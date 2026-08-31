#!/usr/bin/env python3
"""Ω-13: Classify all 78 missing tables by runtime reachability.

Classification:
  A = reachable from active API routes / app pages (production product features)
  B = required by landing page promises (checked separately)
  C = required by SDK/API contracts of external providers
  D = dead code / abandoned architecture (unreachable at runtime)

Method (repository = source of truth):
  1. Build import graph from all API routes (src/app/api/**/route.ts) and app pages.
  2. Walk imports transitively (statically, via regex of relative/aliased imports).
  3. A referencing file that is in the active graph → runtime-reachable.
  4. Tables referenced by active files = class A (or B if landing-promised, C if
     webhook/SDK contract).
"""
import json
import re
import subprocess
from pathlib import Path

ROOT = Path("/home/z/my-project")
SRC = ROOT / "src"

# ── 1. All table references: table -> set of referencing files ──────────────
missing = json.loads((ROOT / "download/verification/audit/schema-drift.json").read_text())["missing"]
exact = json.loads((ROOT / "download/verification/audit/missing-tables-exact.json").read_text())

# ── 2. Build the reachable-module graph ────────────────────────────────────
IMPORT_RE = re.compile(
    r"""(?:import\s[^'"]*?from\s*|import\s*\(\s*|require\s*\(\s*|export\s[^'"]*?from\s*)['"]([^'"]+)['"]"""
)

def resolve_import(spec: str, from_file: Path) -> Path | None:
    if spec.startswith("@/"):
        target = SRC / spec[2:]
    elif spec.startswith("."):
        target = (from_file.parent / spec).resolve()
    else:
        return None  # external package
    for suffix in ("", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx"):
        cand = Path(str(target) + suffix) if suffix else target
        if cand.is_file():
            return cand
    return None

# Active roots: every API route + every page/layout in the app dir
roots = list((SRC / "app").rglob("route.ts")) + list((SRC / "app").rglob("route.tsx"))
roots += list((SRC / "app").rglob("page.tsx")) + list((SRC / "app").rglob("layout.tsx"))
roots = [r for r in roots if r.is_file()]

# Middleware is always active
mw = ROOT / "src" / "middleware.ts"
if mw.is_file():
    roots.append(mw)

seen = set()
queue = [r.resolve() for r in roots]
while queue:
    f = queue.pop()
    if f in seen:
        continue
    seen.add(f)
    try:
        text = f.read_text(errors="ignore")
    except OSError:
        continue
    for spec in IMPORT_RE.findall(text):
        t = resolve_import(spec, f)
        if t and t not in seen:
            queue.append(t)

# Directories that indicate dead/optional modules even if imported lazily
print(f"Active module graph: {len(seen)} files")

# ── 3. Classify each missing table ──────────────────────────────────────────
# SDK contract / webhook payload persistence tables (external integration hard requirements)
SDK_CONTRACT = {
    "webhook_idempotency",      # payment webhook replay protection (Flutterwave contract)
    "failed_payments",          # Flutterwave failure states
    "payment_authorizations",   # Flutterwave 3DS/authorization flows
    "refund_requests",          # refund API contract
}

result = {"A": {}, "B": {}, "C": {}, "D": {}}
for table in sorted(missing):
    files = [ROOT / p for p in exact.get(table, [])]
    active_files = [f for f in files if f.resolve() in seen]
    dead_files = [f for f in files if f.resolve() not in seen]
    if active_files:
        cls = "C" if table in SDK_CONTRACT else "A"
    else:
        cls = "D"
    entry = {
        "referencing_files": [str(f.relative_to(ROOT)) for f in files],
        "active_refs": [str(f.relative_to(ROOT)) for f in active_files],
        "class": cls,
    }
    result[cls][table] = entry

# ── 4. Output ───────────────────────────────────────────────────────────────
out = {
    "generated": "2026-08-31",
    "active_graph_size": len(seen),
    "summary": {k: len(v) for k, v in result.items()},
    "class_A_active_features": result["A"],
    "class_C_sdk_contracts": result["C"],
    "class_D_dead_code": result["D"],
}
(ROOT / "download/verification/audit/missing-tables-classified.json").write_text(json.dumps(out, indent=2))
print(json.dumps(out["summary"], indent=2))
print("\n=== CLASS A (active product features) ===")
for t in sorted(result["A"]):
    print(f"  {t:35s} <- {result['A'][t]['active_refs'][0] if result['A'][t]['active_refs'] else '?'}")
print("\n=== CLASS C (SDK contracts) ===")
for t in sorted(result["C"]):
    print(f"  {t}")
print("\n=== CLASS D (dead code) ===")
print(", ".join(sorted(result["D"])))
