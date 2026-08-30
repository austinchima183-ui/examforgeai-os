#!/usr/bin/env python3
"""Apply migration 004 (question ownership + AI tracking) via Supabase Management API."""
import json, os, sys, urllib.request, urllib.error

# Load env
env = {}
with open('/home/z/my-project/.env.local') as f:
    for line in f:
        line = line.strip()
        if '=' in line and not line.startswith('#'):
            k, v = line.split('=', 1)
            # strip trailing comments (only when outside quotes)
            if v.startswith('"'):
                endq = v.find('"', 1)
                if endq > 0:
                    v = v[1:endq]
            elif v.startswith("'"):
                endq = v.find("'", 1)
                if endq > 0:
                    v = v[1:endq]
            else:
                v = v.split('#')[0]
            v = v.strip()
            env[k] = v

PLAT = env.get('SUPABASE_PLATFORM_KEY')
REF = env.get('SUPABASE_PROJECT_REF', 'pzfnptrrnxkgodclyhft')

if not PLAT:
    print("ERROR: SUPABASE_PLATFORM_KEY not in env")
    sys.exit(1)

SQL_FILE = '/home/z/my-project/supabase/migrations/004_question_ownership_ai_tracking.sql'
sql = open(SQL_FILE).read()

# Execute statement-by-statement for precise error reporting
# (the DO $$ ... $$ block must stay intact)
statements = []
i = 0
cur = []
while i < len(sql):
    ch = sql[i]
    if sql[i:i+2] == '$$':
        end = sql.find('$$', i+2)
        if end == -1:
            cur.append(sql[i:]); i = len(sql)
        else:
            cur.append(sql[i:end+2]); i = end + 2
        continue
    if ch == ';':
        # don't split on ';' inside $$ blocks (already handled) or comments
        stmt = ''.join(cur).strip()
        # skip pure comments
        lines = [l for l in stmt.split('\n') if l.strip() and not l.strip().startswith('--')]
        if lines:
            statements.append(stmt)
        cur = []
    else:
        cur.append(ch)
    i += 1
tail = ''.join(cur).strip()
if tail:
    statements.append(tail)

print(f"Applying {len(statements)} statements to project {REF}...")
failures = 0
for idx, stmt in enumerate(statements, 1):
    first_line = next((l for l in stmt.split('\n') if l.strip() and not l.strip().startswith('--')), '')[:80]
    body = json.dumps({"query": stmt}).encode()
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{REF}/database/query",
        data=body, method="POST")
    req.add_header("Authorization", f"Bearer {PLAT}")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            r.read()
        print(f"  [{idx}/{len(statements)}] OK: {first_line}")
    except urllib.error.HTTPError as e:
        err = e.read().decode(errors='replace')[:300]
        print(f"  [{idx}/{len(statements)}] FAIL: {first_line}\n      {err}")
        failures += 1
    except Exception as e:
        print(f"  [{idx}/{len(statements)}] EXCEPTION: {e}")
        failures += 1

print(f"\n{'MIGRATION 004 APPLIED' if failures == 0 else f'{failures} STATEMENTS FAILED'}")
sys.exit(1 if failures else 0)
