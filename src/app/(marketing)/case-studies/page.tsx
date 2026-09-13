import type { Metadata } from 'next'
import {
  BarChart3,
  CheckCircle2,
  Building2,
  GraduationCap,
  Shield,
  BookOpen,
  Clock,
  TrendingUp,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GradientText } from '@/components/marketing/gradient-text'
import { SectionWrapper } from '@/components/marketing/section-wrapper'
import { CTASection } from '@/components/marketing/cta-section'
import { BreadcrumbJsonLd } from '@/components/marketing/breadcrumb-jsonld'
import { OrganizationJsonLd } from '@/components/seo/organization-jsonld'

export const metadata: Metadata = {
  title: 'Case Studies — ExamForge AI',
  description:
    'How ExamForge AI works in real deployments: an honest look at our pilot methodology, what we measure, and the engineering evidence behind our platform claims.',
}

// ============================================================================
// ExamForge AI — Case Studies Page (HONEST)
// ============================================================================
// RC1 reality audit: the previous version of this page presented four
// elaborate fictional case studies (LASU, Grace International School, the
// Federal Ministry of Education, Covenant University) with invented metrics,
// quotes, and deployment histories. None of it was real. This page now
// describes what we actually do in pilot deployments and what evidence we
// collect — no invented institutions, no invented results.
// ============================================================================

const pilotPhases = [
  {
    icon: BookOpen,
    title: 'Phase 1 — Discovery',
    duration: 'Week 1',
    description:
      'We map the school\'s current assessment workflow: exam creation process, marking workload, result turnaround, and connectivity constraints. Baseline numbers are recorded so improvement is measured, not asserted.',
    deliverables: ['Baseline assessment report', 'Migration plan for question banks', 'Role mapping (5-role RBAC)'],
  },
  {
    icon: GraduationCap,
    title: 'Phase 2 — Onboarding',
    duration: 'Weeks 2–3',
    description:
      'Teachers are trained on question bank management and AI-assisted generation. Students run practice sessions on the CBT interface — including offline mode — before any formal assessment.',
    deliverables: ['Teacher training sessions', 'Question bank import', 'Practice exam runs'],
  },
  {
    icon: BarChart3,
    title: 'Phase 3 — Live Assessment',
    duration: 'Week 4+',
    description:
      'The school runs a formal assessment on the platform: AI-assisted question authoring, server-authoritative exam sessions with tamper detection, auto-marking, and analytics dashboards.',
    deliverables: ['Live exam delivery', 'Auto-marked results', 'Performance analytics'],
  },
  {
    icon: TrendingUp,
    title: 'Phase 4 — Review',
    duration: 'Ongoing',
    description:
      'We review measured outcomes with the school: exam setup time, marking time, result turnaround, and incident logs. What we learn shapes the roadmap — and with the school\'s permission, real results get published here.',
    deliverables: ['Outcome review', 'Published results (with permission)', 'Roadmap feedback'],
  },
]

const measurableClaims = [
  {
    icon: CheckCircle2,
    claim: 'Exam setup in minutes, not weeks',
    evidence: 'AI-assisted question generation with per-role quota tracking — try it yourself in a trial account.',
  },
  {
    icon: Clock,
    claim: 'Objective marking is instant',
    evidence: 'Server-authoritative scoring with auto-marked objective questions and rubric-assisted review for longer answers.',
  },
  {
    icon: Shield,
    claim: 'Tamper events are recorded',
    evidence: 'Every tab-switch during a CBT exam is detected, logged, and surfaced to exam monitors in real time.',
  },
  {
    icon: Building2,
    claim: 'Data isolation is enforced, not promised',
    evidence: 'Row-level security on every database table (270/270 measured) with 700+ scoped policies.',
  },
]

export default function CaseStudiesPage() {
  return (
    <div className="pt-16 bg-[#090909]">
      <BreadcrumbJsonLd items={[{ name: 'Home', href: '/' }, { name: 'Case Studies', href: '/case-studies' }]} />
      <OrganizationJsonLd />

      {/* Hero */}
      <SectionWrapper>
        <div className="text-center max-w-3xl mx-auto">
          <p className="text-sm font-medium text-primary uppercase tracking-wider mb-4">
            Real Deployments, Real Measurement
          </p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            How schools actually{' '}
            <GradientText preset="primary">run on ExamForge</GradientText>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            We are an early-stage platform — we do not yet have years of
            institutional case studies, and we refuse to invent them. What we
            have is a structured pilot methodology, measurable claims, and a
            live platform you can verify. When pilot schools publish their
            results with us, they will appear here with their names on them.
          </p>
        </div>
      </SectionWrapper>

      {/* Pilot methodology */}
      <SectionWrapper backgroundClassName="bg-[#0C0C0C] border-y border-white/[0.04]">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            The pilot methodology
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Every pilot follows the same disciplined path from baseline to
            published results.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {pilotPhases.map((phase) => (
            <Card key={phase.title} className="forge-glass-surface border-white/[0.04] forge-card-shadow">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <phase.icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{phase.title}</CardTitle>
                    <p className="text-xs text-muted-foreground">{phase.duration}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{phase.description}</p>
                <ul className="space-y-1.5">
                  {phase.deliverables.map((d) => (
                    <li key={d} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                      <span className="text-muted-foreground">{d}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </SectionWrapper>

      {/* Measurable claims */}
      <SectionWrapper>
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Claims we can <GradientText preset="cool">prove today</GradientText>
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Every product claim below maps to something running in production
            right now — with the evidence you can check.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {measurableClaims.map((item) => (
            <Card key={item.claim} className="forge-glass-surface border-white/[0.04] forge-card-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <item.icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold mb-2">{item.claim}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.evidence}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </SectionWrapper>

      <CTASection />
    </div>
  )
}
