#!/usr/bin/env python3
"""Comprehensive Supabase audit: project status, edge functions, database, auth config."""
import json, os, urllib.request, urllib.error

PLAT = os.environ["SUPABASE_PLATFORM_KEY"]
REF = os.environ["SUPABASE_PROJECT_REF"]
URL = os.environ["SUPABASE_URL"]
ANON = os.environ["SUPABASE_ANON_KEY"]
SVC = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

def api(url, key=None, method="GET", body=None, use_apikey_header=False):
    headers = {}
    if key:
        if use_apikey_header:
            headers["apikey"] = key
            headers["Authorization"] = f"Bearer {key}"
        else:
            headers["Authorization"] = f"Bearer {key}"
    headers["Content-Type"] = "application/json"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, json.load(r) if r.status != 204 else {}
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.load(e)
        except Exception:
            return e.code, e.read().decode()[:300]

print("=" * 70)
print("SUPABASE PLATFORM API AUDIT")
print("=" * 70)

# 1. Project status
code, proj = api(f"https://api.supabase.com/v1/projects/{REF}", PLAT)
print(f"\n[Project] HTTP {code}")
if code == 200:
    print(f"  Name: {proj.get('name')} | Region: {proj.get('region')} | Status: {proj.get('status')}")
    print(f"  DB Version: {proj.get('database', {}).get('version', '?')}")

# 2. Edge Functions
code, funcs = api(f"https://api.supabase.com/v1/projects/{REF}/functions", PLAT)
print(f"\n[Edge Functions] HTTP {code}")
if code == 200 and isinstance(funcs, list):
    print(f"  Count: {len(funcs)}")
    for f in funcs:
        print(f"  - {f.get('slug'):35} status={f.get('status','?'):8} verify_jwt={f.get('verify_jwt')} imported={f.get('import_map') is not None} size={f.get('size', '?')}B")

# 3. Database PostgREST — list tables via OpenAPI
code, openapi = api(f"{URL}/rest/v1/", ANON, "GET", use_apikey_header=True)
print(f"\n[PostgREST OpenAPI] HTTP {code}")
tables = []
if code == 200 and isinstance(openapi, dict):
    defs = openapi.get("definitions", {})
    tables = list(defs.keys())
    print(f"  Tables exposed via PostgREST: {len(tables)}")
    for t in sorted(tables):
        print(f"    - {t}")

# 4. Test the broken tables mentioned in audit notes
for tbl in ["organizations", "profiles"]:
    code, resp = api(f"{URL}/rest/v1/{tbl}?select=*&limit=1", SVC, use_apikey_header=True)
    msg = resp if isinstance(resp, dict) else str(resp)
    print(f"\n[Test table '{tbl}'] HTTP {code}: {json.dumps(msg)[:200]}")

# 5. Auth settings
code, auth = api(f"https://api.supabase.com/v1/projects/{REF}/config/auth", PLAT)
print(f"\n[Auth Config] HTTP {code}")
if code == 200:
    print(f"  Site URL: {auth.get('SITE_URL')}")
    print(f"  Disable signup: {auth.get('DISABLE_SIGNUP')}")
    print(f"  JWT expiry: {auth.get('JWT_EXPIRY')}")

# 6. Storage buckets (via service role)
code, buckets = api(f"{URL}/storage/v1/bucket", SVC)
print(f"\n[Storage Buckets] HTTP {code}")
if code == 200 and isinstance(buckets, list):
    print(f"  Count: {len(buckets)}")
    for b in buckets:
        print(f"  - {b.get('name'):30} public={b.get('public')} size_limit={b.get('file_size_limit')} mime={b.get('allowed_mime_types')}")
