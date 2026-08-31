// Ω-5: Diagnose LCP element + timing on any local page via Playwright
import { chromium } from 'playwright';

async function main() {
const url = process.argv[2] || 'http://localhost:3000/login';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 412, height: 823 } });
await page.addInitScript(`
  window.__lcp = null;
  try {
    const po = new PerformanceObserver((l) => {
      const e = l.getEntries();
      const last = e[e.length - 1];
      window.__lcp = { size: last.size, startTime: last.startTime,
        tag: last.element ? last.element.tagName : '?',
        cls: last.element ? (last.element.className || '').toString().slice(0,120) : '',
        id: last.element ? last.element.id : '',
        text: last.element ? (last.element.textContent || '').trim().slice(0, 80) : '' };
    });
    po.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (e) {}
`);
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(9000);
const lcp = await page.evaluate(() => window.__lcp);
const nav = await page.evaluate(() => {
  const n = performance.getEntriesByType('navigation')[0] || {};
  const paints = performance.getEntriesByType('paint').map(p => ({ name: p.name, t: Math.round(p.startTime) }));
  return { ttfb: Math.round(n.responseStart || 0), domContentLoaded: Math.round(n.domContentLoadedEventEnd || 0), loadEvent: Math.round(n.loadEventEnd || 0), paints };
});
console.log(JSON.stringify({ url, lcp, nav }, null, 1));
await browser.close();
}
main();
