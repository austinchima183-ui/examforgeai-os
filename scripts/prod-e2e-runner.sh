#!/bin/bash
# ============================================================================
# ExamForge AI Ω — Production E2E Runner
# Runs each suite in a FRESH playwright process to bound memory usage
# (system has 3.9GB RAM, no swap — one long-lived worker OOMs).
# Usage: VERIFY_BASE=https://web-alpha-bay-87.vercel.app bash scripts/prod-e2e-runner.sh
# ============================================================================

BASE="${VERIFY_BASE:-https://web-alpha-bay-87.vercel.app}"
LOGDIR="/home/z/my-project/download/verification/prod-e2e"
mkdir -p "$LOGDIR"

SUITES=(
  "01-student-journey.spec.ts"
  "02-teacher-journey.spec.ts"
  "03-parent-journey.spec.ts"
  "04-school-admin-journey.spec.ts"
  "05-super-admin-journey.spec.ts"
  "06-rbac-matrix.spec.ts"
  "07-cbt-flow.spec.ts"
  "08-ai-api.spec.ts"
)

cd /home/z/my-project
export VERIFY_BASE="$BASE"

TOTAL_PASS=0
TOTAL_FAIL=0
FAILED_SUITES=()

for suite in "${SUITES[@]}"; do
  name="${suite%.spec.ts}"
  echo "=== SUITE: $suite ($(date +%H:%M:%S)) ==="
  VERIFY_BASE="$BASE" npx playwright test "$suite" --reporter=list > "$LOGDIR/$name.log" 2>&1
  rc=$?
  # Count test outcomes from the log
  passed=$(grep -cE "^  ✓" "$LOGDIR/$name.log" || true)
  failed=$(grep -cE "^  ✘|✗|failed" "$LOGDIR/$name.log" || true)
  echo "    rc=$rc  passed_lines=$passed  failed_lines=$failed"
  tail -3 "$LOGDIR/$name.log" | sed 's/^/    /'
  if [ $rc -eq 0 ]; then
    TOTAL_PASS=$((TOTAL_PASS + passed))
    echo "    ✅ SUITE PASSED"
  else
    TOTAL_FAIL=$((TOTAL_FAIL + 1))
    FAILED_SUITES+=("$suite")
    echo "    ❌ SUITE FAILED (rc=$rc) — see $LOGDIR/$name.log"
  fi
  # Let the OS reclaim memory between suites
  sleep 5
  sync
done

echo ""
echo "==================== PRODUCTION E2E SUMMARY ===================="
echo "Suites passed: $(( ${#SUITES[@]} - ${#FAILED_SUITES[@]} )) / ${#SUITES[@]}"
echo "Test lines passed: $TOTAL_PASS"
if [ ${#FAILED_SUITES[@]} -gt 0 ]; then
  echo "FAILED SUITES:"
  for f in "${FAILED_SUITES[@]}"; do echo "  - $f"; done
  exit 1
else
  echo "ALL SUITES GREEN ✅"
fi
