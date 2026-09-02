'use client'

// ============================================================================
// ExamForge AI — Certificate Verification View (Ω-21)
// ============================================================================
// Public client component: performs the rate-limited verification lookup and
// renders the result in the certificate's visual language (gold double
// border, Georgia serif). States: checking, valid, invalid, unavailable.
// ============================================================================

import { useEffect, useState } from 'react'
import { ShieldCheck, ShieldX, SearchX, Loader2, Award } from 'lucide-react'

interface VerificationResponse {
  valid: boolean
  reason?: string
  certificate?: {
    title: string
    type: string
    score: number | null
    grade: string | null
    student: string
    examTitle: string | null
    schoolName: string | null
    issuedAt: string
  }
  error?: string
}

type State = 'checking' | 'valid' | 'invalid' | 'unavailable'

export function CertificateVerificationView({ code }: { code: string }) {
  const [state, setState] = useState<State>('checking')
  const [data, setData] = useState<VerificationResponse['certificate'] | null>(null)

  useEffect(() => {
    let cancelled = false
    async function verify() {
      try {
        const res = await fetch(`/api/verify/certificate/${encodeURIComponent(code)}`, {
          method: 'GET',
        })
        const json: VerificationResponse = await res.json()
        if (cancelled) return
        if (json.valid && json.certificate) {
          setData(json.certificate)
          setState('valid')
        } else if (res.status === 503) {
          setState('unavailable')
        } else {
          setState('invalid')
        }
      } catch {
        if (!cancelled) setState('unavailable')
      }
    }
    verify()
    return () => {
      cancelled = true
    }
  }, [code])

  return (
    <main
      id="main-content"
      className="min-h-screen bg-[#090909] text-foreground flex items-center justify-center px-4 py-12"
    >
      <div className="w-full max-w-xl">
        {/* Certificate frame */}
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-8 sm:p-10 text-center">
          <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
            <Award className="h-6 w-6" aria-hidden="true" />
          </div>

          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-amber-400">
            Certificate Verification
          </h1>
          <p className="mt-2 text-sm text-muted-foreground break-all">
            Code: <span className="font-mono text-foreground/80">{code}</span>
          </p>

          <div className="mt-8" aria-live="polite" role="status">
            {state === 'checking' && (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden="true" />
                <p className="text-sm text-muted-foreground">Checking certificate registry…</p>
              </div>
            )}

            {state === 'valid' && data && (
              <div className="rounded-md border-[3px] border-double border-amber-500/60 bg-white/[0.03] p-6 sm:p-8">
                <div className="flex items-center justify-center gap-2 text-emerald-400">
                  <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                  <span className="text-sm font-semibold uppercase tracking-wide">
                    Authentic certificate
                  </span>
                </div>
                <h2 className="mt-4 font-serif text-xl sm:text-2xl text-amber-300">
                  {data.title}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  awarded to <span className="text-foreground font-medium">{data.student}</span>
                </p>
                {data.examTitle && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    for <span className="text-foreground/90">{data.examTitle}</span>
                  </p>
                )}
                {data.score != null && (
                  <p className="mt-4 text-4xl font-bold text-amber-400">
                    {Math.round(data.score)}%
                  </p>
                )}
                {data.grade && (
                  <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                    Grade {data.grade}
                  </p>
                )}
                {data.schoolName && (
                  <p className="mt-4 text-sm text-foreground/80">{data.schoolName}</p>
                )}
                <p className="mt-4 text-xs text-muted-foreground">
                  Issued {new Date(data.issuedAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            )}

            {state === 'invalid' && (
              <div className="flex flex-col items-center gap-3 py-8">
                <ShieldX className="h-10 w-10 text-destructive" aria-hidden="true" />
                <p className="text-sm font-medium text-destructive">
                  No matching certificate found
                </p>
                <p className="max-w-sm text-xs text-muted-foreground">
                  The code does not match any issued certificate. Check the code printed on the
                  certificate or contact the issuing school.
                </p>
              </div>
            )}

            {state === 'unavailable' && (
              <div className="flex flex-col items-center gap-3 py-8">
                <SearchX className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm font-medium text-foreground/80">
                  Verification temporarily unavailable
                </p>
                <p className="max-w-sm text-xs text-muted-foreground">
                  The certificate registry could not be reached. Please try again shortly.
                </p>
              </div>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground/60">
          ExamForge AI — Empowering Education with AI
        </p>
      </div>
    </main>
  )
}
