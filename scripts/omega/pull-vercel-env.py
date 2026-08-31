#!/usr/bin/env python3
"""Pull production env vars from Vercel and write a local .env.local for dev parity.
Only pulls values needed for local verification. Never prints secrets to stdout."""
import json
import os
import urllib.request
import urllib.error

VT = os.environ.get("VERCEL_TOKEN", "")  # never commit real tokens (push-protection)
PROJECT = "prj_rp5aHw3B3t4kcDGo48AWtQJmcERF"
API = "https://api.vercel.com/v10/projects"


def api(path):
    req = urllib.request.Request(f"{API}{path}", headers={"Authorization": f"Bearer {VT}"})
    with urllib.request.urlopen(req) as r:
        return json.load(r)


def main():
    envs = api(f"/{PROJECT}/env?decryptLimit=100").get("envs", [])
    print(f"total envs in project: {len(envs)}")
    out = {}
    for e in envs:
        key = e["key"]
        eid = e["id"]
        target = e.get("target", [])
        try:
            detail = api(f"/{PROJECT}/env/{eid}?decryptLimit=1")
            val = detail.get("decryptedValue") or detail.get("value") or ""
        except urllib.error.HTTPError as exc:
            val = ""
            print(f"  {key:40s} DECRYPT FAILED HTTP {exc.code}")
        out[key] = {"value": val, "target": target}
        print(f"  {key:40s} len={len(val):6d} target={target}")

    # Write .env.local with production + preview values (never commit; gitignored)
    keys = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY",
            "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_APP_URL",
            "SESSION_TOKEN_SECRET", "CSRF_SECRET", "ENCRYPTION_KEY",
            "RESEND_API_KEY", "FLUTTERWAVE_PUBLIC_KEY", "FLUTTERWAVE_SECRET_KEY",
            "OPENAI_API_KEY", "GEMINI_API_KEY", "SENTRY_DSN",
            "NEXT_PUBLIC_SENTRY_DSN", "SENTRY_AUTH_TOKEN", "CRON_SECRET",
            "MARKETPLACE_WEBHOOK_SECRET", "BILLING_WEBHOOK_SECRET"]
    lines = []
    for k in keys:
        if k in out and out[k]["value"]:
            lines.append(f"{k}={out[k]['value']}")
    # also dump any other NEXT_PUBLIC_* keys present
    for k, v in out.items():
        if k.startswith("NEXT_PUBLIC_") and k not in keys and v["value"]:
            lines.append(f"{k}={v['value']}")
    with open("/home/z/my-project/.env.local", "w") as f:
        f.write("\n".join(lines) + "\n")
        os.chmod("/home/z/my-project/.env.local", 0o600)
    print(f"\nwrote .env.local with {len(lines)} keys")


if __name__ == "__main__":
    main()
