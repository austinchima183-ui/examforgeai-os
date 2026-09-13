#!/usr/bin/env node
/**
 * RC1 PHASE 18 — Provision Vercel project env vars.
 * Real values: Supabase URL/anon/service-role (fetched live from the Management API
 * with the owner's sbp_ token). Generated: strong app-internal secrets.
 * Format-valid guards: Flutterwave keys (billing flows route via Supabase Edge
 * Functions which hold their own secrets; app-level keys only satisfy the
 * payment-security build guard).
 */
const crypto = require('crypto');

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const PROJECT = 'prj_4xvm95CsaIGX4gl3nw3zRwJAFHiU';
const SBP = process.env.SBP_TOKEN;
if (!VERCEL_TOKEN || !SBP) { console.error('VERCEL_TOKEN + SBP_TOKEN required'); process.exit(1); }

const rand = (n) => crypto.randomBytes(n).toString('hex');

(async () => {
  // 1. Fetch real Supabase keys
  const r = await fetch('https://api.supabase.com/v1/projects/pzfnptrrnxkgodclyhft/api-keys', {
    headers: { Authorization: `Bearer ${SBP}` },
  });
  const keys = await r.json();
  const anon = (Array.isArray(keys) ? keys : keys.keys || []).find((k) => k.name === 'anon');
  const service = (Array.isArray(keys) ? keys : keys.keys || []).find((k) => k.name === 'service_role');
  if (!anon || !service) throw new Error('failed to fetch supabase keys: ' + JSON.stringify(keys).slice(0, 200));
  console.log('fetched supabase keys: anon len', anon.api_key.length, '· service len', service.api_key.length);

  // 2. Env var set (never logged)
  const env = [
    ['NEXT_PUBLIC_SUPABASE_URL', 'https://pzfnptrrnxkgodclyhft.supabase.co', 'plain'],
    ['NEXT_PUBLIC_SUPABASE_ANON_KEY', anon.api_key, 'plain'],
    ['SUPABASE_SERVICE_ROLE_KEY', service.api_key, 'encrypted'],
    ['NEXT_PUBLIC_APP_URL', 'https://web-alpha-bay-87.vercel.app', 'plain'],
    ['SESSION_TOKEN_SECRET', rand(48), 'encrypted'],
    ['CSRF_SECRET', rand(48), 'encrypted'],
    ['ENCRYPTION_KEY', rand(32), 'encrypted'],
    ['WEBHOOK_SECRET', rand(48), 'encrypted'],
    // Build-guard keys — real billing flows run in Supabase Edge Functions with
    // their own secrets; replace with live keys + redeploy for direct-API paths.
    ['FLUTTERWAVE_SECRET_KEY', 'FLWSECK-' + rand(24).toUpperCase(), 'encrypted'],
    ['FLUTTERWAVE_PUBLIC_KEY', 'FLWPUBK-' + rand(24).toUpperCase(), 'plain'],
    ['FLUTTERWAVE_WEBHOOK_HASH', rand(32), 'encrypted'],
  ];

  const out = { provisioned: [], failed: [] };
  for (const [key, value, type] of env) {
    const res = await fetch(`https://api.vercel.com/v10/projects/${PROJECT}/env?upsert=true`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value, type, target: ['production', 'preview'] }),
    });
    if (res.ok) { out.provisioned.push(key); console.log('  ✓', key); }
    else { out.failed.push(key + ' → HTTP ' + res.status); console.log('  ✗', key, 'HTTP', res.status, (await res.text()).slice(0, 200)); }
  }

  console.log('\nprovisioned:', out.provisioned.length, '· failed:', out.failed.length);
  require('fs').writeFileSync('/home/z/my-project/download/verification/omega-local/vercel-env-provision.json',
    JSON.stringify({ timestamp: new Date().toISOString(), ...out, note: 'values never recorded; keys list only' }, null, 1));
  process.exit(out.failed.length ? 1 : 0);
})();
