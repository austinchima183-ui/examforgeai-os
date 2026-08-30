// Debug: launch chromium with debug port, verify port, run lighthouse while alive
import { chromium } from 'playwright';
import { execSync } from 'child_process';
import http from 'http';

const get = (url: string) => new Promise<string>((res, rej) => {
  http.get(url, (r) => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>res(d)); }).on('error', rej);
});

async function main() {
  const browser = await chromium.launch({
    args: ['--remote-debugging-port=9333', '--remote-allow-origins=*', '--no-sandbox', '--disable-dev-shm-usage'],
    headless: true,
  });
  await new Promise(r => setTimeout(r, 1500));
  try {
    const v = await get('http://127.0.0.1:9333/json/version');
    console.log('PORT OK:', v.slice(0, 120));
  } catch (e) {
    console.log('PORT FAIL:', (e as Error).message);
  }
  try {
    const out = execSync(
      'lighthouse http://localhost:3000/login --port=9333 --output=json --output-path=/tmp/lh-attach-test.json --quiet --max-wait-for-load=60000',
      { stdio: 'pipe', timeout: 200_000, encoding: 'utf8', env: { ...process.env } },
    );
    console.log('LH ran, out len:', out.length);
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string; message?: string };
    console.error('LH FAIL:', (err.stderr || err.stdout || err.message || '').toString().slice(0, 600));
  }
  await browser.close();
}
main();
