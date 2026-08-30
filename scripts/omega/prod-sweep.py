#!/usr/bin/env python3
"""
Mission Ω-1 — Production page & API status sweep.
Fetches every route discovered from the production sitemap + known API
endpoints and records HTTP status + TTFB. Unauthenticated sweep: auth-protected
routes should 307/redirect to /login; public pages should 200; APIs should
respond with valid status codes (not 5xx).

Usage: python3 scripts/omega/prod-sweep.py
"""

import json
import time
import urllib.request
import urllib.error
import ssl
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone

BASE = 'https://web-alpha-bay-87.vercel.app'
OUT = '/home/z/my-project/download/verification/prod-e2e-omega/route-sweep.json'

ctx = ssl.create_default_context()

def fetch(url: str, method: str = 'GET') -> dict:
    req = urllib.request.Request(url, method=method, headers={
        'User-Agent': 'ExamForge-Omega-Sweep/1.0',
        'Accept': 'text/html,application/json',
    })
    start = time.time()
    try:
        with urllib.request.urlopen(req, timeout=25, context=ctx) as resp:
            return {
                'status': resp.status,
                'ttfb_ms': round((time.time() - start) * 1000),
                'location': resp.headers.get('location', ''),
            }
    except urllib.error.HTTPError as e:
        return {
            'status': e.code,
            'ttfb_ms': round((time.time() - start) * 1000),
            'location': e.headers.get('location', '') if e.headers else '',
        }
    except Exception as e:
        return {'status': 0, 'ttfb_ms': round((time.time() - start) * 1000), 'error': str(e)[:120]}

# 1. Sitemap discovery
print('Fetching sitemap...')
sitemap_raw = fetch(f'{BASE}/sitemap.xml')
routes: list[str] = ['/']
if sitemap_raw['status'] == 200:
    with urllib.request.urlopen(f'{BASE}/sitemap.xml', timeout=25, context=ctx) as r:
        body = r.read().decode('utf-8', errors='replace')
    import re
    locs = re.findall(r'<loc>(.*?)</loc>', body)
    for loc in locs:
        # Sitemap uses canonical domain https://examforge.ai — map to any host
        path = None
        for prefix in (BASE, 'https://examforge.ai', 'https://www.examforge.ai'):
            if loc.startswith(prefix):
                path = loc[len(prefix):] or '/'
                break
        if path is None and loc.startswith('/'):
            path = loc
        if path:
            routes.append(path)
    routes = sorted(set(routes))
print(f'Discovered {len(routes)} routes from sitemap')

# 2. Known API endpoints (health + representative auth/public endpoints)
api_routes = [
    '/api/health',
    '/api/auth/csrf',
    '/api/auth/session',
    '/api/notifications',
    '/api/search',
    '/api/parent/dashboard',
    '/api/ai/status',
    '/api/marketplace/items',
]

results: dict[str, dict] = {}

def probe(route: str, kind: str):
    url = BASE + route
    r = fetch(url)
    return (route, kind, r)

with ThreadPoolExecutor(max_workers=6) as ex:
    futures = [ex.submit(probe, r, 'page') for r in routes]
    futures += [ex.submit(probe, r, 'api') for r in api_routes]
    for f in as_completed(futures):
        route, kind, r = f.result()
        results[route] = {'kind': kind, **r}

# 3. Classification
ok_pages = [r for r, v in results.items() if v['kind'] == 'page' and v['status'] == 200]
redirects = [r for r, v in results.items() if v['kind'] == 'page' and 300 <= v['status'] < 400]
client_errors = [r for r, v in results.items() if 400 <= v['status'] < 500 and v['kind'] == 'page']
server_errors = [r for r, v in results.items() if v['status'] >= 500]
avg_ttfb = round(sum(v['ttfb_ms'] for v in results.values()) / len(results)) if results else 0
max_ttfb = max((v['ttfb_ms'] for v in results.values()), default=0)

report = {
    'auditedAt': datetime.now(timezone.utc).isoformat(),
    'base': BASE,
    'totalRoutes': len(results),
    'pagesOk': len(ok_pages),
    'pagesRedirected': len(redirects),
    'pageClientErrors': len(client_errors),
    'serverErrors': server_errors,
    'avgTtfbMs': avg_ttfb,
    'maxTtfbMs': max_ttfb,
    'results': results,
}

with open(OUT, 'w') as f:
    json.dump(report, f, indent=2)

print(f'Pages OK (200): {len(ok_pages)}')
print(f'Redirects (3xx): {len(redirects)} — sample: {redirects[:5]}')
print(f'Client errors (4xx pages): {len(client_errors)} — {client_errors[:8]}')
print(f'SERVER ERRORS (5xx): {server_errors}')
print(f'Avg TTFB: {avg_ttfb}ms | Max: {max_ttfb}ms')
print(f'API statuses: ' + ', '.join(f"{r}={results[r]['status']}" for r in api_routes))
print(f'Report saved: {OUT}')
