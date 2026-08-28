import { defineConfig, devices } from '@playwright/test'

// ============================================================================
// ExamForge AI Ω — MISSION 9 + 14: E2E Verification Configuration
// - Video recording: ON (full journey videos)
// - Screenshots: ON (only on failure — we take explicit ones in tests)
// - Traces: retain-on-failure
// - HTML report: download/verification/playwright-report
// ============================================================================

const BASE = process.env.VERIFY_BASE || 'http://localhost:3000'

export default defineConfig({
  testDir: './e2e',
  outputDir: './download/verification/test-artifacts',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false, // sequential — each role journey is a coherent video
  retries: 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'download/verification/playwright-report', open: 'never' }],
    ['json', { outputFile: 'download/verification/playwright-report/results.json' }],
    ['list'],
  ],
  use: {
    baseURL: BASE,
    trace: 'retain-on-failure',
    video: 'on', // full journey videos
    screenshot: 'only-on-failure',
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
    locale: 'en-US',
    timezoneId: 'Africa/Lagos',
    viewport: { width: 1440, height: 900 },
    launchOptions: {
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    },
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
