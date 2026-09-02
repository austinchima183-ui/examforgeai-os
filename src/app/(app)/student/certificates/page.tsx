'use client'

// ============================================================================
// ExamForge AI — Student Certificates Page (Ω-21 certificate contract)
// ============================================================================
// Lists earned certificates/badges for achievements.
//
// Ω-21 upgrade — the landing-page contract promised certificates that are
// school-branded, QR-verifiable, email-deliverable and downloadable. This
// page now:
//   1. prefers PERSISTED certificates (stable verification codes, issued
//      via POST /api/student/certificates — idempotent per session)
//   2. offers one-click issuance for eligible graded sessions
//   3. prints a branded certificate (school name/logo/primary color) with an
//      embedded QR code pointing at the public verification page
//      /verify/certificate/<code>
//   4. degrades honestly pre-migration-009 (provisional cards, no fake codes)
// ============================================================================

import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import { apiFetch } from '@/lib/api/client-fetch'

// ── shadcn/ui ──
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

// ── Lucide Icons ──
import {
  Award, Download, Share2, Trophy, Star, CheckCircle2,
  Shield, BookOpen, GraduationCap, Loader2, AlertCircle,
  ExternalLink, Copy, Check, Medal, Sparkles, Lock,
} from 'lucide-react'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

interface ExamSession {
  id: string
  exam_id: string
  percentage: number | null
  grade: string | null
  total_score: number | null
  max_score: number | null
  submitted_at: string | null
  exams?: {
    id: string
    title: string
    subject_id: string | null
    total_marks: number
    subjects?: { id: string; name: string } | null
  } | null
}

interface SchoolBranding {
  id: string
  name: string
  logo_url: string | null
  primary_color: string | null
}

interface PersistedCertificate {
  id: string
  session_id: string | null
  title: string
  type: 'excellence' | 'merit' | 'pass' | 'completion'
  score: number | null
  grade: string | null
  student_name: string | null
  exam_title: string | null
  verification_code: string | null
  issued_at: string
  delivered_at: string | null
  metadata?: Record<string, unknown> | null
}

interface CertificateData {
  id: string
  sessionId: string
  title: string
  subjectName: string
  score: number
  grade: string
  date: string
  verificationCode: string
  type: 'excellence' | 'merit' | 'pass' | 'completion'
  examTitle: string
  /** true when persisted server-side (stable code, email delivered) */
  issued: boolean
  /** delivery status from the issuance API */
  delivery?: string
}

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

/**
 * Deterministic verification code — client replica of the server's
 * buildVerificationCode (FNV-1a over session:student:salt). Matching the
 * server means a provisional card shows exactly the code issuance will
 * persist (no bait-and-switch on reload).
 */
function deterministicVerificationCode(sessionId: string, studentId: string): string {
  const raw = `${sessionId}:${studentId}:examforge-verification-v1`
  let hash = 0x811c9dc5
  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  const h = (hash >>> 0).toString(36).toUpperCase().padStart(7, '0')
  const c = (Math.imul(hash, 0x9e3779b1) >>> 0).toString(36).toUpperCase().padStart(7, '0')
  return `EF-${h.slice(0, 4)}-${c.slice(0, 4)}-${h.slice(4, 7)}`
}

function getCertificateType(percentage: number): 'excellence' | 'merit' | 'pass' | 'completion' {
  if (percentage >= 90) return 'excellence'
  if (percentage >= 75) return 'merit'
  if (percentage >= 60) return 'pass'
  return 'completion'
}

function getGradeLabel(percentage: number): string {
  if (percentage >= 90) return 'A+'
  if (percentage >= 80) return 'A'
  if (percentage >= 70) return 'B'
  if (percentage >= 60) return 'C'
  if (percentage >= 50) return 'D'
  return 'F'
}

const certificateColors = {
  excellence: { bg: 'bg-yellow-50 dark:bg-yellow-950', border: 'border-amber-300 dark:border-amber-700', badge: 'bg-yellow-50 dark:bg-yellow-950 text-white', accent: 'text-yellow-600 dark:text-yellow-400' },
  merit: { bg: 'bg-green-50 dark:bg-green-950', border: 'border-emerald-300 dark:border-emerald-700', badge: 'bg-green-50 dark:bg-green-950 text-white', accent: 'text-green-600 dark:text-green-400' },
  pass: { bg: 'bg-sky-50 dark:bg-sky-950/20', border: 'border-sky-300 dark:border-sky-700', badge: 'bg-sky-500 text-white', accent: 'text-sky-600' },
  completion: { bg: 'bg-slate-50 dark:bg-slate-950/20', border: 'border-slate-300 dark:border-slate-700', badge: 'bg-slate-500 text-white', accent: 'text-slate-600' },
}

const certificateIcons = {
  excellence: Trophy,
  merit: Medal,
  pass: Award,
  completion: CheckCircle2,
}

// ──────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────

export default function CertificatesPage() {
  const [sessions, setSessions] = useState<ExamSession[]>([])
  const [persisted, setPersisted] = useState<PersistedCertificate[]>([])
  const [school, setSchool] = useState<SchoolBranding | null>(null)
  const [studentId, setStudentId] = useState<string>('')
  const [issuing, setIssuing] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCert, setSelectedCert] = useState<CertificateData | null>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // ── Fetch data ──
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/student/certificates')
      if (!res.ok) throw new Error('Failed to load data')
      const data = await res.json()
      setSessions(data.sessions ?? [])
      setPersisted(data.certificates ?? [])
      setSchool(data.school ?? null)
      setStudentId(data.userId ?? '')
    } catch (err) {
      setError('Could not load certificates. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // ── Issue a certificate (persist + email delivery) ──
  const issueCertificate = useCallback(
    async (sessionId: string) => {
      setIssuing(prev => new Set(prev).add(sessionId))
      try {
        const res = await apiFetch('/api/student/certificates', {
          method: 'POST',
          body: { sessionId },
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setError(
            res.status === 503
              ? 'Certificate persistence is not available yet (schema migration pending). Your certificate can still be downloaded.'
              : data?.error ?? 'Could not issue certificate.'
          )
        } else {
          await loadData() // refresh → card flips to issued (stable code, delivery state)
        }
      } catch {
        setError('Could not issue certificate. Check your connection and retry.')
      } finally {
        setIssuing(prev => {
          const next = new Set(prev)
          next.delete(sessionId)
          return next
        })
      }
    },
    [loadData]
  )

  // ── Merge persisted + provisional certificates ──
  const certificates = useMemo<CertificateData[]>(() => {
    const persistedBySession = new Map(
      persisted.filter(c => c.session_id).map(c => [c.session_id as string, c])
    )
    return sessions
      .filter((s) => s.percentage != null && s.percentage >= 60 && s.submitted_at)
      .map((session) => {
        const existing = persistedBySession.get(session.id)
        const percentage = session.percentage as number
        const type = getCertificateType(percentage)
        const subjectName = session.exams?.subjects?.name ?? 'General'
        if (existing) {
          const branding = (existing.metadata as Record<string, unknown> | null)?.branding as
            | { schoolName?: string }
            | undefined
          return {
            id: existing.id,
            sessionId: session.id,
            title: existing.title,
            subjectName,
            score: existing.score ?? percentage,
            grade: existing.grade ?? getGradeLabel(percentage),
            date: existing.issued_at,
            verificationCode: existing.verification_code ?? deterministicVerificationCode(session.id, studentId),
            type: existing.type,
            examTitle: existing.exam_title ?? session.exams?.title ?? 'Exam',
            issued: true,
            delivery: (existing.metadata as Record<string, unknown> | null)
              ? String(((existing.metadata as Record<string, unknown>).delivery as Record<string, unknown>)?.status ?? '')
              : '',
          } as CertificateData & { schoolName?: string }
        }
        return {
          id: `cert-${session.id}`,
          sessionId: session.id,
          title: `${type === 'excellence' ? 'Certificate of Excellence' : type === 'merit' ? 'Certificate of Merit' : type === 'pass' ? 'Certificate of Achievement' : 'Certificate of Completion'}`,
          subjectName,
          score: percentage,
          grade: session.grade ?? getGradeLabel(percentage),
          date: session.submitted_at as string,
          verificationCode: deterministicVerificationCode(session.id, studentId),
          type,
          examTitle: session.exams?.title ?? 'Exam',
          issued: false,
        }
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [sessions, persisted, studentId])

  // ── Stats ──
  const excellenceCount = certificates.filter((c) => c.type === 'excellence').length
  const meritCount = certificates.filter((c) => c.type === 'merit').length
  const passCount = certificates.filter((c) => c.type === 'pass').length
  const totalCount = certificates.length

  // ── Copy verification code ──
  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(code)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch (err) {
      // Clipboard not available
    }
  }

  // ── Download as PDF (branded print with QR verification) ──
  const downloadCertificate = (cert: CertificateData) => {
    // Ω-21 certificate contract: school branding (name/logo/primary color)
    // + scannable QR code that resolves to the public verification page.
    const schoolName = school?.name ?? 'ExamForge AI'
    const logoUrl = school?.logo_url
    const accent = school?.primary_color ?? '#8B6914'
    const verifyUrl = `${window.location.origin}/verify/certificate/${encodeURIComponent(cert.verificationCode)}`
    const qrSrc = `${window.location.origin}/api/qr?data=${encodeURIComponent(verifyUrl)}&size=140`

    const escapeHtml = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${escapeHtml(cert.title)}</title>
        <style>
          body { font-family: Georgia, serif; text-align: center; padding: 60px; color: #1a1a1a; }
          .border { border: 3px double ${accent}; padding: 40px; max-width: 700px; margin: 0 auto; }
          h1 { font-size: 28px; color: ${accent}; margin-bottom: 8px; }
          h2 { font-size: 22px; font-weight: normal; margin-bottom: 24px; }
          .score { font-size: 48px; font-weight: bold; color: ${accent}; margin: 16px 0; }
          .subject { font-size: 18px; margin-bottom: 8px; }
          .exam { font-size: 14px; color: #666; margin-bottom: 24px; }
          .code { font-size: 12px; color: #999; margin-top: 32px; }
          .date { font-size: 14px; color: #666; }
          .footer { font-size: 11px; color: #999; margin-top: 40px; }
          .qr-row { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 24px; }
          .qr-row img { width: 140px; height: 140px; }
          .qr-note { font-size: 11px; color: #777; max-width: 220px; text-align: left; }
          .logo { max-height: 56px; max-width: 220px; margin: 0 auto 12px; display: block; }
        </style>
      </head>
      <body>
        <div class="border">
          ${logoUrl ? `<img class="logo" src="${escapeHtml(logoUrl)}" alt="${escapeHtml(schoolName)} logo" />` : ''}
          <h1>${escapeHtml(schoolName)}</h1>
          <h2>${escapeHtml(cert.title)}</h2>
          <p class="subject">This is to certify that outstanding performance was achieved in</p>
          <p class="subject"><strong>${escapeHtml(cert.subjectName)}</strong></p>
          <p class="exam">${escapeHtml(cert.examTitle)}</p>
          <div class="score">${Math.round(cert.score)}%</div>
          <p>Grade: <strong>${escapeHtml(cert.grade)}</strong></p>
          <p class="date">${format(parseISO(cert.date), 'MMMM d, yyyy')}</p>
          <div class="qr-row">
            <img src="${escapeHtml(qrSrc)}" alt="Verification QR code" onload="window.__qrReady = true" />
            <div class="qr-note">
              <strong>Scan to verify</strong><br />
              Verification code: ${escapeHtml(cert.verificationCode)}
            </div>
          </div>
          <p class="footer">Issued via ${escapeHtml(schoolName)} · ExamForge AI</p>
        </div>
      </body>
      </html>
    `
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
      // wait for the QR image before opening the print dialog
      printWindow.addEventListener('load', () => {
        const img = printWindow.document.querySelector('img[src*="/api/qr"]')
        if (img && !(img as HTMLImageElement).complete) {
          img.addEventListener('load', () => printWindow.print())
          img.addEventListener('error', () => printWindow.print())
          setTimeout(() => printWindow.print(), 2500) // safety net
        } else {
          setTimeout(() => printWindow.print(), 300)
        }
      })
    }
  }

  // ── Share ──
  const shareCertificate = async (cert: CertificateData) => {
    const verifyUrl = `${window.location.origin}/verify/certificate/${encodeURIComponent(cert.verificationCode)}`
    const shareText = `I earned a ${cert.title} in ${cert.subjectName} with a score of ${Math.round(cert.score)}% on ExamForge AI! Verify: ${verifyUrl}`
    if (navigator.share) {
      try {
        await navigator.share({ title: cert.title, text: shareText })
      } catch (err) {
        // User cancelled
      }
    } else {
      await copyCode(shareText)
    }
  }

  // ──────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-8 w-64 forge-skeleton" />
        <div className="grid gap-4 sm:grid-cols-4"><Skeleton className="h-24 forge-skeleton" /><Skeleton className="h-24 forge-skeleton" /><Skeleton className="h-24 forge-skeleton" /><Skeleton className="h-24 forge-skeleton" /></div>
        <div className="grid gap-4 sm:grid-cols-2"><Skeleton className="h-64 forge-skeleton" /><Skeleton className="h-64 forge-skeleton" /></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Award className="h-6 w-6 text-yellow-600 dark:text-yellow-400 neural-glow" />
            Certificates
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">Your earned achievements and certificates</p>
        </div>
        <Badge variant="secondary" className="w-fit">
          <Trophy className="h-3.5 w-3.5 mr-1" />
          {totalCount} Certificate{totalCount !== 1 ? 's' : ''}
        </Badge>
      </div>

      {error && (
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl border-destructive/50 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-destructive/10 border border-white/[0.04] flex items-center justify-center shrink-0">
              <AlertCircle className="h-4 w-4 text-destructive" />
            </div>
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-auto">Dismiss</Button>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] transition-all"><CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-yellow-50 dark:bg-yellow-950/10 border border-white/[0.04] flex items-center justify-center"><Trophy className="h-4 w-4 text-yellow-600 dark:text-yellow-400" /></div>
            <div><p className="text-xl font-bold">{excellenceCount}</p><p className="text-xs text-foreground/60">Excellence</p></div>
          </CardContent>
        </Card>
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] transition-all"><CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-green-50 dark:bg-green-950/10 border border-white/[0.04] flex items-center justify-center"><Medal className="h-4 w-4 text-green-600 dark:text-green-400" /></div>
            <div><p className="text-xl font-bold">{meritCount}</p><p className="text-xs text-foreground/60">Merit</p></div>
          </CardContent>
        </Card>
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] transition-all"><CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-sky-500/10 border border-white/[0.04] flex items-center justify-center"><Award className="h-4 w-4 text-sky-500" /></div>
            <div><p className="text-xl font-bold">{passCount}</p><p className="text-xs text-foreground/60">Achievement</p></div>
          </CardContent>
        </Card>
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] transition-all"><CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 border border-white/[0.04] flex items-center justify-center"><GraduationCap className="h-4 w-4 text-primary" /></div>
            <div><p className="text-xl font-bold">{totalCount}</p><p className="text-xs text-foreground/60">Total earned</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Empty State */}
      {certificates.length === 0 && !loading && (
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow text-center"><CardContent className="p-12">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-white/[0.04] backdrop-blur-sm neural-glow"><Award className="h-8 w-8 text-primary" /></div>
            <h3 className="text-lg font-semibold mb-2">No Certificates Yet</h3>
            <p className="text-muted-foreground mb-2">Score 60% or higher on an exam to earn your first certificate!</p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-4">
              <Sparkles className="h-4 w-4" />
              <span>Keep studying and aim for excellence!</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Certificate Grid */}
      <div className="grid gap-6 sm:grid-cols-2">
        {certificates.map((cert, i) => {
          const colors = certificateColors[cert.type]
          const Icon = certificateIcons[cert.type]

          return (
            <motion.div key={cert.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08, duration: 0.3 }}>
            <Card className={cn('overflow-hidden transition-all hover:shadow-lg forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)]', colors.border, 'border-2')}>
                {/* Certificate Header */}
                <div className={cn('p-4 text-center', colors.bg)}>
                  <div className="flex justify-center mb-2">
                    <div className={cn('h-14 w-14 rounded-full flex items-center justify-center', colors.badge)}>
                      <Icon className="h-7 w-7" />
                    </div>
                  </div>
                  <h3 className={cn('font-serif text-lg font-bold', colors.accent)}>{cert.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{cert.subjectName}</p>
                </div>

                <CardContent className="p-4 space-y-3">
                  {/* Score */}
                  <div className="text-center">
                    <p className="text-3xl font-bold">{Math.round(cert.score)}%</p>
                    <div className="flex items-center justify-center gap-2">
                      <Badge className={colors.badge}>Grade: {cert.grade}</Badge>
                      {cert.issued ? (
                        <Badge variant="secondary" className="gap-1">
                          <CheckCircle2 className="h-3 w-3 text-green-500" aria-hidden="true" />
                          Issued{cert.delivery === 'sent' ? ' · emailed' : ''}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1 text-muted-foreground">
                          <Lock className="h-3 w-3" aria-hidden="true" />
                          Provisional
                        </Badge>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Details */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> Exam</span>
                      <span className="font-medium truncate ml-2 max-w-32">{cert.examTitle}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" /> Date</span>
                      <span className="font-medium">{format(parseISO(cert.date), 'MMM d, yyyy')}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> Verification</span>
                      <button
                        onClick={() => copyCode(cert.verificationCode)}
                        className="font-mono text-xs px-2 py-0.5 rounded bg-muted hover:bg-white/[0.06] flex items-center gap-1 transition-colors"
                      >
                        {cert.verificationCode}
                        {copiedCode === cert.verificationCode ? <Check className="h-3 w-3 text-green-600 dark:text-green-400" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>

                  <Separator />

                  {/* Actions */}
                  <div className="flex gap-2">
                    {!cert.issued && (
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1"
                        onClick={() => issueCertificate(cert.sessionId)}
                        disabled={issuing.has(cert.sessionId)}
                        aria-label={`Issue and email ${cert.title}`}
                      >
                        {issuing.has(cert.sessionId) ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Issuing…
                          </>
                        ) : (
                          <>
                            <Shield className="h-3.5 w-3.5 mr-1" /> Issue & Email
                          </>
                        )}
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => downloadCertificate(cert)}>
                      <Download className="h-3.5 w-3.5 mr-1" /> PDF
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => shareCertificate(cert)}>
                      <Share2 className="h-3.5 w-3.5 mr-1" /> Share
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => setSelectedCert(cert)}>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader><DialogTitle>Certificate Preview</DialogTitle></DialogHeader>
                        {selectedCert && (
                          <div className={cn('p-6 text-center rounded-lg border-2', certificateColors[selectedCert.type].bg, certificateColors[selectedCert.type].border)}>
                            <div className="flex justify-center mb-3">
                              <div className={cn('h-16 w-16 rounded-full flex items-center justify-center', certificateColors[selectedCert.type].badge)}>
                                {(() => { const CIcon = certificateIcons[selectedCert.type]; return <CIcon className="h-8 w-8" /> })()}
                              </div>
                            </div>
                            <h2 className="font-serif text-xl font-bold mb-1">ExamForge AI</h2>
                            <h3 className={cn('font-serif text-lg', certificateColors[selectedCert.type].accent)}>{selectedCert.title}</h3>
                            <p className="text-sm text-muted-foreground mt-2">Awarded for excellence in</p>
                            <p className="font-semibold text-lg mt-1">{selectedCert.subjectName}</p>
                            <p className="text-sm text-muted-foreground mt-1">{selectedCert.examTitle}</p>
                            <p className="text-4xl font-bold mt-4">{selectedCert.score}%</p>
                            <p className="text-sm mt-1">Grade: {selectedCert.grade}</p>
                            <Separator className="my-4" />
                            <p className="text-xs text-muted-foreground">{format(parseISO(selectedCert.date), 'MMMM d, yyyy')}</p>
                            <p className="text-xs text-muted-foreground mt-1">Verification: {selectedCert.verificationCode}</p>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
