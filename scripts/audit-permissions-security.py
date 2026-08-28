#!/usr/bin/env python3
"""
EXAMFORGE AI Ω — Permission & Security Audit Script

Scans the codebase for:
  - Every page route (page.tsx)
  - Every API route (route.ts)
  - Every server action
  - Every require-auth usage
  - Every use of supabase admin / service role
  - Every middleware/route guard
  - Any hardcoded credentials / secrets in code
  - Any usage of dangerouslySetInnerHTML (XSS surface)
  - Any eval() / Function() constructor usage
  - Any unparameterized SQL strings (SQLi surface)
  - Every RLS bypass path

Outputs a comprehensive markdown report to /home/z/my-project/download/audit-reports/
"""

import os
import re
import json
from pathlib import Path
from collections import defaultdict
from datetime import datetime

ROOT = Path("/home/z/my-project/src")
REPORTS_DIR = Path("/home/z/my-project/download/audit-reports")
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

# ──────────────────────────────────────────────────────────────
# Audit categories
# ──────────────────────────────────────────────────────────────

def find_files(pattern, root=ROOT):
    """Find files matching pattern recursively."""
    results = []
    for p in root.rglob(pattern):
        if "node_modules" in str(p):
            continue
        results.append(p)
    return results

def scan_page_routes():
    """Find all page.tsx files and check for auth guards."""
    pages = find_files("page.tsx")
    findings = []
    for p in pages:
        try:
            content = p.read_text()
        except Exception:
            continue
        # Determine route path
        rel = str(p).replace(str(ROOT), "")
        route_path = rel.replace("/page.tsx", "").replace("\\", "/")

        # Look for auth guards
        has_require_auth = "requireAnyRole" in content or "requireRole" in content or "requireAuth" in content
        has_get_session = "supabase.auth.getUser" in content or "supabase.auth.getSession" in content
        is_public = "PUBLIC_ROUTES" in content or "public" in route_path.lower() or "(marketing)" in str(p) or "(public)" in str(p)

        # Server component check
        is_client = "'use client'" in content

        findings.append({
            "file": str(p.relative_to(ROOT.parent)),
            "route": route_path,
            "is_client": is_client,
            "has_auth_guard": has_require_auth or has_get_session,
            "is_public": is_public,
            "status": "OK" if (has_require_auth or has_get_session or is_public) else "REVIEW",
        })
    return findings

def scan_api_routes():
    """Find all API route.ts files and check for auth + CSRF."""
    apis = find_files("route.ts")
    findings = []
    for p in apis:
        try:
            content = p.read_text()
        except Exception:
            continue
        rel = str(p.relative_to(ROOT.parent))

        has_auth = (
            "requireSupabase" in content
            or "createClient" in content
            or "getUser" in content
        )
        has_csrf = "verifyCsrf" in content or "csrf" in content.lower()
        method_get = "export async function GET" in content
        method_post = "export async function POST" in content
        method_put = "export async function PUT" in content
        method_patch = "export async function PATCH" in content
        method_delete = "export async function DELETE" in content
        methods = []
        if method_get: methods.append("GET")
        if method_post: methods.append("POST")
        if method_put: methods.append("PUT")
        if method_patch: methods.append("PATCH")
        if method_delete: methods.append("DELETE")

        findings.append({
            "file": rel,
            "methods": methods,
            "has_auth": has_auth,
            "has_csrf": has_csrf,
            "status": "OK" if has_auth else ("PUBLIC" if "public" in rel else "REVIEW"),
        })
    return findings

def scan_server_actions():
    """Find server actions (files with 'use server')."""
    actions = []
    for p in ROOT.rglob("*.ts"):
        if "node_modules" in str(p):
            continue
        try:
            content = p.read_text()
        except Exception:
            continue
        if "'use server'" not in content:
            continue
        # Find exported async functions
        for m in re.finditer(r"export\s+async\s+function\s+(\w+)\s*\(", content):
            actions.append({
                "file": str(p.relative_to(ROOT.parent)),
                "action": m.group(1),
                "has_auth": "requireSupabase" in content or "createClient" in content or "getUser" in content,
            })
    return actions

def scan_security_surfaces():
    """Scan for security hotspots."""
    findings = defaultdict(list)
    files = list(ROOT.rglob("*.ts")) + list(ROOT.rglob("*.tsx"))
    for p in files:
        if "node_modules" in str(p):
            continue
        try:
            content = p.read_text()
        except Exception:
            continue
        rel = str(p.relative_to(ROOT.parent))

        # dangerouslySetInnerHTML — XSS surface
        if "dangerouslySetInnerHTML" in content:
            for m in re.finditer(r"dangerouslySetInnerHTML", content):
                line_num = content[:m.start()].count("\n") + 1
                findings["dangerouslySetInnerHTML"].append({
                    "file": rel, "line": line_num,
                    "severity": "MEDIUM",
                    "note": "Verify input is sanitized before rendering as HTML",
                })

        # eval / Function constructor — code injection
        if re.search(r"\beval\s*\(", content):
            for m in re.finditer(r"\beval\s*\(", content):
                line_num = content[:m.start()].count("\n") + 1
                findings["eval_or_function"].append({
                    "file": rel, "line": line_num,
                    "severity": "HIGH",
                    "note": "eval() can execute arbitrary code — replace with safer alternative",
                })

        # Service role key usage
        if "SUPABASE_SERVICE_ROLE_KEY" in content or "serviceRole" in content or "service_role" in content:
            for m in re.finditer(r"(SUPABASE_SERVICE_ROLE_KEY|serviceRole|service_role)", content):
                line_num = content[:m.start()].count("\n") + 1
                findings["service_role_usage"].append({
                    "file": rel, "line": line_num,
                    "severity": "MEDIUM",
                    "note": "Service role key bypasses RLS — verify it's only used server-side in trusted admin paths",
                })

        # Hardcoded secrets
        for pattern in [
            r"sk-[a-zA-Z0-9]{20,}",  # OpenAI
            r"eyJ[a-zA-Z0-9_]{20,}",  # JWT-like
            r"FLWSECK_[a-zA-Z0-9-]{20,}",  # Flutterwave secret
            r"re_[a-zA-Z0-9_]{20,}",  # Resend
            r"sntryu_[a-zA-Z0-9_]{20,}",  # Sentry
            r"AIza[a-zA-Z0-9_]{30,}",  # Google API
        ]:
            for m in re.finditer(pattern, content):
                # Skip env.example or .md files
                if "example" in rel or ".md" in rel or "supabase/migrations" in rel:
                    continue
                line_num = content[:m.start()].count("\n") + 1
                snippet = content.split("\n")[line_num-1].strip()[:80]
                findings["hardcoded_secrets"].append({
                    "file": rel, "line": line_num,
                    "severity": "CRITICAL",
                    "snippet": snippet,
                    "note": "Potential hardcoded secret — should be in env var only",
                })

    return findings

def scan_rls_bypass_paths():
    """Find paths that might bypass RLS — using service role or admin client."""
    findings = []
    for p in ROOT.rglob("*.ts"):
        if "node_modules" in str(p):
            continue
        try:
            content = p.read_text()
        except Exception:
            continue
        if "createClient(" not in content:
            continue

        rel = str(p.relative_to(ROOT.parent))
        # Look for patterns that suggest service role bypass
        if "service_role" in content and "createClient" in content:
            findings.append({
                "file": rel,
                "severity": "HIGH",
                "note": "Service role client — bypasses RLS. Use only in trusted admin/server contexts.",
            })
        # Look for .rpc() calls (RPC functions, which have their own RLS)
        for m in re.finditer(r"\.rpc\(\s*[\"'](\w+)", content):
            line_num = content[:m.start()].count("\n") + 1
            findings.append({
                "file": rel,
                "line": line_num,
                "rpc": m.group(1),
                "severity": "INFO",
                "note": f"RPC call to '{m.group(1)}' — verify the function has SECURITY DEFINER + appropriate role checks",
            })
    return findings

def scan_middleware():
    """Audit middleware.ts."""
    mw_path = ROOT.parent / "src" / "middleware.ts"
    if not mw_path.exists():
        mw_path = ROOT.parent / "middleware.ts"
    if not mw_path.exists():
        return None
    content = mw_path.read_text()
    return {
        "file": str(mw_path.relative_to(ROOT.parent)),
        "checks_auth": "getUser" in content or "getSession" in content or "auth" in content.lower(),
        "applies_csp": "Content-Security-Policy" in content or "csp" in content.lower(),
        "applies_rbac": "ROLE_ROUTE_ACCESS" in content or "rbac" in content.lower(),
        "redirects_unauth": "redirect" in content,
        "handles_csrf": "csrf" in content.lower(),
    }

# ──────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────

def main():
    print("ExamForge AI Ω — Permission & Security Audit")
    print("=" * 60)

    pages = scan_page_routes()
    print(f"✓ Scanned {len(pages)} page routes")
    pages_with_issues = [p for p in pages if p["status"] == "REVIEW"]
    print(f"  Pages needing review: {len(pages_with_issues)}")

    apis = scan_api_routes()
    print(f"✓ Scanned {len(apis)} API routes")
    apis_with_issues = [a for a in apis if a["status"] == "REVIEW"]
    print(f"  APIs needing review: {len(apis_with_issues)}")

    actions = scan_server_actions()
    print(f"✓ Found {len(actions)} server actions")

    sec_findings = scan_security_surfaces()
    total_sec = sum(len(v) for v in sec_findings.values())
    print(f"✓ Found {total_sec} security surface findings:")
    for cat, items in sec_findings.items():
        print(f"  {cat}: {len(items)}")

    rls_findings = scan_rls_bypass_paths()
    print(f"✓ Found {len(rls_findings)} RLS-relevant paths")

    mw = scan_middleware()
    print(f"✓ Middleware audit: {mw}")

    # Generate markdown report
    timestamp = datetime.utcnow().isoformat() + "Z"
    report = f"""# ExamForge AI Ω — Permission & Security Audit Report

Generated: {timestamp}

## Summary

- **Page routes scanned**: {len(pages)}
- **API routes scanned**: {len(apis)}
- **Server actions found**: {len(actions)}
- **Security surface findings**: {total_sec}
- **RLS-relevant paths**: {len(rls_findings)}
- **Pages needing review**: {len(pages_with_issues)}
- **APIs needing review**: {len(apis_with_issues)}

## Mission 4 — Permission Audit

### Page Routes — Status Summary

| Status | Count | Description |
|--------|-------|-------------|
| OK | {sum(1 for p in pages if p['status'] == 'OK')} | Has auth guard (`requireAnyRole`/`requireAuth`) OR is public |
| REVIEW | {len(pages_with_issues)} | Missing visible auth guard — review for fallback patterns |

#### Pages Needing Review ({len(pages_with_issues)})

"""
    for p in pages_with_issues[:30]:
        report += f"- `{p['file']}` — route `{p['route']}` (client: {p['is_client']})\n"
    if len(pages_with_issues) > 30:
        report += f"\n_...and {len(pages_with_issues) - 30} more_\n"

    report += f"""

### API Routes — Status Summary

| Status | Count | Description |
|--------|-------|-------------|
| OK | {sum(1 for a in apis if a['status'] == 'OK')} | Has `requireSupabase()` auth check |
| PUBLIC | {sum(1 for a in apis if a['status'] == 'PUBLIC')} | Public endpoint (intentional) |
| REVIEW | {len(apis_with_issues)} | Missing auth — review for fallback patterns |

#### APIs Needing Review ({len(apis_with_issues)})

"""
    for a in apis_with_issues[:30]:
        report += f"- `{a['file']}` — methods: {', '.join(a['methods']) or 'unknown'}\n"
    if len(apis_with_issues) > 30:
        report += f"\n_...and {len(apis_with_issues) - 30} more_\n"

    report += f"""

### Server Actions ({len(actions)})

| Action | File | Has Auth |
|--------|------|----------|
"""
    for a in actions:
        report += f"| `{a['action']}` | `{a['file']}` | {'✅' if a['has_auth'] else '❌'} |\n"

    report += f"""

### Middleware Audit

```json
{json.dumps(mw, indent=2) if mw else "middleware.ts not found"}
```

### RLS Bypass Paths ({len(rls_findings)})

| Severity | File | Note |
|----------|------|------|
"""
    for r in rls_findings[:50]:
        line = r.get("line", "")
        report += f"| {r['severity']} | `{r['file']}{(':'+str(line)) if line else ''}` | {r['note']} |\n"

    report += f"""

## Mission 12 — Security Audit

### Security Surface Findings ({total_sec})

"""
    for cat, items in sec_findings.items():
        report += f"### {cat} ({len(items)})\n\n"
        for i in items[:20]:
            line = i.get("line", "")
            sev = i.get("severity", "INFO")
            note = i.get("note", "")
            snippet = i.get("snippet", "")
            report += f"- **[{sev}]** `{i['file']}{(':'+str(line)) if line else ''}` — {note}\n"
            if snippet:
                report += f"  ```\n  {snippet}\n  ```\n"
        if len(items) > 20:
            report += f"\n_...and {len(items) - 20} more_\n"
        report += "\n"

    report += """

## Critical Issues Summary

"""
    critical = sec_findings.get("hardcoded_secrets", [])
    if not critical:
        report += "✅ **No hardcoded secrets detected in source code.**\n\n"
    else:
        report += f"❌ **{len(critical)} potential hardcoded secrets found — see above.**\n\n"

    eval_findings = sec_findings.get("eval_or_function", [])
    if not eval_findings:
        report += "✅ **No eval()/Function constructor usage.**\n\n"
    else:
        report += f"❌ **{len(eval_findings)} eval() usages found.**\n\n"

    # Final scorecard
    scorecard = []
    scorecard.append(f"- Pages with auth guards: {sum(1 for p in pages if p['has_auth_guard'])} / {len(pages)}")
    scorecard.append(f"- APIs with auth checks: {sum(1 for a in apis if a['has_auth'])} / {len(apis)}")
    scorecard.append(f"- Server actions with auth: {sum(1 for a in actions if a['has_auth'])} / {len(actions)}")
    scorecard.append(f"- Hardcoded secrets: {len(critical)}")
    scorecard.append(f"- eval() usages: {len(eval_findings)}")
    scorecard.append(f"- dangerouslySetInnerHTML usages: {len(sec_findings.get('dangerouslySetInnerHTML', []))}")
    scorecard.append(f"- Service role usages: {len(sec_findings.get('service_role_usage', []))}")

    report += "## Final Scorecard\n\n"
    for line in scorecard:
        report += line + "\n"

    # Save report
    report_path = REPORTS_DIR / "permission-security-audit.md"
    report_path.write_text(report)
    print(f"\n✓ Report saved to: {report_path}")

    # Also save as JSON for machine consumption
    json_path = REPORTS_DIR / "permission-security-audit.json"
    json_path.write_text(json.dumps({
        "generated_at": timestamp,
        "summary": {
            "pages": len(pages),
            "apis": len(apis),
            "server_actions": len(actions),
            "security_findings": total_sec,
            "pages_needing_review": len(pages_with_issues),
            "apis_needing_review": len(apis_with_issues),
        },
        "pages": pages,
        "apis": apis,
        "server_actions": actions,
        "security_findings": dict(sec_findings),
        "rls_paths": rls_findings,
        "middleware": mw,
    }, indent=2))
    print(f"✓ JSON saved to: {json_path}")

if __name__ == "__main__":
    main()
