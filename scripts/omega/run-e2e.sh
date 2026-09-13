#!/bin/bash
# ExamForge Ω∞ — E2E runner: starts prod server, waits for health, runs Playwright, kills server.
# Usage: bash scripts/omega/run-e2e.sh [output-tag]
set -u
TAG="${1:-run}"
cd /home/z/my-project
LOG="scripts/logs/e2e-${TAG}.log"

# Kill anything on port 3000
fuser -k 3000/tcp 2>/dev/null || true
pkill -f "next start" 2>/dev/null || true
sleep 2

echo "[$(date +%H:%M:%S)] starting production server..." | tee -a "$LOG"
npx next start -p 3000 > "scripts/logs/server-${TAG}.log" 2>&1 &
SERVER_PID=$!

# Wait for health (max 60s)
for i in $(seq 1 60); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health 2>/dev/null || echo 000)
  if [ "$CODE" = "200" ]; then
    echo "[$(date +%H:%M:%S)] server healthy after ${i}s" | tee -a "$LOG"
    break
  fi
  if [ "$i" = "60" ]; then
    echo "FATAL: server never became healthy" | tee -a "$LOG"
    kill $SERVER_PID 2>/dev/null
    exit 1
  fi
  sleep 1
done

echo "[$(date +%H:%M:%S)] running playwright e2e..." | tee -a "$LOG"
cd /home/z/my-project
npx playwright test 2>&1 | tee -a "$LOG"
PW_EXIT=${PIPESTATUS[0]}
echo "PLAYWRIGHT_EXIT:$PW_EXIT" | tee -a "$LOG"

kill $SERVER_PID 2>/dev/null
fuser -k 3000/tcp 2>/dev/null || true
echo "[$(date +%H:%M:%S)] server stopped. E2E exit=$PW_EXIT" | tee -a "$LOG"
exit $PW_EXIT
