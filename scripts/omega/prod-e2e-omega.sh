#!/bin/bash
# ============================================================================
# ExamForge AI Ω — FINAL MANDATE Production E2E Runner (foreground, per-suite)
# The sandbox reaps detached background processes, so each suite must run in
# the foreground. Usage: bash scripts/omega/prod-e2e-omega.sh <suite-name> [BASE]
# e.g.: bash scripts/omega/prod-e2e-omega.sh 01-student-journey
# ============================================================================
SUITE="$1"
BASE="${2:-https://web-alpha-bay-87.vercel.app}"
LOGDIR="/home/z/my-project/download/verification/prod-e2e-omega"
mkdir -p "$LOGDIR"

cd /home/z/my-project

if [ -z "$SUITE" ]; then
  echo "Usage: $0 <suite-name|all> [BASE_URL]"
  echo "Suites: 00-landing 01-student-journey 02-teacher-journey 03-parent-journey 04-school-admin-journey 05-super-admin-journey 06-rbac-matrix 07-cbt-flow 08-ai-api"
  exit 1
fi

run_suite() {
  local suite="$1"
  echo "=== SUITE: $suite $(date +%H:%M:%S) ==="
  VERIFY_BASE="$BASE" npx playwright test "e2e/$suite.spec.ts" --reporter=list > "$LOGDIR/$suite.log" 2>&1
  rc=$?
  summary=$(grep -E "^  [0-9]+ (passed|failed)" "$LOGDIR/$suite.log" | tail -1)
  echo "rc=$rc — $summary"
  echo "$suite rc=$rc $summary" >> "$LOGDIR/summary.txt"
  # Show failed test names if any
  if [ $rc -ne 0 ]; then
    grep -E "^  ✘|^    ✘|failed" "$LOGDIR/$suite.log" | head -10
  fi
}

echo "BASE=$BASE" > /dev/null  # summary appended per suite

if [ "$SUITE" = "all" ]; then
  for s in 00-landing 01-student-journey 02-teacher-journey 03-parent-journey 04-school-admin-journey 05-super-admin-journey 06-rbac-matrix 07-cbt-flow 08-ai-api; do
    run_suite "$s"
  done
else
  run_suite "$SUITE"
fi
