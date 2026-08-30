#!/bin/bash
# ============================================================================
# Ω-9: Full E2E evidence run — sequential suites with artifact preservation.
# Playwright cleans outputDir on each invocation, so we copy artifacts to a
# staging dir after each suite (memory-constrained machine can't run one
# invocation).
# ============================================================================
set -e
cd /home/z/my-project

STAGE=download/verification/e2e-evidence
rm -rf "$STAGE"
mkdir -p "$STAGE"

run_suite() {
  local name="$1"; shift
  echo "── Running: $name ──────────────────────────────────"
  npx playwright test "$@" 2>&1 | tail -3
  # Preserve artifacts (videos/traces/screenshots) from this invocation
  if [ -d download/verification/test-artifacts ]; then
    for d in download/verification/test-artifacts/*/; do
      [ -d "$d" ] || continue
      cp -r "$d" "$STAGE/$(basename "$d")" 2>/dev/null || true
    done
  fi
}

run_suite "landing + student"    e2e/00-landing.spec.ts e2e/01-student-journey.spec.ts
run_suite "teacher + parent"     e2e/02-teacher-journey.spec.ts e2e/03-parent-journey.spec.ts
run_suite "school-admin + super" e2e/04-school-admin-journey.spec.ts e2e/05-super-admin-journey.spec.ts
run_suite "widget system 3.0"    e2e/09-widget-system.spec.ts
run_suite "cbt + ai/api"        e2e/07-cbt-flow.spec.ts e2e/08-ai-api.spec.ts
run_suite "rbac matrix"         e2e/06-rbac-matrix.spec.ts

echo ""
echo "═══════════════════════════════════════════════════"
echo "Evidence staged in $STAGE:"
ls "$STAGE" | wc -l | xargs echo "  artifact folders:"
find "$STAGE" -name "*.webm" | wc -l | xargs echo "  videos:"
find "$STAGE" -name "*.png" | wc -l | xargs echo "  screenshots:"
find "$STAGE" -name "trace.zip" | wc -l | xargs echo "  traces:"
du -sh "$STAGE"
