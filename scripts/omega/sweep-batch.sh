#!/bin/bash
# Ω∞ — Local sweep batch: starts prod server, runs route sweep + security audit +
# a11y audit + landing promises scan + table probe, then kills server.
set -u
cd /home/z/my-project
LOG=scripts/logs/sweep-batch.log
: > "$LOG"

fuser -k 3000/tcp 2>/dev/null || true
pkill -f "next start" 2>/dev/null || true
sleep 2

npx next start -p 3000 > scripts/logs/server-sweep.log 2>&1 &
SPID=$!
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 http://localhost:3000/api/health 2>/dev/null || echo 000)
  [ "$code" = "200" ] && { echo "[batch] server healthy (${i}s)" | tee -a "$LOG"; break; }
  [ "$i" = "60" ] && { echo "FATAL: no health" | tee -a "$LOG"; kill $SPID; exit 1; }
  sleep 1
done

echo "=== 1. ROUTE SWEEP ===" | tee -a "$LOG"
python3 scripts/omega/omega1-sweep.py http://localhost:3000 >> "$LOG" 2>&1
echo "SWEEP_EXIT:$?" | tee -a "$LOG"

echo "=== 2. SECURITY AUDIT (static) ===" | tee -a "$LOG"
python3 scripts/omega/security-audit.py >> "$LOG" 2>&1
echo "SEC_EXIT:$?" | tee -a "$LOG"

echo "=== 3. TABLE PROBE ===" | tee -a "$LOG"
node scripts/omega/table-probe.js >> "$LOG" 2>&1
echo "PROBE_EXIT:$?" | tee -a "$LOG"

echo "=== 4. LANDING PROMISES ===" | tee -a "$LOG"
python3 scripts/omega/landing-promises.py >> "$LOG" 2>&1
echo "PROMISES_EXIT:$?" | tee -a "$LOG"

echo "=== 5. A11Y AUDIT ===" | tee -a "$LOG"
npx tsx scripts/omega/a11y-audit-local.ts >> "$LOG" 2>&1
echo "A11Y_EXIT:$?" | tee -a "$LOG"

kill $SPID 2>/dev/null
fuser -k 3000/tcp 2>/dev/null || true
echo "[batch] done" | tee -a "$LOG"
