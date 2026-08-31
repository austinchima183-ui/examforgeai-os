#!/usr/bin/env python3
"""Ω-17: API Enterprise Audit — static analysis of every route.

Checks each route for:
  AUTH      — auth guard present (requireApiAuth / requireApiRole / requireAuth /
              requireApiAuthUnless... variants, or explicitly documented public)
  CSRF      — mutation handlers call a CSRF guard (now auto-exempt for GET)
  RATE      — rate limiting (apiRateLimit / rateLimit guard)
  ROLE      — role restriction where admin-scoped
  VALIDATE  — input validation on mutations (validateInput / schema / parseJsonBody)
  TRYCATCH  — error handling (try/catch present)
  LOGGING   — structured logging on errors

Output: JSON report + pass/fail summary. Repository = source of truth.
"""
import json
import re
from pathlib import Path

ROOT = Path("/home/z/my-project")
API = ROOT / "src" / "app" / "api"

AUTH_PATTERNS = [
    r"requireApiAuth\s*\(", r"requireApiRole\s*\(", r"requireAuth\s*\(",
    r"getAuthUser", r"\.auth\.getUser", r"\.auth\.getSession",
    r"getAuthContext", r"requireSession", r"requireFeature\s*\(",
    r"getUserFromRequest",
]
CSRF_PATTERNS = [r"enforceCsrf\s*\(", r"requireCsrf\s*\(", r"requireCsrfWithBody\s*\(", r"verifyCsrfToken\s*\("]
RATE_PATTERNS = [r"apiRateLimit\s*\(", r"RATE_LIMITS", r"rateLimit\s*\(", r"checkRateLimit"]
VALIDATE_PATTERNS = [r"validateInput\s*\(", r"parseJsonBody\s*\(", r"Schema", r"\.safeParse\s*\(", r"zod"]
ROLE_PATTERNS = [r"requireApiRole\s*\(", r"super_admin", r"school_admin", r"role\s*==="]
LOG_PATTERNS = [r"createLogger", r"log\.error", r"log\.warn", r"console\.error"]

MUTATION_RE = re.compile(r"export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)\s*\(")
HANDLER_RE = re.compile(r"export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s*\(")

routes = sorted(API.rglob("route.ts"))

report = {"total": len(routes), "routes": [], "summary": {}}
issues = {"no_auth": [], "mutation_no_csrf": [], "no_ratelimit": [], "mutation_no_validation": [], "no_trycatch": []}

for route in routes:
    rel = str(route.relative_to(ROOT))
    text = route.read_text(errors="ignore")
    handlers = HANDLER_RE.findall(text)
    mutations = [h for h in handlers if h in ("POST", "PUT", "PATCH", "DELETE")]
    gets = [h for h in handlers if h in ("GET", "HEAD")]

    has_auth = any(re.search(p, text) for p in AUTH_PATTERNS)
    has_csrf = any(re.search(p, text) for p in CSRF_PATTERNS)
    has_rate = any(re.search(p, text) for p in RATE_PATTERNS)
    has_validate = any(re.search(p, text) for p in VALIDATE_PATTERNS)
    has_role = any(re.search(p, text) for p in ROLE_PATTERNS)
    has_log = any(re.search(p, text) for p in LOG_PATTERNS)
    has_trycatch = "try {" in text or "try{" in text

    # Public-by-design routes (webhooks validate signatures instead of sessions;
    # health/csrf/newsletter/contact are documented public endpoints)
    rel_posix = str(route.relative_to(API).parent)
    is_webhook = "webhook" in rel_posix.lower()
    is_health = rel_posix == "health" or route.parent.name == "health"
    is_public_form = any(x in rel_posix for x in ("contact", "newsletter", "demo-booking", "marketing", "og"))
    is_cron = "cron" in rel_posix.lower()

    auth_ok = has_auth or is_webhook or is_health or is_public_form or is_cron
    csrf_ok = (not mutations) or has_csrf or is_webhook  # webhooks use signature verification

    entry = {
        "route": rel_posix,
        "handlers": handlers,
        "auth": auth_ok,
        "csrf": csrf_ok,
        "rate_limit": has_rate,
        "validation": has_validate,
        "role_check": has_role,
        "trycatch": has_trycatch,
        "logging": has_log,
        "public_by_design": (is_webhook or is_health or is_public_form or is_cron) and not has_auth,
    }
    report["routes"].append(entry)

    if not auth_ok:
        issues["no_auth"].append(rel_posix)
    if mutations and not csrf_ok:
        issues["mutation_no_csrf"].append(rel_posix)
    if not has_rate and not is_health:
        issues["no_ratelimit"].append(rel_posix)
    if mutations and not has_validate:
        issues["mutation_no_validation"].append(rel_posix)
    if not has_trycatch:
        issues["no_trycatch"].append(rel_posix)

report["summary"] = {
    "total_routes": len(routes),
    "routes_with_mutations": sum(1 for r in report["routes"] if any(h in ("POST","PUT","PATCH","DELETE") for h in r["handlers"])),
    "auth_ok": sum(1 for r in report["routes"] if r["auth"]),
    "csrf_ok_on_mutations": sum(1 for r in report["routes"] if r["csrf"]),
    "rate_limited": sum(1 for r in report["routes"] if r["rate_limit"]),
    "validation_present": sum(1 for r in report["routes"] if r["validation"]),
    "issues": {k: len(v) for k, v in issues.items()},
    "issue_detail": issues,
}

out = ROOT / "download/verification/audit/api-enterprise-audit.json"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(report, indent=2))

print(json.dumps(report["summary"], indent=2)[:3000])
