import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const title = searchParams.get('title') || 'ExamForge AI'
  const description = searchParams.get('description') || 'The AI Operating System for Modern Schools'
  const type = searchParams.get('type') || 'website'

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f0a1a',
          backgroundImage: 'radial-gradient(ellipse at 30% 20%, rgba(99,102,241,0.15) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(139,92,246,0.1) 0%, transparent 50%)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 80px',
            maxWidth: '90%',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
            <div
              style={{
                width: 48, height: 48, borderRadius: 12,
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginRight: 16,
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" fill="white" fillOpacity="0.9"/>
                <path d="M12 6L6 9V15L12 18L18 15V9L12 6Z" fill="white" fillOpacity="0.5"/>
              </svg>
            </div>
            <span style={{ fontSize: 28, fontWeight: 700, color: 'white', letterSpacing: '-0.02em' }}>ExamForge AI</span>
          </div>

          <div
            style={{
              fontSize: title.length > 40 ? 44 : 56,
              fontWeight: 700, color: 'white', textAlign: 'center',
              lineHeight: 1.15, letterSpacing: '-0.03em', marginBottom: 20, maxWidth: 800,
            }}
          >
            {title}
          </div>

          <div style={{ fontSize: 22, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 1.5, maxWidth: 600 }}>
            {description}
          </div>

          {type !== 'website' && (
            <div style={{ marginTop: 24, padding: '6px 16px', borderRadius: 20, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 500 }}>
              {type}
            </div>
          )}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
