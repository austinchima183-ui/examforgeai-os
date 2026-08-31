#!/usr/bin/env python3
"""OMEGA AUDIT: Probe every table referenced in code against the live Supabase DB.
Produces a definitive schema drift report."""
import json
import re
import subprocess
import urllib.request
from pathlib import Path

ROOT = Path("/home/z/my-project")
env = {}
for line in (ROOT / ".env.local").read_text().splitlines():
    if "=" in line:
        k, v = line.split("=", 1)
        env[k] = v

URL = env["NEXT_PUBLIC_SUPABASE_URL"]
KEY = env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]

# 1. Extract all table names from .from('...') calls
out = subprocess.run(
    ["grep", "-rhoE", r"\.from\(['\"][a-z_]+['\"]\)", "src/", "--include=*.ts", "--include=*.tsx"],
    cwd=ROOT, capture_output=True, text=True
).stdout
tables = sorted(set(re.findall(r"['\"]([a-z_]+)['\"]", out)))

print(f"Tables referenced in code: {len(tables)}")

# 2. Probe each
def probe(table):
    req = urllib.request.Request(
        f"{URL}/rest/v1/{table}?select=*&limit=1",
        headers={"apikey": KEY}
    )
    try:
        urllib.request.urlopen(req, timeout=10)
        return "exists"
    except urllib.error.HTTPError as e:
        return "missing" if e.code == 404 else f"error-{e.code}"
    except Exception as e:
        return f"error"

missing, errors = [], []
for t in tables:
    status = probe(t)
    if status == "missing":
        missing.append(t)
    elif status != "exists":
        errors.append((t, status))

print(f"\n=== MISSING TABLES ({len(missing)}) ===")
for t in missing:
    print(f"  ✗ {t}")
print(f"\n=== PROBE ERRORS ({len(errors)}) ===")
for t, s in errors:
    print(f"  ? {t} → {s}")

report = {
    "total_referenced": len(tables),
    "missing": missing,
    "errors": errors,
    "existing_count": len(tables) - len(missing) - len(errors),
}
(ROOT / "download/verification/audit").mkdir(parents=True, exist_ok=True)
(ROOT / "download/verification/audit/schema-drift.json").write_text(json.dumps(report, indent=2))
print(f"\nReport saved. Existing: {report['existing_count']}, Missing: {len(missing)}")
