#!/usr/bin/env node
// ============================================================================
// MISSION 7 — SDK VERIFICATION
// Live-tests every SDK integration: Supabase, OpenAI, Gemini, Flutterwave,
// Resend, Sentry, Vercel. No assumptions — actual API calls where safe.
// ============================================================================

const fs = require('fs')

const env = {}
for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)="?(.+?)"?\s*(?:#.*)?$/)
  if (m) env[m[1]] = m[2]
}

const results = []
const check = (sdk, name, ok, detail = '') => {
  results.push({ sdk, name, ok, detail })
  console.log(`  ${ok ? '✓' : '✗'} [${sdk}] ${name}${detail ? ` — ${detail}` : ''}`)
}

async function main() {
  console.log('\n🔌 SDK VERIFICATION\n')

  // ── 1. Supabase ──
  const supaHealth = await fetch(`${env.SUPABASE_URL}/auth/v1/health`, {
    headers: { apikey: env.SUPABASE_ANON_KEY },
  })
  check('Supabase', 'Connectivity + auth service', supaHealth.status === 200, `HTTP ${supaHealth.status}`)

  const supaRest = await fetch(`${env.SUPABASE_URL}/rest/v1/schools?select=id&limit=1`, {
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
  })
  check('Supabase', 'REST API (service role)', supaRest.status === 200, `HTTP ${supaRest.status}`)

  // ── 2. OpenAI ──
  if (env.OPENAI_API_KEY) {
    const models = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
    })
    check('OpenAI', 'API key valid', models.status === 200, `HTTP ${models.status}`)

    // Minimal chat completion (1 token)
    const chat = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'ping' }], max_tokens: 1 }),
    })
    check('OpenAI', 'Chat completion', chat.status === 200, `HTTP ${chat.status}`)
  } else {
    check('OpenAI', 'API key present', false, 'missing')
  }

  // ── 3. Gemini ──
  if (env.GEMINI_API_KEY) {
    const gem = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${env.GEMINI_API_KEY}`
    )
    check('Gemini', 'API key valid + models list', gem.status === 200, `HTTP ${gem.status}`)
  } else {
    check('Gemini', 'API key present', false, 'missing')
  }

  // ── 4. Flutterwave ──
  if (env.FLUTTERWAVE_SECRET_KEY) {
    // Verify the mode of the key
    const isTest = env.FLUTTERWAVE_SECRET_KEY.startsWith('FLWSECK-TEST')
    const flw = await fetch('https://api.flutterwave.com/v3/transactions?page=1', {
      headers: { Authorization: `Bearer ${env.FLUTTERWAVE_SECRET_KEY}` },
    })
    check('Flutterwave', `API key valid (${isTest ? 'SANDBOX' : 'LIVE'})`, flw.status === 200, `HTTP ${flw.status}`)
    check('Flutterwave', 'Public key present', Boolean(env.FLUTTERWAVE_PUBLIC_KEY), env.FLUTTERWAVE_PUBLIC_KEY?.slice(0, 12) + '…')
  } else {
    check('Flutterwave', 'API key present', false, 'missing')
  }

  // ── 5. Resend ──
  if (env.RESEND_API_KEY) {
    // List domains (safe read-only)
    const domains = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}` },
    })
    check('Resend', 'API key valid + domains', domains.status === 200, `HTTP ${domains.status}`)
  } else {
    check('Resend', 'API key present', false, 'missing')
  }

  // ── 6. Sentry ──
  if (env.SENTRY_AUTH_TOKEN) {
    // Verify Sentry config files exist
    const configs = ['sentry.client.config.ts', 'sentry.server.config.ts', 'sentry.edge.config.ts']
    const allExist = configs.every((c) => fs.existsSync(c))
    check('Sentry', 'Config files present (client/server/edge)', allExist, configs.filter((c) => fs.existsSync(c)).join(', '))

    // Token format check (skip API call — org slug needed)
    check('Sentry', 'Auth token present', env.SENTRY_AUTH_TOKEN.length > 20, `${env.SENTRY_AUTH_TOKEN.slice(0, 10)}…`)
  } else {
    check('Sentry', 'Auth token present', false, 'missing')
  }

  // ── 7. Vercel ──
  if (env.VERCEL_TOKEN) {
    const projects = await fetch('https://api.vercel.com/v9/projects', {
      headers: { Authorization: `Bearer ${env.VERCEL_TOKEN}` },
    })
    const projData = await projects.json().catch(() => ({}))
    const projectList = (projData.projects || []).map((p) => p.name)
    check('Vercel', 'API token valid + projects', projects.status === 200, `HTTP ${projects.status}, projects: ${projectList.slice(0, 3).join(', ')}`)

    if (env.VERCEL_PROJECT_ID) {
      const deploys = await fetch(
        `https://api.vercel.com/v6/deployments?projectId=${env.VERCEL_PROJECT_ID}&limit=3`,
        { headers: { Authorization: `Bearer ${env.VERCEL_TOKEN}` } }
      )
      const depData = await deploys.json().catch(() => ({}))
      const latest = (depData.deployments || [])[0]
      check('Vercel', 'Deployments accessible', deploys.status === 200,
        latest ? `latest: ${latest.state} (${(latest.created / 1000).toFixed(0)} epoch)` : 'no deployments')
    }
  } else {
    check('Vercel', 'API token present', false, 'missing')
  }

  // ── Summary ──
  const passed = results.filter((r) => r.ok).length
  const bySdk = {}
  for (const r of results) {
    bySdk[r.sdk] = bySdk[r.sdk] || { pass: 0, total: 0 }
    bySdk[r.sdk].total++
    if (r.ok) bySdk[r.sdk].pass++
  }
  console.log('\n══════════════════════════════════════════════════')
  for (const [sdk, s] of Object.entries(bySdk)) {
    console.log(`  ${sdk.padEnd(13)} ${s.pass}/${s.total}`)
  }
  console.log(`  ${'TOTAL'.padEnd(13)} ${passed}/${results.length}`)
  console.log('══════════════════════════════════════════════════\n')

  fs.writeFileSync('download/verification/sdk-verification.json', JSON.stringify({ results, passed, total: results.length }, null, 2))
  console.log('📄 Saved → download/verification/sdk-verification.json')
}

main().catch((e) => {
  console.error('SDK verification failed:', e)
  process.exit(1)
})
