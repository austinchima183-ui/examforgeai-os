#!/bin/bash
# Ω∞ PHASE 4 — Stability Cycle Part C (3-way split, each fits a 600s call):
#   half 1 = suites 00-05 (7 tests)  half 2 = suites 06-08 (9 tests)  half 3 = suites 09-11 (20 tests)
# Usage: bash scripts/omega/stability-C.sh <cycle-number> <half: 1|2|3>
set -u
CYCLE="${1:?cycle number}"
HALF="${2:?half 1, 2 or 3}"
cd /home/z/my-project
STATE="scripts/logs/cycle-$CYCLE.state"
LOG="scripts/logs/cycle-$CYCLE-c$HALF.log"
: > "$LOG"

case "$HALF" in
  1) PREV="RESULT=B_OK";  SUITES="00-landing 01-student-journey 02-teacher-journey 03-parent-journey 04-school-admin-journey 05-super-admin-journey"; MINT=7;  MARK="RESULT=C1_OK" ;;
  2) PREV="RESULT=C1_OK"; SUITES="06-rbac-matrix 07-cbt-flow 08-ai-api"; MINT=9;  MARK="RESULT=C2_OK" ;;
  3) PREV="RESULT=C2_OK"; SUITES="09-widget-system 10-advanced-ux 11-final-omega"; MINT=20; MARK="RESULT=CYCLE_OK" ;;
esac

grep -q "$PREV" "$STATE" 2>/dev/null || { echo "[C.$CYCLE.$HALF] previous part not OK — abort" | tee -a "$LOG"; exit 1; }

echo "[C.$CYCLE.$HALF] $(date +%H:%M:%S) starting production server" | tee -a "$LOG"
pkill -f "next-server" 2>/dev/null || true; sleep 1
npx next start -p 3000 > /tmp/next-prod-c$HALF-$CYCLE.log 2>&1 &
SPID=$!
HC=000
for i in $(seq 1 90); do
  HC=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 http://localhost:3000/api/health 2>/dev/null || echo 000)
  [ "$HC" = "200" ] && break
  sleep 1
done
echo "[C.$CYCLE.$HALF] health=$HC (${i}s)" | tee -a "$LOG"
if [ "$HC" != "200" ]; then echo "RESULT=CYCLE_FAIL" >> "$STATE"; kill $SPID 2>/dev/null; exit 1; fi

echo "[C.$CYCLE.$HALF] $(date +%H:%M:%S) E2E suites: $SUITES" | tee -a "$LOG"
START=$(date +%s)
E2E_VIDEO=off npx playwright test $SUITES --reporter=list > "$LOG.e2e" 2>&1
EC=$?
END=$(date +%s)
PASSED=$(grep -oE "[0-9]+ passed" "$LOG.e2e" | tail -1 | grep -oE "[0-9]+")
FAILED=$(grep -oE "[0-9]+ failed" "$LOG.e2e" | tail -1 | grep -oE "[0-9]+" || echo 0)
echo "[C.$CYCLE.$HALF] E2E: exit=$EC passed=${PASSED:-0} failed=${FAILED:-0} duration=$((END-START))s" | tee -a "$LOG"

kill $SPID 2>/dev/null; fuser -k 3000/tcp 2>/dev/null

if [ $EC -eq 0 ] && [ "${PASSED:-0}" -ge $MINT ] && [ "${FAILED:-1}" -eq 0 ]; then
  echo "$MARK" >> "$STATE"
  if [ "$HALF" = "3" ]; then
    echo "[C.$CYCLE.3] CYCLE $CYCLE COMPLETE ✓ (36/36 E2E across 3 halves)" | tee -a "$LOG"
  fi
  exit 0
else
  echo "RESULT=CYCLE_FAIL" >> "$STATE"
  echo "[C.$CYCLE.$HALF] CYCLE $CYCLE FAILED ✗ (stability count resets)" | tee -a "$LOG"
  exit 1
fi
