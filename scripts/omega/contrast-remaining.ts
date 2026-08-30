import { chromium } from '@playwright/test'
import { readFileSync } from 'fs'

const AXE = readFileSync('node_modules/axe-core/axe.min.js', 'utf-8')
const PAGES = ['/', '/pricing', '/features', '/security', '/docs']

async function main() {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] })
  for (const path of PAGES) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await page.goto(`http://localhost:3000${path}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(4500)
    await page.evaluate(AXE)
    const nodes = await page.evaluate(async () => {
      const r = await (window as any).axe.run(document, { runOnly: { type: 'rule', values: ['color-contrast'] } })
      return r.violations.flatMap((v: any) =>
        v.nodes.map((n: any) => ({
          sel: n.target.join(' ').slice(0, 110),
          ratio: n.any[0]?.data?.contrastRatio,
          size: n.any[0]?.data?.fontSize,
          weight: n.any[0]?.data?.fontWeight,
        }))
      )
    })
    console.log(`\n=== ${path} (${nodes.length}) ===`)
    for (const n of nodes) {
      console.log(`  ratio=${n.ratio} ${n.size} ${n.weight}  ${n.sel}`)
    }
    await page.close()
  }
  await browser.close()
}

main().catch((e) => { console.error('FATAL', e); process.exit(1) })
