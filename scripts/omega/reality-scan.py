#!/usr/bin/env python3
"""Ω∞ FINAL AUDIT — Reality Scan: inventory every fabricated claim in the repo.
Scans marketing components/pages for: fake metrics, testimonials, logos,
compliance badges, integrations, uptime/SLA, awards, ratings, funding."""
import os, re, json

ROOT = '/home/z/my-project/src'
OUT = '/home/z/my-project/download/verification/omega-local/reality-scan.json'

FAKE_PATTERNS = [
    # (label, regex)
    ('metric_500_schools', r'\b500\+?\s*(Schools|schools)'),
    ('metric_120k_students', r'120[Kk]\+?\s*(Students|students)|120,000'),
    ('metric_2m_exams', r'2\.?\s?[Mm]\+?\s*(Exams|exams)'),
    ('metric_countries', r'(4 countries|across 4 countries|NG 280|Kenya.*85|Kenya 85)'),
    ('fake_live_feed', r'(students (took exams|online)|schools joined this month|712 students)'),
    ('institutions', r'(LASU|UNILAG|NNUST|KNUST|Ashesi|Strathmore|Covenant University|Federal Ministry of Education)'),
    ('awards', r'(Best EdTech|Top 50 African|Award-Winning|award-winning)'),
    ('compliance', r'(SOC\s?2|ISO\s?27001|GDPR.{0,30}(certified|compliance badge)|NDPR certified)'),
    ('ratings', r'(4\.9/5|NPS\s?72|97\.2%|retention|98\.6%)'),
    ('funding', r'(Series A|\$2\.5M|\$2\.5 million)'),
    ('integrations_fake', r'(Moodle|Canvas LMS|Google Workspace|Microsoft 365|WhatsApp|Slack|Zapier|Power BI|BigQuery)'),
    ('graphql', r'GraphQL'),
    ('uptime_sla', r'(99\.9% (uptime|SLA)|SLA with)'),
    ('app_domain', r'app\.examforge\.ai'),
    ('fictional_services', r'(GraphQL API|Webhook Relay Service)'),
]

results = []
for dirpath, dirs, files in os.walk(ROOT):
    dirs[:] = [d for d in dirs if d not in ('node_modules', '__tests__')]
    for fn in files:
        if not fn.endswith(('.tsx', '.ts')):
            continue
        p = os.path.join(dirpath, fn)
        try:
            body = open(p, encoding='utf-8', errors='ignore').read()
        except Exception:
            continue
        for label, pat in FAKE_PATTERNS:
            for m in re.finditer(pat, body):
                line_no = body[:m.start()].count('\n') + 1
                line = body.split('\n')[line_no - 1].strip()[:150]
                results.append({'file': p.replace(ROOT + '/', ''), 'line': line_no, 'label': label, 'evidence': line})

by_label = {}
for r in results:
    by_label.setdefault(r['label'], []).append(r)

print(f"REALITY SCAN: {len(results)} fabricated-claim instances across {len(set(r['file'] for r in results))} files\n")
for label, items in sorted(by_label.items()):
    print(f"[{label}] {len(items)} hits in {len(set(i['file'] for i in items))} files:")
    for i in items[:4]:
        print(f"   {i['file']}:{i['line']}  → {i['evidence'][:100]}")
    if len(items) > 4:
        print(f"   ... +{len(items)-4} more")

json.dump({'scannedAt': __import__('datetime').datetime.now().isoformat(), 'total': len(results), 'items': results},
          open(OUT, 'w'), indent=1)
print(f"\nsaved {OUT}")
