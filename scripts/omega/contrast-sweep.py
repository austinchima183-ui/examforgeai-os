#!/usr/bin/env python3
"""
ExamForge AI Ω — FINAL MANDATE Mission Ω-5 (Accessibility)
Color-contrast sweep for authenticated app + auth pages.

WCAG AA math on the app's dark surfaces:
  - foreground #EDEDED at /30 /35 /40 /45 over #090909 → 2.6–4.0:1  (FAIL)
  - foreground #EDEDED at /50 over #090909 → 4.8:1 (pass) but FAILS on
    elevated glass surfaces #1D1D1D (4.39) and #242424 (4.04)
  - foreground #EDEDED at /60 → ≥5.7:1 on every surface in the design
    system (bg #090909, glass #111/#171717/#1D1D1D/#242424)  (PASS)

Therefore the minimum text opacity floor for the authenticated app is /60.
This script raises every text utility below that floor to /60 in app/auth
source areas. Marketing + landing areas are EXCLUDED (RULE ZERO: locked).

Run:  python3 scripts/omega/contrast-sweep.py
"""

import re
import sys
from pathlib import Path

ROOT = Path('/home/z/my-project')

# Areas in scope: authenticated app + shared app components + auth pages.
# EXCLUDED (RULE ZERO — landing/marketing locked): src/app/(marketing), src/components/marketing
SCAN_DIRS = [
    ROOT / 'src/app/(app)',
    ROOT / 'src/app/(public)',
    ROOT / 'src/components/system',
    ROOT / 'src/components/layout',
    ROOT / 'src/components/dashboard',
    ROOT / 'src/components/enterprise',
    ROOT / 'src/components/tables',
    ROOT / 'src/components/auth',
    ROOT / 'src/components/filters',
    ROOT / 'src/components/forms',
    ROOT / 'src/components/search',
    ROOT / 'src/components/ai',
    ROOT / 'src/components/charts',
    ROOT / 'src/components/school',
    ROOT / 'src/components/reports',
    ROOT / 'src/components/dialogs',
    ROOT / 'src/components/onboarding',
    ROOT / 'src/components/performance',
    ROOT / 'src/components/buttons',
    ROOT / 'src/components/help',
    ROOT / 'src/components/seo',
    ROOT / 'src/components/error-boundary.tsx',
    ROOT / 'src/components/error-states.tsx',
    ROOT / 'src/components/api-result-handler.tsx',
    ROOT / 'src/components/command-palette.tsx',
    # Shared UI primitives — placeholder floor affects every form in the app.
    # (Marketing sub-pages reuse Input; brighter placeholder = a11y fix, not a restyle.)
    ROOT / 'src/components/ui',
]

# ── Replacement rules ────────────────────────────────────────────────────────
# Raise text opacity floor to /60 (passes 4.5:1 on every dark surface).
TEXT_OPACITY_RE = re.compile(r'(text-foreground:|text-foreground/)(25|30|35|40|45|50)\b')
WHITE_OPACITY_RE = re.compile(r'(text-white:|text-white/)(25|30|35|40|45|50)\b')
# Bare palette grays that fail on dark bg
GRAY_MAP = {
    'text-gray-500': 'text-foreground/60',
    'text-slate-500': 'text-foreground/60',
    'text-zinc-500': 'text-foreground/60',
}
# Placeholder floor (placeholders are real text)
PLACEHOLDER_RE = re.compile(r'(placeholder:text-foreground:|placeholder:text-foreground/)(25|30|35|40|45|55|50)\b')

total_files = 0
total_repl = 0

for scan_dir in SCAN_DIRS:
    if scan_dir.is_file():
        files = [scan_dir]
    else:
        files = [p for p in scan_dir.rglob('*.tsx')] + [p for p in scan_dir.rglob('*.ts')]
    for f in files:
        try:
            src = f.read_text(encoding='utf-8')
        except Exception as e:
            print(f'SKIP (read error) {f}: {e}')
            continue
        orig = src
        n = 0

        def bump_text(m):
            global n
            n += 1
            return f'{m.group(1)}60'

        src = TEXT_OPACITY_RE.sub(bump_text, src)
        src = WHITE_OPACITY_RE.sub(bump_text, src)
        src = PLACEHOLDER_RE.sub(bump_text, src)
        for old, new in GRAY_MAP.items():
            occurrences = src.count(old)
            if occurrences:
                # word-boundary style replacement
                src = re.sub(rf'\b{old}\b', new, src)
                n += occurrences

        if src != orig:
            f.write_text(src, encoding='utf-8')
            total_files += 1
            total_repl += n
            rel = f.relative_to(ROOT)
            print(f'  ✓ {rel}: {n} replacements')

print(f'\nDONE: {total_repl} replacements across {total_files} files')
