#!/bin/bash
# Detached E2E runner — survives parent session death
cd /home/z/my-project
export NO_COLOR=1
npx playwright test --reporter=line > /tmp/pw-run-final.log 2>&1
echo "DONE EXIT: $?" >> /tmp/pw-run-final.log
