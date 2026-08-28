#!/usr/bin/env python3
"""
Bulk-fix TS18047 ('supabase' is possibly 'null') errors.

Strategy:
1. Find all files containing `const supabase = await createClientOrNull()`
2. Replace with `const supabase = await requireSupabase()` (which returns non-null)
3. Remove redundant null-check blocks that follow this pattern:
     if (!supabase) { return ... }
4. Update the import to add `requireSupabase` if not present.
"""
import re
import sys
from pathlib import Path

ROOT = Path("/home/z/my-project/src")
PATTERN_IMPORT = re.compile(
    r"import\s*\{([^}]*)createClientOrNull([^}]*)\}\s*from\s*['\"]@/lib/supabase/server['\"]"
)
PATTERN_CALL = re.compile(
    r"const\s+supabase\s*=\s*await\s+createClientOrNull\(\)"
)
PATTERN_NULL_CHECK = re.compile(
    r"\s*if\s*\(\s*!supabase\s*\)\s*\{[^}]*?\}\s*", re.DOTALL
)

def transform_file(p: Path) -> bool:
    txt = p.read_text()
    orig = txt
    # 1. Replace call sites
    new_txt = PATTERN_CALL.sub("const supabase = await requireSupabase()", txt)
    if new_txt == txt:
        return False
    # 2. Remove now-redundant null-checks (single-line or block)
    new_txt = PATTERN_NULL_CHECK.sub("", new_txt)
    # 3. Add requireSupabase to the import
    def import_repl(m):
        inner = m.group(0)
        if "requireSupabase" in inner:
            return inner
        # add requireSupabase to the import list
        return inner.replace("createClientOrNull", "createClientOrNull, requireSupabase")
    new_txt = PATTERN_IMPORT.sub(import_repl, new_txt)
    # 4. If no import of createClientOrNull exists but we replaced calls,
    #    we need to add a fresh import line. (Shouldn't happen normally.)
    if "requireSupabase(" in new_txt and "requireSupabase" not in (new_txt[:new_txt.find("requireSupabase(")]):
        # already imported in the part we replaced
        pass

    if new_txt == orig:
        return False
    p.write_text(new_txt)
    return True

def main():
    changed = 0
    for p in ROOT.rglob("*.ts"):
        if "node_modules" in str(p):
            continue
        try:
            if "createClientOrNull" in p.read_text():
                if transform_file(p):
                    changed += 1
                    print(f"  fixed: {p}")
        except Exception as e:
            print(f"  error in {p}: {e}", file=sys.stderr)
    for p in ROOT.rglob("*.tsx"):
        if "node_modules" in str(p):
            continue
        try:
            if "createClientOrNull" in p.read_text():
                if transform_file(p):
                    changed += 1
                    print(f"  fixed: {p}")
        except Exception as e:
            print(f"  error in {p}: {e}", file=sys.stderr)
    print(f"\nTotal files fixed: {changed}")

if __name__ == "__main__":
    main()
