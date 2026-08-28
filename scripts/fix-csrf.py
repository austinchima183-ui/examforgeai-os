#!/usr/bin/env python3
"""
MISSION 11 — CSRF Auto-Fixer
Adds enforceCsrf() calls to all authenticated mutation endpoints missing CSRF.
Pattern: after `if (X instanceof NextResponse) return X` insert CSRF check.
Only applies within POST/PUT/PATCH/DELETE function bodies.
"""
import re, os

WEBHOOK_EXEMPT = ['webhook', 'webhooks', 'auth/callback']
# Public endpoints — no user session to bind CSRF to; handled separately
PUBLIC_MUTATIONS = [
    'api/contact', 'api/newsletter', 'api/events', 'api/analytics/events',
    'api/demo-booking', 'api/marketing/demos', 'api/feedback',
    'api/demo-booking/[id]', 'api/marketing/leads/[id]',
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
fixed, skipped, public_eps, already = [], [], [], []

for route in routes:
    src = open(route).read()

    # Does it have mutation methods?
    has_mutations = any(re.search(rf'export\s+async\s+function\s+{m}\b', src)
                        for m in ['POST', 'PUT', 'PATCH', 'DELETE'])
    if not has_mutations:
        continue

    # Already protected?
    if re.search(r'enforceCsrf|requireCsrf', src):
        already.append(route)
        continue

    # Webhook / exempt?
    if any(w in route for w in WEBHOOK_EXEMPT):
        skipped.append(route)
        continue

    # Public endpoint?
    route_path = route.replace('src/app/', '').replace('/route.ts', '')
    if route_path in PUBLIC_MUTATIONS:
        public_eps.append(route)
        continue

    # ── Apply the fix ──
    lines = src.split('\n')
    out = []
    inserted_count = 0
    in_mutation = False
    mutation_inserted = False

    i = 0
    while i < len(lines):
        line = lines[i]
        out.append(line)

        # Track mutation function boundaries
        m = re.match(r'export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)\b', line)
        if m:
            in_mutation = True
            mutation_inserted = False
        elif re.match(r'export\s+async\s+function\s+(GET|HEAD|OPTIONS)\b', line):
            in_mutation = False
            mutation_inserted = False

        # Detect auth-guard pattern: if (X instanceof NextResponse) return X
        if in_mutation and not mutation_inserted:
            auth_match = re.match(r'^(\s*)if\s+\((\w+)\s+instanceof\s+NextResponse\)\s+return\s+\2\s*$', line)
            if auth_match:
                indent, var = auth_match.group(1), auth_match.group(2)
                # Look ahead: insert CSRF check after this line (with a blank line)
                out.append('')
                out.append(f'{indent}// ─── CSRF guard (auto-added: MISSION 11) ───')
                out.append(f'{indent}const csrfResult = enforceCsrf(request, {var})')
                out.append(f'{indent}if (csrfResult) return csrfResult')
                mutation_inserted = True
                inserted_count += 1
        i += 1

    if inserted_count == 0:
        # No auth pattern found — could not auto-fix
        print(f'⚠️  NO AUTH PATTERN: {route}')
        continue

    new_src = '\n'.join(out)

    # Add import if missing
    if "from '@/lib/api/csrf-guard'" not in new_src:
        # Insert after the last import line
        import_lines = [l for l in new_src.split('\n') if l.startswith('import ')]
        if import_lines:
            last_import = import_lines[-1]
            new_src = new_src.replace(
                last_import,
                last_import + "\nimport { enforceCsrf } from '@/lib/api/csrf-guard'",
                1
            )

    open(route, 'w').write(new_src)
    fixed.append((route, inserted_count))

print(f'✓ Fixed: {len(fixed)} files')
for r, n in fixed:
    print(f'   {r} ({n} mutations guarded)')
print(f'⏭  Already protected: {len(already)}')
print(f'⏭  Webhook-exempt: {len(skipped)}')
print(f'🌐 Public mutations (origin-guard needed): {len(public_eps)}')
for p in public_eps:
    print(f'   {p}')
