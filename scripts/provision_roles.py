#!/usr/bin/env python3
"""Provision test users for each role via service-role API (admin provisioning flow)."""
import json, urllib.request, urllib.error, time

SUPABASE_URL = "[REDACTED]"
SERVICE_KEY = "[REDACTED]"

def api(method, path, body=None):
    req = urllib.request.Request(SUPABASE_URL + path, method=method)
    req.add_header("apikey", SERVICE_KEY)
    req.add_header("Authorization", "Bearer " + SERVICE_KEY)
    req.add_header("Content-Type", "application/json")
    data = json.dumps(body).encode() if body is not None else None
    with urllib.request.urlopen(req, timeout=30, data=data) as r:
        return json.loads(r.read().decode() or '{}')

def main():
    ts = int(time.time())
    users = [
        {"email": f"e2e-teacher-{ts}@examforge-test.com", "password": "Teacher123!", "full_name": "E2E Teacher", "role": "teacher"},
        {"email": f"e2e-parent-{ts}@examforge-test.com", "password": "Parent123!", "full_name": "E2E Parent", "role": "parent"},
        {"email": f"e2e-schooladmin-{ts}@examforge-test.com", "password": "SchoolAdmin123!", "full_name": "E2E School Admin", "role": "school_admin"},
    ]

    results = {}
    for u in users:
        # 1. Create auth user
        auth_user = api("POST", "/auth/v1/admin/users", {
            "email": u["email"],
            "password": u["password"],
            "email_confirm": True,
            "user_metadata": {"full_name": u["full_name"], "role": u["role"]},
            "app_metadata": {"role": u["role"]},
        })
        uid = auth_user["user"]["id"] if "user" in auth_user else auth_user.get("id")
        print(f"created {u['role']}: {u['email']} ({uid[:8]})")

        # 2. Upsert profile with role
        profile = api("PUT", "/rest/v1/users", {
            "id": uid,
            "email": u["email"],
            "full_name": u["full_name"],
            "role": u["role"],
            "is_active": True,
            "is_email_verified": True,
        })
        # Prefer POST with Prefer resolution
        req = urllib.request.Request(SUPABASE_URL + "/rest/v1/users", method="POST")
        req.add_header("apikey", SERVICE_KEY)
        req.add_header("Authorization", "Bearer " + SERVICE_KEY)
        req.add_header("Content-Type", "application/json")
        req.add_header("Prefer", "resolution=merge-duplicates")
        body = {
            "id": uid, "email": u["email"], "full_name": u["full_name"],
            "role": u["role"], "is_active": True, "is_email_verified": True,
        }
        with urllib.request.urlopen(req, timeout=30, data=json.dumps(body).encode()) as r:
            r.read()

        results[u["role"]] = {**u, "id": uid}

    # Save for later steps
    with open("/tmp/e2e_role_users.json", "w") as f:
        json.dump(results, f, indent=2)
    print("\nSaved: /tmp/e2e_role_users.json")
    for role, u in results.items():
        print(f"  {role}: {u['email']} / {u['password']}")

    # Link parent to the earlier student (prod-final user)
    # Get a student to link
    students = api("GET", "/rest/v1/users?role=eq.student&select=id,email&limit=2")
    if students:
        child = students[0]
        parent_id = results["parent"]["id"]
        try:
            link = api("POST", "/rest/v1/parent_children", {
                "parent_id": parent_id, "child_id": child["id"], "relationship": "parent",
            })
            print(f"\nparent-child link: {results['parent']['email']} → {child['email']}")
        except urllib.error.HTTPError as e:
            print(f"\nparent-child link failed: {e.read().decode()[:150]}")

if __name__ == "__main__":
    main()
