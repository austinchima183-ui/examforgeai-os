// ============================================================================
// ExamForge AI — Redis Health Check API Route
// ============================================================================
// GET /api/health/redis — Redis connectivity check
// ============================================================================

import { NextResponse } from 'next/server'
import { checkRedis } from '@/lib/health'

export async function GET() {
  const result = await checkRedis()
  const statusCode = result.status === 'healthy' ? 200 : result.status === 'degraded' ? 200 : 503
  return NextResponse.json(result, { status: statusCode })
}
