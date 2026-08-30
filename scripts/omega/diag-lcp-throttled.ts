// Ω-5: Diagnose LCP with CPU throttling (replicates Lighthouse lab conditions)
import { chromium } from 'playwright';

const url = process.argv[2] || 'http://localhost:3000/login';
const throttle = parseFloat(process.argv[3] || '4');

async function main() {
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 412, height: 823 } });
const cdp = await page.context().newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
await page.addInitScript(`
  window.__lcp = null; window.__longTasks = [];
  try {
    new PerformanceObserver((l) => {
      const e = l.getEntries(); const last = e[e.length - 1];
      window.__lcp = { size: last.size, startTime: Math.round(last.startTime),
        tag: last.element ? last.element.tagName : '?',
        cls: last.element ? (last.element.className || '').toString().slice(0,100) : '',
        text: last.element ? (last.element.textContent || '').trim().slice(0, 60) : '' };
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((l) => {
      for (const t of l.getEntries()) window.__longTasks.push({ start: Math.round(t.startTime), dur: Math.round(t.duration) });
    }).observe({ type: 'longtask', buffered: true });
  } catch (e) {}
`);
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(12000);
const res = await page.evaluate(() => ({
  lcp: window.__lcp,
  longTasks: window.__longTasks.slice(0, 12),
  totalLongTaskMs: window.__longTasks.reduce((a: number, b: { dur: number }) => a + b.dur, 0),
  paints: performance.getEntriesByType('paint').map((p) => ({ n: p.name, t: Math.round(p.startTime) })),
}));
console.log(JSON.stringify(res, null, 1));
await browser.close();
}
main();
