#!/usr/bin/env python3
"""Runtime verification of production APIs and Edge Functions."""
import json, os, time, urllib.request, urllib.error

PROD = "[REDACTED]"
SB = os.environ["SUPABASE_URL"]
ANON = os.environ["SUPABASE_ANON_KEY"]

def req(url, method="GET", body=None, headers=None, timeout=20):
    h = {"Content-Type": "application/json"}
    if headers: h.update(headers)
    data = json.dumps(body).encode() if body else None
    r = urllib.request.Request(url, data=data, headers=h, method=method)
    t0 = time.time()
    try:
        with urllib.request.urlopen(r, timeout=timeout) as resp:
            content = resp.read()
            dt = (time.time()-t0)*1000
            try: parsed = json.loads(content)
            except Exception: parsed = content[:120].decode(errors="replace")
            return resp.status, round(dt), parsed
    except urllib.error.HTTPError as e:
        content = e.read()
        dt = (time.time()-t0)*1000
        try: parsed = json.loads(content)
        except Exception: parsed = content[:120].decode(errors="replace")
        return e.code, round(dt), parsed
    except Exception as e:
        return -1, round((time.time()-t0)*1000), str(e)[:100]

checks = [
    # (category, name, method, path, body, headers)
    ("Pages", "Homepage", "GET", f"{PROD}/", None, None),
    ("Pages", "Login", "GET", f"{PROD}/login", None, None),
    ("Pages", "Signup", "GET", f"{PROD}/signup", None, None),
    ("Pages", "Dashboard (redirect)", "GET", f"{PROD}/dashboard", None, None),
    ("Pages", "Marketplace", "GET", f"{PROD}/marketplace", None, None),
    ("Pages", "Pricing", "GET", f"{PROD}/pricing", None, None),
    ("Pages", "Blog", "GET", f"{PROD}/blog", None, None),
    ("Pages", "Admin (redirect)", "GET", f"{PROD}/admin/users", None, None),
    ("Pages", "404 page", "GET", f"{PROD}/nonexistent-page-xyz", None, None),
    ("Health", "/api/health", "GET", f"{PROD}/api/health", None, None),
    ("Health", "/api/health/detailed", "GET", f"{PROD}/api/health/detailed", None, None),
    ("Health", "/api/health/database", "GET", f"{PROD}/api/health/database", None, None),
    ("Health", "/api/health/ai", "GET", f"{PROD}/api/health/ai", None, None),
    ("Health", "/api/health/redis", "GET", f"{PROD}/api/health/redis", None, None),
    ("Auth-gated", "GET /api/agents (no auth)", "GET", f"{PROD}/api/agents", None, None),
    ("Auth-gated", "GET /api/workflows (no auth)", "GET", f"{PROD}/api/workflows", None, None),
    ("Auth-gated", "GET /api/notifications (no auth)", "GET", f"{PROD}/api/notifications", None, None),
    ("Auth-gated", "GET /api/reports (no auth)", "GET", f"{PROD}/api/reports", None, None),
    ("Public API", "POST /api/contact", "POST", f"{PROD}/api/contact", {"name":"test","email":"test@test.com","message":"health check probe"}, None),
    ("Public API", "POST /api/newsletter/subscribe", "POST", f"{PROD}/api/newsletter/subscribe", {"email":"probe-test@example.com"}, None),
    ("Public API", "GET /api/marketplace/product", "GET", f"{PROD}/api/marketplace/product", None, None),
    ("Public API", "GET /api/search?q=test", "GET", f"{PROD}/api/search?q=test", None, None),
    ("Public API", "GET /api/tenants/resolve", "GET", f"{PROD}/api/tenants/resolve", None, None),
    ("EdgeFn", "health-check", "GET", f"{SB}/functions/v1/health-check", None, {"apikey": ANON, "Authorization": f"Bearer {ANON}"}),
    ("EdgeFn", "ai-complete (no auth)", "POST", f"{SB}/functions/v1/ai-complete", {"prompt":"test"}, {"apikey": ANON, "Authorization": f"Bearer {ANON}"}),
    ("EdgeFn", "verify-admin-role (no auth)", "GET", f"{SB}/functions/v1/verify-admin-role", None, {"apikey": ANON, "Authorization": f"Bearer {ANON}"}),
    ("EdgeFn", "flutterwave-transaction-fee", "POST", f"{SB}/functions/v1/flutterwave-transaction-fee", {"amount":1000,"currency":"NGN"}, {"apikey": ANON, "Authorization": f"Bearer {ANON}"}),
    ("Security", "OPTIONS /api/contact (CORS)", "OPTIONS", f"{PROD}/api/contact", None, None),
    ("Security", "POST /api/billing/checkout (no auth)", "POST", f"{PROD}/api/billing/checkout", {"plan":"starter"}, None),
]

print(f"{'CATEGORY':12} {'CHECK':45} {'STATUS':7} {'MS':6} RESULT")
print("=" * 110)
results = {}
for cat, name, method, url, body, headers in checks:
    code, ms, parsed = req(url, method, body, headers)
    status = "✓" if (200 <= code < 300) else ("!" if code in (301,302,307,308) else "✗")
    summary = ""
    if isinstance(parsed, dict):
        if "status" in parsed: summary = f"status={parsed['status']}"
        elif "error" in parsed: summary = f"error={str(parsed['error'])[:50]}"
        else: summary = json.dumps(parsed)[:60]
    elif isinstance(parsed, str):
        summary = parsed[:60]
    print(f"{cat:12} {name:45} {code:7} {ms:6} {summary[:70]}")
    results[name] = {"code": code, "ms": ms, "cat": cat}

with open("/home/z/my-project/audit/runtime_results.json", "w") as f:
    json.dump(results, f, indent=1)
print("\nSaved: runtime_results.json")
