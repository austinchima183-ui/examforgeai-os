#!/usr/bin/env bash
# Ω-5 Lighthouse runner — runs Lighthouse against a URL and extracts scores + key metrics.
# Usage: lh-run.sh <url> <outfile.json> [preset]
set -u
URL="$1"; OUT="$2"; PRESET="${3:-mobile}"
TMP=$(mktemp -d)
FLAGS="--output=json --output-path=$OUT --chrome-flags='--headless=new --no-sandbox --disable-dev-shm-usage' --quiet"
if [ "$PRESET" = "desktop" ]; then
  eval lighthouse "$URL" --preset=desktop --output=json --output-path="$OUT" --chrome-flags="--headless=new --no-sandbox --disable-dev-shm-usage" --quiet
else
  eval lighthouse "$URL" --output=json --output-path="$OUT" --chrome-flags="--headless=new --no-sandbox --disable-dev-shm-usage" --quiet --form-factor=mobile --screenEmulation.mobile --screenEmulation.width=412 --screenEmulation.height=823 --screenEmulation.deviceScaleFactor=1.75 --cpuThrottling=4 --networkThrottling.kbps=10240 --networkThrottling.requestLatencyMs=40
fi
python3 - "$OUT" <<'PYEOF'
import json, sys
d = json.load(open(sys.argv[1]))
cats = d.get('categories', {})
scores = {k.upper()[:4]: round((v.get('score') or 0)*100) for k, v in cats.items() if isinstance(v, dict)}
a = d.get('audits', {})
m = {}
for k in ['first-contentful-paint','largest-contentful-paint','total-blocking-time','cumulative-layout-shift','speed-index','interactive','server-response-time']:
    if k in a and a[k].get('numericValue') is not None:
        m[k] = round(a[k]['numericValue'])
print(json.dumps({'url': d.get('finalUrl'), 'scores': scores, 'metrics': m}, indent=1))
PYEOF
