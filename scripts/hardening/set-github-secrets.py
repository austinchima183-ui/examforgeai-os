#!/usr/bin/env python3
"""Set GitHub repo secrets for the CI verification workflow.
Secrets: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.
Values read from .env.local — never printed. Encrypted with the repo public key."""
import json
import subprocess
import sys
import urllib.request

from nacl import encoding, public

REPO = "austinchima183-ui/examforgeai-os"

# GitHub token from the git remote URL (never printed)
remote = subprocess.run(["git", "-C", "/home/z/my-project", "remote", "get-url", "origin"],
                        capture_output=True, text=True).stdout
GH = remote.split("x-access-token:")[1].split("@")[0].strip()

# Read real values from .env.local
env = {}
for line in open("/home/z/my-project/.env.local"):
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        env[k] = v

secrets = {
    "SUPABASE_URL": env["NEXT_PUBLIC_SUPABASE_URL"],
    "SUPABASE_ANON_KEY": env["NEXT_PUBLIC_SUPABASE_ANON_KEY"],
    "SUPABASE_SERVICE_ROLE_KEY": env["SUPABASE_SERVICE_ROLE_KEY"],
}

def gh_api(path, method="GET", body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        f"https://api.github.com{path}",
        data=data, method=method,
        headers={
            "Authorization": f"Bearer {GH}",
            "Accept": "application/vnd.github+json",
            "Content-Type": "application/json",
        })
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r)

# 1. Fetch repo public key
pk = gh_api(f"/repos/{REPO}/actions/secrets/public-key")
print(f"public key: id={pk['key_id']}")

# 2. Encrypt each secret (libsodium sealed box) + PUT
pk_obj = public.PublicKey(pk["key"].encode(), encoding.Base64Encoder())
for name, value in secrets.items():
    sealed = public.SealedBox(pk_obj).encrypt(value.encode())
    enc_b64 = encoding.Base64Encoder.encode(sealed).decode()
    gh_api(f"/repos/{REPO}/actions/secrets/{name}", "PUT",
           {"encrypted_value": enc_b64, "key_id": pk["key_id"]})
    print(f"set secret: {name} (value len {len(value)})")

# 3. Verify presence (list secrets — shows names + timestamps only)
lst = gh_api(f"/repos/{REPO}/actions/secrets")
names = sorted(s["name"] for s in lst.get("secrets", []))
print("repo secrets now:", names)
sys.exit(0)
