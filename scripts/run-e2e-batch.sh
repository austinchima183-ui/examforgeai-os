#!/bin/bash
# E2E test runner — batch mode (each batch < 4 min to survive sandbox reaper)
cd /home/z/my-project
export NO_COLOR=1

BATCH=$1
LOG=/tmp/pw-batch-$BATCH.log

case $BATCH in
  1) FILES="e2e/00-landing.spec.ts e2e/01-student-journey.spec.ts";;
  2) FILES="e2e/02-teacher-journey.spec.ts e2e/03-parent-journey.spec.ts";;
  3) FILES="e2e/04-school-admin-journey.spec.ts e2e/05-super-admin-journey.spec.ts";;
  4) FILES="e2e/07-cbt-flow.spec.ts e2e/08-ai-api.spec.ts";;
  5) FILES="e2e/06-rbac-matrix.spec.ts";;
  *) echo "unknown batch $BATCH"; exit 1;;
esac

echo "═══ BATCH $BATCH: $FILES ═══"
npx playwright test $FILES --reporter=line 2>&1 | grep -v "^$" | tail -30
EXIT=${PIPESTATUS[0]}
echo "BATCH $BATCH EXIT: $EXIT"
exit $EXIT
