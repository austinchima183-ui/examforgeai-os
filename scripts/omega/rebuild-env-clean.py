#!/usr/bin/env python3
"""Rebuild a clean, complete .env.local for local production-mode verification.
Real values: Supabase URL/anon/webhook (readable from Vercel), fresh app secrets.
Local-verification placeholders (format-valid): Flutterwave/AI/email keys —
real values live only in Vercel sensitive storage (non-decryptable by design)."""
import base64
import json
import os
import re
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
    try:
        detail = api(f"/{PROJECT}/env/{eid}" if (eid := e["id"]) else None)
        values[e["key"]] = detail.get("decryptedValue") or detail.get("value") or ""
    except Exception:  # noqa: BLE001
        values[e["key"]] = ""

def pick(*names):
    for n in names:
        if values.get(n):
            return values[n]
    return ""

def gen(n=48):
    return base64.urlsafe_b64encode(secrets.token_bytes(n)).decode().rstrip("=")

supabase_url = pick("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL")
anon = pick("SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY")
webhook_hash = pick("FLUTTERWAVE_WEBHOOK_HASH", "FLUTTERWAVE_WEBHOOK_SECRET")
dsn = pick("SENTRY_DSN", "NEXT_PUBLIC_SENTRY_DSN")

# local-verification service key (well-formed JWT, deliberately invalid signature —
# Supabase rejects it on actual use; passes env validator format checks)
import hmac, hashlib
def b64(d): return base64.urlsafe_b64encode(d).decode().rstrip("=")
h = b64(json.dumps({"alg":"HS256","typ":"JWT"}, separators=(",",":")).encode())
p = b64(json.dumps({"iss":"supabase","ref":"pzfnptrrnxkgodclyhft","role":"service_role",
                    "iat":1785200000,"exp":2100800000}, separators=(",",":")).encode())
svc = f"{h}.{p}." + b64(hmac.new(b"local-verification-only", f"{h}.{p}".encode(), hashlib.sha256).digest())

env = {
    "NEXT_PUBLIC_SUPABASE_URL": supabase_url,
    "SUPABASE_URL": supabase_url,
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": anon,
    "SUPABASE_ANON_KEY": anon,
    "SUPABASE_SERVICE_ROLE_KEY": svc,
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

lines = ["# Local production-mode verification env (auto-generated)"] + [f"{k}={v}" for k, v in env.items()]
with open("/home/z/my-project/.env.local", "w") as f:
    f.write("\n".join(lines) + "\n")
os.chmod("/home/z/my-project/.env.local", 0o600)
empty = [k for k, v in env.items() if not v and k not in ("SUPABASE_PLATFORM_KEY", "SENTRY_AUTH_TOKEN", "NEXT_PUBLIC_SENTRY_DSN", "SENTRY_DSN")]
print(f"written {len(env)} vars; empty (expected): {empty or 'none'}")
print(f"supabase_url={bool(supabase_url)} anon={len(anon)} webhook_hash={bool(webhook_hash)}")
