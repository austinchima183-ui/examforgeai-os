#!/bin/bash
# Full E2E suite — mirrors the CI E2E gate exactly.
# Starts next start, provisions fresh exams (already done), runs full playwright suite.
set -o pipefail
cd /home/z/my-project

pkill -9 -f next-server 2>/dev/null
pkill -9 -f "next start" 2>/dev/null
sleep 2

E12=$(python3 -c "import json; print(json.load(open('scripts/tmp/verification-exam-12.json'))['examId'])")
E13=$(python3 -c "import json; print(json.load(open('scripts/tmp/verification-exam-13.json'))['examId'])")
echo "exam12=$E12 exam13=$E13"

# Start production server (env from .env.local — Next loads it automatically)
nohup npx next start -p 3000 > /tmp/e2e-server.log 2>&1 &
SERVER_PID=$!
npx wait-on http://localhost:3000/login --timeout 60000
echo "server up (pid $SERVER_PID)"

E2E_VIDEO=off OMEGA_EXAM_ID=$E12 OMEGA_EXAM_ID_13=$E13 npx playwright test 2>&1 | tail -30
RC=$?

echo "PLAYWRIGHT-EXIT:$RC"
# leave server running status report
exit $RC
