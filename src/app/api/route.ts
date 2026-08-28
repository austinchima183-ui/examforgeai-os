import { createClient, createClientOrNull, requireSupabase } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { isDevAdapterMode } from '@/lib/supabase/dev-adapter'

// ============================================================================
// ExamForge AI — Health Check API Route
// ============================================================================
// Verifies backend connectivity. Replaces the placeholder "Hello, world!".
// ============================================================================

export async function GET() {
  const startTime = Date.now()

  try {
    const supabase = await requireSupabase()
    // ── Dev Adapter Guard ──
    if (!supabase && isDevAdapterMode()) {
      return NextResponse.json({ error: 'Service unavailable in development mode', _devAdapter: true }, { status: 503 })
    }
    const { data: { user } } = await supabase.auth.getUser()

    // Test database connectivity
    const { error: dbError } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .limit(1)

    const responseTime = Date.now() - startTime

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      responseTimeMs: responseTime,
      services: {
        database: dbError ? 'degraded' : 'healthy',
        auth: user ? 'authenticated' : 'anonymous',
      },
      version: process.env.npm_package_version ?? '1.0.0',
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    )
  }
}
