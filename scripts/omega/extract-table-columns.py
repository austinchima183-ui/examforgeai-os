#!/usr/bin/env python3
"""Ω-13: Extract the exact column names each missing-table service code uses,
so migration DDL matches the repository (source of truth) exactly."""
import json
import re
from pathlib import Path

ROOT = Path("/home/z/my-project")

d = json.loads((ROOT / "download/verification/audit/missing-tables-classified.json").read_text())
tables = {**d["class_A_active_features"], **d["class_C_sdk_contracts"]}

# Patterns: .select('a,b(c,d)') / .insert({a:..}) / .update({a:..}) / .eq('a',..)
# / .order('a') / .onConflict('a') etc., scoped to files referencing each table.
SELECT_RE = re.compile(r"\.select\(\s*[`'\"]([^`'\"]+)[`'\"]")
CHAIN_RE = re.compile(r"\.(?:eq|neq|gt|gte|lt|lte|like|ilike|in|order|onConflict|contains|range|is)\(\s*[`'\"]([a-z_.]+)[`'\"]")

report = {}
for table, meta in sorted(tables.items()):
    cols = set()
    for fpath in meta["referencing_files"]:
        p = ROOT / fpath
        if not p.exists():
            continue
        text = p.read_text(errors="ignore")
        # Only parse near references to this table (within 40 lines)
        lines = text.splitlines()
        for i, line in enumerate(lines):
            if f"'{table}'" in line or f'"{table}"' in line:
                window = "\n".join(lines[max(0, i - 6) : i + 30])
                for sel in SELECT_RE.findall(window):
                    for c in sel.split(","):
                        c = c.strip()
                        # strip aliases and nested selects
                        if not c or "(" in c:
                            continue
                        c = c.split(":")[-1].strip()
                        if re.fullmatch(r"[a-z_]+", c):
                            cols.add(c)
                for c in CHAIN_RE.findall(window):
                    if c.split(".")[0].isidentifier() and c.split(".")[0] not in ("data",):
                        cols.add(c)
    report[table] = sorted(cols)

out = ROOT / "download/verification/audit/missing-table-columns.json"
out.write_text(json.dumps(report, indent=2))
for t, cols in list(report.items())[:70]:
    print(f"{t} ({len(cols)}): {', '.join(cols)}")
