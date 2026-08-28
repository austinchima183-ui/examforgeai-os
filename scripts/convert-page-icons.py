#!/usr/bin/env python3
"""
Global RSC-safe icon fix — Phase 2: convert icon={Component} / icon: Component
usages to registry name strings in all server-side pages.
"""
import os, re

def to_kebab(name):
    s1 = re.sub(r'([A-Z]+)([A-Z][a-z])', r'\1-\2', name)
    s2 = re.sub(r'([a-z0-9])([A-Z])', r'\1-\2', s1)
    s3 = re.sub(r'([a-zA-Z])(\d)', r'\1-\2', s2)
    return s3.lower()

# All Lucide icons that exist in the registry (authoritative list)
REGISTRY = set()
reg_src = open('src/lib/design/icon-registry.ts').read()
for m in re.finditer(r"^\s+'?([a-z0-9-]+)'?:\s*\w+,", reg_src, re.MULTILINE):
    REGISTRY.add(m.group(1))

def pascal_to_registry(name):
    """Map a PascalCase Lucide component name to its registry key."""
    kebab = to_kebab(name)
    if kebab in REGISTRY:
        return kebab
    # try without trailing digit (BarChart3 → bar-chart)
    alt = re.sub(r'-\d+$', '', kebab)
    if alt in REGISTRY:
        return alt
    return None

total_converted = 0
files_changed = 0
unmapped = set()

for root, dirs, files in os.walk('src/app'):
    for f in files:
        if not f.endswith('.tsx'):
            continue
        path = os.path.join(root, f)
        src = open(path, encoding='utf-8').read()

        # Skip client components
        if re.search(r"^\s*'use client'", src):
            continue

        orig = src

        # Pattern 1: icon={Component}
        def repl_attr(m):
            global total_converted
            comp = m.group(1)
            reg = pascal_to_registry(comp)
            if reg:
                total_converted += 1
                return f'icon="{reg}"'
            unmapped.add(comp)
            return m.group(0)

        src = re.sub(r'icon=\{([A-Z][A-Za-z0-9]*)\}', repl_attr, src)

        # Pattern 2: icon: Component (in object literals)
        def repl_obj(m):
            global total_converted
            comp = m.group(1)
            reg = pascal_to_registry(comp)
            if reg:
                total_converted += 1
                return f"icon: '{reg}'"
            unmapped.add(comp)
            return m.group(0)

        src = re.sub(r'icon:\s*([A-Z][A-Za-z0-9]*)\s*([,}])', lambda m: repl_obj(m) + m.group(2), src)

        if src != orig:
            open(path, 'w').write(src)
            files_changed += 1

print(f'✓ Converted {total_converted} icon usages across {files_changed} server pages')
if unmapped:
    print(f'\n⚠️  Unmapped components (need registry entries): {sorted(unmapped)}')
