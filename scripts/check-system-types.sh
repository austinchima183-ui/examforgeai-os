#!/bin/bash
# Type-check just the new design system files
set -e
cd /home/z/my-project

# Quick syntax check using tsc on each file
echo "Checking design/system.ts..."
npx tsc --noEmit --skipLibCheck \
  src/lib/design/system.ts 2>&1 | head -20 || echo "OK"

echo ""
echo "Checking components/system/*.tsx..."
npx tsc --noEmit --skipLibCheck \
  --moduleResolution bundler \
  --target ES2020 \
  --lib dom,dom.iterable,ES2020 \
  --jsx react-jsx \
  --esModuleInterop \
  --module esnext \
  --strict false \
  --paths '{
    "@/*": ["./src/*"]
  }' \
  --baseUrl . \
  src/components/system/page-header.tsx \
  src/components/system/kpi-card.tsx \
  src/components/system/section-card.tsx \
  src/components/system/filter-bar.tsx \
  src/components/system/activity-feed.tsx \
  src/components/system/chart-card.tsx \
  src/components/system/quick-actions.tsx \
  src/components/system/dashboard-page.tsx \
  src/components/system/bulk-action-bar.tsx \
  src/components/system/inline-edit-field.tsx \
  src/components/system/saved-filters.tsx \
  2>&1 | head -80

echo ""
echo "Done."
