import { type NextRequest, NextResponse } from 'next/server'
import { apiRateLimit, RATE_LIMITS } from '@/lib/api/rate-limit'
import { rateLimitError } from '@/lib/api/auth-guard'

// ============================================================================
// ExamForge AI — QR Code Endpoint (Ω-21 certificate verification)
// ============================================================================
// GET /api/qr?data=<url-encoded-text>&size=<96-512>
//
// Renders a QR code SVG server-side (qrcode package) so certificate PDFs
// can embed a scannable verification link WITHOUT shipping a QR library to
// the client bundle. Public + aggressively rate-limited: the input is
// reflected only into the QR matrix, never into the response markup.
// ============================================================================

const MAX_DATA_LENGTH = 512

export async function GET(request: NextRequest) {
  // ─── Rate limit (public endpoint) ──────────────────────────
  const { allowed, retryAfter } = await apiRateLimit(request, RATE_LIMITS.relaxed)
  if (!allowed) return rateLimitError(retryAfter)

  const data = request.nextUrl.searchParams.get('data')
  const sizeParam = request.nextUrl.searchParams.get('size')
  const size = Math.min(Math.max(Number(sizeParam) || 160, 96), 512)

  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Missing data parameter' }, { status: 400 })
  }
  if (data.length > MAX_DATA_LENGTH) {
    return NextResponse.json({ error: 'Data too long' }, { status: 400 })
  }
  // Only http(s) URLs may be encoded (prevents QR-phishing payloads through
  // our own renderer; arbitrary text is unnecessary for the certificate use case)
  if (!/^https?:\/\//i.test(data)) {
    return NextResponse.json({ error: 'Only http(s) URLs are supported' }, { status: 400 })
  }

  try {
    const QRCode = (await import('qrcode')).default
    const svg = await QRCode.toString(data, {
      type: 'svg',
      width: size,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#1a1a1a', light: '#ffffff' },
    })

    return new NextResponse(svg, {
      status: 200,
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    })
  } catch (error) {
    console.error('[QR endpoint] render failed:', error)
    return NextResponse.json({ error: 'QR rendering failed' }, { status: 500 })
  }
}
