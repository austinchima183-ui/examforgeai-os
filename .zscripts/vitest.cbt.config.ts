// Temporary verification config — mirrors vitest.config.ts but drops the
// missing ./src/test/setup.ts setupFiles reference (pre-existing harness gap)
// so the CBT integration test can run against live Supabase.
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 60000,
    hookTimeout: 60000,
    include: ['src/lib/cbt/__tests__/cbt-integrity.test.ts'],
    alias: {
      '@': path.resolve('/home/z/my-project', './src'),
    },
  },
})
