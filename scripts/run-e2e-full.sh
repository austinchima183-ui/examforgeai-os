#!/bin/bash
# Full E2E suite — all 5 batches sequentially, detached-safe
cd /home/z/my-project
export NO_COLOR=1

LOG=/tmp/pw-full-suite.log
echo "═══════════════════════════════════════════════" > $LOG
echo "FULL E2E SUITE START: $(date)" >> $LOG
echo "═══════════════════════════════════════════════" >> $LOG

TOTAL_PASS=0
TOTAL_FAIL=0

for BATCH in 1 2 3 4 5; do
  case $BATCH in
    1) FILES="e2e/00-landing.spec.ts e2e/01-student-journey.spec.ts";;
    2) FILES="e2e/02-teacher-journey.spec.ts e2e/03-parent-journey.spec.ts";;
    3) FILES="e2e/04-school-admin-journey.spec.ts e2e/05-super-admin-journey.spec.ts";;
    4) FILES="e2e/07-cbt-flow.spec.ts e2e/08-ai-api.spec.ts";;
    5) FILES="e2e/06-rbac-matrix.spec.ts";;
  esac
  echo "" >> $LOG
  echo "── BATCH $BATCH: $FILES ──" >> $LOG
  npx playwright test $FILES --reporter=line >> $LOG 2>&1
  EXIT=$?
  if [ $EXIT -eq 0 ]; then
    echo "BATCH $BATCH: PASS" >> $LOG
    TOTAL_PASS=$((TOTAL_PASS+1))
  else
    echo "BATCH $BATCH: FAIL (exit $EXIT)" >> $LOG
    TOTAL_FAIL=$((TOTAL_FAIL+1))
  fi
done

echo "" >> $LOG
echo "═══════════════════════════════════════════════" >> $LOG
echo "SUITE DONE: $(date) — $TOTAL_PASS/5 batches passed, $TOTAL_FAIL failed" >> $LOG
echo "DONE EXIT: $TOTAL_FAIL" >> $LOG
