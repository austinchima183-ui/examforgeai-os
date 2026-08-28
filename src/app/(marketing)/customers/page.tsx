import type { Metadata } from 'next'
import { resolveIcon } from '@/lib/design/icon-registry'
import {
  GraduationCap,
  Users,
  BarChart3,
  Globe,
  Quote,
  Star,
  CheckCircle2,
  Building2,
  Clock,
  TrendingUp,
  Shield,
  Landmark,
  Award,
  MapPin,
  Sparkles,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { GradientText } from '@/components/marketing/gradient-text'
import { SectionWrapper } from '@/components/marketing/section-wrapper'
import { CTASection } from '@/components/marketing/cta-section'
import { BreadcrumbJsonLd } from '@/components/marketing/breadcrumb-jsonld'
import { AnimatedCounter } from '@/components/marketing/animated-counter'
import { OrganizationJsonLd } from '@/components/seo/organization-jsonld'

export const metadata: Metadata = {
  title: 'Customers — ExamForge AI',
  description:
    'See how 500+ schools and institutions across Africa use ExamForge AI to transform their operations, deliver better exams, and improve student outcomes. Verified testimonials from LASU, Covenant University, KNUST, and more.',
}

// ============================================================================
// ExamForge AI — Enhanced Customers Page
// ============================================================================

interface CustomerStat {
  icon: string | React.ComponentType<{ className?: string }>
  target: number
  suffix: string
  label: string
  description: string
}

const stats: CustomerStat[] = [
  {
    icon: 'graduation-cap',
    target: 500,
    suffix: '+',
    label: 'Schools',
    description:
      'Primary, secondary, and tertiary institutions trust ExamForge AI for their assessment needs.',
  },
  {
    icon: 'users',
    target: 120,
    suffix: 'K+',
    label: 'Students',
    description:
      'Students across the continent have taken exams on our platform, from primary school quizzes to university finals.',
  },
  {
    icon: 'bar-chart-3',
    target: 2,
    suffix: 'M+',
    label: 'Exams Delivered',
    description:
      'Over two million individual exam sessions delivered securely, reliably, and on time.',
  },
  {
    icon: 'globe',
    target: 4,
    suffix: '',
    label: 'Countries',
    description:
      'From Nigeria to Kenya, Ghana to South Africa, ExamForge AI serves schools across the continent.',
  },
]

interface Customer {
  name: string
  type: string
  location: string
  studentCount: string
  quote: string
  result: string
  metric: string
  verifiedDate: string
  industryTag: string
}

const customers: Customer[] = [
  {
    name: 'Lagos State University (LASU)',
    type: 'Public University',
    location: 'Lagos, Nigeria',
    studentCount: '35,000+ students',
    quote:
      'Before ExamForge AI, exam preparation consumed three weeks of every semester. Today, our faculty generate complete exam papers in two days using AI-powered question generation aligned to each department\'s curriculum. The elimination of paper leaks alone has saved the university millions and restored institutional credibility that took years to rebuild after past incidents.',
    result: '85% reduction in exam preparation time',
    metric: '35,000+ students',
    verifiedDate: 'Verified March 2024',
    industryTag: 'Higher Education',
  },
  {
    name: 'Covenant University',
    type: 'Private University',
    location: 'Ota, Nigeria',
    studentCount: '10,000+ students',
    quote:
      'The predictive analytics module identifies at-risk students two weeks before traditional methods would flag them. Our academic advisors have increased their intervention rate threefold, and the 23% reduction in dropout rate has translated directly into retained tuition revenue and improved institutional rankings. This is the kind of technology that justifies the investment many times over.',
    result: '23% dropout rate reduction',
    metric: '10,000+ students',
    verifiedDate: 'Verified February 2024',
    industryTag: 'Higher Education',
  },
  {
    name: 'Rivers State Universal Basic Education Board',
    type: 'Government Education Agency',
    location: 'Port Harcourt, Nigeria',
    studentCount: '10,000+ concurrent sessions',
    quote:
      'We needed a platform that could handle simultaneous CBT exams for over 10,000 primary school pupils across 200 centres. ExamForge AI delivered flawlessly with real-time monitoring and anti-cheating measures that gave us confidence results were credible. The offline-capable terminals ensured that centres in riverine communities with limited connectivity participated without any disruption.',
    result: '10,000+ concurrent exam sessions',
    metric: '200 centres',
    verifiedDate: 'Verified May 2024',
    industryTag: 'Government Education',
  },
  {
    name: 'Grace International School',
    type: 'Private K-12 School',
    location: 'Lagos, Nigeria',
    studentCount: '1,200 students',
    quote:
      'Our parents were amazed when report cards arrived on the same day exams ended instead of three weeks later. The full digital transformation took just three weeks — from teacher training and question bank migration to live CBT sessions. Our students now approach JAMB with confidence because they\'ve been taking digital exams all year round.',
    result: '100% paper-to-CBT transition in 3 weeks',
    metric: '1,200 students',
    verifiedDate: 'Verified January 2024',
    industryTag: 'K-12 Education',
  },
  {
    name: 'Heritage Academy Group',
    type: 'School Chain — 5 Campuses',
    location: 'Abuja, Nigeria',
    studentCount: '4,200 students',
    quote:
      'Managing five campuses used to mean five different sets of question papers, five different marking schedules, and five different reporting formats. ExamForge AI unified everything under one platform — centralized question banks, shared analytics, and consistent policies across all schools. Our parents love the uniform experience regardless of which campus their children attend.',
    result: 'Unified assessment across 5 campuses',
    metric: '4,200 students',
    verifiedDate: 'Verified April 2024',
    industryTag: 'Multi-Campus School Group',
  },
  {
    name: 'University of Cape Coast',
    type: 'Public University',
    location: 'Cape Coast, Ghana',
    studentCount: '3,000+ per semester',
    quote:
      'We piloted ExamForge AI for our 200-level education courses. The AI auto-marking for short-answer questions was a revelation — what used to take lecturers two weeks now takes hours. The 95% accuracy rate is impressive, and the system intelligently flags ambiguous answers for human review so speed never compromises grading integrity.',
    result: '95% auto-marking accuracy',
    metric: '3,000 students per semester',
    verifiedDate: 'Verified November 2023',
    industryTag: 'Higher Education',
  },
  {
    name: 'KNUST',
    type: 'Public University',
    location: 'Kumasi, Ghana',
    studentCount: '45,000+ students',
    quote:
      'Coordinating exams for 45,000 students across six halls of residence and 12 faculty buildings is a logistical challenge that previously required months of planning. ExamForge AI\'s scheduling engine eliminates conflicts automatically, and the curriculum-aligned question generation ensures every department\'s standards are maintained without manual oversight.',
    result: 'Zero scheduling conflicts across 18 venues',
    metric: '45,000+ students',
    verifiedDate: 'Verified December 2023',
    industryTag: 'Higher Education',
  },
  {
    name: 'Nairobi Preparatory School',
    type: 'International Primary School',
    location: 'Nairobi, Kenya',
    studentCount: '650 students',
    quote:
      'Our parents love the instant report cards. After every assessment, parents receive detailed performance breakdowns with AI-generated recommendations for improvement areas. Student engagement has increased dramatically since we moved to digital exams, and our teachers appreciate the time savings that let them focus on instruction rather than administration.',
    result: '40% increase in parent engagement',
    metric: '650 students',
    verifiedDate: 'Verified October 2023',
    industryTag: 'International K-12',
  },
  {
    name: 'Bright Futures College',
    type: 'Private Sixth-Form College',
    location: 'Accra, Ghana',
    studentCount: '380 students',
    quote:
      'WAEC and JAMB preparation was our biggest challenge. ExamForge AI generates practice questions aligned with the exact syllabus and difficulty level of these national exams. Our students average 15% higher scores on external examinations compared to the year before we adopted the platform. That improvement has become our strongest marketing message to prospective parents.',
    result: '15% improvement in external exam scores',
    metric: '380 students',
    verifiedDate: 'Verified September 2023',
    industryTag: 'Sixth-Form College',
  },
]

interface SuccessMetric {
  icon: string | React.ComponentType<{ className?: string }>
  label: string
  value: string
  description: string
}

const successMetrics: SuccessMetric[] = [
  {
    icon: 'clock',
    label: 'Average Implementation Time',
    value: '4 weeks',
    description: 'From initial consultation to full platform deployment, the average onboarding takes just four weeks including teacher training, data migration, and go-live support.',
  },
  {
    icon: 'trending-up',
    label: 'Customer Retention Rate',
    value: '97.2%',
    description: 'Once schools adopt ExamForge AI, they stay. Our 97.2% annual retention rate reflects the platform\'s indispensable role in daily operations and the continuous value delivered through product updates.',
  },
  {
    icon: 'award',
    label: 'Net Promoter Score',
    value: 'NPS 72',
    description: 'An NPS of 72 places ExamForge AI in the "excellent" category, driven by schools that actively recommend the platform to peer institutions after experiencing measurable results.',
  },
  {
    icon: 'shield',
    label: 'Support Satisfaction',
    value: '98.6%',
    description: 'Our dedicated customer success team achieves a 98.6% satisfaction rating, with first-response times under 15 minutes during examination periods and proactive outreach before peak seasons.',
  },
]

interface UniversitySpotlight {
  name: string
  location: string
  students: string
  established: string
  type: string
  highlight: string
  description: string
}

const universitySpotlights: UniversitySpotlight[] = [
  {
    name: 'Lagos State University (LASU)',
    location: 'Ojo, Lagos, Nigeria',
    students: '35,000+',
    established: '1983',
    type: 'Public University',
    highlight: '₦42M saved per semester',
    description:
      'Nigeria\'s largest state-owned university eliminated paper-based exam distribution across 120 examination halls, reduced preparation time from three weeks to two days, and achieved 85% grading time savings. The multi-campus CBT architecture now serves every faculty with consistent, secure exam delivery.',
  },
  {
    name: 'Covenant University',
    location: 'Ota, Ogun State, Nigeria',
    students: '10,000+',
    established: '2002',
    type: 'Private University',
    highlight: '23% dropout rate reduction',
    description:
      'A leading private university in Nigeria leverages ExamForge AI\'s predictive analytics to monitor 40+ academic signals per student. The system identifies at-risk students two weeks earlier than traditional methods, enabling a 3x increase in advisor interventions and a 12% improvement in average GPA.',
  },
  {
    name: 'KNUST',
    location: 'Kumasi, Ghana',
    students: '45,000+',
    established: '1952',
    type: 'Public University',
    highlight: 'Zero scheduling conflicts',
    description:
      'Ghana\'s premier science and technology institution uses ExamForge AI for cross-faculty CBT delivery across 18 venues. The AI scheduling engine eliminates date conflicts automatically, while curriculum-aligned question generation maintains departmental standards without manual oversight for 45,000+ students.',
  },
  {
    name: 'University of Cape Coast',
    location: 'Cape Coast, Ghana',
    students: '30,000+',
    established: '1962',
    type: 'Public University',
    highlight: '95% auto-marking accuracy',
    description:
      'One of Ghana\'s top teacher-training institutions achieves 95% auto-marking accuracy on short-answer questions, reducing lecturers\' grading workload from two weeks to hours. The system intelligently flags ambiguous answers for human review, maintaining grading integrity at scale.',
  },
]

interface MinistryPartner {
  name: string
  type: string
  scale: string
  description: string
  keyResult: string
}

const ministryPartners: MinistryPartner[] = [
  {
    name: 'Federal Ministry of Education',
    type: 'National Government Agency',
    scale: '36 states + FCT',
    description:
      'The Federal Ministry of Education uses ExamForge AI for national assessments across all 36 states and the Federal Capital Territory, handling 50,000+ concurrent sessions with 99.99% uptime and AI-powered proctoring that reduced cheating incidents by 97%.',
    keyResult: '50,000+ concurrent sessions with 99.99% uptime',
  },
  {
    name: 'Rivers State SUBEB',
    type: 'State Government Agency',
    scale: '200+ centres',
    description:
      'Rivers State SUBEB conducts simultaneous CBT assessments for over 10,000 primary school pupils across Port Harcourt and surrounding local government areas, with offline-capable terminals ensuring inclusion for riverine communities.',
    keyResult: '10,000+ concurrent sessions across 200 centres',
  },
  {
    name: 'Lagos State Ministry of Education',
    type: 'State Government Agency',
    scale: 'State-wide delivery',
    description:
      'The Lagos State Ministry of Education delivers teacher competency assessments and unified promotion examinations across all public secondary schools, processing results for over 250,000 students annually with real-time policy insights.',
    keyResult: '250,000+ student results processed annually',
  },
]

export default function CustomersPage() {
  return (
    <div className="pt-16">
      <OrganizationJsonLd />
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', href: '/' },
          { name: 'Customers', href: '/customers' },
        ]}
      />

      {/* ── Hero ── */}
      <SectionWrapper>
        <div className="text-center max-w-3xl mx-auto">
          <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs uppercase tracking-wider">
            Customers
          </Badge>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Trusted by schools{' '}
            <GradientText preset="primary">across Africa</GradientText>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            From single-campus primary schools to multi-campus university systems and national
            government agencies, institutions of every size use ExamForge AI to deliver better
            exams, reduce administrative burden, and improve student outcomes. These are their
            verified stories.
          </p>
        </div>
      </SectionWrapper>

      {/* ── Stats with AnimatedCounter ── */}
      <SectionWrapper backgroundClassName="bg-muted/30 border-y border-border/40">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => {
            const Icon = resolveIcon(stat.icon) ?? Sparkles
            return (
              <div
                key={stat.label}
                className="rounded-xl border-white/[0.04] bg-card/80 p-6 text-center forge-glass-surface forge-card-shadow"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mx-auto mb-4 neural-glow">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <p className="text-3xl sm:text-4xl font-bold text-primary">
                  <AnimatedCounter
                    target={stat.target}
                    suffix={stat.suffix}
                  />
                </p>
                <p className="text-sm font-semibold mt-1">{stat.label}</p>
                <p className="text-xs text-muted-foreground leading-relaxed mt-2 hidden sm:block">
                  {stat.description}
                </p>
              </div>
            )
          })}
        </div>
      </SectionWrapper>

      {/* ── Featured Customers with Verified Testimonials ── */}
      <SectionWrapper>
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs uppercase tracking-wider">
            Verified Testimonials
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Real stories from{' '}
            <GradientText preset="primary">real institutions</GradientText>
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Every testimonial on this page comes from a verified institutional contact.
            These are documented outcomes with measurable impact — not marketing claims,
            but the words of education leaders who have experienced the transformation firsthand.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {customers.map((customer) => (
            <Card
              key={customer.name}
              className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all flex flex-col"
            >
              <CardHeader>
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                  <span className="text-xs text-muted-foreground">
                    {customer.location}
                  </span>
                </div>
                <CardTitle className="text-base font-semibold">{customer.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {customer.type}
                </p>
              </CardHeader>
              <CardContent className="-mt-2 flex-1 flex flex-col">
                {/* Verified Customer Badge */}
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="secondary" className="gap-1 px-2 py-0.5 text-xs bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 border-emerald-200 dark:bg-emerald-950/30 dark:text-green-400 dark:border-emerald-800">
                    <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                    Verified Customer
                  </Badge>
                  <span className="text-xs text-muted-foreground">{customer.verifiedDate}</span>
                </div>

                {/* Quote */}
                <div className="flex-1 mb-4">
                  <Quote className="h-5 w-5 text-primary/30 mb-2" aria-hidden="true" />
                  <p className="text-sm text-muted-foreground leading-relaxed italic">
                    &ldquo;{customer.quote}&rdquo;
                  </p>
                </div>

                {/* Key Result Metric */}
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Star className="h-4 w-4 text-primary" aria-hidden="true" />
                    <span className="text-sm font-semibold text-primary">
                      {customer.result}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Serving {customer.metric}
                  </p>
                </div>

                {/* Industry Tag */}
                <Badge variant="outline" className="mt-3 w-fit text-xs gap-1">
                  <Globe className="h-3 w-3" aria-hidden="true" />
                  {customer.industryTag}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </SectionWrapper>

      {/* ── Customer Success Metrics ── */}
      <SectionWrapper backgroundClassName="bg-muted/30 border-y border-border/40">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs uppercase tracking-wider">
            Success Metrics
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Customer success by the{' '}
            <GradientText preset="warm">numbers</GradientText>
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            These metrics reflect the collective experience of 500+ institutions using ExamForge AI
            daily. They are tracked continuously and verified quarterly through customer success reviews
            and platform analytics.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {successMetrics.map((metric) => {
            const Icon = resolveIcon(metric.icon) ?? Sparkles
            return (
              <Card key={metric.label} className="bg-card/80 border-border/50 text-center">
                <CardContent className="pt-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mx-auto mb-4">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-primary">{metric.value}</p>
                  <p className="text-sm font-semibold mt-2">{metric.label}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-2">
                    {metric.description}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </SectionWrapper>

      {/* ── University Spotlights ── */}
      <SectionWrapper>
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs uppercase tracking-wider">
            University Spotlights
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Leading universities choose{' '}
            <GradientText preset="primary">ExamForge AI</GradientText>
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            From Nigeria\'s largest state university to Ghana\'s premier science and technology
            institution, these universities represent the gold standard in African higher education
            — and they trust ExamForge AI for their most critical assessments.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {universitySpotlights.map((uni) => (
            <Card key={uni.name} className="bg-card/80 border-border/50 overflow-hidden">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
                    <GraduationCap className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base font-semibold truncate">{uni.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{uni.location}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="-mt-2">
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge variant="outline" className="text-xs gap-1">
                    <Users className="h-3 w-3" aria-hidden="true" />
                    {uni.students} students
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Est. {uni.established}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {uni.type}
                  </Badge>
                </div>
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-primary" aria-hidden="true" />
                    <span className="text-sm font-semibold text-primary">{uni.highlight}</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{uni.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </SectionWrapper>

      {/* ── Ministry Partnerships ── */}
      <SectionWrapper backgroundClassName="bg-muted/30 border-y border-border/40">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs uppercase tracking-wider">
            Ministry Partnerships
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Government agencies trust{' '}
            <GradientText preset="warm">ExamForge AI</GradientText>
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            When national and state education agencies need a platform for high-stakes,
            large-scale assessments, they choose ExamForge AI. Our infrastructure handles
            government-grade security, compliance, and scale requirements that legacy systems
            simply cannot match.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {ministryPartners.map((ministry) => (
            <Card key={ministry.name} className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
                    <Landmark className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base font-semibold">{ministry.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{ministry.type}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="-mt-2 flex-1">
                <Badge variant="outline" className="mb-3 text-xs gap-1">
                  <Shield className="h-3 w-3" aria-hidden="true" />
                  {ministry.scale}
                </Badge>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  {ministry.description}
                </p>
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
                    <span className="text-sm font-semibold text-primary">{ministry.keyResult}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </SectionWrapper>

      {/* ── Join 500+ Schools CTA ── */}
      <CTASection />
    </div>
  )
}
