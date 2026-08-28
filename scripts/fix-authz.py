#!/usr/bin/env python3
"""
MISSION 11 + 4 — Authorization + CSRF fixer for routes with NO in-handler auth.
Adds requireApiRole + enforceCsrf to every handler in the affected routes.
"""
import re

# route → allowed roles
ROUTES = {
    'src/app/api/teacher/lesson-plans/route.ts': ['teacher', 'school_admin', 'super_admin'],
    'src/app/api/teacher/worksheets/route.ts': ['teacher', 'school_admin', 'super_admin'],
    'src/app/api/teacher/rubrics/route.ts': ['teacher', 'school_admin', 'super_admin'],
    'src/app/api/alerting/channels/route.ts': ['school_admin', 'super_admin'],
    'src/app/api/alerting/incidents/route.ts': ['school_admin', 'super_admin'],
    'src/app/api/alerting/incidents/[id]/route.ts': ['school_admin', 'super_admin'],
    'src/app/api/alerting/suppressions/route.ts': ['school_admin', 'super_admin'],
    'src/app/api/parent/messaging/route.ts': ['parent', 'school_admin', 'super_admin'],
    'src/app/api/marketing/leads/[id]/route.ts': ['school_admin', 'super_admin'],
    'src/app/api/settings/sso/route.ts': ['super_admin', 'school_admin'],
    'src/app/api/ai/stream/route.ts': None,  # special: authenticated only
}

for route, roles in ROUTES.items():
    try:
        src = open(route).read()
    except FileNotFoundError:
        print(f'⏭  skip (not found): {route}')
        continue

    if 'requireApiRole' in src or 'requireApiAuth' in src:
        # has some auth — only add CSRF if missing
        pass

    roles_arr = "[" + ", ".join("'" + r + "'" for r in roles) + "]" if roles else None

    # Build the guard block template
    if roles:
        guard = (
            "  // ─── Auth + CSRF guard (MISSION 4+11: feature isolation) ───\n"
            "  const auth = await requireApiRole(request, {roles})\n"
            "  if (auth instanceof NextResponse) return auth\n"
            "  const csrfGuard = enforceCsrf(request, auth)\n"
            "  if (csrfGuard) return csrfGuard\n"
        ).replace('{roles}', roles_arr)
    else:
        guard = (
            "  // ─── Auth + CSRF guard (MISSION 11) ───\n"
            "  const auth = await requireApiAuth(request)\n"
            "  if (auth instanceof NextResponse) return auth\n"
            "  const csrfGuard = enforceCsrf(request, auth)\n"
            "  if (csrfGuard) return csrfGuard\n"
        )

    lines = src.split('\n')
    out = []
    i = 0
    inserted = 0
    while i < len(lines):
        line = lines[i]
        out.append(line)
        m = re.match(r'export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(', line)
        if m:
            method = m.group(1)
            # find the opening brace of the function body
            j = i
            while j < len(lines) and '{' not in lines[j]:
                j += 1
            if j < len(lines):
                # check if function is single-line with brace, or brace on next line
                if lines[j].rstrip().endswith('{'):
                    # insert guard after this line
                    for k in range(i + 1, j + 1):
                        out.append(lines[k])
                    # skip any leading try { line? No — insert right after opening brace
                    out.append(guard.rstrip('\n'))
                    inserted += 1
                    i = j + 1
                    continue
                else:
                    # brace mid-line, e.g. "): Promise<NextResponse> {"
                    pass
        i += 1

    if inserted == 0:
        print(f'⚠️  could not insert: {route}')
        continue

    new_src = '\n'.join(out)
    # Add imports
    needed_imports = []
    if 'requireApiRole' in guard and "requireApiRole" not in new_src.split('export')[0]:
        needed_imports.append('requireApiRole')
    if 'requireApiAuth' in guard and 'requireApiAuth' not in src:
        needed_imports.append('requireApiAuth')

    imports_to_add = []
    if "from '@/lib/api/auth-guard'" in new_src:
        # extend existing import
        for imp in needed_imports:
            if imp not in new_src.split('export')[0]:
                new_src = re.sub(
                    r"import \{ ([^}]+) \} from '@/lib/api/auth-guard'",
                    lambda mm: f"import {{ {mm.group(1)}, {imp} }} from '@/lib/api/auth-guard'",
                    new_src, count=1)
    elif needed_imports:
        imports_to_add.append(f"import {{ {', '.join(needed_imports)} }} from '@/lib/api/auth-guard'")

    if "enforceCsrf" in guard and "from '@/lib/api/csrf-guard'" not in new_src:
        imports_to_add.append("import { enforceCsrf } from '@/lib/api/csrf-guard'")

    if imports_to_add:
        # insert after first import
        first_import_match = re.search(r'^import .+$', new_src, re.MULTILINE)
        if first_import_match:
            insertion_point = first_import_match.end()
            new_src = new_src[:insertion_point] + '\n' + '\n'.join(imports_to_add) + new_src[insertion_point:]

    open(route, 'w').write(new_src)
    print(f'✓ {route} ({inserted} handlers guarded, roles={roles})')
