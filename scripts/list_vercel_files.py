#!/usr/bin/env python3
"""List file tree of a Vercel deployment (names only, no download)."""
import json, os, sys, urllib.request, urllib.error

TOKEN = os.environ["VERCEL_TOKEN"]
TEAM = os.environ["VERCEL_TEAM_ID"]
DEPLOY_ID = sys.argv[1]
API = "https://api.vercel.com"

req = urllib.request.Request(
    f"{API}/v13/deployments/{DEPLOY_ID}/files?teamId={TEAM}&limit=10000",
    headers={"Authorization": f"Bearer {TOKEN}"})
try:
    with urllib.request.urlopen(req) as r:
        tree = json.load(r)
except urllib.error.HTTPError as e:
    print(f"ERROR {e.code}: {e.read().decode()[:300]}")
    sys.exit(1)

files = []
def walk(nodes, prefix=""):
    for n in nodes:
        if n.get("type") == "directory":
            walk(n.get("children", []), prefix + n["name"] + "/")
        elif n.get("type") == "file":
            files.append((prefix + n["name"], n.get("size", 0)))

if isinstance(tree, list):
    walk(tree)
else:
    walk(tree.get("files", []))

print(f"TOTAL FILES: {len(files)}")
total_size = sum(s for _, s in files)
print(f"TOTAL SIZE: {total_size/1024/1024:.1f} MB")
# Show structure summary
dirs = {}
for p, s in files:
    top = "/".join(p.split("/")[:3])
    dirs[top] = dirs.get(top, 0) + 1
for d, c in sorted(dirs.items(), key=lambda x: -x[1])[:40]:
    print(f"  {c:5} {d}")
# save list
with open("/home/z/my-project/audit/deployment_files.json", "w") as f:
    json.dump(files, f)
print("Saved to deployment_files.json")
