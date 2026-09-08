#!/usr/bin/env node
/**
 * RC1 PHASE 18 — Supabase migration runner.
 * Applies migrations 005-009 in order via Management API (postgres DDL owner).
 * Records per-migration result + timing. Migrations are idempotent (safe to re-run).
 */
const fs = require('fs');

const REF = 'pzfnptrrnxkgodclyhft';
const TOKEN = process.env.SBP_TOKEN;
if (!TOKEN) { console.error('SBP_TOKEN env required'); process.exit(1); }

const MIGRATIONS = [
  '005_break_class_rls_recursion.sql',
  '006_omega_billing_fix.sql',
  '007_omega_missing_tables.sql',
  '008_omega_ai_tracking.sql',
  '009_omega_certificates.sql',
];

async function runSql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const text = await r.text();
  let parsed = null;
  try { parsed = JSON.parse(text); } catch { /* non-json */ }
  return { ok: r.ok, status: r.status, text: text.slice(0, 1500), parsed };
}

(async () => {
  const out = { started: new Date().toISOString(), migrations: [] };

  for (const name of MIGRATIONS) {
    const path = `/home/z/my-project/supabase/migrations/${name}`;
    const sql = fs.readFileSync(path, 'utf8');
    process.stdout.write(`→ applying ${name} (${(sql.length / 1024).toFixed(1)}KB) ... `);
    const t0 = Date.now();
    let res;
    try {
      res = await runSql(sql);
    } catch (e) {
      res = { ok: false, status: 0, text: e.message, parsed: null };
    }
    const ms = Date.now() - t0;
    const rec = { name, bytes: sql.length, ms, ok: res.ok, status: res.status };
    if (res.ok) {
      console.log(`OK (${ms}ms)`);
      rec.result = res.parsed;
    } else {
      console.log(`FAILED (${ms}ms) — ${res.text.slice(0, 300)}`);
      rec.error = res.text;
    }
    out.migrations.push(rec);
  }

  out.finished = new Date().toISOString();
  out.verdict = out.migrations.every((m) => m.ok) ? 'ALL APPLIED' : 'SOME FAILED';
  fs.writeFileSync('/home/z/my-project/download/verification/omega-local/migration-apply.json', JSON.stringify(out, null, 1));
  console.log('\nVERDICT:', out.verdict);
  console.log('evidence: download/verification/omega-local/migration-apply.json');
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
