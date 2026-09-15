// Validate the EXACT CI E2E-gate env values against the production validator.
// Mirrors: NODE_ENV=production + the workflow's E2E env (secrets resolved).
process.env.NODE_ENV = 'production'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://pzfnptrrnxkgodclyhft.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'x'.repeat(208) // real-anon stand-in (length-equivalent)
process.env.NEXT_PUBLIC_APP_URL = 'https://web-alpha-bay-87.vercel.app'
process.env.SESSION_TOKEN_SECRET = 'ci-session-secret-0123456789abcdef'
process.env.CSRF_SECRET = 'ci-csrf-secret-0123456789abcdef0'
process.env.ENCRYPTION_KEY = 'ci-encryption-key-0123456789abcdef'
process.env.FLUTTERWAVE_PUBLIC_KEY = 'FLWPUBK_CI-placeholder'
process.env.FLUTTERWAVE_SECRET_KEY = 'FLWSECK_CI-placeholder'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'y'.repeat(219) // real-service stand-in (length-equivalent)

import { validateEnvironment, formatValidationReport } from '../../src/lib/config/env-validation'

const result = validateEnvironment()
console.log(formatValidationReport(result))
console.log('\nVALID:', result.valid, '| critical:', result.criticalCount, '| warnings:', result.warningCount)
if (result.criticalCount > 0) {
  console.log('\nCRITICAL ISSUES (would crash production runtime):')
  for (const i of result.issues.filter((x) => x.severity === 'critical')) {
    console.log(`  - ${i.variable}: ${i.message}`)
  }
  process.exit(1)
}
console.log('\nCI E2E env PASSES the production validator — no runtime crash expected.')
