#!/bin/bash
# ============================================================================
# with-server.sh — Run a command against a local PRODUCTION server.
# Starts `next start` (requires .next build), waits for health, runs the
# wrapped command, then tears the server down. Single Bash-call lifecycle:
# processes spawned inside one tool call die when it ends, so the server
# and its consumer must share that call.
# ============================================================================
set -u
cd /home/z/my-project

PORT="${PORT:-3000}"
LOG=/home/z/my-project/prod-server.log

if [ ! -d .next ]; then
  echo "[with-server] ERROR: no .next build — run a production build first" >&2
  exit 1
fi

# If something is already listening, use it and don't start our own
if curl -s -o /dev/null --max-time 2 "http://localhost:${PORT}/api/health"; then
  echo "[with-server] server already up on :${PORT}"
  exec "$@"
fi

echo "[with-server] starting next start on :${PORT}"
bunx next start -p "$PORT" > "$LOG" 2>&1 &
SERVER_PID=$!

for i in $(seq 1 60); do
  if curl -s -o /dev/null --max-time 3 "http://localhost:${PORT}/api/health"; then
    echo "[with-server] server ready after ${i}s"
    break
  fi
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    echo "[with-server] ERROR: server died during startup" >&2
    tail -20 "$LOG" >&2
    exit 1
  fi
  sleep 1
done

# Run the wrapped command
"$@"
RC=$?

# Teardown
kill "$SERVER_PID" 2>/dev/null
wait "$SERVER_PID" 2>/dev/null
echo "[with-server] server stopped (cmd exit=$RC)"
exit $RC
