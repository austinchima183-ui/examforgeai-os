// Ω-5: Diagnose LCP element on AUTHENTICATED page (cookie) — desktop viewport
import { chromium } from 'playwright';
import fs from 'fs';

const url = process.argv[2];
const role = process.argv[3] || 'student';
const cookieHeader = fs.readFileSync(`/home/z/my-project/scripts/omega/.cookies/${role}.txt`, 'utf8').trim();
const cookies = cookieHeader.split('; ').map((pair) => {
  const idx = pair.indexOf('=');
  return { name: pair.slice(0, idx), value: pair.slice(idx + 1), domain: 'localhost', path: '/' };
});

async function main() {
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1350, height: 940 } });
await ctx.addCookies(cookies);
const page = await ctx.newPage();
await page.addInitScript(`
  window.__lcp = null; window.__longTasks = [];
  try {
    new PerformanceObserver((l) => {
      const e = l.getEntries(); const last = e[e.length - 1];
      window.__lcp = { size: last.size, startTime: Math.round(last.startTime),
        tag: last.element ? last.element.tagName : '?',
        cls: last.element ? (last.element.className || '').toString().slice(0,110) : '',
        text: last.element ? (last.element.textContent || '').trim().slice(0, 60) : '' };
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((l) => {
      for (const t of l.getEntries()) window.__longTasks.push({ start: Math.round(t.startTime), dur: Math.round(t.duration) });
    }).observe({ type: 'longtask', buffered: true });
  } catch (e) {}
`);
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(9000);
const res = await page.evaluate(() => ({
  lcp: window.__lcp,
  longTasks: window.__longTasks.slice(0, 10),
  paints: performance.getEntriesByType('paint').map((p) => ({ n: p.name, t: Math.round(p.startTime) })),
}));
console.log(JSON.stringify(res, null, 1));
await browser.close();
}
main();
