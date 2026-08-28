// ============================================================================
// ExamForge AI — Health Check API Route
// ============================================================================
// GET /api/health — Overall application health
// ============================================================================

import { NextResponse } from 'next/server'
import { getHealthStatus } from '@/lib/health'

export async function GET() {
  try {
    const health = await getHealthStatus()

    const statusCode = health.status === 'healthy' ? 200
      : health.status === 'degraded' ? 200 // Still operational
      : 503 // Service Unavailable

    return NextResponse.json(health, { status: statusCode })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Health check failed',
      },
      { status: 503 }
    )
  }
}
