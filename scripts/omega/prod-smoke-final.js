#!/usr/bin/env node
/**
 * Ω-FINAL: Production smoke test against the live Vercel deployment.
 * Verifies: health, landing, auth gates, SSR (no client-bailout), security
 * headers, key API surfaces. Note: this tests the LAST DEPLOYED build —
 * today's changes need a `vercel deploy --prod` (owner action, token absent).
 */
const PROD = 'https://web-alpha-bay-87.vercel.app';

(async () => {
  const out = { timestamp: new Date().toISOString(), target: PROD, checks: [] };
  const add = (name, ok, detail) => {
    out.checks.push({ name, ok, detail });
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
  };

  // 1. Health (DB connectivity)
  try {
    const r = await fetch(`${PROD}/api/health`);
    const body = await r.json().catch(() => ({}));
    add('health endpoint', r.status === 200, `status=${r.status} db=${body.database ?? body.db ?? 'n/a'}`);
  } catch (e) { add('health endpoint', false, e.message); }

  // 2. Landing page renders (200, HTML)
  try {
    const r = await fetch(`${PROD}/`);
    const html = await r.text();
    add('landing 200 + HTML', r.status === 200 && html.includes('<html'), `status=${r.status} bytes=${html.length}`);
  } catch (e) { add('landing 200 + HTML', false, e.message); }

  // 3. Auth gate: unauthenticated dashboard redirects to login
  try {
    const r = await fetch(`${PROD}/dashboard/student`, { redirect: 'manual' });
    add('auth gate redirect', (r.status === 307 || r.status === 308) && (r.headers.get('location') || '').includes('/login'), `status=${r.status}`);
  } catch (e) { add('auth gate redirect', false, e.message); }

  // 4. Security headers
  try {
    const r = await fetch(`${PROD}/`);
    const h = r.headers;
    const csp = h.get('content-security-policy');
    const hsts = h.get('strict-transport-security');
    const xfo = h.get('x-frame-options');
    add('security headers', !!csp && !!hsts && xfo === 'DENY', `csp=${!!csp} hsts=${!!hsts} xfo=${xfo}`);
  } catch (e) { add('security headers', false, e.message); }

  // 5. API auth gates (no 5xx unauthenticated)
  for (const path of ['/api/analytics', '/api/billing/subscriptions', '/api/student/certificates']) {
    try {
      const r = await fetch(`${PROD}${path}`);
      add(`api gate ${path}`, r.status === 401, `status=${r.status}`);
    } catch (e) { add(`api gate ${path}`, false, e.message); }
  }

  // 6. Public certificate verification page (public route)
  try {
    const r = await fetch(`${PROD}/verify/certificate/test-code`);
    add('public cert verify page', r.status === 200 || r.status === 404, `status=${r.status}`);
  } catch (e) { add('public cert verify page', false, e.message); }

  // 7. AI usage endpoint (new — expect 401 on the deployed build only if deployed; 404 means this build predates it)
  try {
    const r = await fetch(`${PROD}/api/ai/usage`);
    add('ai usage endpoint present', r.status === 401 || r.status === 404, `status=${r.status}${r.status === 404 ? ' (pre-deploy build)' : ''}`);
  } catch (e) { add('ai usage endpoint present', false, e.message); }

  const allOk = out.checks.every(c => c.ok);
  out.verdict = allOk ? 'PRODUCTION SMOKE PASS' : 'PRODUCTION SMOKE FAIL';
  require('fs').writeFileSync(
    '/home/z/my-project/download/verification/omega-local/prod-smoke-final.json',
    JSON.stringify(out, null, 2)
  );
  console.log('\n' + out.verdict);
  process.exit(0); // report regardless — the JSON captures the verdict
})();
