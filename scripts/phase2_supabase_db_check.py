#!/usr/bin/env python3
"""Query Supabase DB via Management API — list tables, compare with Prisma models."""
import json, urllib.request, urllib.error

REF = "pzfnptrrnxkgodclyhft"
TOKENS = [
    "[REDACTED]",  # new token from user
    "[REDACTED]",  # old platform key
]

def query_sql(sql):
    for tok in TOKENS:
        req = urllib.request.Request(
            f"https://api.supabase.com/v1/projects/{REF}/database/query",
            method="POST",
            data=json.dumps({"query": sql}).encode(),
        )
        req.add_header("Authorization", "Bearer " + tok)
        req.add_header("Content-Type", "application/json")
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read().decode()), tok[:12]
        except urllib.error.HTTPError as e:
            body = e.read().decode(errors="replace")[:200]
            if e.code == 401 or e.code == 403:
                continue
            return {"error": body, "code": e.code}, tok[:12]
        except Exception as e:
            return {"error": str(e)}, tok[:12]
    return {"error": "all tokens failed"}, "none"

# 1. List public tables
res, tok = query_sql("""
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;
""")
print(f"token used: {tok}")
if "error" in res:
    print("ERROR:", json.dumps(res)[:500])
else:
    tables = [r["table_name"] for r in res]
    print(f"PUBLIC TABLES: {len(tables)}")
    print(json.dumps(tables, indent=0))

# 2. Check Prisma model equivalents (snake_case)
PRISMA_MODELS = ["schools","users","classes","subjects","class_students","class_teachers",
    "subject_teachers","parent_children","exams","exam_results","attendance","fees",
    "fee_payments","audit_logs","integrations","school_settings","messages",
    "role_permissions","notifications","lesson_plans","worksheets","rubrics",
    "exam_submissions","questions","exam_sessions","exam_session_answers",
    "exam_audit_events","tamper_events","offline_sync_queue"]
if "error" not in res:
    have = set(tables)
    print("\n=== PRISMA MODEL → SUPABASE TABLE CHECK ===")
    missing = []
    for m in PRISMA_MODELS:
        status = "EXISTS" if m in have else "MISSING"
        if m not in have:
            missing.append(m)
        print(f"  {m}: {status}")
    print(f"\nMISSING: {missing}")

# 3. Count RPC functions
res2, _ = query_sql("""
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'
ORDER BY routine_name;
""")
if "error" not in res2:
    print(f"\nRPC FUNCTIONS: {len(res2)}")
