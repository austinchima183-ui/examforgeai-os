#!/usr/bin/env python3
"""Apply SQL migration file statement-by-statement via Supabase Management API.
- Splits on ';' but preserves 'DO $$ ... $$' and 'CREATE FUNCTION ... $$ ... $$' blocks.
- Replaces 'profiles' with 'users' in policy USING clauses (live DB uses users, not profiles).
- Converts 'CREATE INDEX CONCURRENTLY' → 'CREATE INDEX' (can't run in transactions).
- Wraps 'CREATE TRIGGER' with DROP TRIGGER IF EXISTS first.
- Captures every statement outcome.
"""
import json, os, re, sys, time, urllib.request, urllib.error

PLAT = os.environ["SUPABASE_PLATFORM_KEY"]
REF = os.environ["SUPABASE_PROJECT_REF"]

def run_sql(stmt):
    body = json.dumps({"query": stmt}).encode()
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{REF}/database/query",
        data=body,
        headers={
            "Authorization": f"Bearer {PLAT}",
            "Content-Type": "application/json",
            "User-Agent": "examforge-audit/1.0 (principal-architect)",
            "Accept": "application/json",
        },
        method="POST")
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            text = r.read().decode()
            return r.status, text[:600]
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()[:600]
    except Exception as e:
        return -1, str(e)[:200]

def split_sql(sql):
    """Yield (stmt_str, is_dollar_block) tuples."""
    stmts = []
    i = 0
    cur = []
    while i < len(sql):
        line = sql[i:i+1]
        # Check if we're entering a $$ block
        if sql[i:i+2] == "$$":
            # find closing $$
            end = sql.find("$$", i+2)
            if end == -1:
                cur.append(sql[i:])
                i = len(sql)
            else:
                cur.append(sql[i:end+2])
                i = end + 2
        elif sql[i] == ';':
            stmt = ''.join(cur).strip()
            if stmt and not stmt.startswith('--'):
                stmts.append(stmt)
            cur = []
            i += 1
        else:
            cur.append(sql[i])
            i += 1
    stmt = ''.join(cur).strip()
    if stmt and not stmt.startswith('--'):
        stmts.append(stmt)
    return stmts

def adapt(stmt):
    """Apply safe adaptations for the live DB."""
    original = stmt
    notes = []
    # 1. profiles → users in policy USING clauses
    if 'profiles' in stmt and 'FROM profiles' in stmt:
        stmt = stmt.replace('FROM profiles WHERE user_id = auth.uid()', 'FROM users WHERE id = auth.uid()')
        notes.append('profiles→users')
    # 2. CREATE INDEX CONCURRENTLY → CREATE INDEX IF NOT EXISTS (already has IF NOT EXISTS usually)
    if re.search(r'CREATE INDEX CONCURRENTLY IF NOT EXISTS', stmt, re.I):
        stmt = re.sub(r'CREATE INDEX CONCURRENTLY IF NOT EXISTS', 'CREATE INDEX IF NOT EXISTS', stmt, flags=re.I)
        notes.append('CONCURRENTLY→regular')
    elif re.search(r'CREATE INDEX CONCURRENTLY', stmt, re.I):
        stmt = re.sub(r'CREATE INDEX CONCURRENTLY', 'CREATE INDEX IF NOT EXISTS', stmt, flags=re.I)
        notes.append('CONCURRENTLY→regular')
    # 3. CREATE TRIGGER → prepend DROP TRIGGER IF EXISTS
    m = re.search(r'CREATE\s+(?:OR\s+REPLACE\s+)?TRIGGER\s+(\w+)\s+BEFORE\s+UPDATE\s+ON\s+(\w+)', stmt, re.I)
    if m and 'CREATE OR REPLACE' not in stmt.upper():
        trig_name = m.group(1)
        table_name = m.group(2)
        stmt = f"DROP TRIGGER IF EXISTS {trig_name} ON public.{table_name};\n" + stmt
        notes.append(f'+DROP TRIGGER IF EXISTS {trig_name}')
    return stmt, notes

def main():
    sql_file = sys.argv[1]
    label = os.path.basename(sql_file)
    out_path = f"/home/z/my-project/audit/migration_{label}_result.json"
    sql = open(sql_file).read()
    # strip comment-only lines for splitting clarity but keep statements
    stmts = split_sql(sql)
    print(f"\n{'='*70}\nAPPLYING {label} ({len(stmts)} statements)\n{'='*70}")
    results = []
    ok = skip = fail = 0
    for i, s in enumerate(stmts, 1):
        adapted, notes = adapt(s)
        # If adapted contains multiple statements (DROP + CREATE), split again
        sub_stmts = split_sql(adapted) if 'DROP TRIGGER' in adapted else [adapted]
        for ss in sub_stmts:
            ss = ss.strip()
            if not ss: continue
            code, msg = run_sql(ss)
            head = ss[:80].replace('\n', ' ')
            status = 'OK'
            if code == 200:
                ok += 1
                if 'already exists' in msg.lower():
                    status = 'OK_EXISTS'
                    skip += 1
            elif code == 409 or 'already exists' in msg.lower():
                status = 'OK_EXISTS'; ok += 1; skip += 1
            else:
                status = 'FAIL'; fail += 1
            results.append({"stmt": head, "status": status, "code": code, "msg": msg[:200], "notes": notes})
            time.sleep(0.4)  # Cloudflare anti-bot throttle mitigation
            if status == 'FAIL':
                print(f"  [{i:3}] FAIL {head}")
                print(f"         → code {code}: {msg[:150]}")
            elif status == 'OK_EXISTS' and (i <= 5 or 'TRIGGER' in head.upper()):
                print(f"  [{i:3}] EXIST {head}")
        if i % 25 == 0: print(f"  ... {i}/{len(stmts)} processed")
    print(f"\nSummary: OK={ok} EXIST(OK)={skip} FAIL={fail}")
    with open(out_path, 'w') as f:
        json.dump({"file": label, "total": len(stmts), "ok": ok, "exist": skip, "fail": fail, "results": results}, f, indent=1)
    print(f"Saved: {out_path}")

if __name__ == "__main__":
    main()
