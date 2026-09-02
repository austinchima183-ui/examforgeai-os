#!/bin/bash
# Ω-19: Batch E2E runner — starts prod server, runs the given suites, exits.
# Usage: bash scripts/omega/e2e-batch.sh "00-landing 01-student-journey ..."
set -u
SUITES="${1:?usage: e2e-batch.sh 'suite1 suite2 ...'}"
BASE="${2:-http://localhost:3000}"
cd /home/z/my-project

# start server (dies with this invocation — by design)
NODE_OPTIONS="--max-old-space-size=1024" npx next start -p 3000 > /tmp/next-prod.log 2>&1 &
SERVER_PID=$!
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 http://localhost:3000/api/health 2>/dev/null || echo 000)
  [ "$code" = "200" ] && break
  sleep 1
done
if [ "${code:-000}" != "200" ]; then echo "FATAL: server not healthy"; kill $SERVER_PID 2>/dev/null; exit 1; fi
echo "[e2e-batch] server healthy (pid $SERVER_PID)"

TOTAL_PASS=0; TOTAL_FAIL=0
declare -A RESULTS
for suite in $SUITES; do
  log="/tmp/e2e-${suite}.log"
  if VERIFY_BASE="$BASE" npx playwright test "$suite" --project=desktop-chromium --reporter=list > "$log" 2>&1; then
    RESULTS[$suite]="PASS"
    p=$(grep -oE "[0-9]+ passed" "$log" | tail -1 | grep -oE "[0-9]+" || echo 0)
    TOTAL_PASS=$((TOTAL_PASS + ${p:-0}))
    echo "  ✓ $suite PASS ($p tests)"
  else
    RESULTS[$suite]="FAIL"
    f=$(grep -oE "[0-9]+ failed" "$log" | tail -1 | grep -oE "[0-9]+" || echo 0)
    TOTAL_FAIL=$((TOTAL_FAIL + ${f:-0}))
    echo "  ✗ $suite FAIL ($f failed) — tail:"
    tail -8 "$log" | sed 's/^/      /'
  fi
  sleep 2
done
kill $SERVER_PID 2>/dev/null || true

echo "======================================"
echo "BATCH RESULT: $TOTAL_PASS passed / $TOTAL_FAIL failed"
for s in $SUITES; do echo "  ${RESULTS[$s]}  $s"; done
mkdir -p /home/z/my-project/download/verification/omega-local
OUT=/home/z/my-project/download/verification/omega-local/e2e-batch-$(echo "$SUITES" | tr ' ' '-').txt
{ echo "base=$BASE timestamp=$(date -u +%FT%TZ)"; echo "passed=$TOTAL_PASS failed=$TOTAL_FAIL"; for s in $SUITES; do echo "${RESULTS[$s]} $s"; done; } > "$OUT"
[ "$TOTAL_FAIL" = "0" ]
