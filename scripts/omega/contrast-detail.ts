import { chromium } from '@playwright/test'
import { readFileSync, writeFileSync } from 'fs'

const AXE = readFileSync('node_modules/axe-core/axe.min.js', 'utf-8')

async function main() {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] })
  const page = await browser.newPage()
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' })
  await page.waitForTimeout(4000)
  await page.evaluate(AXE)
  const nodes = await page.evaluate(async () => {
    const r = await (window as any).axe.run(document, { runOnly: { type: 'rule', values: ['color-contrast'] } })
    return r.violations.flatMap((v: any) =>
      v.nodes.map((n: any) => ({
        sel: n.target.join(' ').slice(0, 100),
        fg: n.any[0]?.data?.foregroundColor,
        bg: n.any[0]?.data?.backgroundColor,
        ratio: n.any[0]?.data?.contrastRatio,
        size: n.any[0]?.data?.fontSize,
        weight: n.any[0]?.data?.fontWeight,
      }))
    )
  })

  const groups: Record<string, { count: number; ratio: number; samples: string[] }> = {}
  for (const n of nodes) {
    const key = `${n.fg} on ${n.bg} (${n.size} ${n.weight})`
    groups[key] = groups[key] ?? { count: 0, ratio: n.ratio, samples: [] }
    groups[key].count++
    if (groups[key].samples.length < 3) groups[key].samples.push(n.sel)
  }
  Object.entries(groups)
    .sort((a, b) => b[1].count - a[1].count)
    .forEach(([k, g]) => {
      console.log(`${String(g.count).padStart(3)}x  ${k}  ratio=${g.ratio}`)
      g.samples.forEach((s) => console.log('       ', s))
    })
  writeFileSync('/tmp/contrast-groups.json', JSON.stringify({ nodes, groups }, null, 2))
  console.log(`\ntotal nodes: ${nodes.length}`)
  await browser.close()
}

main().catch((e) => { console.error('FATAL', e); process.exit(1) })
