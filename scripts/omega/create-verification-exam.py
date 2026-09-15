#!/usr/bin/env python3
"""Ω-UI FINALIZATION: create a fresh takeable exam for the completion-screen
verification. Inserts via Supabase REST as the E2E teacher (RLS-permitted),
with class_id=NULL (validateExamAccess checks enrollment only when class_id
is set) and allowed_attempts=3.

Question design (deterministic grading):
  Q1 correct, Q2 correct, Q3 wrong-by-student -> 2/3 = 66.7% -> grade C, PASSED
"""
import json
import os
import re
import urllib.request
import uuid

BASE = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "https://pzfnptrrnxkgodclyhft.supabase.co").rstrip("/")
TEACHER = {"email": "e2e-teacher-1787626988@examforge-test.com", "password": "Teacher123!"}
SCHOOL = "995576f7-1c97-4f69-857a-28d8faec6b46"
SUBJECT = "6432d955-c196-4f0e-9ccd-3df9ab649582"
TEACHER_ID = "c799a608-14c3-4a23-b15d-99930dbc76cb"

# Env-first (CI), .env.local fallback (local runs)
ANON = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
if not ANON:
    env = open("/home/z/my-project/.env.local").read()
    ANON = re.search(r"NEXT_PUBLIC_SUPABASE_ANON_KEY=(\S+)", env).group(1)


def req(url, method="GET", body=None, token=None):
    headers = {"apikey": ANON, "Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, method=method, headers=headers)
    with urllib.request.urlopen(r, timeout=20) as resp:
        return json.loads(resp.read().decode() or "null")


# 1. Teacher login
tok = req(f"{BASE}/auth/v1/token?grant_type=password", "POST", TEACHER)["access_token"]

# 2. Insert the exam
exam_id = str(uuid.uuid4())
exam = {
    "id": exam_id,
    "title": "E2E Completion Verification Exam (Ω-UI)",
    "description": "Deterministic 3-question exam verifying the completion screen: "
    "real server score, grade/pass state, persisted answer review, time used.",
    "school_id": SCHOOL,
    "created_by": TEACHER_ID,
    "subject_id": SUBJECT,
    "class_id": None,
    "exam_type": "school_exam",
    "status": "published",
    "total_marks": "3",
    "pass_mark": "1.5",
    "time_limit_minutes": 10,
    "start_time": "2026-09-14T00:00:00Z",
    "end_time": "2027-12-31T23:59:59Z",
    "allowed_attempts": 3,
    "randomize_questions": False,
    "randomize_options": False,
    "show_results": "after_submission",
    "auto_submit": True,
    "allow_resume": True,
    "browser_lockdown": False,
}
created = req(f"{BASE}/rest/v1/exams", "POST", exam, tok)
assert created is None or created == [], f"exam insert failed: {created}"

# 3. Insert questions — single_choice with one isCorrect option each
def q(title, opts, correct_idx, order):
    ids = [str(uuid.uuid4()) for _ in opts]
    options = [{"id": i, "content": t, "isCorrect": n == correct_idx} for n, (i, t) in enumerate(zip(ids, opts))]
    return {
        "exam_id": exam_id,
        "question_text": title,
        "question_type": "single_choice",
        "options": json.dumps(options),
        "correct_answer": json.dumps(ids[correct_idx]),
        "marks": 1,
        "difficulty": "easy",
        "is_required": True,
        "order": order,
    }

questions = [
    q("What is 2 + 2?", ["3", "4", "5", "6"], 1, 1),
    q("What is the capital of France?", ["London", "Berlin", "Paris", "Madrid"], 2, 2),
    q("Which is the largest planet in our solar system?", ["Earth", "Mars", "Jupiter", "Venus"], 2, 3),
]
req(f"{BASE}/rest/v1/questions", "POST", questions, tok)

# 4. Verify readback as teacher
check = req(f"{BASE}/rest/v1/exams?id=eq.{exam_id}&select=id,status,allowed_attempts,show_results", token=tok)
assert check and check[0]["status"] == "published", f"exam not readable: {check}"
qcheck = req(f"{BASE}/rest/v1/questions?exam_id=eq.{exam_id}&select=id&order=order.asc", token=tok)
assert len(qcheck) == 3, f"expected 3 questions, got {len(qcheck)}"

out = {"examId": exam_id, "expected": {"score": 2, "totalMarks": 3, "percentage": 66.7, "grade": "C", "passed": True}}
# Repo-root-relative output (works locally and in CI); mkdir guards against a
# missing scripts/tmp/ dir (a live-measured provisioning failure from a prior session)
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
OUT_PATH = os.path.join(ROOT, "scripts", "tmp", "verification-exam.json")
os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
with open(OUT_PATH, "w") as f:
    json.dump(out, f, indent=2)
print(json.dumps(out))
