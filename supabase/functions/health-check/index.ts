// ============================================================================
// ExamForge AI — Health Check & Metrics Collection Edge Function
// ============================================================================
// Collects service health metrics and evaluates alert rules.
// Also serves as the /health endpoint for deployment verification.
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { getSecurityHeaders, combineHeaders } from '../_shared/security_headers.ts';
import { checkRateLimit, getRateLimitHeaders } from '../_shared/rate_limiter.ts';

interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTimeMs: number;
  details?: Record<string, any>;
}

async function checkDatabaseHealth(supabase: any): Promise<HealthCheckResult> {
  const start = Date.now();
  try {
    const { data, error } = await supabase.from('app_health_checks').select('id').limit(1);
    const responseTime = Date.now() - start;
    if (error) return { service: 'database', status: 'down', responseTimeMs: responseTime, details: { error: error.message } };
    const status = responseTime > 1000 ? 'degraded' : 'healthy';
    return { service: 'database', status, responseTimeMs: responseTime };
  } catch (err) {
    return { service: 'database', status: 'down', responseTimeMs: Date.now() - start, details: { error: String(err) } };
  }
}

async function checkStorageHealth(supabase: any): Promise<HealthCheckResult> {
  const start = Date.now();
  try {
    const { data, error } = await supabase.storage.listBuckets();
    const responseTime = Date.now() - start;
    if (error) return { service: 'storage', status: 'down', responseTimeMs: responseTime, details: { error: error.message } };
    return { service: 'storage', status: 'healthy', responseTimeMs: responseTime, details: { buckets: data?.length || 0 } };
  } catch (err) {
    return { service: 'storage', status: 'down', responseTimeMs: Date.now() - start, details: { error: String(err) } };
  }
}

async function checkAuthHealth(supabase: any): Promise<HealthCheckResult> {
  const start = Date.now();
  try {
    const { error } = await supabase.auth.getSession();
    const responseTime = Date.now() - start;
    if (error && error.message !== 'Auth session missing!') {
      return { service: 'auth', status: 'down', responseTimeMs: responseTime, details: { error: error.message } };
    }
    return { service: 'auth', status: 'healthy', responseTimeMs: responseTime };
  } catch (err) {
    return { service: 'auth', status: 'down', responseTimeMs: Date.now() - start, details: { error: String(err) } };
  }
}

async function checkPaymentHealth(): Promise<HealthCheckResult> {
  const start = Date.now();
  try {
    const flwKey = Deno.env.get('FLUTTERWAVE_SECRET_KEY');
    if (!flwKey) return { service: 'payment', status: 'down', responseTimeMs: 0, details: { error: 'FLUTTERWAVE_SECRET_KEY not configured' } };
    const response = await fetch('https://api.flutterwave.com/v3/transactions', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${flwKey}` },
    });
    const responseTime = Date.now() - start;
    if (!response.ok) return { service: 'payment', status: 'degraded', responseTimeMs: responseTime, details: { status: response.status } };
    return { service: 'payment', status: 'healthy', responseTimeMs: responseTime };
  } catch (err) {
    return { service: 'payment', status: 'down', responseTimeMs: Date.now() - start, details: { error: String(err) } };
  }
}

async function recordHealthCheck(supabase: any, result: HealthCheckResult): Promise<void> {
  await supabase.from('app_health_checks').insert({
    service_name: result.service,
    status: result.status,
    response_time_ms: result.responseTimeMs,
    details: result.details || {},
    checked_at: new Date().toISOString(),
  });
}

async function evaluateAlerts(supabase: any, healthResults: HealthCheckResult[]): Promise<void> {
  for (const result of healthResults) {
    if (result.status === 'down') {
      const { data: existingAlert } = await supabase.from('alert_state').select('*').eq('alert_name', `${result.service}_down`).eq('is_firing', true).maybeSingle();
      if (!existingAlert) {
        await supabase.from('alert_state').upsert({
          alert_name: `${result.service}_down`, severity: 'critical', description: `${result.service} service is down`,
          is_firing: true, first_fired_at: new Date().toISOString(), last_fired_at: new Date().toISOString(),
          current_value: { response_time_ms: result.responseTimeMs, status: result.status }, threshold: { status: 'down' },
        }, { onConflict: 'alert_name' });
        await supabase.from('alert_history').insert({
          alert_name: `${result.service}_down`, severity: 'critical', description: `${result.service} service is down`,
          fired_at: new Date().toISOString(), metric_value: result.responseTimeMs, threshold_value: 0, metadata: result.details || {},
        });
      } else {
        await supabase.from('alert_state').update({ last_fired_at: new Date().toISOString(), current_value: { response_time_ms: result.responseTimeMs } }).eq('alert_name', `${result.service}_down`);
      }
    } else if (result.status === 'degraded') {
      const { data: existingAlert } = await supabase.from('alert_state').select('*').eq('alert_name', `${result.service}_degraded`).eq('is_firing', true).maybeSingle();
      if (!existingAlert) {
        await supabase.from('alert_state').upsert({
          alert_name: `${result.service}_degraded`, severity: 'warning', description: `${result.service} service is degraded (${result.responseTimeMs}ms)`,
          is_firing: true, first_fired_at: new Date().toISOString(), last_fired_at: new Date().toISOString(),
          current_value: { response_time_ms: result.responseTimeMs }, threshold: { max_response_time_ms: 1000 },
        }, { onConflict: 'alert_name' });
      }
    } else {
      await supabase.from('alert_state').update({ is_firing: false, resolved_at: new Date().toISOString() })
        .in('alert_name', [`${result.service}_down`, `${result.service}_degraded`]).eq('is_firing', true);
    }
  }
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') return new Response('ok', { headers: combineHeaders(corsHeaders) });

  // ─── Authentication ──────────────────────────────────────────────
  // Health check requires authentication to prevent abuse.
  // Only authenticated users or internal service requests can trigger
  // health checks that write to the database.
  const authHeader = req.headers.get('Authorization');
  const apiKey = req.headers.get('apikey');
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Allow service-role requests (e.g., cron jobs) without user auth
  const isServiceRequest = apiKey === supabaseServiceKey;

  let isAuthenticatedUser = false;
  if (authHeader && !isServiceRequest) {
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    isAuthenticatedUser = !authError && !!user;
  }

  if (!isServiceRequest && !isAuthenticatedUser) {
    // ─── Rate limiting for unauthenticated requests ──────────────
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown';
    const rateLimitResult = checkRateLimit(`health:${clientIp}`, 60, 60000);

    if (!rateLimitResult.allowed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: combineHeaders(corsHeaders, {
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000).toString(),
          ...getRateLimitHeaders(rateLimitResult),
        }),
      });
    }

    // For unauthenticated requests, return a read-only health status
    // without writing to the database
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const dbStart = Date.now();
    try {
      await supabase.from('schools').select('id').limit(1);
    } catch {}
    const dbResponseTime = Date.now() - dbStart;

    return new Response(JSON.stringify({
      status: dbResponseTime < 1000 ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      version: Deno.env.get('DEPLOY_VERSION') || 'unknown',
      environment: Deno.env.get('ENVIRONMENT') || 'unknown',
      services: { database: { status: dbResponseTime < 1000 ? 'healthy' : 'degraded', responseTimeMs: dbResponseTime } },
    }), {
      status: 200,
      headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json', ...getRateLimitHeaders(rateLimitResult) }),
    });
  }

  // ─── Authenticated: Full health check with DB writes ────────────
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const healthResults = await Promise.all([
    checkDatabaseHealth(supabase), checkStorageHealth(supabase),
    checkAuthHealth(supabase), checkPaymentHealth(),
  ]);

  for (const result of healthResults) await recordHealthCheck(supabase, result);
  await evaluateAlerts(supabase, healthResults);

  const anyDown = healthResults.some(r => r.status === 'down');
  const anyDegraded = healthResults.some(r => r.status === 'degraded');
  const overallStatus = anyDown ? 'down' : anyDegraded ? 'degraded' : 'healthy';

  const response = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: Deno.env.get('DEPLOY_VERSION') || 'unknown',
    environment: Deno.env.get('ENVIRONMENT') || 'unknown',
    services: healthResults.reduce((acc, r) => {
      acc[r.service] = { status: r.status, responseTimeMs: r.responseTimeMs, ...r.details };
      return acc;
    }, {} as Record<string, any>),
  };

  return new Response(JSON.stringify(response), {
    status: anyDown ? 503 : 200,
    headers: combineHeaders(corsHeaders, { 'Content-Type': 'application/json' }),
  });
});
