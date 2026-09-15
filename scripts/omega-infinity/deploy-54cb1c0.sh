#!/bin/bash
# ============================================================================
# RELEASE CLOSURE — deploy EXACTLY commit 54cb1c0 (UI Ascension) to production
# Target project: examforge-ai (prj_rp5aHw3B3t4kcDGo48AWtQJmcERF)
# Domain served: web-alpha-bay-87.vercel.app
# Method: Vercel API v13 deployment with gitSource (proven pattern from
#         deploy-879827e.sh — RC1 deployment used the same method)
# Pre-deploy env fix applied this session: NEXT_PUBLIC_APP_URL corrected
#         examforge-ai.vercel.app (third-party) -> web-alpha-bay-87.vercel.app
# ============================================================================
set -u
# Vercel token is NEVER hardcoded — provide at runtime: VERCEL_TOKEN=vcp_... ./deploy-54cb1c0.sh
VERCEL_TOKEN="${VERCEL_TOKEN:?VERCEL_TOKEN env var required (Vercel personal access token)}"
TEAM="team_hbVXkzeMbXEmG1e6FO4tq4vB"
CERTIFIED_SHA="54cb1c0a1bb2f01eecdb99176fd6a9a488e6a87f"
REPO="austinchima183-ui/examforgeai-os"
OUT="/tmp/deploy-trigger-54cb1c0.json"

echo "=== TRIGGERING PRODUCTION DEPLOYMENT of $CERTIFIED_SHA ==="
HTTP=$(curl -s -X POST "https://api.vercel.com/v13/deployments?teamId=$TEAM" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"examforge-ai\",\"project\":\"examforge-ai\",\"target\":\"production\",\"gitSource\":{\"type\":\"github\",\"repo\":\"$REPO\",\"repoId\":1349988495,\"ref\":\"$CERTIFIED_SHA\"}}" \
  -o "$OUT" -w "%{http_code}")
echo "HTTP: $HTTP"
python3 -c "
import json
d=json.load(open('$OUT'))
print('deployment id:',d.get('id'))
print('readyState:',d.get('readyState'))
print('url:',d.get('url'))
meta=d.get('meta',{})
print('meta.githubCommitSha:',meta.get('githubCommitSha'))
if d.get('error'):
    print('ERROR:',json.dumps(d.get('error'))[:500])
"
DEP_ID=$(python3 -c "import json; print(json.load(open('$OUT')).get('id',''))" 2>/dev/null)
if [ -z "$DEP_ID" ] || [ "$DEP_ID" = "None" ]; then
  echo "FATAL: no deployment id returned"
  exit 1
fi

echo ""
echo "=== POLLING $DEP_ID UNTIL READY/ERROR (10s interval) ==="
START=$(date +%s)
while true; do
  sleep 10
  STATE=$(curl -s -H "Authorization: Bearer $VERCEL_TOKEN" "https://api.vercel.com/v13/deployments/$DEP_ID?teamId=$TEAM" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('readyState','?'))" 2>/dev/null)
  ELAPSED=$(( $(date +%s) - START ))
  echo "[${ELAPSED}s] state: $STATE"
  if [ "$STATE" = "READY" ] || [ "$STATE" = "ERROR" ] || [ "$STATE" = "CANCELED" ]; then
    break
  fi
  if [ $ELAPSED -gt 540 ]; then
    echo "TIMEOUT after 9 minutes — deployment still building. Check manually."
    exit 2
  fi
done

echo ""
echo "=== FINAL DEPLOYMENT STATE ==="
curl -s -H "Authorization: Bearer $VERCEL_TOKEN" "https://api.vercel.com/v13/deployments/$DEP_ID?teamId=$TEAM" -o /tmp/deploy-final-54cb1c0.json
python3 -c "
import json
d=json.load(open('/tmp/deploy-final-54cb1c0.json'))
print('readyState:',d.get('readyState'))
print('errorMessage:',d.get('errorMessage'))
meta=d.get('meta',{})
print('meta.githubCommitSha:',meta.get('githubCommitSha'))
print('COMMIT MATCH:', 'YES' if str(meta.get('githubCommitSha','')).startswith('54cb1c0') else 'NO — MISMATCH')
print('deployment url:',d.get('url'))
print('alias:',d.get('alias'))
"
