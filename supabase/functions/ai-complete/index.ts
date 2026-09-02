// ============================================================================
// ExamForge AI — AI Completion Edge Function
// ============================================================================
// Provides a server-side AI completion endpoint for the Flutter client.
//
// WHY THIS EXISTS:
//   The Flutter client previously called OpenAI/Gemini APIs directly, which
//   is insecure because:
//     1. API keys would be exposed in the client binary
//     2. No rate limiting could be enforced server-side
//     3. No usage tracking or cost control
//     4. Prompt injection attacks could go unchecked
//
// SECURITY MODEL:
//   1. Requires authenticated user (JWT validation)
//   2. Rate limiting: max 20 requests per minute per user
//   3. API keys are never exposed to the client
//   4. Provider and model are validated against allow-lists
//   5. Prompt length is bounded to prevent abuse
//   6. All requests are audit-logged
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { getSecurityHeaders, combineHeaders } from '../_shared/security_headers.ts';
import { checkRateLimit, getRateLimitHeaders } from '../_shared/rate_limiter.ts';

// ─── Allowed models per provider ─────────────────────────────────────────
const ALLOWED_MODELS: Record<string, string[]> = {
  openai: [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'gpt-4',
    'gpt-3.5-turbo',
  ],
  gemini: [
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-1.0-pro',
  ],
};

const MAX_PROMPT_LENGTH = 50_000; // Characters
const MAX_TOKENS_LIMIT = 4_096;
const DEFAULT_MAX_TOKENS = 1_024;
const DEFAULT_TEMPERATURE = 0.7;

// ─── Call OpenAI API ─────────────────────────────────────────────────────
async function callOpenAI(
  apiKey: string,
  prompt: string,
  model: string,
  maxTokens: number,
  temperature: number
): Promise<{ content: string; usage: Record<string, number> }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature,
      }),
      signal: controller.signal,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || `OpenAI API error: ${response.status}`);
    }

    return {
      content: data.choices?.[0]?.message?.content || '',
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── Call Gemini API ─────────────────────────────────────────────────────
async function callGemini(
  apiKey: string,
  prompt: string,
  model: string,
  maxTokens: number,
  temperature: number
): Promise<{ content: string; usage: Record<string, number> }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature,
          },
        }),
        signal: controller.signal,
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || `Gemini API error: ${response.status}`);
    }

    const content = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || '';

    return {
      content,
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata?.totalTokenCount || 0,
      },
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // ─── CORS preflight ──────────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: combineHeaders(corsHeaders) });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json' }),
    });
  }

  // ─── Step 1: Authenticate ────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized — missing auth token' }), {
      status: 401,
      headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json' }),
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const adminClient = createClient(supabaseUrl, supabaseServiceKey);

  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Invalid authentication token' }), {
      status: 401,
      headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json' }),
    });
  }

  // ─── Step 2: Rate limit check ────────────────────────────────────────
  const rateLimit = checkRateLimit(user.id);
  const rateLimitHeaders = getRateLimitHeaders(rateLimit);

  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers: combineHeaders(corsHeaders, {
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil((rateLimit.resetAt - Date.now()) / 1000).toString(),
          ...rateLimitHeaders,
        }),
      }
    );
  }

  // ─── Step 3: Parse and validate request ──────────────────────────────
  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json' }),
    });
  }

  const { provider, prompt, model, maxTokens, temperature } = body;

  // Required fields
  if (!provider || !prompt) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: provider, prompt' }),
      { status: 400, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json' }) }
    );
  }

  // Validate provider
  const normalizedProvider = provider.toLowerCase();
  if (!['openai', 'gemini'].includes(normalizedProvider)) {
    return new Response(
      JSON.stringify({ error: 'Invalid provider. Must be "openai" or "gemini"' }),
      { status: 400, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json' }) }
    );
  }

  // Resolve API key
  const apiKey = normalizedProvider === 'openai'
    ? Deno.env.get('OPENAI_API_KEY')
    : Deno.env.get('GEMINI_API_KEY');

  if (!apiKey) {
    console.error(`${normalizedProvider.toUpperCase()}_API_KEY not configured`);
    return new Response(JSON.stringify({ error: 'AI provider not configured' }), {
      status: 500,
      headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json' }),
    });
  }

  // Validate model
  const resolvedModel = model || (normalizedProvider === 'openai' ? 'gpt-4o-mini' : 'gemini-1.5-flash');
  const allowedModels = ALLOWED_MODELS[normalizedProvider];
  if (!allowedModels.includes(resolvedModel)) {
    return new Response(
      JSON.stringify({
        error: `Model "${resolvedModel}" is not allowed for provider "${normalizedProvider}"`,
        allowedModels,
      }),
      { status: 400, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json' }) }
    );
  }

  // Validate prompt length
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return new Response(
      JSON.stringify({ error: `Prompt exceeds maximum length of ${MAX_PROMPT_LENGTH} characters` }),
      { status: 400, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json' }) }
    );
  }

  // Validate and clamp maxTokens
  const resolvedMaxTokens = Math.min(
    Math.max(1, parseInt(maxTokens) || DEFAULT_MAX_TOKENS),
    MAX_TOKENS_LIMIT
  );

  // Validate and clamp temperature
  const resolvedTemperature = Math.min(
    Math.max(0, parseFloat(temperature) || DEFAULT_TEMPERATURE),
    2.0
  );

  // ─── Step 4: Call AI provider ────────────────────────────────────────
  try {
    const result = normalizedProvider === 'openai'
      ? await callOpenAI(apiKey, prompt, resolvedModel, resolvedMaxTokens, resolvedTemperature)
      : await callGemini(apiKey, prompt, resolvedModel, resolvedMaxTokens, resolvedTemperature);

    // ─── Step 5: Audit log ─────────────────────────────────────────────
    await adminClient.from('ai_request_log').insert({
      user_id: user.id,
      provider: normalizedProvider,
      model: resolvedModel,
      prompt_length: prompt.length,
      max_tokens: resolvedMaxTokens,
      temperature: resolvedTemperature,
      usage: result.usage,
      created_at: new Date().toISOString(),
    }).then(({ error }) => {
      if (error) console.error('Failed to log AI request:', error);
    });

    // ─── Audit log (success) ───────────────────────────────────────────
    console.info(JSON.stringify({
      audit: true,
      event: 'ai_request_success',
      user_id: user.id,
      provider: normalizedProvider,
      model: resolvedModel,
      prompt_length: prompt.length,
      max_tokens: resolvedMaxTokens,
      temperature: resolvedTemperature,
      usage: result.usage,
      timestamp: new Date().toISOString(),
    }));

    // ─── Step 6: Return result ─────────────────────────────────────────
    return new Response(
      JSON.stringify({
        content: result.content,
        provider: normalizedProvider,
        model: resolvedModel,
        usage: result.usage,
        remaining: rateLimit.remaining,
      }),
      { status: 200, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...rateLimitHeaders }) }
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const isTimeout = err instanceof DOMException && err.name === 'AbortError';

    console.error(`AI completion error (${normalizedProvider}/${resolvedModel}):`, errorMessage);

    // ─── Audit log (failure) ───────────────────────────────────────────
    console.error(JSON.stringify({
      audit: true,
      event: 'ai_request_failure',
      user_id: user.id,
      provider: normalizedProvider,
      model: resolvedModel,
      prompt_length: prompt.length,
      error: errorMessage,
      is_timeout: isTimeout,
      timestamp: new Date().toISOString(),
    }));

    return new Response(
      JSON.stringify({
        error: isTimeout
          ? 'AI provider request timed out. Please retry.'
          : `AI provider error: ${errorMessage}`,
      }),
      { status: 502, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json' }) }
    );
  }
});
