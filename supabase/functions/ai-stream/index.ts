// ============================================================================
// ExamForge AI — AI Streaming Edge Function (SSE)
// ============================================================================
// Provides a server-side AI streaming endpoint using Server-Sent Events.
//
// WHY THIS EXISTS:
//   Same security reasons as ai-complete, but with streaming support for
//   real-time text generation in the UI. Streaming improves perceived
//   performance and allows the UI to render partial results.
//
// SECURITY MODEL:
//   1. Requires authenticated user (JWT validation)
//   2. Rate limiting: max 20 requests per minute per user (shared with ai-complete)
//   3. API keys are never exposed to the client
//   4. Provider and model are validated against allow-lists
//   5. Prompt length is bounded to prevent abuse
//   6. All requests are audit-logged
//
// SSE FORMAT:
//   Content-Type: text/event-stream
//   Each event is formatted as:
//     data: {"content": "...", "done": false}\n\n
//   Final event:
//     data: {"content": "", "done": true, "usage": {...}}\n\n
//   Error event:
//     data: {"error": "...", "done": true}\n\n
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

const MAX_PROMPT_LENGTH = 50_000;
const MAX_TOKENS_LIMIT = 4_096;
const DEFAULT_MAX_TOKENS = 1_024;
const DEFAULT_TEMPERATURE = 0.7;

// ─── SSE helper ──────────────────────────────────────────────────────────
function sseEvent(data: Record<string, any>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

// ─── Stream from OpenAI API ──────────────────────────────────────────────
async function* streamOpenAI(
  apiKey: string,
  prompt: string,
  model: string,
  maxTokens: number,
  temperature: number
): AsyncGenerator<Record<string, any>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 min for streams

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
        stream: true,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `OpenAI API error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';
    let totalUsage: Record<string, number> = {};

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === ':') continue; // Skip empty/keepalive lines

        if (trimmed.startsWith('data: ')) {
          const data = trimmed.slice(6);
          if (data === '[DONE]') {
            yield { content: '', done: true, usage: totalUsage };
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content || '';

            // OpenAI may include usage in the final chunk (if stream_options include_usage)
            if (parsed.usage) {
              totalUsage = {
                promptTokens: parsed.usage.prompt_tokens || 0,
                completionTokens: parsed.usage.completion_tokens || 0,
                totalTokens: parsed.usage.total_tokens || 0,
              };
            }

            if (delta) {
              yield { content: delta, done: false };
            }
          } catch {
            // Skip malformed JSON chunks
          }
        }
      }
    }

    // Stream ended without [DONE]
    yield { content: '', done: true, usage: totalUsage };
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── Stream from Gemini API ──────────────────────────────────────────────
async function* streamGemini(
  apiKey: string,
  prompt: string,
  model: string,
  maxTokens: number,
  temperature: number
): AsyncGenerator<Record<string, any>> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
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

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `Gemini API error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';
    let totalUsage: Record<string, number> = {};

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === ':') continue;

        if (trimmed.startsWith('data: ')) {
          const data = trimmed.slice(6);
          try {
            const parsed = JSON.parse(data);
            const text = parsed.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || '';

            if (parsed.usageMetadata) {
              totalUsage = {
                promptTokens: parsed.usageMetadata.promptTokenCount || 0,
                completionTokens: parsed.usageMetadata.candidatesTokenCount || 0,
                totalTokens: parsed.usageMetadata.totalTokenCount || 0,
              };
            }

            if (text) {
              yield { content: text, done: false };
            }
          } catch {
            // Skip malformed JSON chunks
          }
        }
      }
    }

    yield { content: '', done: true, usage: totalUsage };
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
          ...getRateLimitHeaders(rateLimit),
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

  if (!provider || !prompt) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: provider, prompt' }),
      { status: 400, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json' }) }
    );
  }

  const normalizedProvider = provider.toLowerCase();
  if (!['openai', 'gemini'].includes(normalizedProvider)) {
    return new Response(
      JSON.stringify({ error: 'Invalid provider. Must be "openai" or "gemini"' }),
      { status: 400, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json' }) }
    );
  }

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

  if (prompt.length > MAX_PROMPT_LENGTH) {
    return new Response(
      JSON.stringify({ error: `Prompt exceeds maximum length of ${MAX_PROMPT_LENGTH} characters` }),
      { status: 400, headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json' }) }
    );
  }

  const resolvedMaxTokens = Math.min(
    Math.max(1, parseInt(maxTokens) || DEFAULT_MAX_TOKENS),
    MAX_TOKENS_LIMIT
  );
  const resolvedTemperature = Math.min(
    Math.max(0, parseFloat(temperature) || DEFAULT_TEMPERATURE),
    2.0
  );

  // ─── Step 4: Create SSE stream ───────────────────────────────────────
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let fullContent = '';
      let finalUsage: Record<string, number> = {};

      try {
        const generator = normalizedProvider === 'openai'
          ? streamOpenAI(apiKey, prompt, resolvedModel, resolvedMaxTokens, resolvedTemperature)
          : streamGemini(apiKey, prompt, resolvedModel, resolvedMaxTokens, resolvedTemperature);

        for await (const event of generator) {
          if (event.content) {
            fullContent += event.content;
          }
          if (event.usage) {
            finalUsage = event.usage;
          }
          if (event.done) {
            // Send final event with usage stats
            controller.enqueue(encoder.encode(sseEvent({
              content: '',
              done: true,
              usage: finalUsage,
              remaining: rateLimit.remaining,
            })));
          } else {
            controller.enqueue(encoder.encode(sseEvent({
              content: event.content,
              done: false,
            })));
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        const isTimeout = err instanceof DOMException && err.name === 'AbortError';
        controller.enqueue(encoder.encode(sseEvent({
          error: isTimeout
            ? 'AI provider stream timed out.'
            : `AI provider error: ${errorMessage}`,
          done: true,
        })));
      }

      // ─── Audit log (async, fire-and-forget) ──────────────────────────
      adminClient.from('ai_request_log').insert({
        user_id: user.id,
        provider: normalizedProvider,
        model: resolvedModel,
        prompt_length: prompt.length,
        max_tokens: resolvedMaxTokens,
        temperature: resolvedTemperature,
        usage: finalUsage,
        streamed: true,
        created_at: new Date().toISOString(),
      }).then(({ error }) => {
        if (error) console.error('Failed to log AI stream request:', error);
      });

      controller.close();
    },
  });

  // ─── Step 5: Return SSE response ─────────────────────────────────────
  return new Response(stream, {
    status: 200,
    headers: combineHeaders(corsHeaders, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    }),
  });
});
