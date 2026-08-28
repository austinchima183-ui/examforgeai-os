// ============================================================================
// ExamForge AI — AI Health Check API Route
// ============================================================================
// GET /api/health/ai — AI provider availability check
// ============================================================================

import { NextResponse } from 'next/server'
import { checkAI } from '@/lib/health'

export async function GET() {
  const result = checkAI()
  const statusCode = result.status === 'healthy' ? 200 : result.status === 'degraded' ? 200 : 503
  return NextResponse.json(result, { status: statusCode })
}
