#!/usr/bin/env python3
"""
Final RSC icon sweep — fixes local page components that type icon as
ComponentType/LucideIcon but now receive registry strings.
Pattern: local component destructures icon → render with resolveIcon.
"""
import re, os

ERROR_FILES = []
import subprocess
result = subprocess.run(['npx', 'tsc', '--noEmit'], capture_output=True, text=True)
for line in result.stdout.split('\n'):
    m = re.match(r'^(src/[^(]+)\(\d+', line)
    if m and m.group(1) not in ERROR_FILES:
        ERROR_FILES.append(m.group(1))

print(f'Files to fix: {len(ERROR_FILES)}')

for f in ERROR_FILES:
    try:
        src = open(f, encoding='utf-8').read()
    except FileNotFoundError:
        continue
    orig = src

    # 1. Widen type declarations
    src = src.replace(
        'icon: ComponentType<{ className?: string }>',
        'icon: string | ComponentType<{ className?: string }>'
    )
    src = src.replace(
        'icon?: ComponentType<{ className?: string }>',
        'icon?: string | ComponentType<{ className?: string }>'
    )
    src = src.replace('icon: LucideIcon', 'icon: string | LucideIcon')
    src = src.replace('icon?: LucideIcon', 'icon?: string | LucideIcon')
    src = src.replace('icon: typeof Crown', 'icon: string')
    src = src.replace('icon: typeof CheckCircle2', 'icon: string')

    # 2. Where a local component destructures `icon: Icon,` and renders <Icon —
    #    we can't easily inject; instead patch the RENDER site pattern
    #    `<Icon className=` → resolved
    # Simplest: if file has `icon: Icon,` destructure AND `<Icon` usage,
    # rename destructure to icon and add resolution after props close.
    if re.search(r'^\s*icon:\s*Icon,\s*$', src, re.MULTILINE) and '<Icon' in src:
        # Find function body start after the destructuring component
        # Generic approach: replace `icon: Icon,` with `icon,` and inject
        # `const Icon = resolveIcon(icon)` at the first line after `) {`
        src = re.sub(r'^(\s*)icon:\s*Icon,\s*$', r'\1icon,', src, flags=re.MULTILINE)
        # inject after the closing of props — find first `}: {` ... `) {` or `}) {`
        m = re.search(r'\}\s*(?::\s*[^{]+)?\{', src[src.find('icon,'):])
        if m:
            pos = src.find('icon,') + m.end()
            src = src[:pos] + '\n  const Icon = resolveIcon(icon)' + src[pos:]

    # 3. Add import
    if 'resolveIcon(' in src and "from '@/lib/design/icon-registry'" not in src:
        m = re.search(r"^import .+$", src, re.MULTILINE)
        if m:
            src = src[:m.end()] + "\nimport { resolveIcon } from '@/lib/design/icon-registry'" + src[m.end():]

    if src != orig:
        open(f, 'w').write(src)
        print(f'✓ patched {f}')
    else:
        print(f'⏭  no auto-fix {f}')
