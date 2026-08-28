#!/usr/bin/env python3
"""
MISSION 8 — Malformed-JSON 500 fixer.
Replaces `const rawBody = await request.json()` with safe parseJsonBody()
across all API routes, ensuring malformed JSON → 400 (never 500).
"""
import re, os

def find_routes(dir, results):
    for entry in os.listdir(dir):
        full = os.path.join(dir, entry)
        if os.path.isdir(full):
            find_routes(full, results)
        elif entry == 'route.ts':
            results.append(full)
    return results

routes = find_routes('src/app/api', [])
fixed = []

for route in routes:
    src = open(route).read()
    orig = src

    # Pattern: const rawBody = await request.json()
    # Replace with safe parse
    if 'await request.json()' in src:
        # already uses parseJsonBody?
        if 'parseJsonBody' in src:
            continue
        src = src.replace(
            'const rawBody = await request.json()',
            "const bodyJson = await parseJsonBody(request)\n    if (bodyJson instanceof NextResponse) return bodyJson\n    const rawBody = bodyJson.data"
        )

    if src != orig:
        # Add import
        if "from '@/lib/api/validate'" in src:
            # extend existing import
            m = re.search(r"import \{([^}]+)\} from '@/lib/api/validate'", src)
            if m and 'parseJsonBody' not in m.group(1):
                src = src.replace(m.group(0), f"import {{{m.group(1).rstrip().rstrip(',')}, parseJsonBody }} from '@/lib/api/validate'")
        elif "from '@/lib/api/validate'" not in src:
            # add new import after the first import line
            m = re.search(r'^import .+$', src, re.MULTILINE)
            if m:
                src = src[:m.end()] + "\nimport { parseJsonBody } from '@/lib/api/validate'" + src[m.end():]

        open(route, 'w').write(src)
        fixed.append(route)

print(f'✓ Fixed {len(fixed)} routes with safe JSON parsing')
for r in fixed:
    print(f'   {r}')
