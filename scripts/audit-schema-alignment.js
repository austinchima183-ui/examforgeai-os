// ============================================================================
// Schema alignment audit — verify every .from('<table>') in src/ exists in the
// live Supabase schema, and every column selected exists on that table.
// ============================================================================
const fs = require('fs')
const path = require('path')

// ── env ──
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

async function main() {
  // 1. Fetch live schema
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/`, {
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
  })
  const spec = await res.json()
  const tables = Object.keys(spec.definitions || {})
  const tableSet = new Set(tables)
  const tableCols = {}
  for (const t of tables) {
    tableCols[t] = new Set(Object.keys(spec.definitions[t].properties || {}))
  }
  console.log(`Live schema: ${tables.length} tables`)

  // 2. Walk src/ and extract .from('<table>') + select columns
  const findings = []
  const tableUsage = new Set()

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === '__tests__' || entry.name === 'node_modules') continue
        walk(full)
      } else if (/\.(ts|tsx)$/.test(entry.name)) {
        const content = fs.readFileSync(full, 'utf8')
        // table references
        const tableMatches = content.matchAll(/\.from\(\s*['"]([a-z_0-9]+)['"]\s*\)/g)
        for (const m of tableMatches) {
          tableUsage.add(m[1])
          if (!tableSet.has(m[1])) {
            findings.push({ type: 'MISSING_TABLE', file: full, table: m[1] })
          }
        }
        // select columns: .from('table')\n .select('col1, col2')
        const selectMatches = content.matchAll(/\.from\(\s*['"]([a-z_0-9]+)['"]\s*\)([\s\S]{0,400}?)\.select\(\s*[`'"]([^`'"]+)[`'"]/g)
        for (const m of selectMatches) {
          const table = m[1]
          const middle = m[2]
          const sel = m[3]
          // only direct chains (no intervening .from)
          if (middle.includes('.from(')) continue
          if (!tableSet.has(table)) continue // already reported
          const cols = sel
            .split(',')
            .map((c) => c.trim().split(/\s+as\s+/i)[0].trim().split(':')[0].trim())
            .filter((c) => c && !c.includes('(') && !c.includes('*') && !c.includes('!') && !c.includes('->'))
          for (const c of cols) {
            if (!tableCols[table].has(c)) {
              findings.push({ type: 'MISSING_COLUMN', file: full, table, column: c })
            }
          }
        }
      }
    }
  }
  walk('src')

  // 3. Report
  const missingTables = findings.filter((f) => f.type === 'MISSING_TABLE')
  const missingCols = findings.filter((f) => f.type === 'MISSING_COLUMN')
  console.log(`\nTable references found: ${tableUsage.size}`)
  console.log(`MISSING TABLES: ${missingTables.length}`)
  const byTable = {}
  for (const f of missingTables) {
    byTable[f.table] = (byTable[f.table] || 0) + 1
  }
  for (const [t, n] of Object.entries(byTable)) console.log(`  ${t}: ${n} refs`)
  console.log(`MISSING COLUMNS: ${missingCols.length}`)
  const byCol = {}
  for (const f of missingCols) {
    const key = `${f.table}.${f.column}`
    byCol[key] = (byCol[key] || 0) + 1
  }
  for (const [c, n] of Object.entries(byCol).sort((a, b) => b[1] - a[1])) console.log(`  ${c}: ${n} refs`)

  fs.mkdirSync('download/verification', { recursive: true })
  fs.writeFileSync('download/verification/schema-alignment.json', JSON.stringify({
    liveTables: tables.length,
    referencedTables: tableUsage.size,
    missingTables: missingTables,
    missingColumns: missingCols,
  }, null, 2))
  console.log('\nSaved → download/verification/schema-alignment.json')
}

main().catch((e) => { console.error(e); process.exit(1) })
