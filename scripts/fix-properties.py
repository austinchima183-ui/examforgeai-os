#!/usr/bin/env python3
"""Fix downstream property accesses after schema column renames."""
import re

# (file, old_property_pattern, new_property) — surgical, line-scoped where needed
FIXES = [
    # marketplace products: review_count -> total_reviews
    ('src/lib/services/marketplace-service.ts', r'\.review_count\b', '.total_reviews'),
    ('src/app/api/marketplace/product/route.ts', r'\.review_count\b', '.total_reviews'),
    ('src/app/api/marketplace/related/route.ts', r'\.review_count\b', '.total_reviews'),
    ('src/app/api/marketplace/seller/products/route.ts', r'\.review_count\b', '.total_reviews'),
    ('src/app/api/marketplace/seller/analytics/route.ts', r'\.review_count\b', '.total_reviews'),
    # reviews: user_id -> buyer_id, text -> content
    ('src/lib/services/marketplace-service.ts', r'\.user_id\b', '.buyer_id'),
    ('src/lib/services/marketplace-service.ts', r'\.text\b', '.content'),
    ('src/app/api/marketplace/reviews/route.ts', r'\.user_id\b', '.buyer_id'),
    ('src/app/api/marketplace/reviews/route.ts', r'\.text\b', '.content'),
    ('src/lib/payment/payment-security.ts', r'\.user_id\b', '.buyer_id'),
    ('src/app/api/marketplace/webhook/route.ts', r'\.user_id\b', '.buyer_id'),
    # exams starts_at -> start_time
    ('src/lib/ai/ai-student.ts', r'\.starts_at\b', '.start_time'),
    ('src/lib/ai/ai-parent.ts', r'\.starts_at\b', '.start_time'),
    # subscriptions amount -> price_at_subscription, org_id -> school_id, seats -> seats_purchased
    ('src/lib/billing/invoice-service.ts', r'\.amount\b', '.price_at_subscription'),
    ('src/lib/billing/invoice-service-extended.ts', r'\.amount\b', '.price_at_subscription'),
    ('src/lib/billing/revenue-dashboard-service.ts', r'\.amount\b', '.price_at_subscription'),
    ('src/lib/enterprise-analytics/financial-analytics-service.ts', r'\.amount\b', '.price_at_subscription'),
    ('src/lib/enterprise-analytics/risk-analytics-service.ts', r'\.amount\b', '.price_at_subscription'),
    ('src/lib/billing/revenue-dashboard-service.ts', r'\.total\b', '.total_amount'),
    # exam_results score -> score_percentage
    ('src/lib/enterprise-analytics/risk-analytics-service.ts', r'\.score\b', '.score_percentage'),
    ('src/lib/enterprise-analytics/academic-analytics-service.ts', r'\.score\b', '.score_percentage'),
]

for path, pattern, replacement in FIXES:
    try:
        with open(path) as f:
            content = f.read()
        new_content, n = re.subn(pattern, replacement, content)
        if n:
            with open(path, 'w') as f:
                f.write(new_content)
            print(f"{path}: {n} replacements ({pattern} -> {replacement})")
    except FileNotFoundError:
        print(f"SKIP (missing): {path}")
