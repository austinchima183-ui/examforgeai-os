#!/usr/bin/env python3
"""
Phase 11: GitHub-Native Security Audit + Dangling Commit Sweep
Read-only discovery — no mutations to the repo state.
"""
import json
import os
import sys
import subprocess
import urllib.request
import urllib.error
from datetime import datetime

TOKEN = open('/home/z/my-project/.secrets/github_token').read().strip()
OWNER = 'austinchima183-ui'
REPO = 'examforgeai'
OUT_DIR = '/home/z/my-project/audit/phase11'
os.makedirs(OUT_DIR, exist_ok=True)

def gh(method, path, raw=False, want_scopes=False):
    """Authenticated GitHub REST call."""
    url = f"https://api.github.com{path}"
    if raw:
        url = path  # caller passed full URL
    req = urllib.request.Request(url, method=method, headers={
        'Authorization': f'token {TOKEN}',
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'phase11-audit/1.0',
    })
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            body = r.read().decode('utf-8', errors='replace')
            scopes = r.headers.get('X-OAuth-Scopes', '')
            return r.status, json.loads(body) if body and body != '' else None, scopes
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='replace')
        try:
            j = json.loads(body) if body else None
        except Exception:
            j = body
        return e.code, j, e.headers.get('X-OAuth-Scopes', '') if hasattr(e, 'headers') else ''
    except Exception as e:
        return None, {'error': str(e)}, ''

def gh_graphql(query):
    """GraphQL call."""
    req = urllib.request.Request(
        'https://api.github.com/graphql',
        data=json.dumps({'query': query}).encode(),
        method='POST',
        headers={
            'Authorization': f'token {TOKEN}',
            'Content-Type': 'application/json',
            'User-Agent': 'phase11-audit/1.0',
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, json.loads(r.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode('utf-8', errors='replace'))
    except Exception as e:
        return None, {'error': str(e)}

results = {}

print("=" * 70)
print("PHASE 11: GITHUB-NATIVE SECURITY AUDIT")
print("=" * 70)

# === 1. Token scopes ===
status, _, scopes = gh('GET', '/user')
results['token_scopes'] = scopes.strip()
print(f"\n[1] Token scopes: {scopes.strip() or '(none — public-only access)'}")

# === 2. Repo top-level metadata ===
status, repo_meta, _ = gh('GET', f'/repos/{OWNER}/{REPO}')
results['repo_metadata'] = {
    'name': repo_meta.get('name'),
    'private': repo_meta.get('private'),
    'default_branch': repo_meta.get('default_branch'),
    'created_at': repo_meta.get('created_at'),
    'pushed_at': repo_meta.get('pushed_at'),
    'size_kb': repo_meta.get('size'),
    'allow_squash': repo_meta.get('allow_squash_merge'),
    'allow_merge': repo_meta.get('allow_merge_commit'),
    'allow_rebase': repo_meta.get('allow_rebase_merge'),
    'allow_auto_merge': repo_meta.get('allow_auto_merge'),
    'allow_update_branch': repo_meta.get('allow_update_branch'),
    'delete_branch_on_merge': repo_meta.get('delete_branch_on_merge'),
    'has_issues': repo_meta.get('has_issues'),
    'has_wiki': repo_meta.get('has_wiki'),
    'has_pages': repo_meta.get('has_pages'),
    'has_projects': repo_meta.get('has_projects'),
    'has_downloads': repo_meta.get('has_downloads'),
    'archived': repo_meta.get('archived'),
    'disabled': repo_meta.get('disabled'),
    'visibility': repo_meta.get('visibility'),
    'security_and_analysis': repo_meta.get('security_and_analysis'),
    'web_commit_signoff_required': repo_meta.get('web_commit_signoff_required'),
}
print(f"\n[2] Repo: private={repo_meta.get('private')}, default_branch={repo_meta.get('default_branch')}, "
      f"size={repo_meta.get('size')}KB, signoff_required={repo_meta.get('web_commit_signoff_required')}")
print(f"    Merge modes: squash={repo_meta.get('allow_squash_merge')}, "
      f"merge={repo_meta.get('allow_merge_commit')}, rebase={repo_meta.get('allow_rebase_merge')}")
print(f"    Security & analysis: {repo_meta.get('security_and_analysis')}")

# === 3. Branches + protection ===
status, branches, _ = gh('GET', f'/repos/{OWNER}/{REPO}/branches')
results['branches'] = []
print(f"\n[3] Branches ({len(branches) if isinstance(branches, list) else 'err'}):")
if isinstance(branches, list):
    for b in branches:
        bname = b.get('name')
        protected = b.get('protected', False)
        # Fetch protection details
        pstatus, prot, _ = gh('GET', f'/repos/{OWNER}/{REPO}/branches/{bname}/protection')
        protection_detail = None
        if pstatus == 200 and isinstance(prot, dict):
            protection_detail = {
                'required_status_checks': bool(prot.get('required_status_checks')),
                'enforce_admins': bool(prot.get('enforce_admins')),
                'required_pull_request_reviews': bool(prot.get('required_pull_request_reviews')),
                'restrictions': bool(prot.get('restrictions')),
                'allow_force_pushes': bool((prot.get('allow_force_pushes') or {}).get('enabled')),
                'allow_deletions': bool((prot.get('allow_deletions') or {}).get('enabled')),
                'required_linear_history': bool((prot.get('required_linear_history') or {}).get('enabled')),
                'block_creations': bool((prot.get('required_linear_history') or {}).get('block_creations')),
            }
        elif pstatus == 404:
            protection_detail = None  # no protection
        else:
            protection_detail = {'_error': f'HTTP {pstatus}'}
        results['branches'].append({
            'name': bname,
            'protected': protected,
            'commit_sha': (b.get('commit') or {}).get('sha'),
            'commit_msg': ((b.get('commit') or {}).get('commit') or {}).get('message', '')[:80],
            'protection': protection_detail,
        })
        print(f"    - {bname:20} protected={protected} protection={protection_detail is not None}")
else:
    print(f"    ERROR: {branches}")

# === 4. Collaborators ===
status, collabs, _ = gh('GET', f'/repos/{OWNER}/{REPO}/collaborators')
results['collaborators'] = []
print(f"\n[4] Collaborators ({len(collabs) if isinstance(collabs, list) else 'err'}):")
if isinstance(collabs, list):
    for c in collabs:
        login = c.get('login')
        # Get affiliation + permissions
        pstatus, perm, _ = gh('GET', f'/repos/{OWNER}/{REPO}/collaborators/{login}/permission')
        results['collaborators'].append({
            'login': login,
            'id': c.get('id'),
            'site_admin': c.get('site_admin'),
            'permission': (perm or {}).get('permission') if isinstance(perm, dict) else None,
            'role_name': (perm or {}).get('role_name') if isinstance(perm, dict) else None,
            'user_view_type': c.get('user_view_type'),
        })
        print(f"    - {login:25} perm={((perm or {}).get('permission')) if isinstance(perm, dict) else 'n/a'} "
              f"role={((perm or {}).get('role_name')) if isinstance(perm, dict) else 'n/a'}")
else:
    print(f"    ERROR: {collabs}")

# === 5. Deploy keys ===
status, keys, _ = gh('GET', f'/repos/{OWNER}/{REPO}/keys')
results['deploy_keys'] = keys if isinstance(keys, list) else {'_error': keys}
print(f"\n[5] Deploy keys ({len(keys) if isinstance(keys, list) else 'err'}):")
if isinstance(keys, list):
    for k in keys:
        # Truncate key value — keep fingerprint only
        print(f"    - id={k.get('id')} title={k.get('title')!r} "
              f"read_only={k.get('read_only')} added={k.get('created_at')} "
              f"key_fingerprint={(k.get('key') or '')[:30]}…")
else:
    print(f"    ERROR: {keys}")

# === 6. Webhooks ===
status, hooks, _ = gh('GET', f'/repos/{OWNER}/{REPO}/hooks')
results['webhooks'] = []
print(f"\n[6] Webhooks ({len(hooks) if isinstance(hooks, list) else 'err'}):")
if isinstance(hooks, list):
    for h in hooks:
        config = h.get('config', {})
        results['webhooks'].append({
            'id': h.get('id'),
            'url': config.get('url'),
            'content_type': config.get('content_type'),
            'events': h.get('events'),
            'active': h.get('active'),
            'type': h.get('type'),
            'last_response': h.get('last_response'),
            'config_has_secret': bool(config.get('secret')) if isinstance(config, dict) else False,
        })
        print(f"    - id={h.get('id')} url={config.get('url')!r} "
              f"events={h.get('events')} active={h.get('active')} "
              f"last_response={h.get('last_response')} has_secret={bool(config.get('secret'))}")
else:
    print(f"    ERROR: {hooks}")

# === 7. Actions secrets (names only) ===
status, secrets, _ = gh('GET', f'/repos/{OWNER}/{REPO}/actions/secrets')
results['actions_secrets'] = secrets if isinstance(secrets, dict) else {'_error': secrets}
print(f"\n[7] Actions secrets:")
if isinstance(secrets, dict):
    secs = secrets.get('secrets', [])
    print(f"    Count: {len(secs)}")
    for s in secs:
        print(f"    - {s.get('name')} created={s.get('created_at')} updated={s.get('updated_at')}")
else:
    print(f"    ERROR: {secrets}")

# === 8. Actions variables ===
status, variables, _ = gh('GET', f'/repos/{OWNER}/{REPO}/actions/variables')
results['actions_variables'] = variables if isinstance(variables, dict) else {'_error': variables}
print(f"\n[8] Actions variables:")
if isinstance(variables, dict):
    vs = variables.get('variables', [])
    print(f"    Count: {len(vs)}")
    for v in vs:
        # Variables can contain values; mask value
        val = v.get('value', '')
        masked = val if len(val) <= 12 else (val[:4] + '…' + val[-4:])
        print(f"    - {v.get('name')} = {masked}")
else:
    print(f"    ERROR: {variables}")

# === 9. Dependabot alerts (if enabled) ===
status, deps, _ = gh('GET', f'/repos/{OWNER}/{REPO}/dependabot/alerts')
print(f"\n[9] Dependabot alerts:")
if status == 200 and isinstance(deps, list):
    open_count = sum(1 for d in deps if d.get('state') == 'open')
    dism_count = sum(1 for d in deps if d.get('state') == 'dismissed')
    fixed_count = sum(1 for d in deps if d.get('state') == 'fixed')
    print(f"    Total: {len(deps)} (open={open_count}, dismissed={dism_count}, fixed={fixed_count})")
    results['dependabot_alerts_summary'] = {'total': len(deps), 'open': open_count, 'dismissed': dism_count, 'fixed': fixed_count}
else:
    print(f"    Not available (status={status}); likely disabled or no alerts")
    results['dependabot_alerts_summary'] = {'_status': status, '_note': 'disabled or no alerts'}

# === 10. Secret scanning alerts ===
status, ss, _ = gh('GET', f'/repos/{OWNER}/{REPO}/secret-scanning/alerts')
print(f"\n[10] Secret scanning alerts:")
if status == 200 and isinstance(ss, list):
    print(f"    Total: {len(ss)}")
    for s in ss[:10]:
        print(f"    - state={s.get('state')} resolution={s.get('resolution')} "
              f"secret_type={(s.get('secret_type_display_name') or s.get('secret_type'))} "
              f"created={s.get('created_at')}")
    results['secret_scanning_alerts'] = ss[:20]
else:
    print(f"    Not available (status={status}); likely disabled or no alerts")
    results['secret_scanning_alerts'] = {'_status': status, '_note': 'disabled or no alerts'}

# === 11. Code scanning alerts ===
status, cs, _ = gh('GET', f'/repos/{OWNER}/{REPO}/code-scanning/alerts')
print(f"\n[11] Code scanning alerts:")
if status == 200 and isinstance(cs, list):
    print(f"    Total: {len(cs)}")
    results['code_scanning_alerts_summary'] = {'total': len(cs)}
else:
    print(f"    Not available (status={status}); likely disabled")
    results['code_scanning_alerts_summary'] = {'_status': status, '_note': 'disabled or no alerts'}

# === 12. Recent commits + signature verification ===
status, commits, _ = gh('GET', f'/repos/{OWNER}/{REPO}/commits?per_page=30')
results['commits'] = []
print(f"\n[12] Recent 30 commits + signature verification:")
if isinstance(commits, list):
    signed_count = 0
    verified_count = 0
    for c in commits:
        vinfo = ((c.get('commit') or {}).get('verification') or {})
        is_verified = vinfo.get('verified', False)
        reason = vinfo.get('reason', 'unknown')
        sig_present = bool(vinfo.get('signature'))
        if sig_present:
            signed_count += 1
        if is_verified:
            verified_count += 1
        sha = c.get('sha', '')[:8]
        msg = ((c.get('commit') or {}).get('message') or '').split('\n')[0][:60]
        author = (((c.get('commit') or {}).get('author') or {}).get('name')) or 'unknown'
        date = ((c.get('commit') or {}).get('author') or {}).get('date', '')
        results['commits'].append({
            'sha': c.get('sha'),
            'short_sha': sha,
            'message_first_line': msg,
            'author': author,
            'date': date,
            'signature_present': sig_present,
            'verified': is_verified,
            'verification_reason': reason,
        })
        marker = '✓' if is_verified else ('✗' if sig_present and not is_verified else '·')
        print(f"    [{marker}] {sha} {date} {author:20} {msg}")
    print(f"    Summary: {signed_count} signed / {verified_count} verified / {len(commits)} total")
    results['commit_signature_summary'] = {
        'total': len(commits),
        'signed': signed_count,
        'verified': verified_count,
        'unsigned': len(commits) - signed_count,
    }
else:
    print(f"    ERROR: {commits}")

# === 13. GitHub Actions workflows ===
status, wfs, _ = gh('GET', f'/repos/{OWNER}/{REPO}/actions/workflows')
print(f"\n[13] GitHub Actions workflows:")
results['actions_workflows'] = []
if isinstance(wfs, dict):
    workflows = wfs.get('workflows', [])
    print(f"    Count: {len(workflows)}")
    for w in workflows:
        results['actions_workflows'].append({
            'name': w.get('name'),
            'path': w.get('path'),
            'state': w.get('state'),
            'created_at': w.get('created_at'),
            'updated_at': w.get('updated_at'),
        })
        print(f"    - {w.get('name')} path={w.get('path')} state={w.get('state')}")
else:
    print(f"    ERROR: {wfs}")

# === 14. All refs (heads + tags + anything else) ===
status, refs, _ = gh('GET', f'/repos/{OWNER}/{REPO}/git/refs?per_page=100')
print(f"\n[14] All refs (refs/*):")
results['refs'] = []
if isinstance(refs, list):
    print(f"    Total refs: {len(refs)}")
    for r in refs:
        results['refs'].append({
            'ref': r.get('ref'),
            'sha': r.get('object', {}).get('sha'),
            'type': r.get('object', {}).get('type'),
        })
        print(f"    - {r.get('ref')} -> {r.get('object', {}).get('sha')[:10]} ({r.get('object', {}).get('type')})")
else:
    print(f"    ERROR: {refs}")

# === 15. Dangling commit sweep via git ls-remote + GraphQL danglingCommits ===
print(f"\n[15] Dangling commit sweep (authenticated):")
# Use git ls-remote to get all refs (some may be hidden from REST API)
try:
    ls_remote = subprocess.run(
        ['git', 'ls-remote', f'https://{TOKEN}@github.com/{OWNER}/{REPO}.git'],
        capture_output=True, text=True, timeout=30,
        env={**os.environ, 'GIT_TERMINAL_PROMPT': '0', 'GIT_ASKPASS': 'echo'}
    )
    if ls_remote.returncode == 0:
        all_refs = ls_remote.stdout.strip().split('\n') if ls_remote.stdout.strip() else []
        print(f"    git ls-remote returned {len(all_refs)} refs (incl. internal refs like refs/pull/*)")
        results['git_ls_remote_refs'] = [r.split('\t') for r in all_refs]
        # Pull requests refs can expose PR head SHAs that might lead to dangling commits
        pr_heads = [r for r in all_refs if 'refs/pull/' in r and r.endswith('head')]
        print(f"    PR head refs found: {len(pr_heads)}")
        for r in pr_heads[:10]:
            sha, ref = r.split('\t')
            print(f"      {sha[:10]} {ref}")
    else:
        print(f"    git ls-remote FAILED: {ls_remote.stderr[:200]}")
        results['git_ls_remote_refs'] = {'_error': ls_remote.stderr[:500]}
except Exception as e:
    print(f"    git ls-remote EXCEPTION: {e}")
    results['git_ls_remote_refs'] = {'_error': str(e)}

# GraphQL dangling refs query (only works on the REST API's recent commits — for older dangling
# objects we already used git fetch in Phase 8). Use the GraphQL `repository.refs` for a complete
# enumeration here.
print(f"\n    GraphQL enumeration of all refs:")
gql_query = """
query {
  repository(owner: "%s", name: "%s") {
    id
    refs(refPrefix: "") {
      totalCount
      nodes {
        name
        prefix
        target {
          oid
          ... on Commit {
            committedDate
            message
          }
          ... on Tag {
            tagger { name }
            target { oid }
          }
        }
      }
    }
    pullRequests(states: [OPEN, CLOSED, MERGED], first: 50) {
      totalCount
      nodes {
        number
        title
        state
        headRefName
        headRefOid
        mergedAt
        author { login }
      }
    }
  }
}
""" % (OWNER, REPO)
gql_status, gql_data = gh_graphql(gql_query)
if gql_status == 200 and gql_data.get('data'):
    repo = gql_data['data'].get('repository') or {}
    refs_field = repo.get('refs') or {}
    print(f"      refs totalCount: {refs_field.get('totalCount', 0)}")
    for ref in (refs_field.get('nodes') or [])[:20]:
        oid = (ref.get('target') or {}).get('oid', 'unknown')[:10] if ref.get('target') else 'unknown'
        print(f"      {ref.get('prefix')}{ref.get('name')} -> {oid}")
    prs = repo.get('pullRequests') or {}
    print(f"      pull requests totalCount: {prs.get('totalCount', 0)}")
    for pr in (prs.get('nodes') or [])[:10]:
        print(f"        #{pr.get('number')} {pr.get('state', ''):8} {(pr.get('headRefOid') or '')[:10]} {(pr.get('title') or '')[:60]}")
    results['graphql_refs'] = refs_field
    results['graphql_pull_requests'] = prs
    if gql_data.get('errors'):
        results['graphql_errors'] = gql_data['errors']
        print(f"      GraphQL errors: {gql_data['errors']}")
else:
    print(f"      GraphQL FAILED: status={gql_status} body={str(gql_data)[:400]}")
    results['graphql_refs'] = gql_data

# === 15b. Fetch detailed code scanning alerts ===
print(f"\n[15b] Code scanning alerts (first 30, full detail):")
status, cs_detail, _ = gh('GET', f'/repos/{OWNER}/{REPO}/code-scanning/alerts?per_page=50')
results['code_scanning_alerts_detail'] = []
if status == 200 and isinstance(cs_detail, list):
    print(f"    Fetched {len(cs_detail)} alerts")
    severity_count = {}
    for a in cs_detail:
        sev = (a.get('rule') or {}).get('security_severity_level') or 'unknown'
        severity_count[sev] = severity_count.get(sev, 0) + 1
        results['code_scanning_alerts_detail'].append({
            'number': a.get('number'),
            'state': a.get('state'),
            'rule_id': (a.get('rule') or {}).get('id'),
            'rule_name': (a.get('rule') or {}).get('name'),
            'severity': (a.get('rule') or {}).get('severity'),
            'security_severity_level': sev,
            'description': (a.get('rule') or {}).get('description'),
            'tool': (a.get('tool') or {}).get('name'),
            'path': (a.get('most_recent_instance') or {}).get('location', {}).get('path'),
            'created_at': a.get('created_at'),
            'html_url': a.get('html_url'),
        })
    print(f"    Severity: {severity_count}")
    # Print first 10
    for a in cs_detail[:10]:
        r = a.get('rule') or {}
        mi = a.get('most_recent_instance') or {}
        loc = mi.get('location') or {}
        print(f"    #{a.get('number')} {a.get('state'):8} {r.get('security_severity_level') or 'n/a':8} "
              f"{r.get('id', '')[:50]} at {loc.get('path')}")
else:
    print(f"    ERROR: status={status} body={str(cs_detail)[:200]}")

# === 15c. Fetch detailed secret scanning alerts ===
print(f"\n[15c] Secret scanning alerts (full detail, locations):")
status, ss_detail, _ = gh('GET', f'/repos/{OWNER}/{REPO}/secret-scanning/alerts?per_page=50')
results['secret_scanning_alerts_detail'] = []
if status == 200 and isinstance(ss_detail, list):
    print(f"    Fetched {len(ss_detail)} alerts")
    for a in ss_detail:
        # Locations
        locs_url = a.get('locations_url')
        locs = []
        if locs_url:
            lstatus, lbody, _ = gh('GET', locs_url, raw=True)
            if lstatus == 200 and isinstance(lbody, list):
                for l in lbody[:3]:
                    details = (l.get('details') or {})
                    locs.append({
                        'path': details.get('path'),
                        'start_line': details.get('start_line'),
                        'end_line': details.get('end_line'),
                        'start_column': details.get('start_column'),
                        'end_column': details.get('end_column'),
                    })
        # Don't capture the secret itself
        alert = {
            'number': a.get('number'),
            'state': a.get('state'),
            'secret_type': a.get('secret_type'),
            'secret_type_display_name': a.get('secret_type_display_name'),
            'resolution': a.get('resolution'),
            'created_at': a.get('created_at'),
            'updated_at': a.get('updated_at'),
            'push_protection_status': a.get('push_protection_status'),
            'locations': locs,
            # DO NOT include 'secret' — keep it redacted
        }
        results['secret_scanning_alerts_detail'].append(alert)
        print(f"    #{alert['number']} state={alert['state']} type={alert['secret_type_display_name']} "
              f"created={alert['created_at']} resolution={alert['resolution']} push_prot={alert['push_protection_status']}")
        for l in locs[:2]:
            print(f"        loc: {l.get('path')} L{l.get('start_line')}-{l.get('end_line')}")
else:
    print(f"    ERROR: status={status} body={str(ss_detail)[:200]}")

# === 15d. Fetch raw workflow YAML files ===
print(f"\n[15d] Workflow YAML contents:")
results['workflow_files'] = {}
for wf in (results.get('actions_workflows') or []):
    path = wf.get('path')
    if not path:
        continue
    # Try raw fetch via contents API
    wstatus, wbody, _ = gh('GET', f'/repos/{OWNER}/{REPO}/contents/{path}')
    if wstatus == 200 and isinstance(wbody, dict) and wbody.get('encoding') == 'base64':
        import base64
        content = base64.b64decode(wbody['content']).decode('utf-8', errors='replace')
        results['workflow_files'][path] = content
        # Print first 40 lines of each
        lines = content.split('\n')
        print(f"\n    --- {path} ({len(lines)} lines) ---")
        for line in lines[:40]:
            print(f"    | {line}")
        if len(lines) > 40:
            print(f"    | ... ({len(lines) - 40} more lines)")
    else:
        print(f"    FAILED {path}: status={wstatus} body={str(wbody)[:200]}")
        results['workflow_files'][path] = f"FAILED: {wstatus}"

# === 16. Events (recent repo activity) ===
status, events, _ = gh('GET', f'/repos/{OWNER}/{REPO}/events?per_page=30')
print(f"\n[16] Recent repo events:")
results['events_summary'] = {}
if isinstance(events, list):
    by_type = {}
    for e in events:
        t = e.get('type', 'unknown')
        by_type[t] = by_type.get(t, 0) + 1
    print(f"    Total events returned: {len(events)}")
    print(f"    By type: {by_type}")
    results['events_summary'] = {'total_returned': len(events), 'by_type': by_type}
else:
    print(f"    ERROR: {events}")

# === Save raw JSON ===
with open(f'{OUT_DIR}/phase11_raw.json', 'w') as f:
    json.dump(results, f, indent=2, default=str)
print(f"\n{'='*70}")
print(f"Raw results saved to {OUT_DIR}/phase11_raw.json")
print(f"{'='*70}")
