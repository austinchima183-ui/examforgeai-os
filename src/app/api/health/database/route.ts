// ============================================================================
// ExamForge AI — Database Health Check API Route
// ============================================================================
// GET /api/health/database — Database connectivity check
// ============================================================================

import { NextResponse } from 'next/server'
import { checkDatabase } from '@/lib/health'

export async function GET() {
  const result = await checkDatabase()
  const statusCode = result.status === 'healthy' ? 200 : result.status === 'degraded' ? 200 : 503
  return NextResponse.json(result, { status: statusCode })
}
