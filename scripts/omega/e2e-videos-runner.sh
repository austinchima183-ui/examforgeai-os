#!/bin/bash
# Ω-9: Per-suite E2E runner WITH VIDEO PRESERVATION
# Each suite's artifacts (videos) are moved to a per-suite directory before
# the next invocation cleans the outputDir.
set -u
BASE="${1:-http://localhost:3000}"
cd /home/z/my-project

SUITES=(
  "00-landing"
  "01-student-journey"
  "02-teacher-journey"
  "03-parent-journey"
  "04-school-admin-journey"
  "05-super-admin-journey"
  "06-rbac-matrix"
  "07-cbt-flow"
  "08-ai-api"
  "09-widget-system"
  "10-advanced-ux"
)

ART="download/verification/omega-local/e2e-videos"
rm -rf "$ART"; mkdir -p "$ART"
OUT="download/verification/test-artifacts"
declare -A RESULTS
TOTAL_PASS=0; TOTAL_FAIL=0

for suite in "${SUITES[@]}"; do
  echo ">>> SUITE: $suite"
  rm -rf "$OUT"; mkdir -p "$OUT"
  log="/tmp/e2e-${suite}.log"
  if VERIFY_BASE="$BASE" npx playwright test "$suite" --project=desktop-chromium --reporter=list > "$log" 2>&1; then
    RESULTS[$suite]="PASS"
    p=$(grep -oE "[0-9]+ passed" "$log" | tail -1 | grep -oE "[0-9]+" || echo "?")
    TOTAL_PASS=$((TOTAL_PASS + ${p:-0}))
    echo "    PASS ($p tests)"
  else
    RESULTS[$suite]="FAIL"
    f=$(grep -oE "[0-9]+ failed" "$log" | tail -1 | grep -oE "[0-9]+" || echo "?")
    TOTAL_FAIL=$((TOTAL_FAIL + ${f:-0}))
    echo "    FAIL ($f failed)"; tail -8 "$log" | sed 's/^/      /'
  fi
  # preserve this suite's videos before the next run cleans outputDir
  mkdir -p "$ART/$suite"
  find "$OUT" -name "video.webm" | while read -r v; do
    testdir=$(basename "$(dirname "$v")")
    cp "$v" "$ART/$suite/${testdir}.webm"
  done
  sleep 2
done

echo "=================================================================="
for suite in "${SUITES[@]}"; do echo "  ${RESULTS[$suite]}  $suite"; done
echo "  TOTAL: $TOTAL_PASS passed / $TOTAL_FAIL failed"
echo "=================================================================="
{
  echo "{ \"base\": \"$BASE\", \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
  first=1
  for suite in "${SUITES[@]}"; do
    [ $first -eq 0 ] && echo ","
    printf '  "%s": "%s"' "$suite" "${RESULTS[$suite]}"
    first=0
  done
  echo ","
  echo "  \"total_passed\": $TOTAL_PASS, \"total_failed\": $TOTAL_FAIL"
  echo "}"
} > download/verification/omega-local/e2e-videos-summary.json
echo "videos: $ART"; ls -la "$ART" | head -15