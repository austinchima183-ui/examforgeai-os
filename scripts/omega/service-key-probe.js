#!/usr/bin/env node
/**
 * Ω-FINAL: Supabase service-key validity probe.
 * RULE ZERO: test the actual key against the live project — never trust
 * the documented claim that it is invalid.
 *
 * Checks:
 *  1. OpenAPI root (service_role-only endpoint) → 200 means VALID service key
 *  2. Direct service read (RLS bypass) on users table
 *  3. If valid: list live public tables via OpenAPI definitions
 */
const fs = require('fs');

function loadEnv() {
  const raw = fs.readFileSync('/home/z/my-project/.env.local', 'utf8');
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

(async () => {
  const env = loadEnv();
  const URL = (env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || '').replace(/\r/g, '');
  const KEY = (env.SUPABASE_SERVICE_ROLE_KEY || '').replace(/\r/g, '');
  console.log('URL:', URL);
  console.log('KEY length:', KEY.length, '| starts:', KEY.slice(0, 12), '| JWT:', KEY.split('.').length === 3);

  // Decode JWT payload to inspect role claim
  try {
    const payload = JSON.parse(Buffer.from(KEY.split('.')[1], 'base64url').toString('utf8'));
    console.log('JWT payload role:', payload.role, '| iss:', payload.iss, '| exp:', payload.exp ? new Date(payload.exp * 1000).toISOString() : 'none', '| ref:', payload.ref);
  } catch (e) {
    console.log('JWT decode failed:', e.message);
  }

  const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };

  // 1. OpenAPI root — service_role-only
  try {
    const r = await fetch(`${URL}/rest/v1/`, { headers });
    console.log('OpenAPI root status:', r.status);
    if (r.status === 200) {
      const body = await r.json();
      const tables = Object.keys(body.definitions || {});
      console.log('SERVICE KEY IS VALID. Live public tables (' + tables.length + '):');
      console.log(tables.sort().join(', '));
      fs.writeFileSync('/home/z/my-project/download/verification/omega-local/live-db-tables.json', JSON.stringify({ timestamp: new Date().toISOString(), tableCount: tables.length, tables: tables.sort() }, null, 2));
    } else {
      const t = await r.text();
      console.log('OpenAPI body:', t.slice(0, 200));
    }
  } catch (e) {
    console.log('OpenAPI ERR:', e.message);
  }

  // 2. Service read (RLS bypass)
  try {
    const r2 = await fetch(`${URL}/rest/v1/users?select=id&limit=1`, { headers });
    console.log('Service read users:', r2.status, (await r2.text()).slice(0, 100));
  } catch (e) {
    console.log('Service read ERR:', e.message);
  }
})();
