#!/usr/bin/env python3
"""Phase 2: Try to recover source files from Vercel deployments (original + rewrite)."""
import json, urllib.request, urllib.error, os, sys

TOKEN = "[REDACTED]"
TEAM = "[REDACTED]"
BASE = "https://api.vercel.com"

DEPLOYMENTS = {
    "original_cb27b1e": "[REDACTED]",  # web-alpha-bay-87 (original ExamForge)
    "rewrite_latest": "dpl_42xKiumCgtCM9anBUv8V",             # latest OMEGA rewrite
    "rewrite_prev": "dpl_824RTKqoYNZwLcoDyuNQ",
    "rewrite_first": "dpl_HnzHCkHtSNMggVDafNDD",
}

def api(path, raw=False):
    req = urllib.request.Request(BASE + path)
    req.add_header("Authorization", "Bearer " + TOKEN)
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            data = r.read()
            return (data if raw else json.loads(data.decode())), r.status
    except urllib.error.HTTPError as e:
        body = e.read()[:300]
        return ({"error": body.decode(errors="replace")}, e.code)
    except Exception as e:
        return {"error": str(e)}, 0

def try_files_endpoints(dep_id, name):
    print(f"\n{'='*70}\n=== {name} ({dep_id}) ===")
    # v13 metadata first
    meta, sc = api(f"/v13/deployments/{dep_id}?teamId={TEAM}")
    if sc == 200:
        m = meta.get("meta", {}) or {}
        print(f"meta: framework={m.get('framework')} node={meta.get('nodeVersion')} "
              f"gitRef={m.get('githubCommitRef')} sha={str(m.get('githubCommitSha'))[:10]}")
        print(f"routes/aliases: {json.dumps(meta.get('alias', [])[:5])}")
        print(f"builds: {[b.get('use') for b in meta.get('builds', [])]}")
        print(f"functions count: {len(meta.get('functions', {}) or {})}")
        print(f"createdAt: {meta.get('createdAt')}")
        # save meta
        with open(f"/home/z/my-project/audit/dep_{name}_meta.json", "w") as f:
            json.dump(meta, f, indent=2)
    else:
        print(f"v13 meta FAILED {sc}: {json.dumps(meta)[:200]}")

    # v6 files tree
    files, sc = api(f"/v6/deployments/{dep_id}/files?teamId={TEAM}")
    print(f"v6 files status={sc}")
    if sc == 200:
        flist = walk_files(files)
        print(f"  → {len(flist)} files in tree")
        with open(f"/home/z/my-project/audit/dep_{name}_filetree.json", "w") as f:
            json.dump(flist[:3000], f, indent=2)
        # show key files
        for fp in flist:
            if any(k in fp["path"] for k in ["package.json", "globals.css", "tailwind", "layout.tsx", "page.tsx", "schema.prisma"]):
                print(f"    {fp['path']} ({fp['size']}B)")
    else:
        print(f"  error: {json.dumps(files)[:200]}")

    # v13 files (newer endpoint)
    files13, sc = api(f"/v13/deployments/{dep_id}/files?teamId={TEAM}")
    print(f"v13 files status={sc}")
    if sc == 200 and isinstance(files13, dict):
        print(f"  keys: {list(files13.keys())[:10]}")
        with open(f"/home/z/my-project/audit/dep_{name}_filetree13.json", "w") as f:
            json.dump(files13, f, indent=2)
    elif sc != 200:
        print(f"  error: {json.dumps(files13)[:200]}")

def walk_files(node, prefix=""):
    """Walk the v6 files tree structure."""
    out = []
    if isinstance(node, list):
        for n in node:
            out.extend(walk_files(n, prefix))
    elif isinstance(node, dict):
        path = prefix + node.get("name", "")
        if node.get("type") == "directory" or "children" in node:
            for c in node.get("children", []):
                out.extend(walk_files(c, path + "/"))
        else:
            out.append({"path": path, "sha": node.get("sha"), "size": node.get("size")})
    return out

if __name__ == "__main__":
    os.makedirs("/home/z/my-project/audit", exist_ok=True)
    for name, dep in DEPLOYMENTS.items():
        try:
            try_files_endpoints(dep, name)
        except Exception as e:
            print(f"{name}: EXCEPTION {e}")
