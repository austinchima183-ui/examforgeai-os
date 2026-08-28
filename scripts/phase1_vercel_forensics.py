#!/usr/bin/env python3
"""Phase 1 Forensics: Vercel deployment history for examforge-ai project."""
import json, urllib.request, urllib.error, ssl, sys

TOKEN = "[REDACTED]"
TEAM = "[REDACTED]"
PROJECT = "[REDACTED]"
BASE = "https://api.vercel.com"

def api(path, method="GET"):
    req = urllib.request.Request(BASE + path, method=method)
    req.add_header("Authorization", "Bearer " + TOKEN)
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read().decode()), r.status
    except urllib.error.HTTPError as e:
        return {"error": e.read().decode()[:500]}, e.code
    except Exception as e:
        return {"error": str(e)}, 0

def main():
    # 1. Project metadata
    proj, sc = api(f"/v9/projects/{PROJECT}?teamId={TEAM}")
    print(f"=== PROJECT (status {sc}) ===")
    if "error" in proj:
        print(json.dumps(proj)[:300]); sys.exit(1)
    print(f"name={proj.get('name')} framework={proj.get('framework')} nodeVersion={proj.get('nodeVersion')}")
    print(f"gitForkPrivacy={proj.get('gitForkPrivacy')}")
    link = proj.get("link") or {}
    print(f"link: type={link.get('type')} org={link.get('org')} repo={link.get('repo')} deployHooks={bool(link.get('deployHooks'))}")

    # 2. All deployments (paginate)
    deployments = []
    until = None
    while True:
        path = f"/v6/deployments?projectId={PROJECT}&teamId={TEAM}&limit=100&state=READY&target=production"
        if until:
            path += f"&until={until}"
        d, sc = api(path)
        if "error" in d:
            print("deployments error:", json.dumps(d)[:300]); break
        batch = d.get("deployments", [])
        deployments.extend(batch)
        pgn = d.get("pagination", {})
        nxt = pgn.get("next")
        if not nxt or not batch:
            break
        until = nxt
        if len(deployments) > 600:
            break

    print(f"\n=== PRODUCTION DEPLOYMENTS: {len(deployments)} total ===")
    deployments.sort(key=lambda x: x.get("createdAt", 0))
    for d in deployments:
        url = d.get("url", "?")
        uid = d.get("uid", "?")
        meta = d.get("meta", {}) or {}
        created = d.get("createdAt", 0)
        age_days = round((__import__("time").time() - created / 1000) / 86400, 1)
        print(f"{created} (-{age_days}d) {uid[:24]} {url} | git={meta.get('githubCommitRef','?')} sha={str(meta.get('githubCommitSha','?'))[:8]} | {meta.get('githubCommitMessage','')[:60]}")

    # 3. Also check ALL deployments (including non-production/broken) count
    d, sc = api(f"/v6/deployments?projectId={PROJECT}&teamId={TEAM}&limit=100")
    print(f"\n=== TOTAL deployments incl. preview/failed (first page count): {len(d.get('deployments', []))} status={sc} ===")
    for dep in d.get("deployments", [])[:20]:
        print(f"  {dep.get('uid','?')[:20]} target={dep.get('target')} state={dep.get('state')} ready={dep.get('readyState')} url={dep.get('url')}")

    # save full list
    with open("/home/z/my-project/audit/vercel_deployments.json", "w") as f:
        json.dump({"project": proj, "deployments": deployments}, f, indent=2)
    print("\nSaved: audit/vercel_deployments.json")

if __name__ == "__main__":
    main()
