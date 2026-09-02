#!/usr/bin/env node
/**
 * Ω-FINAL: Verify trailing-slash redirect routes resolve to proper auth gates.
 * The sweep script probes without following redirects; these 11 routes 307/308
 * to their canonical paths. Follow them and confirm the terminal status.
 */
const BASE = 'http://localhost:3000';
const ROUTES = [
  '/api',
  '/api/alerting/incidents/',
  '/api/auth/callback',
  '/api/demo-booking/',
  '/api/feedback/',
  '/api/marketing/leads/',
  '/api/newsletter/unsubscribe',
  '/api/newsletter/verify',
  '/api/organizations/',
  '/api/verify/certificate/',
  '/api/workflows/',
];

(async () => {
  let allOk = true;
  const out = { timestamp: new Date().toISOString(), base: BASE, results: [] };
  for (const route of ROUTES) {
    try {
      const res = await fetch(`${BASE}${route}`, { redirect: 'follow' });
      const chain = res.url.replace(BASE, '') || '(same)';
      // Any non-5xx terminal status is acceptable (auth gates 401/403, method
      // gates 405, validation 400, or a public JSON landing).
      const ok = res.status < 500;
      if (!ok) allOk = false;
      out.results.push({ route, finalStatus: res.status, finalPath: chain, ok });
      console.log(`${ok ? 'PASS' : 'FAIL'} ${res.status} ${route} → ${chain}`);
    } catch (e) {
      allOk = false;
      out.results.push({ route, error: e.message, ok: false });
      console.log(`FAIL ${route} — ${e.message}`);
    }
  }
  out.allOk = allOk;
  require('fs').writeFileSync(
    '/home/z/my-project/download/verification/omega-local/redirect-resolution.json',
    JSON.stringify(out, null, 2)
  );
  console.log(allOk ? 'ALL REDIRECTS RESOLVE TO NON-5XX TERMINAL STATUS' : 'SOME REDIRECTS FAILED');
  process.exit(allOk ? 0 : 1);
})();
