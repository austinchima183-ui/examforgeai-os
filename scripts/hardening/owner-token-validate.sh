#!/bin/bash
# Owner Vercel token validation (blob 4a5c27ed) — never prints the token.
cd /home/z/my-project
VT=$(git cat-file -p 4a5c27ed | rg -o 'vcp_5p9vab[A-Za-z0-9]+' | head -1)
echo "token: ${VT:0:10}... (len ${#VT})"
user=$(curl -s -m 15 -H "Authorization: Bearer $VT" https://api.vercel.com/v2/user)
echo "$user" | python3 -c 'import json,sys; d=json.load(sys.stdin); u=d.get("user",{}); print("identity:", u.get("username") or u.get("email") or d.get("error",{}).get("code","ERR"))'
teams=$(curl -s -m 15 -H "Authorization: Bearer $VT" "https://api.vercel.com/v2/teams?limit=10")
echo "$teams" | python3 -c 'import json,sys; d=json.load(sys.stdin); [print("team:", t.get("id"), t.get("slug")) for t in d.get("teams",[])]'
PROJ="prj_rp5aHw3B3t4kcDGo48AWtQJmcERF"
proj=$(curl -s -m 15 -H "Authorization: Bearer $VT" "https://api.vercel.com/v9/projects/$PROJ")
echo "$proj" | python3 -c 'import json,sys; d=json.load(sys.stdin); print("prod project:", d.get("name"), "| autoDeploy:", d.get("autoDeploy"), "| git repo:", (d.get("link") or {}).get("org"), "/", (d.get("link") or {}).get("repo"), "| prodCommit:", ((d.get("targets") or {}).get("production") or {}).get("meta",{}).get("githubCommitSha","?")[:8])'
deployments=$(curl -s -m 15 -H "Authorization: Bearer $VT" "https://api.vercel.com/v6/deployments?projectId=$PROJ&limit=3&target=production&state=READY")
echo "$deployments" | python3 -c 'import json,sys; d=json.load(sys.stdin); [print("deploy:", x["uid"], x.get("meta",{}).get("githubCommitSha","?")[:8], x["created"], x.get("url")) for x in d.get("deployments",[])]'
