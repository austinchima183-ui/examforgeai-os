#!/usr/bin/env python3
"""Schema reconciliation: rename code-side table references to live schema tables.
Each mapping verified against live Supabase OpenAPI spec."""
import os, re

# table rename map (code-name → live-name) — verified against live schema
RENAME = {
    'payments': 'transactions',
    'ai_generations': 'ai_generation_requests',
    'school_events': 'school_calendar_events',
    'class_enrollments': 'class_students',
    'parent_student_relationships': 'parent_students',
    'notification_delivery': 'notification_delivery_log',
}

SKIP_DIRS = {'__tests__', 'node_modules', '.next'}

changed_files = []
total_replacements = 0

for root, dirs, files in os.walk('src'):
    dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
    for fname in files:
        if not fname.endswith(('.ts', '.tsx')):
            continue
        path = os.path.join(root, fname)
        with open(path) as f:
            content = f.read()
        original = content
        for old, new in RENAME.items():
            # .from('old') and .from("old")
            pattern = re.compile(r"\.from\(\s*['\"]" + re.escape(old) + r"['\"]\s*\)")
            content, n = pattern.subn(f".from('{new}')", content)
            if n:
                total_replacements += n
        if content != original:
            with open(path, 'w') as f:
                f.write(content)
            changed_files.append(path)

print(f"Replaced {total_replacements} table references across {len(changed_files)} files")
for f in changed_files:
    print(f"  {f}")
