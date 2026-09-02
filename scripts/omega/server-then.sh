#!/bin/bash
# Ω-19/Ω-20: Self-contained server+command runner.
# The sandbox kills background processes between Bash invocations, so every
# verification batch must start the production server, wait for health, run
# the requested command(s), and exit — all within one invocation.
# Usage: bash scripts/omega/server-then.sh <timeout-seconds> <command...>
set -u
TIMEOUT_SECS="${1:?usage: server-then.sh <timeout> <command...>}"
shift

cd /home/z/my-project

# start production server (detached within this invocation only)
NODE_OPTIONS="--max-old-space-size=1024" npx next start -p 3000 > /tmp/next-prod.log 2>&1 &
SERVER_PID=$!

# wait for health (max 60s)
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 http://localhost:3000/api/health 2>/dev/null || echo 000)
  if [ "$code" = "200" ]; then
    echo "[server-then] server healthy after ${i}s (pid $SERVER_PID)"
    break
  fi
  sleep 1
done

if [ "${code:-000}" != "200" ]; then
  echo "[server-then] FATAL: server did not become healthy; log tail:"
  tail -15 /tmp/next-prod.log
  kill $SERVER_PID 2>/dev/null || true
  exit 1
fi

# run the requested command with the remaining timeout
timeout "$TIMEOUT_SECS" "$@"
RC=$?

# capture server log snapshot for this batch (evidence + debugging)
kill $SERVER_PID 2>/dev/null || true
sleep 1
echo "[server-then] command exit=$RC; server log tail:"
tail -5 /tmp/next-prod.log
exit $RC
