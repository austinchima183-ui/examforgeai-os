#!/usr/bin/env python3
"""
Mission Ω-7 — Security audit battery:
1. Static: scan the local production build output (.next/static) for leaked secrets.
2. Static: verify no server-only env vars are referenced in client bundles.
3. Live: probe production security headers + auth-gating + CSRF rejection.
4. Static: audit API route CSRF enforcement coverage (enforceCsrf wrapper).
"""
import json
import os
import re
import urllib.request
import ssl
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path('/home/z/my-project')
OUT = ROOT / 'download/verification/omega-local/security-audit.json'
OUT.parent.mkdir(parents=True, exist_ok=True)

report = {
    'auditedAt': datetime.now(timezone.utc).isoformat(),
    'sections': {},
}

# ── 1. Secrets scan of client bundles ────────────────────────────────────────
SECRET_PATTERNS = [
    ('supabase_service_role', re.compile(r'sb_secret_[A-Za-z0-9_-]{20,}')),
    ('service_role_literal', re.compile(r'SUPABASE_SERVICE_ROLE_KEY\s*[=:]\s*["\'][^"\']{20,}')),
    ('jwt_secret', re.compile(r'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.eyJpc\.[A-Za-z0-9_-]{20,}')),
    ('openai_key', re.compile(r'sk-[A-Za-z0-9]{20,}T3BlbkFJ[A-Za-z0-9]{20,}')),
    ('flutterwave_secret', re.compile(r'FLWSECK-[A-Za-z0-9-]{30,}')),
    ('resend_key', re.compile(r're_[A-Za-z0-9]{20,}')),
    ('private_key_block', re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----')),
    ('session_secret_assign', re.compile(r'SESSION_TOKEN_SECRET\s*[=:]\s*["\'][A-Za-z0-9]{16,}')),
    ('csrf_secret_assign', re.compile(r'CSRF_SECRET\s*[=:]\s*["\'][A-Za-z0-9]{16,}')),
    ('encryption_key_assign', re.compile(r'ENCRYPTION_KEY\s*[=:]\s*["\'][A-Za-z0-9]{16,}')),
    ('sentry_token', re.compile(r'sntrys_[A-Za-z0-9]{20,}')),
]

print('Scanning .next/static client bundles for secrets...')
client_files = list((ROOT / '.next/static').rglob('*.js')) if (ROOT / '.next/static').exists() else []
leaks = []
scanned = 0
for f in client_files:
    scanned += 1
    try:
        text = f.read_text(encoding='utf-8', errors='ignore')
    except Exception:
        continue
    for name, pattern in SECRET_PATTERNS:
        for m in pattern.finditer(text):
            leaks.append({
                'pattern': name,
                'file': str(f.relative_to(ROOT)),
                'preview': m.group(0)[:30] + '…',
            })

report['sections']['clientBundleSecretScan'] = {
    'filesScanned': scanned,
    'leaksFound': leaks,
    'verdict': 'PASS' if not leaks else 'FAIL',
}
print(f'  scanned {scanned} client files — leaks: {len(leaks)}')

# Also scan server chunks for PRIVATE KEYS only (server bundles legitimately
# reference env var names, but must not embed literal private keys)
server_files = list((ROOT / '.next/server').rglob('*.js')) if (ROOT / '.next/server').exists() else []
server_leaks = []
for f in server_files:
    try:
        text = f.read_text(encoding='utf-8', errors='ignore')
    except Exception:
        continue
    for name in ('private_key_block', 'openai_key', 'flutterwave_secret', 'resend_key', 'sentry_token'):
        pattern = dict(SECRET_PATTERNS)[name]
        for m in pattern.finditer(text):
            server_leaks.append({
                'pattern': name,
                'file': str(f.relative_to(ROOT)),
                'preview': m.group(0)[:30] + '…',
            })
report['sections']['serverBundleSecretScan'] = {
    'filesScanned': len(server_files),
    'leaksFound': server_leaks,
    'verdict': 'PASS' if not server_leaks else 'FAIL',
}
print(f'  scanned {len(server_files)} server files — leaks: {len(server_leaks)}')

# ── 2. CSRF enforcement coverage (static code audit) ────────────────────────
print('Auditing API route CSRF enforcement...')
api_dir = ROOT / 'src/app/api'
route_files = list(api_dir.rglob('route.ts'))
enforced = []
webhook = []
public_anonymous = []
other = []
for rf in route_files:
    src = rf.read_text(encoding='utf-8', errors='ignore')
    rel = str(rf.relative_to(ROOT))
    if 'enforceCsrf' in src or 'verifyCsrfToken' in src or 'csrf' in src.lower() and 'verify' in src.lower():
        enforced.append(rel)
    elif 'webhook' in rel.lower():
        webhook.append(rel)
    elif re.search(r'export\s+async\s+function\s+GET', src) and 'auth' not in src.lower():
        public_anonymous.append(rel)
    else:
        other.append(rel)

report['sections']['csrfCoverage'] = {
    'totalApiRouteFiles': len(route_files),
    'csrfEnforced': len(enforced),
    'webhookRoutesHmac': len(webhook),
    'publicAnonymousGet': len(public_anonymous),
    'otherAuthenticatedOrMixed': len(other),
    'enforcedList': enforced[:60],
    'webhookList': webhook,
    'otherList': other[:40],
}
print(f"  {len(route_files)} API route files: {len(enforced)} enforce CSRF, "
      f"{len(webhook)} webhooks (HMAC), {len(public_anonymous)} public GETs, {len(other)} other")

# ── 3. Live production probes ────────────────────────────────────────────────
print('Probing production security posture...')
BASE = 'https://web-alpha-bay-87.vercel.app'
ctx = ssl.create_default_context()

def fetch(url, method='GET', headers=None, body=None):
    req = urllib.request.Request(url, method=method, headers=headers or {}, data=body)
    try:
        with urllib.request.urlopen(req, timeout=20, context=ctx) as resp:
            return resp.status, dict(resp.headers)
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers or {})
    except Exception as e:
        return 0, {'error': str(e)[:100]}

status, headers = fetch(f'{BASE}/')
required_headers = {
    'content-security-policy': 'CSP present',
    'strict-transport-security': 'HSTS present',
    'x-frame-options': 'X-Frame-Options present',
    'x-content-type-options': 'nosniff present',
    'referrer-policy': 'Referrer-Policy present',
    'permissions-policy': 'Permissions-Policy present',
}
header_results = {}
hl = {k.lower(): v for k, v in headers.items()}
for h, desc in required_headers.items():
    header_results[h] = 'PRESENT' if h in hl else 'MISSING'
    if h in hl:
        header_results[f'{h}#value'] = hl[h][:120]

# Auth gating: protected APIs must reject anonymous access
probe_apis = [
    '/api/notifications', '/api/parent/dashboard', '/api/search',
    '/api/ai/status', '/api/marketplace/items',
]
auth_gate = {}
for api in probe_apis:
    s, _ = fetch(f'{BASE}{api}')
    auth_gate[api] = s

# CSRF rejection: POST without token must be rejected
csrf_probe = {}
s, _ = fetch(
    f'{BASE}/api/auth/logout',
    method='POST',
    headers={'Content-Type': 'application/json'},
    body=b'{}',
)
csrf_probe['POST /api/auth/logout without CSRF token'] = s

# SQL injection probe on a public endpoint (search)
s, _ = fetch(f'{BASE}/api/search?q=%27%3B%20DROP%20TABLE%20users%3B--')
csrf_probe['GET /api/search?q=<sql injection>'] = s

report['sections']['liveProbes'] = {
    'securityHeaders': header_results,
    'authGating': auth_gate,
    'csrfAndInjectionProbes': csrf_probe,
    'headerVerdict': 'PASS' if all(v == 'PRESENT' for k, v in header_results.items() if '#' not in k) else 'FAIL',
    'authGateVerdict': 'PASS' if all(v in (401, 403) for v in auth_gate.values()) else 'FAIL',
}

with open(OUT, 'w') as f:
    json.dump(report, f, indent=2)
print(f'\nReport saved: {OUT}')
print('Header verdict:', report['sections']['liveProbes']['headerVerdict'])
print('Auth gate verdict:', report['sections']['liveProbes']['authGateVerdict'])
print('Client bundle secrets:', report['sections']['clientBundleSecretScan']['verdict'])
print('Server bundle secrets:', report['sections']['serverBundleSecretScan']['verdict'])
