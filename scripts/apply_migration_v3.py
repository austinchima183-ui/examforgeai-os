#!/usr/bin/env python3
"""Lean migration applier: send entire SQL file as ONE multi-statement query.
On failure, fall back to a single retry with detailed error captured.
"""
import json, os, re, sys, time, urllib.request, urllib.error

PLAT = os.environ["SUPABASE_PLATFORM_KEY"]
REF = os.environ["SUPABASE_PROJECT_REF"]
HDR = {"Authorization": f"Bearer {PLAT}", "Content-Type": "application/json",
       "User-Agent": "examforge-audit/1.0", "Accept": "application/json"}

def run_query(sql):
    body = json.dumps({"query": sql}).encode()
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{REF}/database/query",
        data=body, headers=HDR, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            r.read()
            return True, None
    except urllib.error.HTTPError as e:
        return False, f"{e.code}: {e.read().decode()[:400]}"
    except Exception as e:
        return False, str(e)[:200]

def adapt(sql):
    sql = sql.replace('FROM profiles WHERE user_id = auth.uid()', 'FROM users WHERE id = auth.uid()')
    sql = re.sub(r'\bCREATE INDEX CONCURRENTLY IF NOT EXISTS\b', 'CREATE INDEX IF NOT EXISTS', sql, flags=re.I)
    sql = re.sub(r'\bCREATE INDEX CONCURRENTLY\b', 'CREATE INDEX IF NOT EXISTS', sql, flags=re.I)
    # Add DROP TRIGGER IF EXISTS before each CREATE TRIGGER
    triggers = re.findall(r'CREATE\s+(?:OR\s+REPLACE\s+)?TRIGGER\s+(\w+)\s+BEFORE\s+UPDATE\s+ON\s+public\.(\w+)', sql, re.I)
    for tn, tbl in triggers:
        sql = sql.replace(f'CREATE TRIGGER {tn}', f'DROP TRIGGER IF EXISTS {tn} ON public.{tbl}; CREATE TRIGGER {tn}', 1)
    return sql

def split_sql(sql):
    stmts, i, cur = [], 0, []
    while i < len(sql):
        if sql[i:i+2] == "$$":
            end = sql.find("$$", i+2)
            if end == -1: cur.append(sql[i:]); i = len(sql)
            else: cur.append(sql[i:end+2]); i = end + 2
        elif sql[i] == ';':
            s = ''.join(cur).strip()
            if s: stmts.append(s)
            cur = []; i += 1
        else:
            cur.append(sql[i]); i += 1
    s = ''.join(cur).strip()
    if s: stmts.append(s)
    return stmts

SKIP_PATTERNS = [
    r'\bON\s+(public\.)?questions\b',
    r'\bON\s+(public\.)?audit_logs\b',
    r'\bON\s+(public\.)?attendance\b',
    r'\bON\s+(public\.)?fees\b',
    r'\bON\s+(public\.)?fee_payments\b',
    r'\bidx_exam_sessions_school_created\b',
    r'\bidx_exam_sessions_score\b',
    r'\bidx_exam_sessions_student_status\b',
    r'\bidx_marketplace_products_status_category\b',
    r'\bidx_topics_parent\b',
    r'\bidx_marketplace_purchases_user\b',
    r'\bidx_marketplace_reviews_user\b',
    r'\bidx_invoices_org_created\b',
]

def main():
    path = sys.argv[1]
    label = os.path.basename(path)
    sql = open(path).read()
    # strip pure comments
    sql = '\n'.join(l for l in sql.split('\n') if not l.strip().startswith('--'))
    sql = adapt(sql)
    stmts = split_sql(sql)
    filtered = [s for s in stmts if not any(re.search(p, s, re.I) for p in SKIP_PATTERNS)]
    skipped = [s[:80] for s in stmts if any(re.search(p, s, re.I) for p in SKIP_PATTERNS)]
    print(f"=== {label}: {len(stmts)} stmts, applying {len(filtered)}, skipping {len(skipped)} ===")
    # Send entire filtered SQL as ONE query (multi-statement)
    full_sql = ";\n".join(filtered)
    ok, err = run_query(full_sql)
    if ok:
        print(f"  ✓ Applied all {len(filtered)} statements in one batch")
        result = {"file": label, "applied": len(filtered), "skipped": len(skipped), "failed": 0, "errors": []}
    else:
        # Failure — try per-chunk to find what works
        print(f"  ✗ Bulk failed: {err[:200]}")
        print(f"  Retrying in chunks of 15...")
        CHUNK = 15
        chunks = [filtered[i:i+CHUNK] for i in range(0, len(filtered), CHUNK)]
        ok_n = 0; failed_stmts = []
        for ci, chunk in enumerate(chunks, 1):
            chunk_sql = ";\n".join(chunk)
            ok_chunk, echunk = run_query(chunk_sql)
            time.sleep(0.3)
            if ok_chunk:
                ok_n += len(chunk)
                print(f"  chunk {ci}/{len(chunks)}: OK ({len(chunk)})")
            else:
                # Per-statement retry
                for s in chunk:
                    sok, se = run_query(s)
                    time.sleep(0.2)
                    if sok: ok_n += 1
                    else: failed_stmts.append({"stmt": s[:120], "err": se[:200]})
        result = {"file": label, "applied": ok_n, "skipped": len(skipped), "failed": len(failed_stmts), "errors": failed_stmts}
        print(f"  Applied: {ok_n}, Failed: {len(failed_stmts)}")
    # Reload schema cache
    run_query("NOTIFY pgrst, 'reload schema';")
    print("  PostgREST schema cache reloaded")
    with open(f"/home/z/my-project/audit/migration_{label}_result.json", 'w') as f:
        json.dump(result, f, indent=1)
    print(f"Saved: migration_{label}_result.json")

if __name__ == "__main__":
    main()
