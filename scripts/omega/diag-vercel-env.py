#!/usr/bin/env python3
"""Diagnose which Vercel env vars can be decrypted and why others fail."""
import json
import os
import urllib.request
import urllib.error

VT = os.environ.get("VERCEL_TOKEN", "")
PROJECT = "prj_rp5aHw3B3t4kcDGo48AWtQJmcERF"
API = "https://api.vercel.com/v10/projects"


def api(path):
    req = urllib.request.Request(f"{API}{path}", headers={"Authorization": f"Bearer {VT}"})
    with urllib.request.urlopen(req) as r:
        return json.load(r)


envs = api(f"/{PROJECT}/env?decryptLimit=100").get("envs", [])
print(f"total envs: {len(envs)}")
for e in envs:
    eid = e["id"]
    key = e["key"]
    target = e.get("target", [])
    etype = e.get("type", "?")
    sensitive = e.get("sensitive", False)
    # value present in list response?
    has_val = bool(e.get("value"))
    detail = {}
    err = ""
    try:
        detail = api(f"/{PROJECT}/env/{eid}?decryptLimit=1")
    except urllib.error.HTTPError as exc:
        err = f"HTTP {exc.code}: {exc.read().decode()[:120]}"
    decrypted = bool(detail.get("decryptedValue")) or bool(detail.get("value"))
    print(f"  {key:36s} type={etype:8s} sensitive={sensitive!s:5s} listVal={has_val!s:5s} decrypted={decrypted!s:5s} {('ERR: ' + err) if err else ''}")
