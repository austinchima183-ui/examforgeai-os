#!/bin/bash
# Ω-1: Per-suite E2E runner (fresh process per suite — memory constraint)
# Usage: bash scripts/omega/e2e-per-suite.sh [base_url]
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

declare -A RESULTS
TOTAL_PASS=0
TOTAL_FAIL=0

for suite in "${SUITES[@]}"; do
  echo "=================================================================="
  echo ">>> SUITE: $suite"
  echo "=================================================================="
  log="/tmp/e2e-${suite}.log"
  if VERIFY_BASE="$BASE" npx playwright test "$suite" --project=desktop-chromium --reporter=list > "$log" 2>&1; then
    RESULTS[$suite]="PASS"
    p=$(grep -oE "[0-9]+ passed" "$log" | tail -1 | grep -oE "[0-9]+" || echo "?")
    TOTAL_PASS=$((TOTAL_PASS + ${p:-0}))
    echo "    ✓ PASS ($p tests)"
  else
    RESULTS[$suite]="FAIL"
    f=$(grep -oE "[0-9]+ failed" "$log" | tail -1 | grep -oE "[0-9]+" || echo "?")
    TOTAL_FAIL=$((TOTAL_FAIL + ${f:-0}))
    echo "    ✗ FAIL ($f failed) — last lines:"
    tail -12 "$log" | sed 's/^/      /'
  fi
  sleep 2
done

echo ""
echo "=================================================================="
echo "E2E PER-SUITE SUMMARY (base=$BASE)"
echo "=================================================================="
for suite in "${SUITES[@]}"; do
  echo "  ${RESULTS[$suite]}  $suite"
done
echo "------------------------------------------------------------------"
echo "  TOTAL: $TOTAL_PASS passed / $TOTAL_FAIL failed"
echo "=================================================================="

# persist summary JSON
SUMMARY_FILE="/home/z/my-project/download/verification/omega-local/e2e-per-suite.json"
mkdir -p "$(dirname "$SUMMARY_FILE")"
{
  echo "{"
  echo "  \"base\": \"$BASE\","
  echo "  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
  for i in "${!SUITES[@]}"; do
    suite="${SUITES[$i]}"
    comma=$([ $((i + 1)) -lt ${#SUITES[@]} ] && echo "," || echo "")
    echo "  \"$suite\": \"${RESULTS[$suite]}\"$comma"
  done
  echo "  \"total_passed\": $TOTAL_PASS,"
  echo "  \"total_failed\": $TOTAL_FAIL"
  echo "}"
} > "$SUMMARY_FILE"
echo "summary written: $SUMMARY_FILE"
