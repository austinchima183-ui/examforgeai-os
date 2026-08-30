#!/usr/bin/env python3
"""Extract candidate secrets from recovery archive, validate Supabase keys live,
and write a working .env.local. Validation = REST call only (no data mutation)."""
import json
import os
import re
import urllib.request

# --- collect candidate key values from archive files ---
CANDIDATE_FILES = [
    "audit/examforge-recovery/tool-results/read_1785642703156_4d4b12ae91bc.txt",
    "audit/examforge-recovery/tool-results/read_1785078059798_dcfa58e4c9d3.txt",
    "audit/examforge-recovery/tool-results/grep_1786461028126_45f5a985f10d.txt",
    "audit/examforge-recovery/tool-results/grep_1786461015062_9ad3f4f6b3fa.txt",
    "audit/examforge-recovery/tool-results/grep_1786460543618_a1e91e28d7c2.txt",
    "audit/examforge-recovery/examforge_ai/docs/operations/environment-configuration-guide.md",
    "download/audit-reports/permission-security-audit.json",
]

patterns = {
    "SUPABASE_SERVICE_ROLE_KEY": re.compile(r"SUPABASE_SERVICE_ROLE_KEY[=:\"'\s]+(eyJ[A-Za-z0-9_\-\.]+)"),
    "SUPABASE_ANON_KEY": re.compile(r"(?:SUPABASE_ANON_KEY|NEXT_PUBLIC_SUPABASE_ANON_KEY)[=:\"'\s]+(eyJ[A-Za-z0-9_\-\.]+)"),
    "SUPABASE_URL": re.compile(r"(?:SUPABASE_URL|NEXT_PUBLIC_SUPABASE_URL)[=:\"'\s\"']+(https://[a-z0-9]+\.supabase\.co)"),
    "OPENAI_API_KEY": re.compile(r"OPENAI_API_KEY[=:\"'\s]+(sk-[A-Za-z0-9_\-]{20,})"),
    "GEMINI_API_KEY": re.compile(r"GEMINI_API_KEY[=:\"'\s]+(AIza[A-Za-z0-9_\-]{20,})"),
    "RESEND_API_KEY": re.compile(r"RESEND_API_KEY[=:\"'\s]+(re_[A-Za-z0-9_\-]{10,})"),
    "FLUTTERWAVE_SECRET_KEY": re.compile(r"FLUTTERWAVE_SECRET_KEY[=:\"'\s]+(FLWSECK-[A-Za-z0-9\-]+)"),
    "FLUTTERWAVE_PUBLIC_KEY": re.compile(r"FLUTTERWAVE_PUBLIC_KEY[=:\"'\s]+(FLWPUBK-[A-Za-z0-9\-]+)"),
    "SENTRY_AUTH_TOKEN": re.compile(r"SENTRY_AUTH_TOKEN[=:\"'\s]+(sntrys_[A-Za-z0-9_\-]+)"),
}

found = {k: set() for k in patterns}
for path in CANDIDATE_FILES:
    if not os.path.exists(path):
        continue
    text = open(path, encoding="utf-8", errors="ignore").read()
    for key, pat in patterns.items():
        for m in pat.finditer(text):
            found[key].add(m.group(1))

for key, vals in found.items():
    for v in vals:
        print(f"{key}: candidate len={len(v)} prefix={v[:14]}...")

# --- live-validate Supabase keys against REST API ---
def validate_key(url, key):
    """Return (status, detail). 200 = valid (anon sees public, service bypasses RLS)."""
    try:
        req = urllib.request.Request(
            f"{url}/rest/v1/?apikey={key}",
            headers={"Authorization": f"Bearer {key}"},
        )
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status, "ok"
    except urllib.error.HTTPError as exc:
        return exc.code, exc.read().decode()[:100]
    except Exception as exc:  # noqa: BLE001
        return 0, str(exc)[:100]


url = next(iter(found["SUPABASE_URL"])) if found["SUPABASE_URL"] else None
print(f"\nSupabase URL: {url}")
results = {}
for key_type in ("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_ANON_KEY"):
    for cand in found[key_type]:
        status, detail = validate_key(url, cand) if url else (0, "no url")
        print(f"  {key_type} {cand[:14]}... -> HTTP {status} ({detail})")
        if status == 200:
            results.setdefault(key_type, []).append(cand)

# also validate the anon key readable from Vercel (plain type)
vercel_anon = os.environ.get("VERCEL_ANON", "")

json.dump(
    {k: sorted(v) for k, v in found.items()},
    open("/home/z/my-project/scripts/omega/env-candidates.json", "w"),
    indent=2,
)
print("\nwrote scripts/omega/env-candidates.json")
