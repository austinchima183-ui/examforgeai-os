#!/usr/bin/env bash
# Ω-5: Full Lighthouse evidence matrix — all roles × key pages × both presets
# Produces download/verification/lighthouse/omega5-matrix.json
set -u
cd /home/z/my-project
export CHROME_PATH="$HOME/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome"
OUTDIR="download/verification/lighthouse"
mkdir -p "$OUTDIR"
BASE="${BASE_URL:-http://localhost:3000}"

run() { # role path name preset
  local role="$1" path="$2" name="$3" preset="$4"
  local -a args=()
  if [ "$role" != "anon" ]; then
    local cookie; cookie=$(cat "/home/z/my-project/scripts/omega/.cookies/${role}.txt")
    local hdr; hdr=$(python3 -c "import json,sys; print(json.dumps({'Cookie': sys.argv[1]}))" "$cookie")
    args+=(--extra-headers "$hdr" --disable-storage-reset)
  fi
  if [ "$preset" = "desktop" ]; then args+=(--preset=desktop); fi
  local out="$OUTDIR/omega5-${name}-${preset}.json"
  timeout 240 lighthouse "${BASE}${path}" "${args[@]}" \
    --output=json --output-path="$out" \
    --chrome-flags="--headless=new --no-sandbox --disable-dev-shm-usage" \
    --quiet --max-wait-for-load=90000 2>/dev/null
  python3 - "$out" "$name" "$preset" "$path" <<'PYEOF'
import json, sys
try:
    d = json.load(open(sys.argv[1]))
except Exception:
    print(json.dumps({'name': sys.argv[2], 'preset': sys.argv[3], 'error': 'no output'})); sys.exit(0)
cats = d.get('categories', {})
scores = {k.upper()[:4]: round((v.get('score') or 0)*100) for k, v in cats.items() if isinstance(v, dict)}
a = d.get('audits', {})
m = {k: round(a[k]['numericValue']) for k in ['first-contentful-paint','largest-contentful-paint','total-blocking-time','speed-index','interactive'] if k in a and a[k].get('numericValue') is not None}
print(json.dumps({'name': sys.argv[2], 'preset': sys.argv[3], 'path': sys.argv[4], 'scores': scores, 'metrics': m}))
PYEOF
}

{
run anon / landing mobile
run anon /login login mobile
run student /dashboard/student student-dash mobile
run teacher /dashboard/teacher teacher-dash mobile
run parent /parent/dashboard parent-dash mobile
run school_admin /dashboard/school-admin schooladmin-dash mobile
run super_admin /dashboard/super-admin superadmin-dash mobile
run anon / landing desktop
run anon /login login desktop
run student /dashboard/student student-dash desktop
run teacher /dashboard/teacher teacher-dash desktop
run parent /parent/dashboard parent-dash desktop
run school_admin /dashboard/school-admin schooladmin-dash desktop
run super_admin /dashboard/super-admin superadmin-dash desktop
} | tee "$OUTDIR/omega5-matrix-raw.txt"

python3 - "$OUTDIR/omega5-matrix-raw.txt" "$OUTDIR/omega5-matrix.json" <<'PYEOF'
import json, sys
rows = []
for line in open(sys.argv[1]):
    line = line.strip()
    if line.startswith('{'):
        try: rows.append(json.loads(line))
        except Exception: pass
json.dump({'generatedAt': __import__('datetime').datetime.utcnow().isoformat()+'Z', 'runs': rows}, open(sys.argv[2], 'w'), indent=1)
print(f"matrix saved: {len(rows)} runs -> {sys.argv[2]}")
PYEOF
