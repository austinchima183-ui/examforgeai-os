#!/usr/bin/env python3
"""
Scan all page.tsx / layout.tsx files WITHOUT 'use client' for props that
pass Lucide components (functions) to client components — the RSC
serialization bug. Finds: icon={X}, icon: X, badge={{icon: X}}, etc.
"""
import os, re

results = []

for root, dirs, files in os.walk('src/app'):
    for f in files:
        if not (f.endswith('.tsx') and (f.startswith('page.') or f.startswith('layout.'))):
            continue
        path = os.path.join(root, f)
        src = open(path, encoding='utf-8').read()

        # Skip client components — they can pass anything
        if re.search(r"^\s*'use client'", src):
            continue

        # Find capitalized component refs passed as props
        # icon={Cap}, icon: Cap, icon: Cap, (badge={{ ... icon: Cap }})
        patterns = [
            (r'icon=\{([A-Z][A-Za-z0-9]*)\}', 'icon={X}'),
            (r'icon:\s*([A-Z][A-Za-z0-9]*)\s*[,}]', 'icon: X'),
            (r'Icon=\{([A-Z][A-Za-z0-9]*)\}', 'Icon={X}'),
        ]
        for pat, label in patterns:
            for m in re.finditer(pat, src):
                comp = m.group(1)
                # Skip common false positives
                if comp in ('ROUTES', 'Math', 'JSON', 'Object', 'Array', 'String', 'Number', 'Boolean', 'Date'):
                    continue
                # Get line number
                line_no = src[:m.start()].count('\n') + 1
                line = src.split('\n')[line_no - 1].strip()[:100]
                results.append((path, line_no, label, comp, line))

print(f"🔍 SERVER→CLIENT FUNCTION PROP SCAN\n")
if not results:
    print("  ✓ No icon-component props passed from server components")
else:
    print(f"  Found {len(results)} potential RSC violations:\n")
    for path, line_no, label, comp, line in results:
        print(f"  {path}:{line_no}")
        print(f"    [{label} → {comp}] {line[:90]}")
        print()
