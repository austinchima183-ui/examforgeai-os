#!/usr/bin/env node
/**
 * Ω-1 verification: all 5 E2E test users authenticate via Supabase Auth
 * (password grant) and report the expected app role.
 */
const URL_BASE = 'https://pzfnptrrnxkgodclyhft.supabase.co'

const USERS = [
  { role: 'student', email: 'prod-final-1787626351@examforge-test.com', password: 'SecurePass123!' },
  { role: 'teacher', email: 'e2e-teacher-1787626988@examforge-test.com', password: 'Teacher123!' },
  { role: 'parent', email: 'e2e-parent-1787626988@examforge-test.com', password: 'Parent123!' },
  { role: 'school_admin', email: 'e2e-schooladmin-1787626988@examforge-test.com', password: 'SchoolAdmin123!' },
  { role: 'super_admin', email: 'e2e-superadmin@examforge-test.com', password: 'SuperAdmin123!' },
]

async function main() {
  const env = require('fs').readFileSync('/home/z/my-project/.env.local', 'utf8')
  const anon = env.match(/^NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)$/m)[1].trim()
  let pass = 0, fail = 0
  for (const u of USERS) {
    try {
      const res = await fetch(`${URL_BASE}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: { apikey: anon, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: u.email, password: u.password }),
      })
      const data = await res.json()
      const appRole = data?.user?.user_metadata?.role || data?.user?.app_metadata?.role
      const ok = res.status === 200 && appRole === u.role
      console.log(`${ok ? 'PASS' : 'FAIL'} ${u.role.padEnd(14)} http=${res.status} appRole=${appRole ?? 'none'} ${data.error_code ? data.error_code + ' ' + (data.msg || '') : ''}`)
      ok ? pass++ : fail++
    } catch (exc) {
      console.log(`FAIL ${u.role.padEnd(14)} ${exc.message}`)
      fail++
    }
  }
  console.log(`\n${pass}/5 authenticated, ${fail} failed`)
  process.exit(fail === 0 ? 0 : 1)
}
main()
