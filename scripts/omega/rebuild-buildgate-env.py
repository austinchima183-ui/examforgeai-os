#!/usr/bin/env python3
"""Rebuild .env.local for the production build gate — full known-good var set.
Follows scripts/omega/rebuild-env-clean.py (RC1-certified template) except:
  - Supabase URL/anon extracted from the production client bundle (public by design)
  - webhook hash left empty (owner Vercel account not accessible this session)
Real server secrets minted format-valid non-live; build-time only. NEVER committed."""
import base64, hmac, hashlib, json, os, secrets

with open("/home/z/my-project/scripts/extracted-public-env.txt") as f:
    vals = dict(line.strip().split("=", 1) for line in f if "=" in line)

supabase_url = vals["NEXT_PUBLIC_SUPABASE_URL"]
anon = vals["NEXT_PUBLIC_SUPABASE_ANON_KEY"]

def b64(d):
    return base64.urlsafe_b64encode(d).decode().rstrip("=")

h = b64(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode())
p = b64(json.dumps({"iss": "supabase", "ref": "pzfnptrrnxkgodclyhft", "role": "service_role",
                    "iat": 1785200000, "exp": 2100800000}, separators=(",", ":")).encode())
svc = f"{h}.{p}." + b64(hmac.new(b"local-verification-only", f"{h}.{p}".encode(), hashlib.sha256).digest())

def gen(n=48):
    return base64.urlsafe_b64encode(secrets.token_bytes(n)).decode().rstrip("=")

# Preserve the stored VERCEL_TOKEN (custody) if present — NEVER hardcode secrets here.
_existing = {}
try:
    with open("/home/z/my-project/.env.local") as f:
        for line in f:
            if line.startswith("VERCEL_TOKEN="):
                _existing["VERCEL_TOKEN"] = line.strip().split("=", 1)[1]
except FileNotFoundError:
    pass

env = {
    **_existing,
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
    "FLUTTERWAVE_WEBHOOK_SECRET": "",
    "FLUTTERWAVE_WEBHOOK_HASH": "",
    "FLUTTERWAVE_WEBHOOK_SECRET_HASH": "",
    "SENTRY_AUTH_TOKEN": "",
    "NEXT_PUBLIC_SENTRY_DSN": "",
    "SENTRY_DSN": "",
    "E2E_BASE_URL": "http://localhost:3000",
}

lines = ["# Local production-build-gate env (auto-generated, GITIGNORED)"] + [f"{k}={v}" for k, v in env.items()]
path = "/home/z/my-project/.env.local"
with open(path, "w") as f:
    f.write("\n".join(lines) + "\n")
os.chmod(path, 0o600)
print(f"[+] wrote {len(env)} vars to {path} (mode 600)")
print(f"[+] url={bool(supabase_url)} anon_len={len(anon)} svc_len={len(svc)}")
