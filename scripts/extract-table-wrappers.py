#!/usr/bin/env python3
"""Extract inline table column definitions from server pages into RSC-safe
client wrapper components (columns with cell render functions cannot cross
the server→client boundary)."""
import os, re

PAGES = [
    {
        'page': 'src/app/(app)/parents/page.tsx',
        'wrapper': 'src/components/tables/parents-table.tsx',
        'component': 'ParentsTable',
        'item_type': 'ParentListItem',
        'type_import': "@/lib/services/users-service",
        'search_key': 'name',
        'search_placeholder': 'Search parents...',
        'empty_message': 'No parents found',
        'empty_description': 'No parents match your search criteria. Try adjusting your filters.',
    },
    {
        'page': 'src/app/(app)/students/page.tsx',
        'wrapper': 'src/components/tables/students-table.tsx',
        'component': 'StudentsTable',
        'item_type': 'StudentListItem',
        'type_import': "@/lib/services/users-service",
        'search_key': 'name',
        'search_placeholder': 'Search students...',
        'empty_message': 'No students found',
        'empty_description': 'No students match your search criteria. Try adjusting your filters.',
    },
    {
        'page': 'src/app/(app)/teachers/page.tsx',
        'wrapper': 'src/components/tables/teachers-table.tsx',
        'component': 'TeachersTable',
        'item_type': 'TeacherListItem',
        'type_import': "@/lib/services/users-service",
        'search_key': 'name',
        'search_placeholder': 'Search teachers...',
        'empty_message': 'No teachers found',
        'empty_description': 'No teachers match your search criteria. Try adjusting your filters.',
    },
    {
        'page': 'src/app/(app)/schools/page.tsx',
        'wrapper': 'src/components/tables/schools-table.tsx',
        'component': 'SchoolsTable',
        'item_type': 'SchoolListItem',
        'type_import': "@/lib/services/schools-service",
        'search_key': 'name',
        'search_placeholder': 'Search schools...',
        'empty_message': 'No schools found',
        'empty_description': 'No schools match your search criteria. Try adjusting your filters.',
    },
    {
        'page': 'src/app/(app)/question-bank/page.tsx',
        'wrapper': 'src/components/tables/question-bank-table.tsx',
        'component': 'QuestionBankTable',
        'item_type': 'QuestionListItem',
        'type_import': "@/lib/services/question-bank-service",
        'search_key': 'text',
        'search_placeholder': 'Search questions...',
        'empty_message': 'No questions found',
        'empty_description': 'No questions match your search criteria. Try adjusting your filters.',
    },
]

WRAPPER_TEMPLATE = """'use client'

// ============================================================================
// ExamForge AI — {component} (client wrapper)
// RSC-safe: the server page passes only serializable DATA; column definitions
// (which contain render functions) live here in the client boundary.
// ============================================================================

import {{ type ColumnDef }} from '@tanstack/react-table'
import {{ DataTable }} from '@/components/tables/data-table'
import type {{ {item_type} }} from '{type_import}'
{extra_imports}

const columns: ColumnDef<{item_type}, unknown>[] = [
{columns_body}]

export function {component}({{ data }}: {{ data: {item_type}[] }}) {{
  return (
    <DataTable
      columns={{columns}}
      data={{data}}
      searchKey="{search_key}"
      searchPlaceholder="{search_placeholder}"
      emptyMessage="{empty_message}"
      emptyDescription="{empty_description}"
    />
  )
}}
"""

def extract(page_path):
    with open(page_path) as f:
        content = f.read()

    # 1. Find columns block
    m = re.search(r'const columns: ColumnDef<\w+, unknown>\[\] = \[', content)
    if not m:
        return None, None, None
    start = m.start()
    # bracket matching starts at the '= [' opening bracket
    open_bracket = content.find('[', m.end() - 1)  # the '[' right after '= '
    depth = 0
    i = open_bracket
    end = len(content)
    while i < len(content):
        if content[i] == '[':
            depth += 1
        elif content[i] == ']':
            depth -= 1
            if depth == 0:
                end = i + 1
                break
        i += 1
    columns_block = content[start:end]
    inner = content[open_bracket + 1:end - 1].strip('\n')
    if inner.endswith(','):
        inner = inner[:-1].rstrip('\n')
    remaining = content[:start] + content[end:]

    # 2. Collect import lines from the page
    import_lines = re.findall(r'^import .*?$', remaining, re.MULTILINE)

    return columns_block, remaining, import_lines, inner


for spec in PAGES:
    page = spec['page']
    print(f"── {page} ──")
    columns_block, remaining, import_lines, inner = extract(page)
    if columns_block is None:
        print("  SKIP: no columns found")
        continue


    # Detect which imports the columns body references
    extra = []
    for line in import_lines:
        if 'DataTable' in line or 'ColumnDef' in line or "from '@tanstack/react-table'" in line:
            continue
        if 'require-auth' in line or 'requireAuth' in line:
            continue
        # get imported names
        m = re.search(r'import\s+\{([^}]+)\}\s+from', line)
        if m:
            names = [n.strip().split(' as ')[-1].strip() for n in m.group(1).split(',')]
            used = [n for n in names if n and re.search(r'\b' + re.escape(n) + r'\b', inner)]
            if used:
                extra.append(line.strip())
        elif re.match(r'^import type', line) and spec['item_type'] not in line:
            continue
    # dedupe
    extra = list(dict.fromkeys(extra))

    wrapper = WRAPPER_TEMPLATE.format(
        component=spec['component'],
        item_type=spec['item_type'],
        type_import=spec['type_import'],
        columns_body=inner + ',\n',
        extra_imports='\n'.join(extra),
        search_key=spec['search_key'],
        search_placeholder=spec['search_placeholder'],
        empty_message=spec['empty_message'],
        empty_description=spec['empty_description'],
    )
    with open(spec['wrapper'], 'w') as f:
        f.write(wrapper)
    print(f"  created {spec['wrapper']} ({len(wrapper)} bytes, {len(extra)} extra imports)")

    # 3. Update the page: remove columns block, replace DataTable usage
    page_content = remaining
    # find all DataTable usages and replace
    def replace_datatable(m):
        attrs = m.group(0)
        data_match = re.search(r'data=\{([^}]+)\}', attrs)
        data_expr = data_match.group(1) if data_match else '[]'
        return f"<{spec['component']} data={{ {data_expr} }} />"

    page_content = re.sub(
        r'<DataTable[\s\S]*?/>',
        replace_datatable,
        page_content,
    )
    # swap import
    page_content = page_content.replace(
        "import { DataTable } from '@/components/tables/data-table'",
        f"import {{ {spec['component']} }} from '{spec['wrapper'].replace('src/', '@/')}'"
    )
    # remove now-unused imports (ColumnDef, item type if unused)
    if 'ColumnDef' not in page_content.replace("import { type ColumnDef } from '@tanstack/react-table'", ''):
        page_content = page_content.replace("import { type ColumnDef } from '@tanstack/react-table'\n", '')
    # check type usage remaining
    if f'{spec["item_type"]}' not in page_content.replace(f"import type {{ {spec['item_type']} }} from '{spec['type_import']}'", ''):
        page_content = page_content.replace(f"import type {{ {spec['item_type']} }} from '{spec['type_import']}'\n", '')
    # drop imports whose names no longer appear in the page body
    def drop_unused_imports(text):
        lines = text.split('\n')
        out = []
        for line in lines:
            m = re.match(r'^import \{([^}]+)\} from \'([^\']+)\'$', line.strip())
            if m and 'tables/data-table' not in line:
                names = [n.strip().split(' as ')[-1].strip() for n in m.group(1).split(',')]
                body = '\n'.join(out + lines[lines.index(line) + 1:]) if False else text.replace(line, '')
                # count usages outside import lines
                body_wo_imports = '\n'.join(l for l in text.split('\n') if not l.strip().startswith('import'))
                used = [n for n in names if n and re.search(r'\b' + re.escape(n) + r'\b', body_wo_imports)]
                if not used:
                    continue
            out.append(line)
        return '\n'.join(out)

    page_content = drop_unused_imports(page_content)
    with open(page, 'w') as f:
        f.write(page_content)
    print(f"  updated {page}")

print("\nDone.")
