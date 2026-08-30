#!/usr/bin/env python3
"""Restore .env.local by decrypting env vars from the Vercel project.

Writes /home/z/my-project/.env.local with both canonical names and
NEXT_PUBLIC_* aliases used by the codebase. Secrets never printed to stdout.
"""
import json
import os
import sys
import urllib.request

VT = os.environ.get("VERCEL_TOKEN", "").strip()
PROJECT = "prj_rp5aHw3B3t4kcDGo48AWtQJmcERF"
API = "https://api.vercel.com/v10/projects"

if not VT:
    print("VERCEL_TOKEN env var required")
    sys.exit(1)


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
    except Exception as exc:  # noqa: BLE001
        print(f"WARN could not decrypt {e['key']}: {exc}", file=sys.stderr)
        val = ""
    values[e["key"]] = val

# Compose .env.local. Canonical + aliases used in code.
lines = [
    "# Restored from Vercel project examforge-ai (auto-generated)",
    f"NEXT_PUBLIC_SUPABASE_URL={values.get('SUPABASE_URL', values.get('NEXT_PUBLIC_SUPABASE_URL', ''))}",
    f"NEXT_PUBLIC_SUPABASE_ANON_KEY={values.get('SUPABASE_ANON_KEY', values.get('NEXT_PUBLIC_SUPABASE_ANON_KEY', ''))}",
    f"SUPABASE_SERVICE_ROLE_KEY={values.get('SUPABASE_SERVICE_ROLE_KEY', '')}",
    f"SUPABASE_PLATFORM_KEY={values.get('SUPABASE_PLATFORM_KEY', '')}",
    f"NEXT_PUBLIC_APP_URL={values.get('NEXT_PUBLIC_APP_URL', 'https://web-alpha-bay-87.vercel.app')}",
    f"SESSION_TOKEN_SECRET={values.get('SESSION_TOKEN_SECRET', '')}",
    f"CSRF_SECRET={values.get('CSRF_SECRET', '')}",
    f"ENCRYPTION_KEY={values.get('ENCRYPTION_KEY', '')}",
    f"NEXTAUTH_SECRET={values.get('NEXTAUTH_SECRET', '')}",
    f"RESEND_API_KEY={values.get('RESEND_API_KEY', '')}",
    f"OPENAI_API_KEY={values.get('OPENAI_API_KEY', '')}",
    f"GEMINI_API_KEY={values.get('GEMINI_API_KEY', '')}",
    f"FLUTTERWAVE_PUBLIC_KEY={values.get('FLUTTERWAVE_PUBLIC_KEY', '')}",
    f"FLUTTERWAVE_SECRET_KEY={values.get('FLUTTERWAVE_SECRET_KEY', '')}",
    f"FLUTTERWAVE_WEBHOOK_SECRET={values.get('FLUTTERWAVE_WEBHOOK_SECRET', '')}",
    f"FLUTTERWAVE_WEBHOOK_HASH={values.get('FLUTTERWAVE_WEBHOOK_HASH', '')}",
    f"FLUTTERWAVE_WEBHOOK_SECRET_HASH={values.get('FLUTTERWAVE_WEBHOOK_SECRET_HASH', '')}",
    f"SENTRY_AUTH_TOKEN={values.get('SENTRY_AUTH_TOKEN', '')}",
    f"NEXT_PUBLIC_SENTRY_DSN={values.get('NEXT_PUBLIC_SENTRY_DSN', '')}",
    f"SENTRY_DSN={values.get('SENTRY_DSN', '')}",
]
out = "\n".join(lines) + "\n"
missing = [k for k, v in values.items() if not v and k not in ("NEXT_PUBLIC_SENTRY_DSN",)]
with open("/home/z/my-project/.env.local", "w") as f:
    f.write(out)
os.chmod("/home/z/my-project/.env.local", 0o600)
filled = sum(1 for k, v in values.items() if v)
print(f"restored {filled}/{len(envs)} values; missing: {missing or 'none'}")
