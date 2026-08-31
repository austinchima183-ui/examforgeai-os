#!/usr/bin/env python3
"""OMEGA AUDIT: Authenticated API audit against a target (local or production).
Logs in as each of the 5 roles via Supabase password grant, then probes key APIs.
Produces a pass/fail matrix with HTTP codes and error details."""
import json
import os
import sys
import urllib.request
import urllib.error
from pathlib import Path

ROOT = Path("/home/z/my-project")
env = {}
for f in [ROOT / ".env.local", ROOT / ".env"]:
    if f.exists():
        for line in f.read_text().splitlines():
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                env.setdefault(k, v.strip())

SUPA_URL = env["NEXT_PUBLIC_SUPABASE_URL"]
SUPA_ANON = env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]

TARGET = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000"

TEST_USERS = {
    "student": ("prod-final-1787626351@examforge-test.com", "SecurePass123!"),
    "teacher": ("e2e-teacher-1787626988@examforge-test.com", "Teacher123!"),
    "parent": ("e2e-parent-1787626988@examforge-test.com", "Parent123!"),
    "school_admin": ("e2e-schooladmin-1787626988@examforge-test.com", "SchoolAdmin123!"),
    "super_admin": ("e2e-superadmin@examforge-test.com", "SuperAdmin123!"),
}

# API endpoints per role — the ones backing landing-page promises
ENDPOINTS = {
    "student": [
        ("GET", "/api/health"),
        ("GET", "/api/student/dashboard"),
        ("GET", "/api/student/exams"),
        ("GET", "/api/student/results"),
        ("GET", "/api/ai/student"),
        ("GET", "/api/notifications"),
        ("GET", "/api/student/study-plan"),
        ("GET", "/api/student/flashcards"),
    ],
    "teacher": [
        ("GET", "/api/teacher/dashboard"),
        ("GET", "/api/teacher/classes"),
        ("GET", "/api/teacher/exams"),
        ("GET", "/api/teacher/questions"),
        ("GET", "/api/teacher/students"),
        ("GET", "/api/ai/teacher"),
        ("GET", "/api/teacher/lesson-plans"),
        ("GET", "/api/teacher/analytics"),
    ],
    "parent": [
        ("GET", "/api/parent/dashboard"),
        ("GET", "/api/parent/children"),
        ("GET", "/api/parent/results"),
        ("GET", "/api/ai/parent"),
        ("GET", "/api/notifications"),
    ],
    "school_admin": [
        ("GET", "/api/school/dashboard"),
        ("GET", "/api/school/students"),
        ("GET", "/api/school/teachers"),
        ("GET", "/api/school/classes"),
        ("GET", "/api/school/subjects"),
        ("GET", "/api/ai/school-admin"),
        ("GET", "/api/school/attendance"),
        ("GET", "/api/school/analytics"),
        ("GET", "/api/billing/invoices"),
        ("GET", "/api/marketplace/products"),
    ],
    "super_admin": [
        ("GET", "/api/admin/dashboard"),
        ("GET", "/api/admin/organizations"),
        ("GET", "/api/admin/users"),
        ("GET", "/api/admin/audit-logs"),
        ("GET", "/api/admin/subscriptions"),
        ("GET", "/api/ai/predictive"),
        ("GET", "/api/admin/system-health"),
    ],
}


def login(email, password):
    body = json.dumps({"email": email, "password": password}).encode()
    req = urllib.request.Request(
        f"{SUPA_URL}/auth/v1/token?grant_type=password",
        data=body,
        headers={"apikey": SUPA_ANON, "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            data = json.load(r)
            return data.get("access_token")
    except urllib.error.HTTPError as e:
        print(f"LOGIN FAIL {email}: HTTP {e.code} {e.read().decode()[:150]}")
        return None


def probe(method, path, token):
    req = urllib.request.Request(
        TARGET + path,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            body = r.read().decode(errors="replace")[:300]
            return r.status, body
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode(errors="replace")[:300]
    except Exception as e:
        return 0, str(e)[:200]


def main():
    print(f"Target: {TARGET}\n")
    results = {}
    for role, (email, password) in TEST_USERS.items():
        token = login(email, password)
        if not token:
            results[role] = {"LOGIN": "FAIL"}
            continue
        results[role] = {}
        print(f"── {role} ──")
        for method, path in ENDPOINTS.get(role, []):
            status, body = probe(method, path, token)
            ok = 200 <= status < 300
            results[role][path] = {"status": status, "ok": ok}
            mark = "✓" if ok else "✗"
            detail = "" if ok else f" — {body[:120]}"
            print(f"  {mark} {status} {path}{detail}")
        print()

    # Summary
    total = sum(len(v) for v in results.values())
    passed = sum(1 for v in results.values() for x in v.values() if x.get("ok"))
    print(f"═══ SUMMARY: {passed}/{total} API checks passed ═══")

    out = ROOT / "download/verification/audit/api-audit.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps({"target": TARGET, "results": results}, indent=2))
    print(f"Saved: {out}")


if __name__ == "__main__":
    main()
