#!/usr/bin/env node
// ============================================================================
// Generates the RBAC test matrix JSON from src/lib/constants/route-rbac.ts
// (source of truth) — used by e2e/06-rbac-matrix.spec.ts
// ============================================================================

const fs = require('fs')

const src = fs.readFileSync('src/lib/constants/route-rbac.ts', 'utf8')

// Parse ROUTE_ROLE_MAP block
function extractMap(name) {
  const start = src.indexOf(`export const ${name}`)
  if (start === -1) throw new Error(`${name} not found`)
  const braceStart = src.indexOf('{', start)
  let depth = 0
  let end = braceStart
  for (let i = braceStart; i < src.length; i++) {
    if (src[i] === '{') depth++
    if (src[i] === '}') {
      depth--
      if (depth === 0) { end = i; break }
    }
  }
  const body = src.slice(braceStart + 1, end)

  const map = {}
  const re = /'([^']+)':\s*\[([^\]]*)\]/g
  let m
  while ((m = re.exec(body)) !== null) {
    const route = m[1]
    const roles = m[2].split(',').map((r) => r.trim().replace(/['"]/g, '')).filter(Boolean)
    map[route] = roles
  }
  return map
}

const routeRoleMap = extractMap('ROUTE_ROLE_MAP')
const publicRoutes = extractMap('PUBLIC_ROUTES') // won't parse as map — handled below

// Parse PUBLIC_ROUTES as array
const pubStart = src.indexOf('export const PUBLIC_ROUTES')
const pubBracket = src.indexOf('[', pubStart)
const pubEnd = src.indexOf(']', pubBracket)
const publicList = src.slice(pubBracket + 1, pubEnd)
  .split('\n')
  .map((l) => l.trim().replace(/[,]/g, '').replace(/['"]/g, ''))
  .filter((l) => l && !l.startsWith('//'))

const ROLES = ['student', 'teacher', 'parent', 'school_admin', 'super_admin']

// Build matrix: role → { allowed: [], denied: [] }
// Utility pages that legitimately render their own state for every role —
// excluded from allowed-route spot checks (visiting them is not a feature).
const UTILITY_ROUTES = new Set([
  '/forbidden',      // always shows the forbidden page (tautological)
  '/settings',       // settings root renders per-role sub-navigation
])

const matrix = {}
for (const role of ROLES) {
  const allowed = []
  const denied = []
  for (const [route, roles] of Object.entries(routeRoleMap)) {
    // Skip dynamic param routes for direct navigation tests
    if (route.includes('[')) continue
    if (UTILITY_ROUTES.has(route)) continue
    if (roles.includes(role)) allowed.push(route)
    else denied.push(route)
  }
  matrix[role] = { allowed, denied }
}

const output = {
  generatedAt: new Date().toISOString(),
  source: 'src/lib/constants/route-rbac.ts',
  publicRoutes: publicList,
  routeRoleMap,
  matrix,
}

fs.mkdirSync('download/verification', { recursive: true })
fs.writeFileSync('download/verification/rbac-matrix.json', JSON.stringify(output, null, 2))

console.log('✓ RBAC matrix generated')
console.log(`  Routes mapped: ${Object.keys(routeRoleMap).length}`)
console.log(`  Public routes: ${publicList.length}`)
for (const role of ROLES) {
  console.log(`  ${role.padEnd(13)} allowed=${matrix[role].allowed.length} denied=${matrix[role].denied.length}`)
}
