#!/usr/bin/env python3
"""
Phase 11 (cont): Issues tracker audit + authenticated dangling commit sweep
"""
import json, os, subprocess, urllib.request, urllib.error, base64, hashlib

TOKEN = open('/home/z/my-project/.secrets/github_token').read().strip()
OWNER = 'austinchima183-ui'
REPO = 'examforgeai'
OUT_DIR = '/home/z/my-project/audit/phase11'

def gh(method, path, raw=False):
    url = path if raw else f"https://api.github.com{path}"
    req = urllib.request.Request(url, method=method, headers={
        'Authorization': f'token {TOKEN}',
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'phase11-audit-2/1.0',
    })
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            body = r.read().decode('utf-8', errors='replace')
            return r.status, json.loads(body) if body else None
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='replace')
        try:
            j = json.loads(body) if body else None
        except Exception:
            j = body
        return e.code, j
    except Exception as e:
        return None, {'error': str(e)}

results = {}

# === 17. Issues (all states) ===
print("=" * 70)
print("[17] Issues tracker audit")
print("=" * 70)
status, issues = gh('GET', f'/repos/{OWNER}/{REPO}/issues?state=all&per_page=100')
results['issues'] = []
if isinstance(issues, list):
    open_count = sum(1 for i in issues if i.get('state') == 'open')
    closed_count = sum(1 for i in issues if i.get('state') == 'closed')
    print(f"  Total: {len(issues)} (open={open_count}, closed={closed_count})")
    for i in issues:
        labels = [l.get('name') for l in (i.get('labels') or [])]
        results['issues'].append({
            'number': i.get('number'),
            'state': i.get('state'),
            'title': i.get('title'),
            'created_at': i.get('created_at'),
            'updated_at': i.get('updated_at'),
            'closed_at': i.get('closed_at'),
            'author': (i.get('user') or {}).get('login'),
            'labels': labels,
            'comments': i.get('comments', 0),
            'body_len': len(i.get('body') or ''),
            'html_url': i.get('html_url'),
        })
        print(f"  #{i.get('number'):3} [{i.get('state'):6}] {i.get('title', '')[:70]:70} by {(i.get('user') or {}).get('login')} comments={i.get('comments', 0)} labels={labels}")
else:
    print(f"  ERROR: {issues}")

# === 18. Pull requests (REST fallback) ===
print()
print("=" * 70)
print("[18] Pull requests")
print("=" * 70)
status, prs = gh('GET', f'/repos/{OWNER}/{REPO}/pulls?state=all&per_page=100')
results['pull_requests'] = prs if isinstance(prs, list) else {'_error': prs}
if isinstance(prs, list):
    print(f"  Total: {len(prs)}")
    for p in prs[:20]:
        print(f"  #{p.get('number')} [{p.get('state'):6}] {p.get('title', '')[:60]:60} by {(p.get('user') or {}).get('login')} head={p.get('head', {}).get('sha', '')[:8] if isinstance(p.get('head'), dict) else ''}")
else:
    print(f"  ERROR: {prs}")

# === 19. Releases ===
print()
print("=" * 70)
print("[19] Releases")
print("=" * 70)
status, rels = gh('GET', f'/repos/{OWNER}/{REPO}/releases')
results['releases'] = rels if isinstance(rels, list) else {'_error': rels}
if isinstance(rels, list):
    print(f"  Total: {len(rels)}")
    for r in rels:
        print(f"  - {r.get('tag_name')} name={r.get('name', '')[:50]} published={r.get('published_at')} draft={r.get('draft')} prerelease={r.get('prerelease')}")
else:
    print(f"  ERROR: {rels}")

# === 20. Tags (REST) ===
print()
print("=" * 70)
print("[20] Tags")
print("=" * 70)
status, tags = gh('GET', f'/repos/{OWNER}/{REPO}/tags')
results['tags'] = tags if isinstance(tags, list) else {'_error': tags}
if isinstance(tags, list):
    print(f"  Total: {len(tags)}")
    for t in tags:
        print(f"  - {t.get('name')} sha={(t.get('commit') or {}).get('sha', '')[:10]}")
else:
    print(f"  ERROR: {tags}")

# === 21. Dangling commit sweep — git ls-remote with token ===
print()
print("=" * 70)
print("[21] Dangling commit sweep — authenticated git fetch")
print("=" * 70)
# We already recovered cb27b1e and c36e6d9 in Phase 8. Now with the token,
# let's see if we can fetch more dangling SHAs.
# Strategy: enumerate the .git/objects/pack/ of the local cloned repo, look at
# all loose objects via git rev-list --all --objects, then try fetching each
# possible short SHA via the API. Or: do a "git fetch --all --tags --prune-tags
# --refetch" to be exhaustive.

LOCAL_REPO = '/home/z/my-project/audit/examforge-clone'
os.makedirs('/home/z/my-project/audit', exist_ok=True)

if not os.path.isdir(LOCAL_REPO):
    print(f"Cloning {OWNER}/{REPO} with token...")
    clone = subprocess.run(
        ['git', 'clone', f'https://x-access-token:{TOKEN}@github.com/{OWNER}/{REPO}.git', LOCAL_REPO],
        capture_output=True, text=True, timeout=60
    )
    if clone.returncode != 0:
        print(f"Clone failed: {clone.stderr[:500]}")
    else:
        print(f"Cloned to {LOCAL_REPO}")
else:
    print(f"Clone already exists at {LOCAL_REPO}")

# Get all known refs
print("\nAll refs in local clone:")
all_refs = subprocess.run(
    ['git', '-C', LOCAL_REPO, 'for-each-ref', '--format=%(objectname) %(refname)'],
    capture_output=True, text=True, timeout=15
)
all_sha_set = set()
if all_refs.returncode == 0:
    for line in all_refs.stdout.strip().split('\n'):
        sha, ref = line.split(' ', 1)
        all_sha_set.add(sha)
        print(f"  {sha[:10]} {ref}")

# Now: list ALL objects known to the repo (commits, trees, blobs, tags)
print("\nAll objects reachable from any ref:")
all_objects = subprocess.run(
    ['git', '-C', LOCAL_REPO, 'rev-list', '--all', '--objects'],
    capture_output=True, text=True, timeout=30
)
reachable_shas = set()
if all_objects.returncode == 0:
    for line in all_objects.stdout.strip().split('\n'):
        sha = line.split(' ', 1)[0]
        reachable_shas.add(sha)
    print(f"  Reachable from rev-list --all: {len(reachable_shas)} objects")

# Check for loose objects not referenced by anything
print("\nLoose + pack objects (fsck):")
fsck = subprocess.run(
    ['git', '-C', LOCAL_REPO, 'fsck', '--full', '--unreachable', '--dangling', '--no-reflogs'],
    capture_output=True, text=True, timeout=30
)
print(f"  fsck returncode: {fsck.returncode}")
dangling_objs = []
for line in fsck.stdout.strip().split('\n'):
    if line:
        print(f"  {line}")
        if 'dangling' in line or 'unreachable' in line:
            parts = line.split()
            if len(parts) >= 3:
                dangling_objs.append({'type': parts[0], 'sha': parts[2], 'kind': parts[1]})
results['dangling_objects'] = dangling_objs

# For each dangling commit, get its info via the GitHub API to see if it's recoverable
print(f"\n  Dangling objects found: {len(dangling_objs)}")
for d in dangling_objs:
    if d['type'] == 'commit':
        sha = d['sha']
        status, commit_data = gh('GET', f'/repos/{OWNER}/{REPO}/git/commits/{sha}')
        if status == 200 and isinstance(commit_data, dict):
            msg = (commit_data.get('message') or '').split('\n')[0][:80]
            author = ((commit_data.get('author') or {}).get('name')) or 'unknown'
            date = ((commit_data.get('author') or {}).get('date')) or ''
            print(f"    Dangling commit: {sha[:10]} by {author} on {date} — {msg}")
            d['message'] = msg
            d['author'] = author
            d['date'] = date
        else:
            print(f"    Dangling commit: {sha[:10]} — GitHub API returned {status}")
            d['api_status'] = status

# Save raw results
with open(f'{OUT_DIR}/phase11b_raw.json', 'w') as f:
    json.dump(results, f, indent=2, default=str)
print(f"\n{'='*70}")
print(f"Saved to {OUT_DIR}/phase11b_raw.json")
print(f"{'='*70}")
