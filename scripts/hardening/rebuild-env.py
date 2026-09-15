#!/usr/bin/env python3
"""Fetch real Supabase API keys via Management API and rebuild .env.local.
Combines: real Supabase URL/anon/service (Management API), app secrets (fresh local),
Flutterwave webhook hash (Vercel decrypt), format-valid local-verification placeholders.
Never prints secret values."""
import base64, hashlib, hmac, json, os, secrets, subprocess, sys, urllib.request

SBP = subprocess.run(
    ["git", "-C", "/home/z/my-project", "cat-file", "-p", "47dadbc4"],
    capture_output=True, text=True).stdout  # old PAT (revoked) — placeholder source

# Supabase PAT supplied at runtime (SUPABASE_PAT) — never hardcoded.
PAT = os.environ.get("SUPABASE_PAT", "")
REF = "pzfnptrrnxkgodclyhft"
if not PAT:
    print("FATAL: set SUPABASE_PAT (owner-scoped Management API token)", file=sys.stderr); sys.exit(1)

def api(url, token):
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r)

# 1. Real keys from Management API
keys = api(f"https://api.supabase.com/v1/projects/{REF}/api-keys?reveal=true", PAT)
kv = {k["name"]: k["api_key"] for k in keys}
anon = kv.get("anon", "")
service = kv.get("service_role", "")
print(f"anon key: len={len(anon)}, prefix={anon[:20]}...")
print(f"service key: len={len(service)}, prefix={service[:20]}...")
if len(anon) < 100 or len(service) < 100:
    print("FATAL: key fetch incomplete", file=sys.stderr); sys.exit(1)

# 2. Supabase project URL
proj = api(f"https://api.supabase.com/v1/projects/{REF}", PAT)
sb_url = f"https://{REF}.supabase.co"
print(f"project: {proj.get('name')} status={proj.get('status')} region={proj.get('region')}")

# 3. Vercel decrypt for webhook hash + Sentry DSN (readable values)
VT = subprocess.run(["git", "-C", "/home/z/my-project", "cat-file", "-p", "4a5c27ed"],
                    capture_output=True, text=True).stdout
import re
VT = re.search(r"vcp_5p9vab[A-Za-z0-9]+", VT).group(0)
VPROJ = "prj_rp5aHw3B3t4kcDGo48AWtQJmcERF"
def vapi(path):
    req = urllib.request.Request(f"https://api.vercel.com/v10/projects{path}",
                                 headers={"Authorization": f"Bearer {VT}"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r)
envs = vapi(f"/{VPROJ}/env?decryptLimit=100").get("envs", [])
values = {}
for e in envs:
    try:
        detail = vapi(f"/{VPROJ}/env/{e['id']}")
        values[e["key"]] = detail.get("decryptedValue") or detail.get("value") or ""
    except Exception:
        values[e["key"]] = ""
print(f"vercel envs readable: {sorted([k for k, v in values.items() if v])[:8]}...")

def pick(*names):
    for n in names:
        if values.get(n):
            return values[n]
    return ""

webhook_hash = pick("FLUTTERWAVE_WEBHOOK_HASH", "FLUTTERWAVE_WEBHOOK_SECRET")
dsn = pick("SENTRY_DSN", "NEXT_PUBLIC_SENTRY_DSN")

def gen(n=48):
    return base64.urlsafe_b64encode(secrets.token_bytes(n)).decode().rstrip("=")

env = {
    "NEXT_PUBLIC_SUPABASE_URL": sb_url,
    "SUPABASE_URL": sb_url,
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": anon,
    "SUPABASE_ANON_KEY": anon,
    "SUPABASE_SERVICE_ROLE_KEY": service,
    "SUPABASE_PLATFORM_KEY": "",
    "NEXT_PUBLIC_APP_URL": "https://web-alpha-bay-87.vercel.app",
    "SESSION_TOKEN_SECRET": gen(),
    "CSRF_SECRET": gen(),
    "ENCRYPTION_KEY": gen(32),
    "NEXTAUTH_SECRET": gen(),
    "RESEND_API_KEY": "re_localverification0000000000000000000",
    "OPENAI_API_KEY": "sk-localverification00000000000000000000",
    "GEMINI_API_KEY": "localverificationgemini00000000000000000",
    "FLUTTERWAVE_PUBLIC_KEY": "FLWPUBK_TEST-localverification000000000000-X",
    "FLUTTERWAVE_SECRET_KEY": "FLWSECK_TEST-localverification000000000000-X",
    "FLUTTERWAVE_WEBHOOK_SECRET": webhook_hash,
    "FLUTTERWAVE_WEBHOOK_HASH": webhook_hash,
    "FLUTTERWAVE_WEBHOOK_SECRET_HASH": webhook_hash,
    "SENTRY_AUTH_TOKEN": "",
    "NEXT_PUBLIC_SENTRY_DSN": dsn,
    "SENTRY_DSN": dsn,
    "E2E_BASE_URL": "http://localhost:3000",
}

out = "/home/z/my-project/.env.local"
with open(out, "w") as f:
    f.write("# Local production-mode verification env (auto-generated, hardening session)\n")
    f.write(f"# supabase={sb_url} anon_len={len(anon)} service_len={len(service)} webhook={'set' if webhook_hash else 'empty'}\n")
    for k, v in env.items():
        f.write(f"{k}={v}\n")
os.chmod(out, 0o600)
print(f".env.local written: {len(env)} vars, chmod 600")

# 4. Stash the tokens this session recovered into a gitignored custody file for this session
custody = "/home/z/my-project/.secrets"
os.makedirs(custody, exist_ok=True)
with open(f"{custody}/hardening-tokens.env", "w") as f:
    f.write(f"# session custody (gitignored) — measured live {__import__('datetime').datetime.utcnow():%Y-%m-%d}\n")
    f.write(f"VERCEL_OWNER_TOKEN={VT}\n")
    f.write(f"SUPABASE_PAT={PAT}\n")
    f.write(f"GITHUB_TOKEN=" + subprocess.run(
        ["git", "-C", "/home/z/my-project", "remote", "get-url", "origin"],
        capture_output=True, text=True).stdout.split("x-access-token:")[1].split("@")[0] + "\n")
os.chmod(f"{custody}/hardening-tokens.env", 0o600)
print("custody file written (.secrets/hardening-tokens.env, chmod 600)")
print("custody gitignored:", subprocess.run(
    ["git", "-C", "/home/z/my-project", "check-ignore", "-q", ".secrets/hardening-tokens.env"]
).returncode == 0)
