#!/usr/bin/env node
/**
 * RC1 PHASE 18 — Supabase migration status probe (pre/post apply).
 * Queries live DB via Management API (postgres role) and reports:
 * - applied migration files (by matching schema fingerprints)
 * - total table count, materialized state of the 5 RLS-recursion tables,
 *   plans policy state, the 007 table set, 008 AI-tracking tables, 009 cert columns
 */
const fs = require('fs');

const REF = 'pzfnptrrnxkgodclyhft';
const TOKEN = process.env.SBP_TOKEN;
if (!TOKEN) { console.error('SBP_TOKEN env required'); process.exit(1); }

async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

(async () => {
  const out = { timestamp: new Date().toISOString(), checks: {} };

  // 1. Migration tracking table (if CLI was ever used)
  try {
    const m = await sql(`select version from supabase_migrations.schema_migrations order by version desc limit 20`);
    out.checks.schema_migrations = m.map((x) => x.version);
  } catch (e) {
    out.checks.schema_migrations = 'TABLE ABSENT (migrations applied manually, not via CLI)';
  }

  // 2. Total public tables
  const t = await sql(`select count(*)::int as n from pg_tables where schemaname='public'`);
  out.checks.public_table_count = t[0].n;

  // 3. Migration 005 fingerprint: user_can_access_class function + classes policy state
  try {
    const f = await sql(`select count(*)::int as n from pg_proc p join pg_namespace n on n.oid=p.pronamespace where p.proname='user_can_access_class' and n.nspname='public'`);
    const p = await sql(`select count(*)::int as n from pg_policies where schemaname='public' and tablename in ('classes','class_students','class_subjects','class_teachers','parent_students')`);
    out.checks.mig005 = { fn_user_can_access_class: f[0].n === 1, rls_policies_on_5_tables: p[0].n };
  } catch (e) { out.checks.mig005 = `ERROR: ${e.message.slice(0, 200)}`; }

  // 4. Migration 006 fingerprint: plans readable policy
  try {
    const p = await sql(`select count(*)::int as n from pg_policies where schemaname='public' and tablename='plans'`);
    out.checks.mig006 = { plans_policies: p[0].n };
  } catch (e) { out.checks.mig006 = `ERROR: ${e.message.slice(0, 200)}`; }

  // 5. Migration 007 fingerprint: count of the 59 target tables that exist
  const mig007 = fs.readFileSync('/home/z/my-project/supabase/migrations/007_omega_missing_tables.sql', 'utf8');
  const created = [...mig007.matchAll(/create table if not exists (?:public\.)?([a-z_]+)/g)].map((m) => m[1]);
  const existing = await sql(`select tablename from pg_tables where schemaname='public'`);
  const existingSet = new Set(existing.map((x) => x.tablename));
  const present = created.filter((c) => existingSet.has(c));
  out.checks.mig007 = { targets: created.length, present: present.length, missing: created.filter((c) => !existingSet.has(c)) };

  // 6. Migration 008 fingerprint: ai_usage_daily / ai events
  try {
    const a = await sql(`select tablename from pg_tables where schemaname='public' and tablename like 'ai_%'`);
    out.checks.mig008 = { ai_tables: a.map((x) => x.tablename) };
  } catch (e) { out.checks.mig008 = `ERROR: ${e.message.slice(0, 200)}`; }

  // 7. Migration 009 fingerprint: certificates columns
  try {
    const c = await sql(`select column_name from information_schema.columns where table_schema='public' and table_name='certificates' order by ordinal_position`);
    out.checks.mig009 = { certificate_columns: c.map((x) => x.column_name) };
  } catch (e) { out.checks.mig009 = `ERROR: ${e.message.slice(0, 200)}`; }

  console.log(JSON.stringify(out, null, 1));
  fs.writeFileSync('/home/z/my-project/download/verification/omega-local/migration-status.json', JSON.stringify(out, null, 1));
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
