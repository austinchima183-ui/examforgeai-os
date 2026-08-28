#!/usr/bin/env python3
"""Recover source files from a Vercel deployment via Management API."""
import json, os, sys, urllib.request, urllib.error

TOKEN = os.environ["VERCEL_TOKEN"]
TEAM = os.environ["VERCEL_TEAM_ID"]
DEPLOY_ID = sys.argv[1]
OUT_DIR = sys.argv[2]

API = "https://api.vercel.com"

def api_get(path):
    req = urllib.request.Request(f"{API}{path}", headers={"Authorization": f"Bearer {TOKEN}"})
    with urllib.request.urlopen(req) as r:
        return json.load(r)

# 1. Get file tree
try:
    tree = api_get(f"/v13/deployments/{DEPLOY_ID}/files?teamId={TEAM}&limit=10000&mode=files")
except urllib.error.HTTPError as e:
    print(f"ERROR {e.code}: {e.read().decode()[:500]}")
    sys.exit(1)

files = []
def walk(nodes, prefix=""):
    for n in nodes:
        if n.get("type") == "directory":
            walk(n.get("children", []), prefix + n["name"] + "/")
        elif n.get("type") == "file":
            files.append((prefix + n["name"], n.get("uid") or n.get("id")))

if isinstance(tree, list):
    walk(tree)
else:
    walk(tree.get("files", []))

print(f"Total files in deployment: {len(files)}")

# 2. Download each file
os.makedirs(OUT_DIR, exist_ok=True)
ok, fail = 0, 0
for path, fid in files:
    if not fid:
        continue
    dest = os.path.join(OUT_DIR, path)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    try:
        req = urllib.request.Request(
            f"{API}/v2/deployments/{DEPLOY_ID}/files/{fid}?teamId={TEAM}",
            headers={"Authorization": f"Bearer {TOKEN}"})
        with urllib.request.urlopen(req) as r:
            data = r.read()
        with open(dest, "wb") as f:
            f.write(data)
        ok += 1
    except Exception as e:
        print(f"  FAIL {path}: {e}")
        fail += 1

print(f"Downloaded: {ok}, Failed: {fail}")
