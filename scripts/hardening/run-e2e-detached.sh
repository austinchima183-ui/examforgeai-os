#!/bin/bash
# Detached E2E runner — survives tool-call timeouts via setsid.
cd /home/z/my-project
mkdir -p download/verification/omega-local

pkill -9 -f next-server 2>/dev/null
pkill -9 -f "next start" 2>/dev/null
sleep 2

E12=$(python3 -c "import json; print(json.load(open('scripts/tmp/verification-exam-12.json'))['examId'])")
E13=$(python3 -c "import json; print(json.load(open('scripts/tmp/verification-exam-13.json'))['examId'])")

# Start production server detached
setsid nohup npx next start -p 3000 > /tmp/e2e-server.log 2>&1 < /dev/null &
sleep 1
npx wait-on http://localhost:3000/login --timeout 60000 || exit 1
echo "server up $(date -u +%H:%M:%S)" > /tmp/e2e-run.status

# Run full suite detached
setsid nohup env E2E_VIDEO=off OMEGA_EXAM_ID=$E12 OMEGA_EXAM_ID_13=$E13 \
  npx playwright test > /tmp/e2e-run.log 2>&1 < /dev/null &
echo "playwright launched $(date -u +%H:%M:%S) exam12=$E12 exam13=$E13" >> /tmp/e2e-run.status
