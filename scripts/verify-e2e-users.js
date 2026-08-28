#!/usr/bin/env node
// ============================================================================
// Verify E2E test users can authenticate against Supabase Auth
// ============================================================================
const fs = require('fs')
const path = require('path')

const envFile = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8')
const env = {}
for (const line of envFile.split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) {
    // strip surrounding quotes and trailing comments
    let v = m[2].trim()
    v = v.replace(/^"([^"]*)".*$/, '$1').replace(/^'([^']*)'.*$/, '$1')
    env[m[1]] = v.trim()
  }
}

const SUPABASE_URL = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL
const ANON = env.SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const TEST_USERS = {
  student: { email: 'prod-final-1787626351@examforge-test.com', password: 'SecurePass123!' },
  teacher: { email: 'e2e-teacher-1787626988@examforge-test.com', password: 'Teacher123!' },
  parent: { email: 'e2e-parent-1787626988@examforge-test.com', password: 'Parent123!' },
  school_admin: { email: 'e2e-schooladmin-1787626988@examforge-test.com', password: 'SchoolAdmin123!' },
  super_admin: { email: 'e2e-superadmin@examforge-test.com', password: 'SuperAdmin123!' },
}

async function main() {
  const results = {}
  for (const [role, u] of Object.entries(TEST_USERS)) {
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { apikey: ANON, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: u.email, password: u.password }),
      })
      const data = await res.json()
      const ok = res.ok && data.access_token
      // fetch role from user endpoint
      let dbRole = null
      if (ok) {
        try {
          const me = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
            headers: { apikey: ANON, Authorization: `Bearer ${data.access_token}` },
          })
          const meData = await me.json()
          dbRole = meData.app_metadata?.role || meData.user_metadata?.role || 'unknown'
        } catch {}
      }
      results[role] = { ok, status: res.status, email: u.email, appRole: dbRole, error: ok ? null : (data.error_description || data.msg || 'unknown') }
      console.log(`${ok ? '✓' : '✗'} ${role.padEnd(13)} ${ok ? 'AUTH OK, app_role=' + dbRole : 'FAILED (' + res.status + '): ' + (data.error_description || data.msg || '')}`)
    } catch (e) {
      results[role] = { ok: false, error: String(e) }
      console.log(`✗ ${role} EXCEPTION: ${String(e).slice(0, 100)}`)
    }
  }
  fs.mkdirSync('download/verification', { recursive: true })
  fs.writeFileSync('download/verification/e2e-users.json', JSON.stringify(results, null, 2))
  const okCount = Object.values(results).filter(r => r.ok).length
  console.log(`\n${okCount}/5 test users verified`)
  process.exit(okCount === 5 ? 0 : 1)
}

main()
