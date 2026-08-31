#!/usr/bin/env python3
"""OMEGA FIX-1: Codemod — replace plain fetch() calls to /api/* CSRF-enforcing
routes with apiFetch() (auto-attaches x-csrf-token). Handles:
  - adding the import
  - fetch(`/api/...`) and fetch('/api/...') forms
  - preserves body: JSON.stringify(...) (apiFetch now passes strings through)
Only converts calls whose route enforces CSRF, in client-side files."""
import re
import glob
from pathlib import Path

csrf_paths = set()
for f in glob.glob('src/app/api/**/route.ts', recursive=True):
    src = open(f).read()
    if 'enforceCsrf' in src or 'requireCsrf' in src:
        rp = f.replace('src/app/api', '/api').replace('/route.ts', '')
        csrf_paths.add(rp)

IMPORT_LINE = "import { apiFetch } from '@/lib/api/client-fetch'"

changed_files = []
for f in glob.glob('src/app/**/*.tsx', recursive=True) + \
            glob.glob('src/lib/**/*.ts', recursive=True) + \
            glob.glob('src/components/**/*.tsx', recursive=True) + \
            glob.glob('src/features/**/*.ts*', recursive=True):
    if '/api/' in f.replace('src/app/api', '') or 'client-fetch' in f:
        continue
    src = open(f).read()
    if 'apiFetch' in src:
        continue  # already migrated

    lines = src.split('\n')
    convert_lines = set()
    for i, line in enumerate(lines):
        for m in re.finditer(r"fetch\(\s*[`'\"](/api/[^`'\"]+?)[`'\"]", line):
            url = m.group(1)
            base = url.split('?')[0].rstrip('/')
            ctx = '\n'.join(lines[i:i + 12])
            if re.search(r"method:\s*['\"`](POST|PUT|PATCH|DELETE)['\"`]", ctx):
                if base in csrf_paths or any(
                    base.startswith(rp + '/') and '[' not in rp for rp in csrf_paths
                ):
                    # only convert when the fetch call STARTS on this line
                    convert_lines.add(i)
    if not convert_lines:
        continue

    new_lines = []
    for i, line in enumerate(lines):
        if i in convert_lines:
            line = re.sub(r"\bfetch\(", "apiFetch(", line, count=1)
        new_lines.append(line)
    src = '\n'.join(new_lines)

    # Add import after 'use client' directive (or at top)
    if "'use client'" in src.split('\n')[0] or '"use client"' in src.split('\n')[0]:
        src = src.replace('\n', '\n' + IMPORT_LINE + '\n', 1)
    elif re.search(r"^['\"]use client['\"]", src, re.M):
        src = re.sub(r"^(['\"]use client['\"];?)\s*$",
                     r"\1\n\n" + IMPORT_LINE, src, count=1, flags=re.M)
    else:
        # non-client file using browser fetch (e.g. offline service) — add at top after comments
        m = re.search(r"^import ", src, re.M)
        if m:
            src = src[:m.start()] + IMPORT_LINE + '\n' + src[m.start():]
        else:
            src = IMPORT_LINE + '\n\n' + src

    open(f, 'w').write(src)
    changed_files.append((f, len(convert_lines)))

print(f"Converted {sum(c for _, c in changed_files)} calls in {len(changed_files)} files:")
for f, c in sorted(changed_files):
    print(f"  {c:2d} calls  {f}")
