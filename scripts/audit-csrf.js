#!/usr/bin/env node
// ============================================================================
// MISSION 11 — CSRF Coverage Audit
// Finds all API routes with mutation methods (POST/PUT/PATCH/DELETE)
// and checks whether they validate CSRF (requireCsrf / validateCsrfToken)
// or are exempt (webhooks — signature-verified instead).
// ============================================================================

const fs = require('fs')
const path = require('path')

const API_ROOT = 'src/app/api'
const WEBHOOK_EXEMPT = [
  'webhook', 'webhooks', // signature-verified (Flutterwave/Paystack)
  'auth/callback',       // OAuth callback (state-validated)
]

function findRoutes(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      findRoutes(full, results)
    } else if (entry.name === 'route.ts') {
      results.push(full)
    }
  }
  return results
}

const routes = findRoutes(API_ROOT)
const mutationRoutes = []
const csrfProtected = []
const csrfMissing = []
const webhookRoutes = []

for (const route of routes) {
  const src = fs.readFileSync(route, 'utf8')
  const methods = []
  if (/export\s+async\s+function\s+POST/.test(src)) methods.push('POST')
  if (/export\s+async\s+function\s+PUT/.test(src)) methods.push('PUT')
  if (/export\s+async\s+function\s+PATCH/.test(src)) methods.push('PATCH')
  if (/export\s+async\s+function\s+DELETE/.test(src)) methods.push('DELETE')
  if (methods.length === 0) continue

  const isWebhook = WEBHOOK_EXEMPT.some((w) => route.includes(w))
  const hasCsrf = /requireCsrf|enforceCsrf|validateCsrfToken|CSRF_HEADER/.test(src)
  const hasSignature = /verifySignature|verifyWebhookSignature|signature/.test(src)

  const entry = {
    route: route.replace('src/app', '').replace('/route.ts', ''),
    methods,
    hasCsrf,
    hasSignature,
    isWebhook,
  }

  mutationRoutes.push(entry)
  if (isWebhook || hasSignature) webhookRoutes.push(entry)
  else if (hasCsrf) csrfProtected.push(entry)
  else csrfMissing.push(entry)
}

console.log('══════════════════════════════════════════════════')
console.log('  CSRF COVERAGE AUDIT — API Mutation Endpoints')
console.log('══════════════════════════════════════════════════')
console.log(`  Total mutation endpoints:  ${mutationRoutes.length}`)
console.log(`  CSRF protected:           ${csrfProtected.length}`)
console.log(`  Webhook (signature-ver):  ${webhookRoutes.length}`)
console.log(`  MISSING CSRF:             ${csrfMissing.length}`)
console.log('══════════════════════════════════════════════════\n')

if (csrfMissing.length > 0) {
  console.log('❌ ENDPOINTS MISSING CSRF PROTECTION:')
  for (const r of csrfMissing) {
    console.log(`   ${r.route.padEnd(55)} [${r.methods.join(',')}]`)
  }
  console.log('')
}

fs.writeFileSync(
  'download/verification/csrf-audit.json',
  JSON.stringify({ total: mutationRoutes.length, protected: csrfProtected.length, webhooks: webhookRoutes.length, missing: csrfMissing }, null, 2)
)
console.log('📄 Saved → download/verification/csrf-audit.json')
