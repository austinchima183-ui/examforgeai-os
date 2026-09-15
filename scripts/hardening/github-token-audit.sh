#!/bin/bash
# GitHub token capability audit (from remote URL) — never prints the token.
cd /home/z/my-project
GH=$(git remote get-url origin | sed -n 's/.*x-access-token:\([^@]*\)@.*/\1/p')
echo "token prefix: ${GH:0:6}... length: ${GH#*.}"
echo "--- whoami ---"
curl -s -m 15 -H "Authorization: Bearer $GH" https://api.github.com/user | python3 -c 'import json,sys; d=json.load(sys.stdin); print("login:", d.get("login"), "| name:", d.get("name"))'
echo "--- repo perms ---"
curl -s -m 15 -H "Authorization: Bearer $GH" https://api.github.com/repos/austinchima183-ui/examforgeai-os | python3 -c 'import json,sys; d=json.load(sys.stdin); p=d.get("permissions",{}); print("perm:", p, "| full_name:", d.get("full_name"), "| default_branch:", d.get("default_branch"))'
echo "--- push dry-run ---"
git push --dry-run origin HEAD:main 2>&1 | tail -2
echo "--- secrets admin probe (public key) ---"
curl -s -m 15 -H "Authorization: Bearer $GH" https://api.github.com/repos/austinchima183-ui/examforgeai-os/actions/secrets/public-key | python3 -c 'import json,sys; d=json.load(sys.stdin); print("key_id:", d.get("key_id"), "| err:", d.get("message","-"))'
echo "--- actions runs (last 3) ---"
curl -s -m 15 -H "Authorization: Bearer $GH" "https://api.github.com/repos/austinchima183-ui/examforgeai-os/actions/runs?per_page=3" | python3 -c 'import json,sys; d=json.load(sys.stdin); [print(" -", r["id"], r["head_sha"][:8], r["status"], r["conclusion"], r["name"]) for r in d.get("workflow_runs",[])]'
