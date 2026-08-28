#!/usr/bin/env python3
"""
Fix TS errors from CSRF auto-fixer:
1. Handlers with `_request` param → rename to `request` (and use it)
2. Handlers with NO request param → add `request: NextRequest`
3. GET handlers that got the auth guard accidentally returning AuthResult → remove guard from GET (auth-only, no CSRF needed on safe methods where handler doesn't use auth)
"""
import re

FILES = """src/app/api/agents/[id]/execute/route.ts
src/app/api/agents/route.ts
src/app/api/alerting/channels/route.ts
src/app/api/alerting/incidents/[id]/route.ts
src/app/api/alerting/suppressions/route.ts
src/app/api/analytics/nlq/route.ts
src/app/api/billing/subscriptions/route.ts
src/app/api/developer/keys/route.ts
src/app/api/developer/oauth-apps/route.ts
src/app/api/marketplace-v2/listings/route.ts
src/app/api/organizations/[id]/route.ts
src/app/api/organizations/route.ts
src/app/api/organizations/switch/route.ts
src/app/api/parent/messaging/route.ts
src/app/api/plugins/[id]/install/route.ts
src/app/api/plugins/route.ts
src/app/api/school/attendance/route.ts
src/app/api/school/calendar/route.ts
src/app/api/school/classes/route.ts
src/app/api/school/fees/route.ts
src/app/api/school/timetable/route.ts
src/app/api/security/passkeys/route.ts
src/app/api/security/sessions/route.ts
src/app/api/security/sso/route.ts
src/app/api/settings/sso/route.ts
src/app/api/workflows/[id]/execute/route.ts
src/app/api/workflows/[id]/route.ts
src/app/api/workflows/route.ts""".strip().split('\n')

for route in FILES:
    try:
        src = open(route).read()
    except FileNotFoundError:
        continue
    orig = src

    # ── Fix 1: _request param in function signatures → request ──
    # Pattern: export async function METHOD(\n  _request: NextRequest,
    src = re.sub(
        r'(export\s+async\s+function\s+\w+\(\s*\n\s*)_request(\s*:\s*NextRequest)',
        r'\1request\2',
        src
    )
    # Also single-line: export async function GET(_request: NextRequest)
    src = re.sub(
        r'(export\s+async\s+function\s+\w+\()_request(\s*:\s*NextRequest\s*[\),])',
        r'\1request\2',
        src
    )

    # ── Fix 2: handlers with no params that reference `request` ──
    # Pattern: export async function METHOD() { ... enforceCsrf(request ...
    # → export async function METHOD(request: NextRequest) {
    def add_param(match):
        return f"{match.group(1)}(request: NextRequest){match.group(2)}"
    # find function signatures without params
    lines = src.split('\n')
    for idx, line in enumerate(lines):
        m = re.match(r'(export\s+async\s+function\s+(?:POST|PUT|PATCH|DELETE))\(\)\s*(\{.*)$', line)
        if m:
            # check if body references request
            context = '\n'.join(lines[idx:idx+15])
            if 'request' in context:
                lines[idx] = f"{m.group(1)}(request: NextRequest){m.group(2)}"
    src = '\n'.join(lines)

    # multi-line zero-param signatures
    src = re.sub(
        r'(export\s+async\s+function\s+(?:POST|PUT|PATCH|DELETE)\()\s*\n(\s*\{)',
        r'\1request: NextRequest\n\2',
        src
    )

    if src != orig:
        open(route, 'w').write(src)
        print(f'✓ params fixed: {route}')
    else:
        print(f'  no param fix needed: {route}')
