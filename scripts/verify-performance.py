#!/usr/bin/env python3
"""
MISSION 10 — Performance Audit
Analyzes: bundle sizes, page weight, static vs dynamic split, code splitting.
"""
import os, json

NEXT_DIR = '.next'
issues = []
report = {'pages': {}, 'bundles': {}, 'summary': {}}

# 1. Static bundle analysis
static_dir = os.path.join(NEXT_DIR, 'static', 'chunks')
if os.path.exists(static_dir):
    bundles = []
    for root, dirs, files in os.walk(static_dir):
        for f in files:
            if f.endswith('.js'):
                path = os.path.join(root, f)
                size = os.path.getsize(path)
                bundles.append((f, size))
    bundles.sort(key=lambda x: -x[1])
    total = sum(b[1] for b in bundles)
    report['bundles']['total_count'] = len(bundles)
    report['bundles']['total_size_kb'] = round(total / 1024, 1)
    report['bundles']['largest'] = [
        {'name': b[0], 'size_kb': round(b[1] / 1024, 1)} for b in bundles[:10]
    ]
    print(f"📦 JS Bundles: {len(bundles)} chunks, {total/1024:.0f} KB total")
    print("   Top 5 largest:")
    for name, size in bundles[:5]:
        flag = ' ⚠️ LARGE' if size > 500 * 1024 else ''
        print(f"     {name[:50]:50} {size/1024:7.1f} KB{flag}")
        if size > 800 * 1024:
            issues.append(f'Oversized bundle: {name} ({size/1024:.0f} KB)')

# 2. Route-level analysis from app-path-routes-manifest
with open(os.path.join(NEXT_DIR, 'app-path-routes-manifest.json')) as f:
    routes = json.load(f)

dynamic_routes = [r for r in routes if r.startswith('/api')]
page_routes = [r for r in routes if not r.startswith('/api')]
report['summary']['total_routes'] = len(routes)
report['summary']['api_routes'] = len(dynamic_routes)
report['summary']['page_routes'] = len(page_routes)
print(f"\n🗺️  Routes: {len(routes)} total ({len(page_routes)} pages, {len(dynamic_routes)} API)")

# 3. Prerendered pages analysis
prerender_manifest = os.path.join(NEXT_DIR, 'prerender-manifest.json')
if os.path.exists(prerender_manifest):
    with open(prerender_manifest) as f:
        pm = json.load(f)
    static_pages = list(pm.get('routes', {}).keys())
    report['summary']['prerendered_pages'] = len(static_pages)
    print(f"⚡ Prerendered (SSG) pages: {len(static_pages)}")

# 4. Middleware size
mw = os.path.join(NEXT_DIR, 'server', 'middleware.js')
if os.path.exists(mw):
    size = os.path.getsize(mw)
    print(f"🔧 Middleware: {size/1024:.1f} KB")
    if size > 300 * 1024:
        issues.append(f'Middleware too large: {size/1024:.0f} KB (impacts every request)')

# 5. Check for source maps shipped (should be off in prod)
sourcemap_count = 0
for root, dirs, files in os.walk(os.path.join(NEXT_DIR, 'static')):
    for f in files:
        if f.endswith('.map'):
            sourcemap_count += 1
report['summary']['sourcemaps_shipped'] = sourcemap_count
if sourcemap_count > 0:
    issues.append(f'{sourcemap_count} source maps shipped to production')

print(f"\n{'='*55}")
print(f"  ISSUES: {len(issues)}")
for i in issues:
    print(f"   ⚠️  {i}")
if not issues:
    print("  ✓ No performance issues detected")
print(f"{'='*55}")

report['issues'] = issues
os.makedirs('download/verification', exist_ok=True)
with open('download/verification/performance-audit.json', 'w') as f:
    json.dump(report, f, indent=2)
print("\n📄 Saved → download/verification/performance-audit.json")
