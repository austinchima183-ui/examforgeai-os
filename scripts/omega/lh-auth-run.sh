#!/usr/bin/env bash
# Ω-5: Run Lighthouse on an AUTHENTICATED page using the extracted Supabase cookie.
# Usage: lh-auth-run.sh <role> <path> <outfile>
set -u
ROLE="$1"; PATH_="$2"; OUT="$3"
BASE="${BASE_URL:-http://localhost:3000}"
COOKIE=$(cat "/home/z/my-project/scripts/omega/.cookies/${ROLE}.txt")
export CHROME_PATH="$HOME/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome"
lighthouse "${BASE}${PATH_}" \
  --extra-headers "{\"Cookie\": $(python3 -c "import json,sys; print(json.dumps(sys.argv[1]))" "$COOKIE")}" \
  --disable-storage-reset \
  --output=json --output-path="$OUT" \
  --chrome-flags="--headless=new --no-sandbox --disable-dev-shm-usage" \
  --quiet --max-wait-for-load=90000 2>/dev/null
python3 - "$OUT" "$ROLE" "$PATH_" <<'PYEOF'
import json, sys
d = json.load(open(sys.argv[1]))
cats = d.get('categories', {})
scores = {k.upper()[:4]: round((v.get('score') or 0)*100) for k, v in cats.items() if isinstance(v, dict)}
a = d.get('audits', {})
m = {k: round(a[k]['numericValue']) for k in ['first-contentful-paint','largest-contentful-paint','total-blocking-time','speed-index','interactive'] if k in a and a[k].get('numericValue') is not None}
final = d.get('finalDisplayedUrl','')
print(json.dumps({'role': sys.argv[2], 'page': sys.argv[3], 'finalUrl': final, 'scores': scores, 'metrics': m}, indent=1))
# warn if redirected to login (auth failed)
if '/login' in final or '/login' in (d.get('requestedUrl') or ''):
    print('WARNING: redirected to login — auth may have failed')
PYEOF
