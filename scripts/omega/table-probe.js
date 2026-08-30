#!/usr/bin/env node
/**
 * Ω-1 DEEP VERIFICATION — Supabase table existence probe (user-scoped).
 *
 * The OpenAPI root is service_role-only and the real service key is stored as
 * a non-decryptable Vercel sensitive value (external blocker). The honest
 * functional check: probe every `.from('<table>')` reference with an
 * AUTHENTICATED user JWT. For user-facing queries the relevant question is
 * exactly "does the authenticated role see this table?" — 404/PGRST205 means
 * the reference is broken at runtime (missing table or missing grant).
 *
 * Output: download/verification/omega-local/table-probe.json
 */
const fs = require('fs')
const path = require('path')

const SUPA_URL = 'https://pzfnptrrnxkgodclyhft.supabase.co'
const env = {}
for (const line of fs.readFileSync('/home/z/my-project/.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim()
}
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const USERS = [
  { role: 'student', email: 'prod-final-1787626351@examforge-test.com', password: 'SecurePass123!' },
  { role: 'teacher', email: 'e2e-teacher-1787626988@examforge-test.com', password: 'Teacher123!' },
  { role: 'super_admin', email: 'e2e-superadmin@examforge-test.com', password: 'SuperAdmin123!' },
]

async function login(email, password) {
  const res = await fetch(`${SUPA_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error(`login ${email}: ${res.status}`)
  return (await res.json()).access_token
}

async function probeTable(token, table) {
  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/${encodeURIComponent(table)}?select=*&limit=1`, {
      headers: { apikey: ANON, Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })
    if (res.status === 200) return 'OK'
    const body = await res.text()
    if (res.status === 404) return body.includes('PGRST205') || /relation|does not exist/i.test(body) ? 'MISSING' : 'MISSING(404)'
    if (res.status === 401 || res.status === 403) return 'FORBIDDEN'
    return `HTTP_${res.status}`
  } catch (e) {
    return `ERR:${e.message.slice(0, 40)}`
  }
}

async function main() {
  const srcRoot = '/home/z/my-project/src'
  const tables = new Map()
  ;(function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === '__tests__' || entry.name === 'node_modules') continue
        walk(full)
      } else if (/\.(ts|tsx)$/.test(entry.name)) {
        const content = fs.readFileSync(full, 'utf8')
        for (const m of content.matchAll(/\.from\(\s*['"]([a-z_0-9]+)['"]\s*\)/g)) {
          if (!tables.has(m[1])) tables.set(m[1], new Set())
          tables.get(m[1]).add(path.relative('/home/z/my-project', full))
        }
      }
    }
  })(srcRoot)

  console.log(`referenced tables: ${tables.size}`)

  const results = {}
  for (const u of USERS) {
    const token = await login(u.email, u.password)
    console.log(`probing as ${u.role}...`)
    const perTable = {}
    let done = 0
    for (const table of tables.keys()) {
      perTable[table] = await probeTable(token, table)
      done++
      if (done % 40 === 0) console.log(`  ${done}/${tables.size}`)
    }
    results[u.role] = perTable
  }

  // aggregate: a table is VERIFIED-EXISTING if any role sees OK; BROKEN if all roles 404
  const aggregate = {}
  for (const table of tables.keys()) {
    const statuses = Object.values(results).map((r) => r[table])
    aggregate[table] = {
      refs: tables.get(table).size,
      files: Array.from(tables.get(table)).slice(0, 5),
      statuses: Object.fromEntries(Object.keys(results).map((r) => [r, results[r][table]])),
      verdict: statuses.includes('OK')
        ? 'EXISTS'
        : statuses.every((s) => s.startsWith('MISSING'))
          ? 'MISSING'
          : statuses.every((s) => s === 'FORBIDDEN')
            ? 'FORBIDDEN-ALL'
            : 'MIXED',
    }
  }

  const verdicts = {}
  for (const v of Object.values(aggregate)) verdicts[v.verdict] = (verdicts[v.verdict] || 0) + 1

  const out = {
    timestamp: new Date().toISOString(),
    method: 'authenticated-Role REST probe (OpenAPI root is service_role-only; real service key externally blocked)',
    referencedTables: tables.size,
    verdictCounts: verdicts,
    aggregate,
  }
  fs.mkdirSync('/home/z/my-project/download/verification/omega-local', { recursive: true })
  fs.writeFileSync('/home/z/my-project/download/verification/omega-local/table-probe.json', JSON.stringify(out, null, 2))
  console.log('\nVERDICT COUNTS:', verdicts)
  const missing = Object.entries(aggregate).filter(([, v]) => v.verdict === 'MISSING')
  console.log(`\nMISSING tables (${missing.length}):`)
  missing.sort((a, b) => b[1].refs - a[1].refs).forEach(([t, v]) => console.log(`  ${String(v.refs).padStart(4)} refs  ${t}`))
}

main().catch((e) => { console.error('FATAL', e); process.exit(1) })
