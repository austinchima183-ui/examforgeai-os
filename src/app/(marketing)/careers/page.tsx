import type { Metadata } from 'next'
import { resolveIcon } from '@/lib/design/icon-registry'
import Link from 'next/link'
import {
  Briefcase,
  MapPin,
  Clock,
  Heart,
  GraduationCap,
  DollarSign,
  Globe,
  Laptop,
  Users,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GradientText } from '@/components/marketing/gradient-text'
import { SectionWrapper } from '@/components/marketing/section-wrapper'
import { CTASection } from '@/components/marketing/cta-section'
import { BreadcrumbJsonLd } from '@/components/marketing/breadcrumb-jsonld'

export const metadata: Metadata = {
  title: 'Careers',
  description:
    'Join the ExamForge AI team. We are hiring engineers, designers, and educators to build the future of African education technology.',
}

// ============================================================================
// ExamForge AI — Careers Page
// ============================================================================

const positions = [
  {
    title: 'Senior Frontend Engineer',
    department: 'Engineering',
    location: 'Lagos, Nigeria / Remote',
    type: 'Full-time',
    description:
      'Lead the development of our React and Next.js frontend, building performant, accessible interfaces that thousands of educators and students use daily. You will own the component architecture, drive design system evolution, and mentor junior engineers.',
  },
  {
    title: 'Backend Engineer',
    department: 'Engineering',
    location: 'Lagos, Nigeria / Remote',
    type: 'Full-time',
    description:
      'Design and scale our server-side infrastructure powering real-time CBT exams, AI question generation, and analytics pipelines. You will work with PostgreSQL, Node.js, and distributed systems handling thousands of concurrent exam sessions.',
  },
  {
    title: 'Product Designer',
    department: 'Design',
    location: 'Lagos, Nigeria / Remote',
    type: 'Full-time',
    description:
      'Craft intuitive, delightful experiences for educators and students across web and mobile. You will lead user research, design end-to-end flows, and collaborate closely with engineering to ship polished products that make complex workflows feel simple.',
  },
  {
    title: 'AI/ML Engineer',
    department: 'AI Research',
    location: 'Lagos, Nigeria / Remote',
    type: 'Full-time',
    description:
      'Build and deploy the AI models that power our question generation, auto-marking, and adaptive learning features. You will work with large language models, fine-tune for African educational contexts, and ship production ML systems at scale.',
  },
  {
    title: 'Sales Lead',
    department: 'Revenue',
    location: 'Lagos, Nigeria',
    type: 'Full-time',
    description:
      'Drive growth across African markets by building and leading our sales function. You will develop go-to-market strategies for schools and institutions, manage the full sales cycle from lead to close, and build a high-performing sales team.',
  },
  {
    title: 'Customer Success Manager',
    department: 'Success',
    location: 'Lagos, Nigeria / Remote',
    type: 'Full-time',
    description:
      'Ensure schools get maximum value from ExamForge AI. You will onboard new institutions, run training sessions, track adoption metrics, and serve as the voice of the customer in product decisions. This is a high-impact role at the intersection of education and technology.',
  },
]

const benefits = [
  {
    icon: 'dollar-sign',
    title: 'Competitive Salary',
    description:
      'Market-rate compensation benchmarked against top tech companies in Africa. We pay for the value you bring, not your zip code.',
  },
  {
    icon: 'heart',
    title: 'Health Insurance',
    description:
      'Comprehensive health, dental, and vision coverage for you and your dependents. Your well-being is non-negotiable.',
  },
  {
    icon: 'globe',
    title: 'Remote-First',
    description:
      'Work from anywhere in Nigeria or beyond. We trust you to deliver great work regardless of where you sit.',
  },
  {
    icon: 'graduation-cap',
    title: 'Learning Budget',
    description:
      'Annual learning stipend for courses, conferences, and books. We invest in your growth because your development makes us better.',
  },
  {
    icon: 'laptop',
    title: 'Equipment',
    description:
      'A top-spec laptop and any peripherals you need to do your best work. We do not expect you to bring your own tools.',
  },
  {
    icon: 'sparkles',
    title: 'Equity',
    description:
      'Meaningful equity in a fast-growing company. Every team member is an owner, sharing in the success we build together.',
  },
  {
    icon: 'clock',
    title: 'Flexible Hours',
    description:
      'Core overlap hours with flexible start and end times. We measure output, not hours at a desk.',
  },
  {
    icon: 'users',
    title: 'Team Retreats',
    description:
      'Quarterly in-person retreats for team bonding, strategy sessions, and shared experiences. We are distributed, but never disconnected.',
  },
]

const cultureValues = [
  {
    title: 'Impact Over Activity',
    description:
      'We do not celebrate busywork. We celebrate outcomes. If a three-line PR solves a problem that a 500-line PR would also solve, we ship the three-liner. Impact is measured by how much better our users lives become, not by how many hours you spent.',
  },
  {
    title: 'Radical Candor',
    description:
      'We give feedback early, directly, and with care. We believe that avoiding difficult conversations is a disservice to your teammates. We disagree openly, commit fully, and review honestly.',
  },
  {
    title: 'Education Obsession',
    description:
      'Everyone at ExamForge AI spends time in schools. Engineers observe teachers using the product. Designers sit in on exams. Salespeople understand the pain of manual marking. We build for people we know, not personas we invented.',
  },
  {
    title: 'Ownership Mentality',
    description:
      'There are no "that is not my job" moments here. If you see a broken link, fix it. If a customer is confused, help them. If a process is slow, improve it. We hire people who see gaps and fill them without being asked.',
  },
]

export default function CareersPage() {
  return (
    <div className="pt-16">
      <BreadcrumbJsonLd items={[{ name: 'Home', href: '/' }, { name: 'Company', href: '/careers' }, { name: 'Careers', href: '/careers' }]} />
      {/* Hero */}
      <SectionWrapper>
        <div className="text-center max-w-3xl mx-auto">
          <p className="text-sm font-medium text-primary uppercase tracking-wider mb-4">
            Careers
          </p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Build the future of{' '}
            <GradientText preset="primary">African education</GradientText>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            ExamForge AI is on a mission to give every school in Africa access to
            world-class technology. We are looking for passionate engineers,
            designers, and educators who want their work to matter. If you want
            to build products that genuinely improve millions of lives, you
            belong here.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="#positions">
                <Briefcase className="mr-2 h-4 w-4" />
                View Open Positions
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/about">
                Learn About Our Team
              </Link>
            </Button>
          </div>
        </div>
      </SectionWrapper>

      {/* Open Positions */}
      <SectionWrapper
        id="positions"
        backgroundClassName="bg-muted/30 border-y border-border/40"
      >
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Open Positions
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            We are growing fast and hiring across engineering, design, revenue,
            and customer success. Every role is an opportunity to make a
            tangible difference in education across Africa.
          </p>
        </div>
        <div className="space-y-4 animate-fade-in">
          {positions.map((position) => (
            <div
              key={position.title}
              className="rounded-xl border border-border/50 bg-card/80 p-6 hover:border-primary/30 transition-colors"
            >
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-2">
                    {position.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    {position.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/50 px-3 py-1 text-muted-foreground">
                      <Briefcase className="h-3.5 w-3.5" />
                      {position.department}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/50 px-3 py-1 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      {position.location}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/50 px-3 py-1 text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {position.type}
                    </span>
                  </div>
                </div>
                <Button asChild className="shrink-0">
                  <Link href="/contact">Apply Now</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* Benefits */}
      <SectionWrapper>
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Benefits & Perks
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            We believe that great work comes from people who are well-supported.
            Our benefits are designed to keep you healthy, growing, and
            focused on the work that matters.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((benefit) => {
            const Icon = resolveIcon(benefit.icon) ?? Sparkles
            return (
              <div
                key={benefit.title}
                className="rounded-xl border border-border/50 bg-card/50 p-6"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold mb-2">
                  {benefit.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            )
          })}
        </div>
      </SectionWrapper>

      {/* Culture */}
      <SectionWrapper backgroundClassName="bg-muted/30 border-y border-border/40">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Our Culture
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Culture is not a poster on a wall. It is the set of behaviors we
            reward, the standards we hold, and the way we treat each other when
            things get hard. These are the principles that define how we work.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cultureValues.map((value) => (
            <div
              key={value.title}
              className="rounded-xl border border-border/50 bg-card/50 p-6"
            >
              <h3 className="text-lg font-semibold mb-3">{value.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {value.description}
              </p>
            </div>
          ))}
        </div>
      </SectionWrapper>

      <CTASection />
    </div>
  )
}
