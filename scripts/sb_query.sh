#!/usr/bin/env bash
# Query Supabase DB via Management API (curl proven working)
set -e
REF="pzfnptrrnxkgodclyhft"
TOK="sbp_[REDACTED]"

q() {
  curl -s -X POST "https://api.supabase.com/v1/projects/${REF}/database/query" \
    -H "Authorization: Bearer ${TOK}" \
    -H "Content-Type: application/json" \
    -d "{\"query\": $(python3 -c "import json,sys; print(json.dumps(sys.argv[1]))" "$1")}" \
    --max-time 60
}

echo "=== PUBLIC TABLES ==="
q "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name;" > /home/z/my-project/audit/sb_tables.json
python3 -c "
import json
d = json.load(open('/home/z/my-project/audit/sb_tables.json'))
tables = [r['table_name'] for r in d]
print(f'count: {len(tables)}')
print(' '.join(tables))
"

echo ""
echo "=== PRISMA MODEL CHECK ==="
python3 -c "
import json
d = json.load(open('/home/z/my-project/audit/sb_tables.json'))
have = set(r['table_name'] for r in d)
models = ['schools','users','classes','subjects','class_students','class_teachers',
 'subject_teachers','parent_children','exams','exam_results','attendance','fees',
 'fee_payments','audit_logs','integrations','school_settings','messages',
 'role_permissions','notifications','lesson_plans','worksheets','rubrics',
 'exam_submissions','questions','exam_sessions','exam_session_answers',
 'exam_audit_events','tamper_events','offline_sync_queue']
missing = [m for m in models if m not in have]
present = [m for m in models if m in have]
print(f'present ({len(present)}): {\" \".join(present)}')
print(f'MISSING ({len(missing)}): {\" \".join(missing)}')
"

echo ""
echo "=== RPC FUNCTIONS COUNT ==="
q "SELECT routine_name FROM information_schema.routines WHERE routine_schema='public' AND routine_type='FUNCTION' ORDER BY routine_name;" > /home/z/my-project/audit/sb_functions.json
python3 -c "
import json
d = json.load(open('/home/z/my-project/audit/sb_functions.json'))
print(f'count: {len(d)}')
print(' '.join(r['routine_name'] for r in d))
"

echo ""
echo "=== RLS ENABLED TABLES COUNT ==="
q "SELECT count(*) as c FROM pg_tables WHERE schemaname='public' AND rowsecurity = true;"
echo ""
echo "=== AUTH USERS COUNT ==="
q "SELECT count(*) as c FROM auth.users;"
