#!/usr/bin/env python3
"""Context-aware column reconciliation: rename columns ONLY inside
.from('<table>')...select(...) chains for verified table.column pairs."""
import os, re

# table rename (1 more)
TABLE_RENAME = {
    'attendance_records': 'attendance',
}

# (table, old_col) -> new_col  — verified against live schema
COLUMN_MAP = {
    ('exam_results', 'score'): 'score_percentage',
    ('exam_results', 'percentage'): 'score_percentage',
    ('subscriptions', 'plan_tier'): 'plan_id',
    ('subscriptions', 'amount'): 'price_at_subscription',
    ('marketplace_products', 'review_count'): 'total_reviews',
    ('marketplace_purchases', 'user_id'): 'buyer_id',
    ('marketplace_purchases', 'status'): 'is_active',
    ('marketplace_reviews', 'user_id'): 'buyer_id',
    ('marketplace_reviews', 'text'): 'content',
    ('messages', 'sender'): 'sender_id',
    ('exams', 'starts_at'): 'start_time',
    ('invoices', 'total'): 'total_amount',
}

SKIP_DIRS = {'__tests__', 'node_modules', '.next'}
changed_files = []
total_col_fixes = 0
total_table_fixes = 0

for root, dirs, files in os.walk('src'):
    dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
    for fname in files:
        if not fname.endswith(('.ts', '.tsx')):
            continue
        path = os.path.join(root, fname)
        with open(path) as f:
            content = f.read()
        original = content

        # 1. table renames
        for old, new in TABLE_RENAME.items():
            pattern = re.compile(r"\.from\(\s*['\"]" + re.escape(old) + r"['\"]\s*\)")
            content, n = pattern.subn(f".from('{new}')", content)
            total_table_fixes += n

        # 2. column renames in select strings, scoped to table context
        for (table, old_col), new_col in COLUMN_MAP.items():
            # Pattern: .from('table') ... .select('...col...')  (within 600 chars, no intervening .from()
            def fix_select(m):
                global total_col_fixes
                prefix, sel, quote = m.group(1), m.group(2), m.group(3)
                # word-boundary replace of the column name
                new_sel, n = re.subn(r'\b' + re.escape(old_col) + r'\b', new_col, sel)
                if n:
                    total_col_fixes += n
                return prefix + new_sel + quote

            pattern = re.compile(
                r"(\.from\(\s*['\"]" + re.escape(table) + r"['\"]\s*\)(?:(?!\.from\()[\s\S]){0,600}?\.select\(\s*)([`'\"])([\s\S]*?)\2(?=\s*[\),])",
                re.DOTALL
            )
            # group(2) is the quote — need it in replacement; restructure:
            for _ in range(10):  # multiple selects per file
                m = re.search(
                    r"\.from\(\s*['\"]" + re.escape(table) + r"['\"]\s*\)(?:(?!\.from\()[\s\S]){0,600}?\.select\(\s*([`'\"])([\s\S]*?)\1(?=\s*[\),])",
                    content, re.DOTALL
                )
                if not m:
                    break
                quote, sel = m.group(1), m.group(2)
                new_sel, n = re.subn(r'\b' + re.escape(old_col) + r'\b', new_col, sel)
                if n == 0:
                    break
                content = content[:m.start(2)] + new_sel + content[m.end(2):]
                total_col_fixes += n

        if content != original:
            with open(path, 'w') as f:
                f.write(content)
            changed_files.append(path)

print(f"Table renames: {total_table_fixes}")
print(f"Column fixes: {total_col_fixes}")
print(f"Files changed: {len(changed_files)}")
for f in changed_files:
    print(f"  {f}")
