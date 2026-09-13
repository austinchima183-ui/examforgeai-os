import type { Metadata } from 'next'
import {
  GraduationCap,
  Users,
  BarChart3,
  Building2,
  Clock,
  TrendingUp,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GradientText } from '@/components/marketing/gradient-text'
import { SectionWrapper } from '@/components/marketing/section-wrapper'
import { CTASection } from '@/components/marketing/cta-section'
import { BreadcrumbJsonLd } from '@/components/marketing/breadcrumb-jsonld'
import { AnimatedCounter } from '@/components/marketing/animated-counter'
import { OrganizationJsonLd } from '@/components/seo/organization-jsonld'

export const metadata: Metadata = {
  title: 'Pilot Program — ExamForge AI',
  description:
    'ExamForge AI is an early-stage platform running structured pilots with schools. Here is our honest current state, what we measure, and how your school can join the pilot program.',
}

// ============================================================================
// ExamForge AI — Customers Page (HONEST PILOT PROGRAM)
// ============================================================================
// RC1 reality audit: the previous version of this page listed fictional
// customers (LASU, Covenant University, FME...), fabricated metrics (500+
// schools, 120K students, NPS 72, 97.2% retention, 98.6% satisfaction),
// and invented case studies with named people. All removed. This page now
// states our true current stage and invites pilot participation.
// ============================================================================

const stats = [
  {
    icon: Building2,
    target: 11,
    suffix: '',
    label: 'Pilot & Test Schools',
    description:
      'Schools in our database today — a mix of structured pilots and end-to-end test environments. We do not inflate this number.',
  },
  {
    icon: Users,
    target: 147,
    suffix: '',
    label: 'Platform Accounts',
    description:
      'Teacher, student, parent, and administrator accounts provisioned across pilots and verification suites.',
  },
  {
    icon: BarChart3,
    target: 1028,
    suffix: '',
    label: 'Automated Tests',
    description:
      'Every release runs a full verification suite — unit, integration, and 38 end-to-end browser journeys across all 5 roles.',
  },
  {
    icon: Clock,
    target: 24,
    suffix: 'h',
    label: 'Response Target',
    description:
      'During active pilots we aim to respond to any school-reported issue within one working day. No invented SLA percentages.',
  },
]

const pilotValues = [
  {
    icon: CheckCircle2,
    title: 'Real deployment, real feedback',
    description:
      'Pilot schools run actual assessments on the platform — CBT exams, question banks, AI generation, and result analytics. Their feedback drives our roadmap directly.',
  },
  {
    icon: TrendingUp,
    title: 'Measured, not promised',
    description:
      'We share platform telemetry with pilot schools openly: exam completion rates, sync reliability, and AI generation quality. No vanity metrics.',
  },
  {
    icon: Sparkles,
    title: 'Your data stays yours',
    description:
      'Row-level security isolates every school\'s data at the database layer. Export your data any time — no lock-in, no hostage-taking.',
  },
]

export default function CustomersPage() {
  return (
    <div className="pt-16 bg-[#090909]">
      <BreadcrumbJsonLd items={[{ name: 'Home', href: '/' }, { name: 'Customers', href: '/customers' }]} />
      <OrganizationJsonLd />

      {/* Hero */}
      <SectionWrapper>
        <div className="text-center max-w-3xl mx-auto">
          <p className="text-sm font-medium text-primary uppercase tracking-wider mb-4">
            Pilot Program
          </p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Built with schools,{' '}
            <GradientText preset="primary">not just for them</GradientText>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            ExamForge AI is early-stage. Instead of a wall of logos we do not
            have and testimonials nobody wrote, here is exactly where we
            stand — and what joining a pilot looks like.
          </p>
        </div>
      </SectionWrapper>

      {/* Honest current state */}
      <SectionWrapper backgroundClassName="bg-[#0C0C0C] border-y border-white/[0.04]">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Where we are <GradientText preset="cool">right now</GradientText>
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Numbers measured from our production database and codebase on the
            date this page was generated — not marketing projections.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {stats.map((stat) => (
            <Card key={stat.label} className="forge-glass-surface border-white/[0.04] forge-card-shadow">
              <CardContent className="pt-6 text-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary mx-auto mb-4">
                  <stat.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="text-3xl font-bold tracking-tight forge-gradient-text">
                  <AnimatedCounter target={stat.target} suffix={stat.suffix} />
                </div>
                <p className="text-sm font-medium mt-1">{stat.label}</p>
                <p className="text-xs text-muted-foreground leading-relaxed mt-2">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </SectionWrapper>

      {/* Pilot values */}
      <SectionWrapper>
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            What pilot schools get
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            A direct line to the engineering team building the platform.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {pilotValues.map((value) => (
            <Card key={value.title} className="forge-glass-surface border-white/[0.04] forge-card-shadow">
              <CardHeader>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-3">
                  <value.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <CardTitle className="text-base">{value.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">{value.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </SectionWrapper>

      {/* Honest disclosure */}
      <SectionWrapper backgroundClassName="bg-[#0C0C0C] border-y border-white/[0.04]">
        <div className="max-w-2xl mx-auto">
          <Card className="forge-glass-surface border-white/[0.04] forge-card-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <GraduationCap className="h-5 w-5 text-primary" aria-hidden="true" />
                An honest note on testimonials
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                You will notice this page has no testimonials. That is
                deliberate: we do not publish quotes attributed to
                institutions or individuals who have not actually given them.
                As pilot schools choose to speak about their experience
                publicly, with their permission, their words will appear
                here — unedited and attributed.
              </p>
            </CardContent>
          </Card>
        </div>
      </SectionWrapper>

      <CTASection />
    </div>
  )
}
