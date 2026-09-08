#!/usr/bin/env node
/**
 * RC1 PHASE 18 cleanup — remove env vars + deployments mistakenly created on the
 * wrong Vercel project (prj_4xvm / "web-alpha-bay-87" name, owns -mu domain),
 * and the stray deploy to "my-project". The true production project is
 * prj_rp5aHw / "examforge-ai" (owns web-alpha-bay-87.vercel.app).
 */
const VT = process.env.VERCEL_TOKEN;
if (!VT) { console.error('VERCEL_TOKEN required'); process.exit(1); }
const H = { Authorization: `Bearer ${VT}` };
const WRONG_PROJECT = 'prj_4xvm95CsaIGX4gl3nw3zRwJAFHiU';
const KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_APP_URL', 'SESSION_TOKEN_SECRET', 'CSRF_SECRET', 'ENCRYPTION_KEY',
  'WEBHOOK_SECRET', 'FLUTTERWAVE_SECRET_KEY', 'FLUTTERWAVE_PUBLIC_KEY', 'FLUTTERWAVE_WEBHOOK_HASH',
];

(async () => {
  // 1. Remove env vars from the wrong project
  const list = await (await fetch(`https://api.vercel.com/v9/projects/${WRONG_PROJECT}/env`, { headers: H })).json();
  for (const e of list.envs || []) {
    if (!KEYS.includes(e.key)) continue;
    const r = await fetch(`https://api.vercel.com/v9/projects/${WRONG_PROJECT}/env/${e.id}`, { method: 'DELETE', headers: H });
    console.log(`env ${e.key}: delete → ${r.status}`);
  }

  // 2. Remove the stray deployment on the wrong project (RC1-with-placeholder-env)
  for (const uid of ['dpl_4eLEZaEcGk5VMGYooSL2kfqsXHEx']) {
    const r = await fetch(`https://api.vercel.com/v12/deployments/${uid}?teamId=team_hbVXkzeMbXEmG1e6FO4tq4vB`, { method: 'DELETE', headers: H });
    console.log(`deployment ${uid}: delete → ${r.status}`);
  }
  console.log('cleanup done');
})();
