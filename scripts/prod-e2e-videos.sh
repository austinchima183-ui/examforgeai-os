#!/bin/bash
# ============================================================================
# ExamForge AI Ω — Production E2E Video Evidence Capture
# Re-runs journey suites with PER-SUITE output dirs so videos persist
# (Playwright cleans its outputDir on every new invocation).
# ============================================================================

BASE="${VERIFY_BASE:-https://web-alpha-bay-87.vercel.app}"
VIDDIR="/home/z/my-project/download/verification/prod-e2e/videos"
mkdir -p "$VIDDIR"
cd /home/z/my-project

SUITES=(
  "00-landing"
  "01-student-journey"
  "02-teacher-journey"
  "03-parent-journey"
  "04-school-admin-journey"
  "05-super-admin-journey"
  "07-cbt-flow"
)

FAILED=()
for name in "${SUITES[@]}"; do
  out="$VIDDIR/$name"
  mkdir -p "$out"
  echo "=== $name ($(date +%H:%M:%S)) ==="
  VERIFY_BASE="$BASE" npx playwright test "e2e/$name.spec.ts" \
    --output="$out" --reporter=list > "$VIDDIR/$name.log" 2>&1
  rc=$?
  vids=$(find "$out" -name "*.webm" | wc -l)
  if [ $rc -eq 0 ]; then
    echo "    PASSED — $vids video(s)"
  else
    echo "    FAILED (rc=$rc) — see $VIDDIR/$name.log"
    FAILED+=("$name")
  fi
  sleep 4
done

echo ""
echo "==== VIDEO EVIDENCE SUMMARY ===="
if [ ${#FAILED[@]} -eq 0 ]; then
  echo "ALL JOURNEY SUITES PASSED — videos in $VIDDIR"
  find "$VIDDIR" -name "*.webm" | wc -l
else
  echo "FAILED: ${FAILED[*]}"
  exit 1
fi
