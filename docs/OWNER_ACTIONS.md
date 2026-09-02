# OWNER ACTIONS — ExamForge AI Ω Final (2026-09-02)

Everything below is blocked ONLY by credentials that do not exist in this
environment. All artifacts are committed in the repository (local `main`
@ `75e92d9`). Each action is copy-paste ready.

## 1. Push the source to GitHub (token expired — verified)

The remote-embedded token authenticates reads (public repo) but GitHub
rejects writes ("Invalid username or token" — revoked/rotated). Six commits
are pending on local `main` (5 from the prior session + the Ω-final commit).

```bash
cd /home/z/my-project
# Update the remote with a fresh token (classic PAT with repo scope, or
# fine-grained token with Contents: Read and write on examforgeai):
git remote set-url origin \
  https://x-access-token:<NEW_TOKEN>@github.com/austinchima183-ui/examforgeai-os.git
git push origin main

# If the canonical target is instead the mandate's repo (public):
git remote add canonical https://x-access-token:<NEW_TOKEN>@github.com/austinchima183-ui/examforgeai.git
git push canonical main   # note: history was re-squashed for examforgeai-os; expect divergence
```

Commits pending push (newest first):
- `75e92d9` omega-final: complete offline CBT contract, ship AI usage analytics, zero dependency vulnerabilities
- `703d6c3`, `c60c253`, `05055c0`, `9d211f1`, `c251bd2` (TOTP/IDOR/CSRF fixes, migrations 007–009, evidence)

## 2. Apply the live-database migrations (DDL — 15 minutes)

Open the Supabase SQL Editor on project `pzfnptrrnxkgodclyhft` and run, in
order (each file is idempotent — safe to re-run):

```
supabase/migrations/005_break_class_rls_recursion.sql   # fixes classes 500s (RLS recursion 42P17)
supabase/migrations/006_omega_billing_fix.sql           # fixes plans RLS policy
supabase/migrations/007_omega_missing_tables.sql       # creates 59 referenced-but-missing tables
supabase/migrations/008_omega_ai_tracking.sql          # AI tracking completeness
supabase/migrations/009_omega_certificates.sql         # certificate contract columns + RLS
```

Verification after applying (no credentials needed):

```bash
node scripts/omega/table-probe.js          # expect: MISSING → EXISTS, no HTTP_500 rows
```

## 3. Redeploy production (Vercel token absent this session)

```bash
cd /home/z/my-project
vercel login                     # or: export VERCEL_TOKEN=<token>
npx vercel deploy --prod --yes
node scripts/omega/prod-smoke-final.js    # expect: 9/9 PASS (now incl. today's build)
```

## 4. Post-deploy re-measurement (optional, 10 minutes)

```bash
CHROME_PATH=$(find ~/.cache/ms-playwright -name chrome-headless-shell | head -1) \
  bash scripts/omega/with-server.sh \
  npx lighthouse http://localhost:3000/dashboard/student --preset=desktop --output=json
```
