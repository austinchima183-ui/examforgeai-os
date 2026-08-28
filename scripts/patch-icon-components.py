#!/usr/bin/env python3
"""
Global RSC-safe icon fix — Phase 1: patch all components declaring
`icon: LucideIcon` / `icon?: LucideIcon` to accept `string | LucideIcon`
and resolve strings via the icon registry.
"""
import re

FILES = [
    'src/components/command-palette.tsx',
    'src/components/system/bulk-action-bar.tsx',
    'src/components/docs/docs-sidebar.tsx',
    'src/components/ai/contextual-suggestions.tsx',
    'src/components/dashboard/intelligent-insights.tsx',
    'src/components/dashboard/quick-actions.tsx',
    'src/components/dashboard/recent-activity.tsx',
    'src/components/dashboard/stat-card.tsx',
    'src/components/enterprise/dashboard-widgets.tsx',
]

for f in FILES:
    try:
        src = open(f, encoding='utf-8').read()
    except FileNotFoundError:
        print(f'⏭  {f} not found')
        continue

    orig = src

    # 1. Patch prop type declarations
    src = src.replace('icon: LucideIcon', 'icon: string | LucideIcon')
    src = src.replace('icon?: LucideIcon', 'icon?: string | LucideIcon')

    # 2. Add resolveIcon import if not present
    if 'resolveIcon' not in src:
        # find the lucide import line to append after
        m = re.search(r"^import .+lucide-react.+$", src, re.MULTILINE)
        if m:
            src = src[:m.end()] + "\nimport { resolveIcon } from '@/lib/design/icon-registry'" + src[m.end():]
        else:
            # add after first import
            m = re.search(r"^import .+$", src, re.MULTILINE)
            if m:
                src = src[:m.end()] + "\nimport { resolveIcon } from '@/lib/design/icon-registry'" + src[m.end():]

    # 3. Patch destructured icon usage: `icon: Icon,` or `icon,` in component body
    #    → resolve after destructuring
    # Pattern A: destructure renames icon → Icon
    if re.search(r'\bicon:\s*Icon\s*,', src) and 'const Icon = resolveIcon' not in src:
        # find the closing of the destructuring params and add resolution after function body opens
        # simple approach: after the `}: XxxProps) {` line following the destructure
        m = re.search(r'(\}\s*:\s*\w+Props[^{]*\{)', src)
        if m:
            src = src[:m.end()] + "\n  const ResolvedIcon = resolveIcon(Icon)" + src[m.end():]
            # replace usages <Icon  with <ResolvedIcon
            src = re.sub(r'<Icon(\s)', r'<ResolvedIcon\1', src)
            src = re.sub(r'<Icon/>', '<ResolvedIcon />', src)

    # Pattern B: plain `icon,` destructure
    if re.search(r'^\s*icon,\s*$', src, re.MULTILINE) and 'const Icon = resolveIcon(icon)' not in src:
        m = re.search(r'(\}\s*:\s*\w+Props[^{]*\{)', src)
        if m:
            src = src[:m.end()] + "\n  const Icon = resolveIcon(icon)" + src[m.end():]

    if src != orig:
        open(f, 'w').write(src)
        print(f'✓ patched {f}')
    else:
        print(f'  no changes {f}')
