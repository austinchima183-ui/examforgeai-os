#!/usr/bin/env python3
"""Extract real public Supabase URL + anon key from the production client bundle.
(RULE ZERO: these values are PUBLIC by design — embedded in every browser payload.)"""
import re, subprocess, sys

BASE = "https://web-alpha-bay-87.vercel.app"

def fetch(url, binary=False):
    r = subprocess.run(["curl", "-s", "-m", "20", url], capture_output=True)
    return r.stdout if binary else r.stdout.decode("utf-8", "ignore")

html = fetch(BASE + "/login")
chunks = re.findall(r'/_next/static/(?:immutable/)?chunks/[^"\']+\.js', html)
print(f"[i] login page references {len(chunks)} chunks; sampling up to 40")

url_pat = re.compile(r'https://[a-z0-9]{8,}\.supabase\.co')
key_pat = re.compile(r'eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{100,}\.[A-Za-z0-9_-]{20,}')

found_url, found_key = None, None
seen = set()
for c in chunks[:40]:
    if c in seen:
        continue
    seen.add(c)
    js = fetch(BASE + c)
    if not js:
        continue
    if not found_url:
        m = url_pat.search(js)
        if m and "pzfnptrrnxkgodclyhft" in m.group(0):
            found_url = m.group(0)
    if not found_key:
        m = key_pat.search(js)
        if m:
            found_key = m.group(0)
    if found_url and found_key:
        break

print(f"[+] SUPABASE_URL: {found_url}")
print(f"[+] ANON_KEY: {'FOUND len=' + str(len(found_key)) if found_key else 'NOT FOUND'}")
if found_url and found_key:
    # sanity: anon key must decode as JWT with ref = project id
    import base64, json as j
    payload = found_key.split(".")[1]
    payload += "=" * (-len(payload) % 4)
    claims = j.loads(base64.urlsafe_b64decode(payload))
    print(f"[+] anon key claims: ref={claims.get('ref')} role={claims.get('role')}")
    with open("/home/z/my-project/scripts/extracted-public-env.txt", "w") as f:
        f.write(f"NEXT_PUBLIC_SUPABASE_URL={found_url}\nNEXT_PUBLIC_SUPABASE_ANON_KEY={found_key}\n")
    print("[+] saved to scripts/extracted-public-env.txt")
    sys.exit(0)
sys.exit(1)
