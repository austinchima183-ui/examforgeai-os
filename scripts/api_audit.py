#!/usr/bin/env python3
"""Comprehensive API route audit — tests every route's HTTP method behavior
against the local dev server. Documents status codes, auth requirements,
and response shapes."""
import json, urllib.request, urllib.error, time, sys, os
from concurrent.futures import ThreadPoolExecutor

BASE = os.environ.get("BASE_URL", "http://localhost:3000")
# Anon (no auth) request — verifies auth guards work
ANON_KEY = "[REDACTED]"

def find_routes():
    routes = []
    for root, dirs, files in os.walk("src/app/api"):
        if "route.ts" in files:
            rel = os.path.relpath(root, "src/app/api")
            path = "/" + rel.replace(os.sep, "/")
            path = path.replace("/(api)", "")
            routes.append(path)
    return sorted(routes)

def get_methods(route_path):
    """Extract exported HTTP methods from route.ts source."""
    fs_path = os.path.join("src/app/api", route_path.lstrip("/"), "route.ts")
    try:
        src = open(fs_path).read()
    except FileNotFoundError:
        return []
    methods = []
    for m in ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]:
        if f"export async function {m}" in src or f"export function {m}" in src:
            methods.append(m)
    return methods

def test_route(route_path, method):
    """Test a single route+method with anon auth."""
    url = BASE + route_path
    # Skip routes with dynamic params (need specific IDs)
    if "[" in route_path:
        return {"route": route_path, "method": method, "status": "DYNAMIC", "latency": 0,
                "note": "requires param — tested separately"}

    req = urllib.request.Request(url, method=method)
    req.add_header("apikey", ANON_KEY)
    if method in ("POST", "PUT", "PATCH"):
        req.add_header("Content-Type", "application/json")
        body = b"{}"
    else:
        body = None

    start = time.time()
    try:
        with urllib.request.urlopen(req, timeout=30, data=body) as r:
            status = r.status
            body_out = r.read(300).decode(errors="replace")
    except urllib.error.HTTPError as e:
        status = e.code
        try:
            body_out = e.read(300).decode(errors="replace")
        except Exception:
            body_out = ""
    except Exception as e:
        status = 0
        body_out = str(e)[:100]
    latency = round((time.time() - start) * 1000)

    # Classify
    if status == 401:
        cls = "AUTH_REQUIRED"          # correct — protected
    elif status == 403:
        cls = "FORBIDDEN"              # correct — role-guarded
    elif status in (404,):
        cls = "NOT_FOUND"
    elif status == 405:
        cls = "METHOD_NOT_ALLOWED"     # method not implemented
    elif status == 400:
        cls = "VALIDATION"             # reached handler, validation rejected
    elif status == 429:
        cls = "RATE_LIMITED"
    elif 200 <= status < 300:
        cls = "PUBLIC_OK"              # public endpoint
    elif status == 0:
        cls = "CONNECTION_FAIL"
    else:
        cls = f"HTTP_{status}"

    return {"route": route_path, "method": method, "status": status, "class": cls,
            "latency": latency, "body": body_out[:120]}

def main():
    routes = find_routes()
    print(f"Found {len(routes)} API route files")
    all_results = []
    tasks = []
    for route in routes:
        for method in get_methods(route):
            tasks.append((route, method))

    print(f"Testing {len(tasks)} route+method combinations (anon)...")
    with ThreadPoolExecutor(max_workers=8) as ex:
        futures = {ex.submit(test_route, r, m): (r, m) for r, m in tasks}
        for fut in futures:
            pass
        for fut in list(futures.keys()):
            try:
                result = fut.result(timeout=45)
                if isinstance(result, dict) and "class" not in result:
                    result["class"] = f"HTTP_{result.get('status', 'unknown')}"
                all_results.append(result)
            except Exception as e:
                r, m = futures[fut]
                all_results.append({"route": r, "method": m, "status": -1,
                                    "class": "TEST_ERROR", "latency": 0, "body": str(e)[:80]})

    # Summary
    classes = {}
    for res in all_results:
        classes.setdefault(res["class"], []).append(res)

    print("\n" + "=" * 70)
    print("ANON ACCESS AUDIT SUMMARY")
    print("=" * 70)
    for cls in sorted(classes):
        print(f"{cls}: {len(classes[cls])}")

    # Critical findings
    print("\n--- PUBLIC_OK (accessible without auth) ---")
    for res in classes.get("PUBLIC_OK", []):
        print(f"  {res['method']:7s} {res['route']:50s} {res['status']} {res['latency']}ms")

    print("\n--- ERRORS / ANOMALIES ---")
    for cls in ["CONNECTION_FAIL", "TEST_ERROR", "HTTP_500", "HTTP_502", "HTTP_503"]:
        for res in classes.get(cls, []):
            print(f"  {res['method']:7s} {res['route']:50s} {res['status']} {res['body'][:80]}")

    print("\n--- METHOD_NOT_ALLOWED (method exported? test mismatch) ---")
    for res in classes.get("METHOD_NOT_ALLOWED", [])[:10]:
        print(f"  {res['method']:7s} {res['route']}")

    with open("/home/z/my-project/audit/api_audit_anon.json", "w") as f:
        json.dump(all_results, f, indent=2)
    print(f"\nFull results: audit/api_audit_anon.json")

if __name__ == "__main__":
    main()
