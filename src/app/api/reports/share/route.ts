import { NextResponse, type NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/auth/require-auth'
import { validateInput } from '@/lib/api/validate'
import { z } from 'zod'
import { enforceCsrf } from '@/lib/api/csrf-guard'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const authResult = await getAuthUser()

  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ─── CSRF guard (auto-added: MISSION 11) ───
  const csrfResult = enforceCsrf(request, authResult)
  if (csrfResult) return csrfResult

  try {
    const { email, reportTitle, reportType, shareUrl } = await request.json()

    if (!email || !reportTitle) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // In production, this would send an email using Resend/SendGrid
    // For now, we simulate a successful share
    // ⚠️ PII: Do not log email addresses in production
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Report Share] Sharing "${reportTitle}" (${reportType}) - URL: ${shareUrl}`)
    }

    return NextResponse.json({
      success: true,
      message: `Report shared with ${email}`,
    })
  } catch (error) {
    console.error('Report share error:', error)
    return NextResponse.json({ error: 'Failed to share report' }, { status: 500 })
  }
}
