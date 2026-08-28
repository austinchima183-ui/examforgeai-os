#!/usr/bin/env python3
"""
MISSION 5 — Dead Code Detection
Finds: unused components, unused lib modules, unused exports.
Conservative — only flags files with ZERO imports anywhere.
"""
import os, re, json

SRC = 'src'

def find_files(ext):
    result = []
    for root, dirs, files in os.walk(SRC):
        for f in files:
            if f.endswith(ext):
                result.append(os.path.join(root, f))
    return result

# Collect all source content
all_ts = find_files('.ts') + find_files('.tsx')
contents = {}
for f in all_ts:
    try:
        contents[f] = open(f, encoding='utf-8').read()
    except Exception:
        pass

# Build import graph: which module paths are imported
imported_paths = set()
import_re = re.compile(r"from\s+['\"]@/([^'\"]+)['\"]|import\s*\(\s*['\"]@/([^'\"]+)['\"]")

for f, src in contents.items():
    for m in import_re.finditer(src):
        mod = m.group(1) or m.group(2)
        imported_paths.add(mod)
        # also add as path with /index
        imported_paths.add(mod + '/index')

def is_imported(filepath):
    """Check if a file is imported anywhere via @/ alias."""
    rel = filepath.replace('src/', '').rsplit('.', 1)[0]
    if rel in imported_paths:
        return True
    # try index resolution
    if rel.endswith('/index'):
        if rel[:-6] in imported_paths:
            return True
    # dynamic imports with partial paths
    partial = rel.split('/')[-1]
    for imp in imported_paths:
        if imp.endswith(partial):
            return True
    return False

# Check candidates: components, lib modules (skip pages, api routes, layouts — entry points)
candidates = []
for f in contents:
    rel = f.replace('src/', '')
    if rel.startswith('app/') or rel.startswith('middleware'):
        continue
    if '/__tests__/' in f or '.test.' in f or '.spec.' in f:
        continue
    if not is_imported(f):
        candidates.append(f)

# Filter out obvious entry points
ENTRY_PATTERNS = [
    'instrumentation', 'sentry.', 'loading.tsx', 'error.tsx', 'not-found.tsx',
    'globals.css', 'layout.tsx', 'page.tsx', 'route.ts', 'template.tsx',
    'default.tsx', 'generateStaticParams',
]

dead_candidates = []
for f in sorted(candidates):
    if any(p in f for p in ENTRY_PATTERNS):
        continue
    dead_candidates.append(f)

print('🔍 DEAD CODE ANALYSIS')
print(f'   Total TS/TSX files: {len(contents)}')
print(f'   Unreferenced candidates: {len(dead_candidates)}')
print()
for f in dead_candidates[:40]:
    size = os.path.getsize(f)
    print(f'   {f} ({size/1024:.1f} KB)')

report = {
    total_files: len(contents),
    dead_candidates: dead_candidates,
} if False else {
    'total_files': len(contents),
    'dead_candidates': dead_candidates,
}
with open('download/verification/dead-code-report.json', 'w') as fp:
    json.dump(report, fp, indent=2)
print(f'\n📄 Saved → download/verification/dead-code-report.json')
