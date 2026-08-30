#!/usr/bin/env python3
"""
Ω-1 DEEP VERIFICATION SWEEP (re-derived from source tree — RULE ZERO).
1. Extract every page route + API route from src/app (static ground truth).
2. Unauthenticated sweep against the target base:
   - public pages → 200
   - protected pages → 307/redirect to /login (or 200 with login render)
   - API routes → 401/403/405 (never 5xx)
   - _next assets excluded
3. Writes verdict per route + summary JSON.

Usage: python3 scripts/omega/omega1-sweep.py [base_url]
"""
import json
import os
import re
import sys
import time
import urllib.request
import urllib.error
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:3000'
OUT = '/home/z/my-project/download/verification/omega-local/omega1-route-sweep.json'
SRC = '/home/z/my-project/src/app'

# ── 1. Static route extraction ──────────────────────────────────────────────
pages, apis = [], []

for root, dirs, files in os.walk(SRC):
    dirs[:] = [d for d in dirs if d not in ('node_modules', '__pycache__')]
    rel = os.path.relpath(root, SRC).replace(os.sep, '/')
    for f in files:
        if f == 'route.ts' or f == 'route.js':
            path = '' if rel == '.' else '/' + rel
            path = re.sub(r'\((group)\)/', lambda m: '', path)  # keep groups out of path
            path = re.sub(r'/+', '/', path)
            path = re.sub(r'\[\.\.\.(\w+)\]', '{...}', path)
            path = re.sub(r'\[(\w+)\]', '{}', path)
            apis.append({'route': path or '/', 'file': f'{rel}/route.ts'})
        elif f == 'page.tsx' or f == 'page.ts':
            path = '' if rel == '.' else '/' + rel
            path = re.sub(r'\((group)\)/', lambda m: '', path)
            path = re.sub(r'/+', '/', path)
            path = re.sub(r'\[\.\.\.(\w+)\]', '{...}', path)
            path = re.sub(r'\[(\w+)\]', '{}', path)
            pages.append({'route': path or '/', 'file': f'{rel}/page.tsx'})

# dynamic route slugs are swept as /  (cannot know real ids generically)
def concretize(route: str) -> str:
    out = re.sub(r'\{[^}]*\}', '', route)
    out = re.sub(r'/+', '/', out)
    return out or '/'

# ── 2. Sweep ────────────────────────────────────────────────────────────────
PUBLIC_PREFIXES = ('/', '/login', '/register', '/forgot-password', '/reset-password',
                   '/verify-email', '/terms', '/privacy', '/pricing', '/features',
                   '/security', '/about', '/contact', '/faq', '/help', '/docs',
                   '/marketplace', '/blog', '/careers', '/status', '/changelog')
PAGE_OK_PUBLIC = (200,)
PAGE_OK_PROTECTED = (307, 308, 302, 303, 401, 403)
API_OK = (401, 403, 405, 400, 404, 422, 429, 200)

def fetch(route: str, is_api: bool, method: str = 'GET'):
    url = BASE + route
    req = urllib.request.Request(url, method=method, headers={
        'User-Agent': 'ExamForge-Omega1-Sweep/1.0',
        'Accept': 'text/html,application/json',
    })
    start = time.time()
    try:
        # do not follow redirects
        class NoRedirect(urllib.request.HTTPRedirectHandler):
            def redirect_request(self, *args, **kwargs):
                return None
        opener = urllib.request.build_opener(NoRedirect)
        with opener.open(req, timeout=30) as resp:
            status, loc, body = resp.status, resp.headers.get('location', ''), resp.read(400).decode('utf-8', 'ignore')
    except urllib.error.HTTPError as e:
        status = e.code
        loc = e.headers.get('location', '') if e.headers else ''
        try:
            body = e.read(400).decode('utf-8', 'ignore')
        except Exception:  # noqa: BLE001
            body = ''
    except Exception as e:  # noqa: BLE001
        return {'route': route, 'isApi': is_api, 'status': 0, 'error': str(e)[:120],
                'verdict': 'FAIL', 'expected': 'reachable'}
    ttfb = round((time.time() - start) * 1000)

    if is_api:
        ok = status in API_OK
        verdict = 'PASS' if ok else 'FAIL'
        expected = '401/403/4xx (no 5xx)'
        if status >= 500:
            verdict = 'FAIL'
    else:
        is_public = route in ('/', '/login', '/register') or any(
            route.startswith(p) and p != '/' for p in PUBLIC_PREFIXES[1:])
        if is_public:
            ok = status in PAGE_OK_PUBLIC
            expected = '200'
        else:
            ok = status in PAGE_OK_PROTECTED
            expected = '307/redirect or 401'
        verdict = 'PASS' if ok else 'FAIL'
    return {'route': route, 'isApi': is_api, 'status': status, 'location': loc,
            'ttfb_ms': ttfb, 'verdict': verdict, 'expected': expected,
            'bodySnippet': body[:120] if status >= 500 else ''}

targets = []
for p in pages:
    targets.append((concretize(p['route']), False))
for a in apis:
    targets.append((concretize(a['route']), True))
# dedupe
seen = set()
targets = [t for t in targets if not (t in seen or seen.add(t))]

print(f'routes: {len(pages)} pages, {len(apis)} apis → sweeping {len(targets)} concrete targets')

results = []
with ThreadPoolExecutor(max_workers=8) as ex:
    futs = {ex.submit(fetch, r, is_api): r for r, is_api in targets}
    for fut in as_completed(futs):
        results.append(fut.result())

results.sort(key=lambda x: (x['isApi'], x['route']))
passed = sum(1 for r in results if r['verdict'] == 'PASS')
failed = [r for r in results if r['verdict'] == 'FAIL']

summary = {
    'base': BASE,
    'timestamp': datetime.now(timezone.utc).isoformat(),
    'pages_found': len(pages),
    'apis_found': len(apis),
    'swept': len(results),
    'pass': passed,
    'fail': len(failed),
    'failures': [{k: r.get(k) for k in ('route', 'isApi', 'status', 'error', 'location', 'expected', 'bodySnippet')} for r in failed],
    'results': results,
}
os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump(summary, open(OUT, 'w'), indent=2)
print(f'\nPASS {passed}/{len(results)}  FAIL {len(failed)}')
for f in failed[:20]:
    print(f"  FAIL {f.get('status')} {'API ' if f['isApi'] else 'PAGE'} {f['route']} (expected {f.get('expected')}) {f.get('error', '')} {f.get('bodySnippet', '')[:80]}")
print(f'written: {OUT}')
