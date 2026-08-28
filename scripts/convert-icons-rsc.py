#!/usr/bin/env python3
"""
Convert icon={Component} / icon: Component usages to RSC-safe
icon="registry-name" strings in the 4 server-side role dashboards.
"""
import re

FILES = [
    'src/app/(app)/dashboard/student/page.tsx',
    'src/app/(app)/dashboard/teacher/page.tsx',
    'src/app/(app)/dashboard/school-admin/page.tsx',
    'src/app/(app)/dashboard/super-admin/page.tsx',
]

# PascalCase → kebab-case
def to_kebab(name):
    # Handle sequences like CheckCircle2 → check-circle-2, BarChart3 → bar-chart-3
    s1 = re.sub(r'([A-Z]+)([A-Z][a-z])', r'\1-\2', name)
    s2 = re.sub(r'([a-z0-9])([A-Z])', r'\1-\2', s1)
    return s2.lower()

# Icons known to be used
USED = [
    'Activity', 'ActivityIcon', 'Award', 'BarChart3', 'BookOpen', 'Brain',
    'CalendarDays', 'CheckCircle2', 'ClipboardList', 'Clock', 'Cpu',
    'CreditCard', 'Database', 'DollarSign', 'FileText', 'Flame', 'Globe',
    'GraduationCap', 'LayoutGrid', 'Lock', 'Plus', 'School', 'Server',
    'Settings', 'Shield', 'Sparkles', 'Target', 'Trophy', 'UserPlus',
    'Users', 'Zap', 'Bell', 'BookMarked', 'Calendar', 'HelpCircle',
    'MessageSquare', 'Mail', 'Star', 'TrendingUp', 'TrendingDown',
    'LayoutDashboard', 'Lightbulb', 'LineChart', 'PieChart', 'Heart',
    'AlertTriangle', 'ArrowRight', 'Building2', 'ChevronRight',
]

for fpath in FILES:
    with open(fpath) as f:
        src = f.read()

    changed = 0
    # icon={Component} → icon="kebab-name"
    for comp in USED:
        pat_attr = f'icon={{{comp}}}'
        rep_attr = f'icon="{to_kebab(comp if comp != "ActivityIcon" else "Activity")}"'
        if pat_attr in src:
            src = src.replace(pat_attr, rep_attr)
            changed += src.count(rep_attr) and 1 or 1

    # icon: Component, → icon: 'kebab-name',
    for comp in USED:
        kebab = to_kebab(comp if comp != 'ActivityIcon' else 'Activity')
        pat_obj = f'icon: {comp},'
        rep_obj = f"icon: '{kebab}',"
        if pat_obj in src:
            src = src.replace(pat_obj, rep_obj)
            changed += 1

    with open(fpath, 'w') as f:
        f.write(src)

    # Count remaining component references
    remaining = re.findall(r'icon=\{[A-Z]\w*\}|icon: [A-Z]\w*,', src)
    print(f'{fpath}: converted (remaining: {len(remaining)})')
    for r in remaining:
        print(f'   ⚠️ still present: {r}')
