#!/usr/bin/env python3
"""Authenticated API audit — tests key routes with a real user session,
verifying data access + role enforcement."""
import json, urllib.request, urllib.error, time

SUPABASE_URL = "[REDACTED]"
ANON_KEY = "[REDACTED]"
BASE = "http://localhost:3000/api"

def auth_request(email, password):
    """Sign in and get access token."""
    req = urllib.request.Request(
        f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        method="POST",
        data=json.dumps({"email": email, "password": password}).encode(),
    )
    req.add_header("apikey", ANON_KEY)
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode())

def api_call(method, path, token, body=None):
    """Call local API with auth token (as cookie-style Authorization)."""
    url = BASE + path
    req = urllib.request.Request(url, method=method)
    req.add_header("apikey", ANON_KEY)
    # The app uses Supabase SSR cookies; emulate via Authorization header
    # (requireApiAuth reads the Supabase session)
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    if body is not None:
        req.add_header("Content-Type", "application/json")
        data = json.dumps(body).encode()
    else:
        data = None

    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *a, **k):
            return None
    opener = urllib.request.build_opener(NoRedirect)
    start = time.time()
    try:
        with opener.open(req, timeout=30, data=data) as r:
            return r.status, r.read(250).decode(errors="replace"), round((time.time()-start)*1000)
    except urllib.error.HTTPError as e:
        try: b = e.read(250).decode(errors="replace")
        except: b = ""
        return e.code, b, round((time.time()-start)*1000)
    except Exception as e:
        return 0, str(e)[:80], round((time.time()-start)*1000)

def main():
    email = f"authaudit-{int(time.time())}@examforge-test.com"
    password = "AuditPass123!"

    # Create user
    req = urllib.request.Request(
        f"{SUPABASE_URL}/auth/v1/signup",
        method="POST",
        data=json.dumps({"email": email, "password": password}).encode(),
    )
    req.add_header("apikey", ANON_KEY)
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=30) as r:
        signup = json.loads(r.read().decode())
    print(f"test user: {email} ({signup['user']['id'][:8]})")

    # Login
    tokens = auth_request(email, password)
    token = tokens["access_token"]
    print(f"access token: {token[:25]}...\n")

    # Test routes WITH auth — student role
    tests = [
        # (method, path, expected behavior description)
        ("GET", "/student/progress", "student data"),
        ("GET", "/notifications/history", "own notifications"),
        ("GET", "/admin/users", "DENY: admin route for student"),
        ("GET", "/admin/audit-logs", "DENY: admin route for student"),
        ("GET", "/teacher/lesson-plans", "teacher route for student"),
        ("GET", "/parent/dashboard", "parent route for student"),
        ("GET", "/billing/subscriptions", "billing data"),
        ("GET", "/settings/api-keys", "own settings"),
        ("GET", "/marketplace/my-purchases", "own purchases"),
        ("GET", "/workflows", "workflows list"),
        ("GET", "/analytics", "analytics"),
        ("GET", "/student/practice", "practice data"),
        ("GET", "/student/flashcards", "flashcards"),
        ("GET", "/student/certificates", "certificates"),
        ("GET", "/student/study-planner", "study planner"),
        ("GET", "/student/revision-hub", "revision hub"),
        ("GET", "/cbt/session", "CBT session"),
        ("GET", "/health", "health check"),
    ]

    print(f"{'METHOD':7s} {'ROUTE':38s} {'STATUS':7s} {'LAT':6s} BODY")
    print("-" * 110)
    for method, path, desc in tests:
        status, body, lat = api_call(method, path, token)
        print(f"{method:7s} {path:38s} {status:<7d} {lat:<5d}ms {body[:75]}")

    # RLS verification — direct DB query as this user
    print("\n=== RLS VERIFICATION (anon key + user JWT via PostgREST) ===")
    for table in ["users", "exam_sessions", "fee_payments", "messages", "audit_logs"]:
        req = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/{table}?select=*&limit=3")
        req.add_header("apikey", ANON_KEY)
        req.add_header("Authorization", f"Bearer {token}")
        try:
            with urllib.request.urlopen(req, timeout=20) as r:
                rows = json.loads(r.read().decode())
                print(f"  {table:20s} → {len(rows)} rows visible (student RLS scope)")
        except urllib.error.HTTPError as e:
            print(f"  {table:20s} → HTTP {e.code} (RLS denied)")
        except Exception as e:
            print(f"  {table:20s} → {str(e)[:50]}")

if __name__ == "__main__":
    main()
