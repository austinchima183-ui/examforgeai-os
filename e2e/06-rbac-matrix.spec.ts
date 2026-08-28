// ============================================================================
// MISSION 4 — FEATURE ISOLATION MATRIX (memory-efficient)
// Tests the RBAC matrix with minimal page loads:
//   - ALL denied routes (isolation is critical — every one checked)
//   - Spot-check allowed routes (first 12 per role)
// Uses domcontentloaded + short waits to keep server memory bounded.
// ============================================================================

import { test, expect } from '@playwright/test'
import { login, TEST_USERS, type RoleKey } from './helpers'
import fs from 'fs'

interface Matrix {
  matrix: Record<string, { allowed: string[]; denied: string[] }>
}

const data: Matrix = JSON.parse(
  fs.readFileSync('download/verification/rbac-matrix.json', 'utf8')
)

const ROLES: RoleKey[] = ['student', 'teacher', 'parent', 'school_admin', 'super_admin']

// Memory conservation: no video recording for heavy sweeps (top-level use)
test.use({ video: 'off', trace: 'off' })

test.describe('RBAC Feature Isolation Matrix', () => {

  for (const role of ROLES) {
    test(`matrix sweep as ${role}`, async ({ page }) => {
      // Memory-efficient: no video for matrix sweeps (videos in journey tests)
      test.setTimeout(420_000)
      await login(page, role)
      const { allowed, denied } = data.matrix[role]

      const violations: string[] = []

      // ── Allowed routes: spot-check first 12 (render without bounce) ──
      for (const route of allowed.slice(0, 12)) {
        try {
          await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 25_000 })
          await page.waitForTimeout(400)
          const pathname = new URL(page.url()).pathname
          if (pathname === '/login') {
            violations.push(`ALLOWED route ${route} bounced to /login`)
          } else if (pathname === '/forbidden') {
            violations.push(`ALLOWED route ${route} showed /forbidden`)
          }
        } catch (e) {
          violations.push(`ALLOWED route ${route} errored: ${String(e).slice(0, 60)}`)
        }
      }

      // ── Denied routes: ALL checked (feature isolation) ──
      for (const route of denied) {
        try {
          await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 25_000 })
          await page.waitForTimeout(300)
          const pathname = new URL(page.url()).pathname
          const stillOnDeniedRoute =
            pathname === route || pathname.startsWith(route + '/')
          if (stillOnDeniedRoute) {
            violations.push(`DENIED route ${route} was ACCESSIBLE`)
          }
        } catch (e) {
          violations.push(`DENIED route ${route} errored: ${String(e).slice(0, 60)}`)
        }
      }

      expect(
        violations,
        `${role} RBAC violations:\n${violations.join('\n')}`
      ).toHaveLength(0)
    })
  }
})
