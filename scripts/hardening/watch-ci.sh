#!/bin/bash
# Poll the CI Verification Suite run for a commit — prints status + step states.
cd /home/z/my-project
GH=$(git remote get-url origin | sed -n 's/.*x-access-token:\([^@]*\)@.*/\1/p')
SHA="${1:-$(git rev-parse HEAD)}"

RUN_ID=$(curl -s -m 15 -H "Authorization: Bearer $GH" \
  "https://api.github.com/repos/austinchima183-ui/examforgeai-os/actions/runs?head_sha=$SHA&per_page=1" \
  | python3 -c 'import json,sys; d=json.load(sys.stdin); runs=d.get("workflow_runs",[]); print(runs[0]["id"] if runs else "")')

if [ -z "$RUN_ID" ]; then echo "no run found for $SHA yet"; exit 0; fi
echo "run: $RUN_ID"
curl -s -m 15 -H "Authorization: Bearer $GH" \
  "https://api.github.com/repos/austinchima183-ui/examforgeai-os/actions/runs/$RUN_ID" \
  | python3 -c 'import json,sys; d=json.load(sys.stdin); print("status:", d.get("status"), "| conclusion:", d.get("conclusion"))'

curl -s -m 15 -H "Authorization: Bearer $GH" \
  "https://api.github.com/repos/austinchima183-ui/examforgeai-os/actions/runs/$RUN_ID/jobs?per_page=5" > /tmp/ci-jobs.json
python3 <<'EOF'
import json
d = json.load(open("/tmp/ci-jobs.json"))
for job in d.get("jobs", []):
    print("job: %s — %s %s" % (job["name"], job["status"], job.get("conclusion") or ""))
    for s in job.get("steps", []):
        if s["status"] == "completed":
            mark = "OK " if s.get("conclusion") == "success" else "FAIL"
        elif s["status"] == "in_progress":
            mark = "RUN "
        else:
            mark = "WAIT"
        print("  [%s] %s" % (mark, s["name"]))
EOF
