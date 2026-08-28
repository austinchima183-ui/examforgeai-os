#!/usr/bin/env python3
"""
MISSION 11 — CSRF Auto-Fixer v3
Handles single-line patterns:
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!authResult) return NextResponse.json(...)
"""
import re, os

WEBHOOK_EXEMPT = ['webhook', 'webhooks', 'auth/callback']
PUBLIC_MUTATIONS = [
    'api/contact', 'api/newsletter', 'api/events', 'api/analytics/events',
    'api/demo-booking', 'api/marketing/demos', 'api/feedback',
]

def find_routes(dir, results):
    for entry in os.listdir(dir):
        full = os.path.join(dir, entry)
        if os.path.isdir(full):
            find_routes(full, results)
        elif entry == 'route.ts':
            results.append(full)
    return results

routes = find_routes('src/app/api', [])
fixed, still_missing = [], []

for route in routes:
    src = open(route).read()
    has_mutations = any(re.search(rf'export\s+async\s+function\s+{m}\b', src)
                        for m in ['POST', 'PUT', 'PATCH', 'DELETE'])
    if not has_mutations:
        continue
    if re.search(r'enforceCsrf|requireCsrf', src):
        continue
    if any(w in route for w in WEBHOOK_EXEMPT):
        continue
    route_path = route.replace('src/app/', '').replace('/route.ts', '')
    if any(route_path.startswith(p) for p in PUBLIC_MUTATIONS):
        continue

    lines = src.split('\n')
    out = []
    inserted = 0
    in_mutation = False
    done_this_fn = False
    i = 0
    while i < len(lines):
        line = lines[i]
        out.append(line)

        m = re.match(r'export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)\b', line)
        if m:
            in_mutation = True
            done_this_fn = False
        elif re.match(r'export\s+async\s+function\s+(GET|HEAD|OPTIONS)\b', line):
            in_mutation = False
            done_this_fn = False

        # Single-line unauthorized pattern
        if in_mutation and not done_this_fn:
            neg = re.match(r'^(\s*)if\s*\(!(\w+)\)\s+return\s+NextResponse\.json\(.+401.+\)\s*$', line)
            if neg:
                indent, var = neg.group(1), neg.group(2)
                out.append('')
                out.append(f'{indent}// ─── CSRF guard (auto-added: MISSION 11) ───')
                if var == 'user':
                    out.append(f'{indent}const csrfResult = enforceCsrf(request, {{ user: {{ id: user.id }} }})')
                else:
                    out.append(f'{indent}const csrfResult = enforceCsrf(request, {var})')
                out.append(f'{indent}if (csrfResult) return csrfResult')
                inserted += 1
                done_this_fn = True
        i += 1

    if inserted == 0:
        still_missing.append(route)
        continue

    new_src = '\n'.join(out)
    if "from '@/lib/api/csrf-guard'" not in new_src:
        import_lines = [l for l in new_src.split('\n') if l.startswith('import ')]
        if import_lines:
            last_import = import_lines[-1]
            new_src = new_src.replace(
                last_import,
                last_import + "\nimport { enforceCsrf } from '@/lib/api/csrf-guard'", 1)
    open(route, 'w').write(new_src)
    fixed.append((route, inserted))

print(f'✓ Fixed: {len(fixed)} files')
for r, n in fixed:
    print(f'   {r} ({n})')
print(f'\n⚠️  Still missing: {len(still_missing)}')
for r in still_missing:
    print(f'   {r}')
