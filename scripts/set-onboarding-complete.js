// Set onboarding_completed=true for all E2E test users (they are pre-provisioned
// verification accounts — onboarding wizard blocks E2E interactions)
const fs = require('fs')

const env = {}
for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m) {
    let v = m[2].trim()
    if (v.startsWith('"')) {
      const endq = v.indexOf('"', 1)
      if (endq > 0) v = v.slice(1, endq)
    } else {
      v = v.split('#')[0].trim()
    }
    env[m[1]] = v.trim()
  }
}

const TEST_USERS = [
  'prod-final-1787626351@examforge-test.com',
  'e2e-teacher-1787626988@examforge-test.com',
  'e2e-parent-1787626988@examforge-test.com',
  'e2e-schooladmin-1787626988@examforge-test.com',
  'e2e-superadmin@examforge-test.com',
]

async function main() {
  const url = env.SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY

  // 1. Get user IDs by email
  const res = await fetch(`${url}/rest/v1/users?select=id,email,settings&email=in.(${TEST_USERS.join(',')})`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  })
  const users = await res.json()
  console.log(`Found ${users.length} test users`)

  for (const u of users) {
    // 2. Merge settings with onboarding_completed
    const settings = { ...(u.settings || {}), onboarding_completed: true }
    const upd = await fetch(`${url}/rest/v1/users?id=eq.${u.id}`, {
      method: 'PATCH',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ settings }),
    })
    console.log(`  ${u.email}: ${upd.status}`)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
