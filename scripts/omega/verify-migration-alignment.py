#!/usr/bin/env python3
"""Ω-13: Cross-check code INSERT/UPDATE payloads against migration 007 DDL.

Extracts object keys passed to .insert({...}) / .upsert({...}) / .update({...})
for each of the 59 new tables, then compares to the columns in the migration.
Reports mismatches so the DDL can be aligned with the code (source of truth).
"""
import json
import re
from pathlib import Path

ROOT = Path("/home/z/my-project")
sql = (ROOT / "supabase/migrations/007_omega_missing_tables.sql").read_text()

# Parse DDL columns per table (top-level columns only, stop at CHECK constraints at depth)
table_cols = {}
for m in re.finditer(
    r"CREATE TABLE IF NOT EXISTS public\.([a-z_]+) \((.*?)\n\);", sql, re.DOTALL
):
    name, body = m.group(1), m.group(2)
    cols = []
    for line in body.splitlines():
        line = line.strip()
        if not line or line.startswith("--"):
            continue
        cm = re.match(r"^([a-z_]+)\s", line)
        if cm and cm.group(1) not in ("PRIMARY", "UNIQUE", "CHECK", "CONSTRAINT", "FOREIGN", "REFERENCES"):
            cols.append(cm.group(1))
    table_cols[name] = set(cols)

# Extract code payloads: table -> set of keys
d = json.loads((ROOT / "download/verification/audit/missing-tables-classified.json").read_text())
tables = {**d["class_A_active_features"], **d["class_C_sdk_contracts"]}

OBJ_KEY_RE = re.compile(r"^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:")

code_cols = {}
for table, meta in tables.items():
    keys = set()
    for fpath in meta["referencing_files"]:
        p = ROOT / fpath
        if not p.exists():
            continue
        text = p.read_text(errors="ignore")
        lines = text.splitlines()
        for i, line in enumerate(lines):
            if f".from('{table}')" in line or f'.from("{table}")' in line:
                # scan forward for insert/upsert/update object literals
                for j in range(i, min(i + 40, len(lines))):
                    l = lines[j]
                    if re.search(r"\.(insert|upsert|update)\(\s*\{?\s*$|\.update\(\{|\.insert\(\{|\.upsert\(\{", l):
                        # collect keys until closing "}" or "}," at depth 0
                        depth = 0
                        started = False
                        k = j
                        while k < min(j + 60, len(lines)):
                            ll = lines[k]
                            depth += ll.count("{") - ll.count("}")
                            if "{" in ll:
                                started = True
                            if started:
                                for km in OBJ_KEY_RE.finditer(ll):
                                    key = km.group(1)
                                    if key not in ("onConflict",):
                                        keys.add(key)
                            if started and depth <= 0:
                                break
                            k += 1
                        break
    code_cols[table] = keys

# Compare
report = {}
for table in sorted(tables):
    ddl = table_cols.get(table, set())
    code = code_cols.get(table, set())
    missing_in_ddl = sorted(code - ddl)
    report[table] = {
        "ddl_columns": sorted(ddl),
        "code_payload_keys": sorted(code),
        "missing_in_ddl": missing_in_ddl,
    }

out = ROOT / "download/verification/audit/migration007-code-alignment.json"
out.write_text(json.dumps(report, indent=2))

problems = {t: r["missing_in_ddl"] for t, r in report.items() if r["missing_in_ddl"]}
print(f"tables checked: {len(tables)}; tables with payload-key mismatches: {len(problems)}")
for t, miss in problems.items():
    print(f"  {t}: missing {', '.join(miss)}")
