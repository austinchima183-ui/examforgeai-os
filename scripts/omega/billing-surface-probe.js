#!/usr/bin/env node
/**
 * Ω-FINAL: Billing surface probe (live).
 * 1. Does the flutterwave-checkout Supabase Edge Function exist (OPTIONS/POST)?
 * 2. Do the plan/checkout/billing APIs on production respond sanely?
 */
const fs = require('fs');

function loadEnv() {
  const raw = fs.readFileSync('/home/z/my-project/.env.local', 'utf8');
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const idx = line.indexOf('=');
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      if (/^[A-Z_0-9]+$/.test(key)) env[key] = val;
    }
  }
  return env;
}

(async () => {
  const env = loadEnv();
  const SUPA = env.NEXT_PUBLIC_SUPABASE_URL;
  const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const PROD = 'https://web-alpha-bay-87.vercel.app';
  const out = { timestamp: new Date().toISOString(), probes: {} };

  // 1. Edge function existence
  for (const fn of ['flutterwave-checkout']) {
    try {
      const r = await fetch(`${SUPA}/functions/v1/${fn}`, { method: 'OPTIONS', headers: { apikey: ANON } });
      out.probes[`edge:${fn}:OPTIONS`] = { status: r.status, invocationCount: r.headers.get('x-invocation-count') };
    } catch (e) {
      out.probes[`edge:${fn}:OPTIONS`] = { error: e.message };
    }
    try {
      const r = await fetch(`${SUPA}/functions/v1/${fn}`, {
        method: 'POST',
        headers: { apikey: ANON, 'Content-Type': 'application/json', Authorization: `Bearer ${ANON}` },
        body: JSON.stringify({}),
      });
      out.probes[`edge:${fn}:POST`] = { status: r.status, body: (await r.text()).slice(0, 200) };
    } catch (e) {
      out.probes[`edge:${fn}:POST`] = { error: e.message };
    }
  }

  // 2. Production API surface (unauthenticated — expect 401 gates, not 5xx)
  for (const path of ['/api/billing/checkout', '/api/billing/subscriptions', '/api/billing/invoices', '/api/plans']) {
    try {
      const r = await fetch(`${PROD}${path}`);
      out.probes[`prod:${path}`] = { status: r.status, body: (await r.text()).slice(0, 150) };
    } catch (e) {
      out.probes[`prod:${path}`] = { error: e.message };
    }
  }

  fs.writeFileSync('/home/z/my-project/download/verification/omega-local/billing-surface-probe.json', JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
})();
