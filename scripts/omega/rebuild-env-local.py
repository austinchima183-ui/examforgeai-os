#!/usr/bin/env python3
"""Rebuild .env.local: plain values from Vercel + freshly generated app secrets.
Sensitive Vercel values are non-decryptable by design; app secrets are local-only
signing keys (fresh values = fresh local sessions, production unaffected)."""
import base64
import json
import os
import secrets
import urllib.request

VT = os.environ.get("VERCEL_TOKEN", "")
PROJECT = "prj_rp5aHw3B3t4kcDGo48AWtQJmcERF"
API = "https://api.vercel.com/v10/projects"

def api(path):
    req = urllib.request.Request(f"{API}{path}", headers={"Authorization": f"Bearer {VT}"})
    with urllib.request.urlopen(req) as r:
        return json.load(r)

envs = api(f"/{PROJECT}/env?decryptLimit=100").get("envs", [])
values = {}
for e in envs:
    eid = e["id"]
    try:
        detail = api(f"/{PROJECT}/env/{eid}?decryptLimit=1")
        val = detail.get("decryptedValue") or detail.get("value") or ""
    except Exception:  # noqa: BLE001
        val = ""
    values[e["key"]] = val

def pick(*names):
    for n in names:
        v = values.get(n, "")
        if v:
            return v
    return ""

supabase_url = pick("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL")
anon = pick("SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY")
webhook_secret = pick("FLUTTERWAVE_WEBHOOK_SECRET")
webhook_hash = pick("FLUTTERWAVE_WEBHOOK_HASH")
dsn = pick("SENTRY_DSN", "NEXT_PUBLIC_SENTRY_DSN")

def gen_secret(n=48):
    return base64.urlsafe_b64encode(secrets.token_bytes(n)).decode().rstrip("=")

lines = [
    "# Rebuilt: plain values from Vercel + fresh local app secrets (auto-generated)",
    f"NEXT_PUBLIC_SUPABASE_URL={supabase_url}",
    f"SUPABASE_URL={supabase_url}",
    f"NEXT_PUBLIC_SUPABASE_ANON_KEY={anon}",
    f"SUPABASE_ANON_KEY={anon}",
    f"SUPABASE_SERVICE_ROLE_KEY={pick('SUPABASE_SERVICE_ROLE_KEY')}",
    f"SUPABASE_PLATFORM_KEY={pick('SUPABASE_PLATFORM_KEY')}",
    "NEXT_PUBLIC_APP_URL=http://localhost:3000",
    f"SESSION_TOKEN_SECRET={gen_secret()}",
    f"CSRF_SECRET={gen_secret()}",
    f"ENCRYPTION_KEY={gen_secret(32)}",
    f"NEXTAUTH_SECRET={gen_secret()}",
    f"RESEND_API_KEY={pick('RESEND_API_KEY')}",
    f"OPENAI_API_KEY={pick('OPENAI_API_KEY')}",
    f"GEMINI_API_KEY={pick('GEMINI_API_KEY')}",
    f"FLUTTERWAVE_PUBLIC_KEY={pick('FLUTTERWAVE_PUBLIC_KEY')}",
    f"FLUTTERWAVE_SECRET_KEY={pick('FLUTTERWAVE_SECRET_KEY')}",
    f"FLUTTERWAVE_WEBHOOK_SECRET={webhook_secret}",
    f"FLUTTERWAVE_WEBHOOK_HASH={webhook_hash}",
    f"FLUTTERWAVE_WEBHOOK_SECRET_HASH={pick('FLUTTERWAVE_WEBHOOK_SECRET_HASH')}",
    f"SENTRY_AUTH_TOKEN={pick('SENTRY_AUTH_TOKEN')}",
    f"NEXT_PUBLIC_SENTRY_DSN={dsn}",
    f"SENTRY_DSN={dsn}",
    # E2E test credentials (from prior verified sessions)
    "E2E_BASE_URL=http://localhost:3000",
]
with open("/home/z/my-project/.env.local", "w") as f:
    f.write("\n".join(lines) + "\n")
os.chmod("/home/z/my-project/.env.local", 0o600)

filled = [l.split("=")[0] for l in lines if "=" in l and l.split("=", 1)[1]]
print(f"supabase_url={bool(supabase_url)} anon_key={bool(anon)} webhook={bool(webhook_secret)}")
print(f"filled: {len(filled)} vars: {', '.join(filled[:8])}...")

# Live-validate the anon key
try:
    req = urllib.request.Request(
        f"{supabase_url}/rest/v1/?apikey={anon}",
        headers={"Authorization": f"Bearer {anon}"},
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        print(f"anon key REST check: HTTP {r.status}")
except Exception as exc:  # noqa: BLE001
    print(f"anon key REST check FAILED: {exc}")
