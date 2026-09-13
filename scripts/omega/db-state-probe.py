#!/usr/bin/env python3
"""Ω∞ — Live database state measurement via Supabase Management API."""
import json, urllib.request

import os
PAT = os.environ.get("SUPABASE_ACCESS_TOKEN")
if not PAT:
    raise SystemExit("SUPABASE_ACCESS_TOKEN env var required")
REF = "pzfnptrrnxkgodclyhft"

def q(sql):
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{REF}/database/query",
        data=json.dumps({"query": sql}).encode(),
        headers={"Authorization": f"Bearer {PAT}", "Content-Type": "application/json"},
        method="POST")
    return json.load(urllib.request.urlopen(req, timeout=30))

checks = {
    "table_count": "select count(*)::int as n from information_schema.tables where table_schema='public'",
    "rls_enabled": "select count(*)::int as n from pg_tables where schemaname='public' and rowsecurity=true",
    "rls_disabled": "select count(*)::int as n from pg_tables where schemaname='public' and rowsecurity=false",
    "policies": "select count(*)::int as n from pg_policies where schemaname='public'",
    "users": "select count(*)::int as n from auth.users",
    "schools": "select count(*)::int as n from public.schools",
    "students": "select count(*)::int as n from public.students",
    "exams": "select count(*)::int as n from public.exams",
    "certificates": "select count(*)::int as n from public.certificates",
    "ai_request_log": "select count(*)::int as n from public.ai_request_log",
    "tamper_events": "select count(*)::int as n from public.tamper_events",
    "plans": "select count(*)::int as n from public.subscription_plans",
    "missing_tables_probe": """select t.name from (values
        ('marketplace_listings'),('marketplace_purchases_v2'),('devices'),('admissions_applications'),
        ('marketing_campaigns'),('support_tickets'),('coupon_usages'),('failed_payments'),
        ('scheduled_reports'),('security_devices'),('risk_events'),('access_policies'),
        ('notification_queue'),('report_schedules'),('marketplace_purchases'),('marketplace_categories')
    ) as t(name) where not exists (
        select 1 from information_schema.tables it
        where it.table_schema='public' and it.table_name=t.name)""",
}

out = {}
for name, sql in checks.items():
    try:
        out[name] = q(sql)
    except Exception as e:
        out[name] = [{"error": str(e)[:120]}]
    print(name, "=>", json.dumps(out[name])[:300])

json.dump(out, open("/home/z/my-project/download/verification/omega-local/db-state-omegainf.json", "w"), indent=1)
print("\nsaved to download/verification/omega-local/db-state-omegainf.json")
