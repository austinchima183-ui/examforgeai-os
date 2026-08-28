#!/bin/bash
# Full E2E suite — SINGLE invocation (all artifacts preserved + one HTML report)
cd /home/z/my-project
export NO_COLOR=1

LOG=/tmp/pw-full-suite-v2.log
echo "═══════════════════════════════════════════════" > $LOG
echo "FULL E2E SUITE v2 (single run): $(date)" >> $LOG
echo "Server: production build @ localhost:3000" >> $LOG
echo "═══════════════════════════════════════════════" >> $LOG

npx playwright test --reporter=line >> $LOG 2>&1
EXIT=$?
echo "" >> $LOG
echo "═══════════════════════════════════════════════" >> $LOG
echo "SUITE DONE: $(date) — EXIT: $EXIT" >> $LOG
echo "DONE EXIT: $EXIT" >> $LOG
