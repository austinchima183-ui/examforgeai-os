#!/bin/bash
# Ω∞ PHASE 4 — Stability Cycle Part A: static gates from clean state
# Usage: bash scripts/omega/stability-A.sh <cycle-number>
set -u
CYCLE="${1:?cycle number}"
cd /home/z/my-project
STATE="scripts/logs/cycle-$CYCLE.state"
LOG="scripts/logs/cycle-$CYCLE-a.log"
: > "$LOG"
FAIL=0

echo "[A.$CYCLE] $(date +%H:%M:%S) CLEAN STATE: killing servers, clearing .next" | tee -a "$LOG"
pkill -f "next-server" 2>/dev/null || true
pkill -f "next start" 2>/dev/null || true
fuser -k 3000/tcp 2>/dev/null || true
sleep 1
rm -rf .next /tmp/next-prod.log
echo "clean: $?" >> "$LOG"

run_step() {
  local name="$1"; shift
  echo "[A.$CYCLE] $(date +%H:%M:%S) START $name" | tee -a "$LOG"
  "$@" >> "$LOG" 2>&1
  local ec=$?
  echo "[A.$CYCLE] $(date +%H:%M:%S) END $name exit=$ec" | tee -a "$LOG"
  if [ $ec -ne 0 ]; then FAIL=1; echo "[A.$CYCLE] FAILED at $name" | tee -a "$LOG"; fi
  return $ec
}

run_step tsc npx tsc --noEmit
[ $FAIL -eq 1 ] && { echo "RESULT=A_FAIL" > "$STATE"; exit 1; }
run_step eslint npx eslint .
[ $FAIL -eq 1 ] && { echo "RESULT=A_FAIL" > "$STATE"; exit 1; }
run_step build npm run build
[ $FAIL -eq 1 ] && { echo "RESULT=A_FAIL" > "$STATE"; exit 1; }
run_step unit env CI=true npx vitest run
[ $FAIL -eq 1 ] && { echo "RESULT=A_FAIL" > "$STATE"; exit 1; }
run_step security python3 scripts/omega/security-audit.py
run_step reality python3 scripts/omega/reality-scan.py
run_step promises python3 scripts/omega/landing-promises.py

# verify unit count
PASSED=$(grep -oE "[0-9]+ passed" scripts/logs/cycle-$CYCLE-a.log | tail -1 | grep -oE "[0-9]+")
echo "[A.$CYCLE] unit passed=$PASSED" | tee -a "$LOG"

if [ $FAIL -eq 0 ]; then
  echo "RESULT=A_OK" > "$STATE"
  echo "[A.$CYCLE] $(date +%H:%M:%S) PART A COMPLETE (all static gates green)" | tee -a "$LOG"
  exit 0
else
  echo "RESULT=A_FAIL" > "$STATE"
  exit 1
fi
