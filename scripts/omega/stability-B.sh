#!/bin/bash
# Ω∞ PHASE 4 — Stability Cycle Part B: runtime probes (server + sweep + DB + a11y + smoke)
# Usage: bash scripts/omega/stability-B.sh <cycle-number>
set -u
CYCLE="${1:?cycle number}"
cd /home/z/my-project
STATE="scripts/logs/cycle-$CYCLE.state"
LOG="scripts/logs/cycle-$CYCLE-b.log"
: > "$LOG"
FAIL=0

grep -q "RESULT=A_OK" "$STATE" 2>/dev/null || { echo "[B.$CYCLE] Part A not OK — abort" | tee -a "$LOG"; exit 1; }

echo "[B.$CYCLE] $(date +%H:%M:%S) starting production server" | tee -a "$LOG"
pkill -f "next-server" 2>/dev/null || true; sleep 1
npx next start -p 3000 > /tmp/next-prod-$CYCLE.log 2>&1 &
SPID=$!
HC=000
for i in $(seq 1 90); do
  HC=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 http://localhost:3000/api/health 2>/dev/null || echo 000)
  [ "$HC" = "200" ] && break
  sleep 1
done
echo "[B.$CYCLE] health=$HC (${i}s)" | tee -a "$LOG"
if [ "$HC" != "200" ]; then echo "RESULT=AB_FAIL" >> "$STATE"; kill $SPID 2>/dev/null; exit 1; fi

step() {
  local name="$1"; shift
  echo "[B.$CYCLE] $(date +%H:%M:%S) START $name" | tee -a "$LOG"
  "$@" >> "$LOG" 2>&1
  local ec=$?
  echo "[B.$CYCLE] $(date +%H:%M:%S) END $name exit=$ec" | tee -a "$LOG"
  [ $ec -ne 0 ] && { FAIL=1; echo "[B.$CYCLE] FAILED at $name" | tee -a "$LOG"; }
}

step sweep python3 scripts/omega/omega1-sweep.py http://localhost:3000
step dbprobe node scripts/omega/table-probe.js
step a11y npx tsx scripts/omega/a11y-audit-local.ts
step smoke node scripts/omega/prod-smoke-final.js
step perf bash -c 'T1=$(curl -s -o /dev/null -w "%{time_total}" http://localhost:3000/api/health); T2=$(curl -s -o /dev/null -w "%{time_total}" http://localhost:3000/); echo "health_ttfb=$T1 landing_ttfb=$T2"'

kill $SPID 2>/dev/null; fuser -k 3000/tcp 2>/dev/null

if [ $FAIL -eq 0 ]; then
  echo "RESULT=B_OK" >> "$STATE"
  echo "[B.$CYCLE] $(date +%H:%M:%S) PART B COMPLETE" | tee -a "$LOG"
  exit 0
else
  echo "RESULT=B_FAIL" >> "$STATE"
  exit 1
fi
