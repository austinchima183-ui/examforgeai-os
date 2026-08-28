#!/usr/bin/env python3
"""Parallel download of Vercel deployment source files."""
import json, os, sys, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed

TOKEN = os.environ["VERCEL_TOKEN"]
TEAM = os.environ["VERCEL_TEAM_ID"]
DEPLOY_ID = sys.argv[1]
OUT_DIR = sys.argv[2]
PREFIX = sys.argv[3] if len(sys.argv) > 3 else ""  # only download paths starting with this
API = "https://api.vercel.com"

def api_get(path):
    req = urllib.request.Request(f"{API}{path}", headers={"Authorization": f"Bearer {TOKEN}"})
    with urllib.request.urlopen(req) as r:
        return json.load(r)

tree = api_get(f"/v13/deployments/{DEPLOY_ID}/files?teamId={TEAM}&limit=10000")

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

if PREFIX:
    files = [(p, f) for p, f in files if p.startswith(PREFIX)]

print(f"Downloading {len(files)} files -> {OUT_DIR}")

def fetch(item):
    path, fid = item
    if not fid:
        return (path, None, "no-id")
    dest = os.path.join(OUT_DIR, path)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    try:
        req = urllib.request.Request(
            f"{API}/v2/deployments/{DEPLOY_ID}/files/{fid}?teamId={TEAM}",
            headers={"Authorization": f"Bearer {TOKEN}"})
        with urllib.request.urlopen(req, timeout=60) as r:
            data = r.read()
        with open(dest, "wb") as f:
            f.write(data)
        return (path, len(data), None)
    except Exception as e:
        return (path, None, str(e)[:100])

ok = fail = 0
with ThreadPoolExecutor(max_workers=16) as ex:
    for fut in as_completed([ex.submit(fetch, f) for f in files]):
        path, size, err = fut.result()
        if err:
            fail += 1
            if fail <= 5:
                print(f"  FAIL {path}: {err}")
        else:
            ok += 1
            if ok % 200 == 0:
                print(f"  progress: {ok} done")

print(f"DONE. OK={ok} FAIL={fail}")
