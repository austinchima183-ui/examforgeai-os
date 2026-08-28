// ============================================================================
// ExamForge AI — Vitest Configuration
// ============================================================================
// Production test configuration for unit, integration, and component tests.
// ============================================================================

import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    // Test environment
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,

    // Coverage
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: [
        'src/lib/**/*.ts',
        'src/features/**/*.ts',
      ],
      exclude: [
        'src/lib/supabase/types.ts', // Generated types
        'src/lib/brand-constants.ts', // Constants only
        '**/*.d.ts',
        '**/index.ts', // Barrel exports
      ],
      thresholds: {
        statements: 60,
        branches: 50,
        functions: 60,
        lines: 60,
      },
    },

    // Inclusions / Exclusions
    include: ['src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}'],
    exclude: [
      'node_modules',
      'examforgeai_repo',
      'examforge_ai',
      'e2e',
    ],

    // Timeout
    testTimeout: 10000,
    hookTimeout: 10000,

    // Path aliases
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
