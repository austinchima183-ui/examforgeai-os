#!/usr/bin/env bash
# Apply the Supabase unification migration via Management API
set -e
REF="pzfnptrrnxkgodclyhft"
TOK="sbp_[REDACTED]"
SQL_FILE="/home/z/my-project/supabase/migrations/002_supabase_unification.sql"

python3 - "$SQL_FILE" << 'PYEOF'
import json, sys, urllib.request

sql = open(sys.argv[1]).read()
payload = json.dumps({"query": sql}).encode()
req = urllib.request.Request(
    "https://api.supabase.com/v1/projects/pzfnptrrnxkgodclyhft/database/query",
    method="POST", data=payload)
req.add_header("Authorization", "Bearer sbp_[REDACTED]")
req.add_header("Content-Type", "application/json")
try:
    with urllib.request.urlopen(req, timeout=120) as r:
        body = r.read().decode()
        print("SUCCESS:", body[:500] if body else "(no rows returned)")
except urllib.error.HTTPError as e:
    print(f"FAILED {e.code}:", e.read().decode(errors="replace")[:2000])
PYEOF
