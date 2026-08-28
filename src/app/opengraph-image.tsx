import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'ExamForge AI — The AI Operating System for Modern Schools'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
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
          backgroundColor: '#0f0f23',
          backgroundImage: 'radial-gradient(ellipse at 30% 50%, rgba(79, 70, 229, 0.3) 0%, transparent 50%), radial-gradient(ellipse at 70% 50%, rgba(168, 85, 247, 0.2) 0%, transparent 50%)',
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
              boxShadow: '0 8px 32px rgba(79, 70, 229, 0.4)',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          </div>
          <span
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '-0.02em',
            }}
          >
            ExamForge
            <span style={{ color: '#818CF8' }}> AI</span>
          </span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 52,
            fontWeight: 700,
            color: '#ffffff',
            textAlign: 'center',
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            maxWidth: 900,
            padding: '0 60px',
          }}
        >
          The AI Operating System
          <br />
          for{' '}
          <span
            style={{
              background: 'linear-gradient(135deg, #818CF8, #A78BFA, #F472B6)',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            Modern Schools
          </span>
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 20,
            color: '#94A3B8',
            marginTop: 20,
            textAlign: 'center',
            maxWidth: 700,
            padding: '0 60px',
          }}
        >
          One platform to manage schools, run CBT exams, automate administration, and empower learning with AI.
        </div>

        {/* Stats bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 32,
            marginTop: 40,
            padding: '16px 32px',
            borderRadius: 16,
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          {[
            { value: '500+', label: 'Schools' },
            { value: '120K+', label: 'Students' },
            { value: '2M+', label: 'Exams' },
            { value: '99.9%', label: 'Uptime' },
          ].map((stat) => (
            <div key={stat.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: 24, fontWeight: 700, color: '#818CF8' }}>{stat.value}</span>
              <span style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
