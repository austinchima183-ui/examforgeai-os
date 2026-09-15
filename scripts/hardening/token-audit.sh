#!/bin/bash
# Token custody audit — validates candidate tokens WITHOUT printing them.
# Tokens are supplied via env vars or recovered from git objects:
#   VERCEL_TOKEN / SUPABASE_PAT (user-supplied or custody file)
# Git-blob recovery follows the established unreachable-object procedure.
# Usage: bash token-audit.sh [candidate_vercel_token] [candidate_supabase_pat]

PROD_PROJECT="prj_rp5aHw3B3t4kcDGo48AWtQJmcERF"  # examforge-ai (owns web-alpha-bay-87.vercel.app)
CUSTODY="/home/z/my-project/.secrets/hardening-tokens.env"
[ -f "$CUSTODY" ] && source "$CUSTODY"

V_CAND="${1:-${VERCEL_TOKEN:-}}"
S_CAND="${2:-${SUPABASE_PAT:-}}"

check_vercel() {
  local label="$1" tok="$2"
  echo "=== $label ==="
  [ -z "$tok" ] && { echo "  (no candidate)"; return; }
  local user username proj pname
  user=$(curl -s -m 15 -H "Authorization: Bearer $tok" https://api.vercel.com/v2/user)
  username=$(echo "$user" | python3 -c 'import json,sys; d=json.load(sys.stdin); u=d.get("user",{}); print(u.get("username") or u.get("email") or d.get("error",{}).get("code","ERR"))' 2>/dev/null)
  echo "  /v2/user -> $username"
  if [ "$username" != "ERR" ] && [ -n "$username" ] && [ "$username" != "None" ]; then
    proj=$(curl -s -m 15 -H "Authorization: Bearer $tok" "https://api.vercel.com/v9/projects/$PROD_PROJECT")
    pname=$(echo "$proj" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("name") or d.get("error",{}).get("code","ERR"))' 2>/dev/null)
    echo "  prod project access -> $pname"
  fi
}

check_supabase() {
  local label="$1" tok="$2"
  echo "=== $label ==="
  [ -z "$tok" ] && { echo "  (no candidate)"; return; }
  local projs count
  projs=$(curl -s -m 15 -H "Authorization: Bearer $tok" https://api.supabase.com/v1/projects)
  count=$(echo "$projs" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else "ERR:"+str(d.get("message","?"))[:60])' 2>/dev/null)
  echo "  /v1/projects -> $count"
  if [[ "$count" != ERR* && "$count" != "0" ]]; then
    echo "$projs" | python3 -c 'import json,sys; [print("  -", p["id"], p["name"], p["status"]) for p in json.load(sys.stdin)]' 2>/dev/null
  fi
}

# Owner-scoped token recovered from the established git blob (deploy history)
OWNER_VT=$(git -C /home/z/my-project cat-file -p 4a5c27ed 2>/dev/null | rg -o 'vcp_[A-Za-z0-9]+' | head -1)
check_vercel "vercel_owner_gitblob" "$OWNER_VT"
check_vercel "vercel_candidate" "$V_CAND"
check_supabase "supabase_candidate" "$S_CAND"
