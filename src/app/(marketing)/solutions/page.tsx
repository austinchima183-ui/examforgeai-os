'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import {
  ArrowRight, GraduationCap, Building2, Landmark, Users, Globe,
  Sparkles, Check, Quote
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GradientText } from '@/components/marketing/gradient-text'
import { SectionWrapper } from '@/components/marketing/section-wrapper'
import { CTASection } from '@/components/marketing/cta-section'
import { BreadcrumbJsonLd } from '@/components/marketing/breadcrumb-jsonld'

// ============================================================================
// ExamForge AI — Solutions Page (Premium)
// ============================================================================

const solutions = [
  {
    id: 'primary',
    icon: GraduationCap,
    title: 'Primary Schools',
    description: [
      'Simplify assessment for younger learners with intuitive CBT interfaces, age-appropriate question formats, and parent engagement tools. Our platform makes it easy for primary schools to adopt digital exams without overwhelming students or teachers.',
      'Young students interact with a friendly, colorful interface designed for their developmental stage. Large buttons, clear instructions, and visual timers reduce anxiety and help children focus on demonstrating their knowledge.',
      'Parents stay informed through a dedicated portal that shows attendance, grades, and teacher feedback in real-time. Automated report cards are generated at the end of each term, saving teachers hours of manual work.',
      'With ExamForge AI, primary schools can start with simple quizzes and gradually move to full digital assessments as their confidence grows. Our onboarding team provides hands-on training for every teacher.',
    ],
    features: ['Simple exam interface for young students', 'Parent portal with real-time updates', 'Automated report cards', 'Attendance tracking', 'Age-appropriate question formats', 'Teacher onboarding support'],
    testimonial: {
      quote: 'Our teachers used to spend weeks creating and marking exams. Now it takes minutes. The parent portal alone has transformed how we communicate with families.',
      author: 'Mrs. Funke Adeyemi',
      role: 'Head Teacher, Grace Land Primary School, Lagos',
    },
  },
  {
    id: 'secondary',
    icon: Building2,
    title: 'Secondary Schools',
    description: [
      'Prepare students for WAEC, NECO, and JAMB with practice exams that mirror the real experience. AI-powered question generation aligned with national curriculum standards helps teachers create quality assessments in minutes.',
      'The platform includes a comprehensive question bank aligned with the Nigerian and West African curriculum. Teachers can select topics, difficulty levels, and cognitive domains to generate exams that truly test understanding.',
      'Performance analytics break down results by class, subject, topic, and even individual student. Identify knowledge gaps early, track improvement over time, and provide targeted support where it matters most.',
      'Our exam preparation dashboards give students a clear picture of their strengths and weaknesses, with AI-recommended study plans and practice exercises tailored to their needs.',
    ],
    features: ['WAEC/NECO/JAMB aligned questions', 'AI question generation by subject', 'Performance analytics by class and subject', 'Exam preparation dashboards', 'Curriculum-aligned question bank', 'Student study plan recommendations'],
    testimonial: {
      quote: 'Since using ExamForge AI, our WAEC pass rate increased from 67% to 89% in just one year. The practice exams are incredibly close to the real thing.',
      author: 'Mr. Chukwuemeka Obi',
      role: 'Vice Principal, Kings College, Lagos',
    },
  },
  {
    id: 'universities',
    icon: Landmark,
    title: 'Universities',
    description: [
      'Scale examinations across hundreds of courses and thousands of students. Live monitoring, anti-cheating measures, and AI auto-marking for large-scale assessments make university exams manageable and secure.',
      'Our platform handles the complexity of university-level examinations: multiple departments, various course structures, and diverse assessment types from multiple-choice to essay questions. Everything is managed from a single administrative dashboard.',
      'Live monitoring lets invigilators watch hundreds of students across multiple halls simultaneously. The system automatically flags suspicious behavior patterns, tab-switching, and other integrity concerns for review.',
      'AI auto-marking handles objective questions instantly and provides consistent, rubric-based marking for essays and long-form answers. Detailed feedback is generated for each student, reducing the marking burden on lecturers while improving feedback quality.',
    ],
    features: ['Large-scale CBT delivery', 'Live monitoring across multiple halls', 'AI marking for essays and long-form answers', 'Department-level analytics', 'Anti-cheating measures', 'Multi-department administration'],
    testimonial: {
      quote: 'We conduct exams for 15,000 students across 200 courses. ExamForge AI has reduced our marking time by 80% and virtually eliminated result disputes.',
      author: 'Prof. Aisha Mohammed',
      role: 'Dean of Academic Affairs, University of Abuja',
    },
  },
  {
    id: 'school-groups',
    icon: Users,
    title: 'School Groups & Chains',
    description: [
      'Manage multiple schools from a single dashboard with centralized policies, shared resources, and aggregate analytics. Each school maintains its own data isolation while the central administration has full visibility.',
      'School chains face unique challenges: maintaining quality standards across locations, sharing best practices, and ensuring consistent policies. ExamForge AI provides a unified platform that respects each school\'s autonomy while enabling central oversight.',
      'Shared question banks and exam templates ensure consistent assessment standards across all schools in the group. Teachers can collaborate on resource creation while administrators maintain quality control.',
      'Aggregate analytics across all schools provide insights into group-wide performance trends, identify top-performing schools, and highlight areas that need attention. Compare performance across locations with standardized metrics.',
    ],
    features: ['Multi-school management', 'Shared question banks', 'Centralized policy enforcement', 'Aggregate analytics across schools', 'Data isolation per school', 'Cross-school collaboration tools'],
    testimonial: {
      quote: 'Managing 12 schools used to mean 12 different systems. Now we have one dashboard that gives us visibility into every school while letting each one operate independently.',
      author: 'Dr. Oluwaseun Bakare',
      role: 'Director of Education, Bright Horizons Schools Group',
    },
  },
  {
    id: 'government',
    icon: Globe,
    title: 'Government Agencies',
    description: [
      'Conduct large-scale examinations for education ministries, examination bodies, and government agencies. Our platform handles tens of thousands of concurrent exam sessions with robust security and real-time monitoring.',
      'Government examinations demand the highest levels of security, reliability, and compliance. ExamForge AI is built on enterprise-grade infrastructure with 99.99% uptime, end-to-end encryption, and comprehensive audit trails.',
      'Our platform supports the full examination lifecycle: from question creation and review workflows to exam delivery, marking, result processing, and certification. Every step is tracked and auditable.',
      'Advanced anti-cheating measures include browser lockdown, facial recognition, keystroke analysis, and AI-powered anomaly detection. Real-time monitoring dashboards give invigilators complete visibility across all examination centers.',
    ],
    features: ['Massive concurrent exam delivery', 'Advanced anti-cheating measures', 'Result processing and certification', 'Compliance and audit reporting', 'Browser lockdown & facial recognition', 'Multi-center coordination'],
    testimonial: {
      quote: 'We successfully delivered examinations to 85,000 candidates across 120 centers simultaneously. The system performed flawlessly and the audit trail gave us complete confidence in the results.',
      author: 'Alhaji Ibrahim Yusuf',
      role: 'Director of Examinations, State Ministry of Education',
    },
  },
  {
    id: 'examination-bodies',
    icon: GraduationCap,
    title: 'Examination Bodies',
    description: [
      'Professional examination bodies can leverage our AI-powered platform to create, deliver, and grade certification exams at scale. Custom branding, certificate generation, and secure result delivery are all built in.',
      'Professional certification requires specialized workflows: candidate registration, payment processing, exam scheduling, and secure result delivery. ExamForge AI handles all of this from a single platform.',
      'Custom branding and theming ensures that the examination experience reflects your organization\'s identity. From the login screen to the certificate, every touchpoint is customizable.',
      'Digital certificates with QR codes and blockchain verification provide tamper-proof proof of achievement. Candidates can verify their results instantly, and employers can confirm credentials with a simple scan.',
    ],
    features: ['Custom branding and theming', 'Professional certification workflows', 'Secure result delivery', 'Digital certificate generation with QR codes', 'Candidate registration & payment', 'Blockchain-verified credentials'],
    testimonial: {
      quote: 'Our certification process used to take 6 months from exam to certificate. With ExamForge AI, it now takes 2 weeks. The digital certificates with QR verification have eliminated fraud entirely.',
      author: 'Chief Adewale Okonkwo',
      role: 'Registrar, Institute of Chartered Accountants',
    },
  },
]

// Stagger animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] as [number, number, number, number] },
  },
}

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative rounded-2xl p-[1px] bg-gradient-to-r from-primary/20 via-purple-500/20 to-cyan-500/20 ${className}`}>
      <div className="relative rounded-2xl bg-card/80 backdrop-blur-xl border border-white/10 dark:border-white/5 p-6 h-full">
        {children}
      </div>
    </div>
  )
}

// Separate component for each solution section to properly use hooks
function SolutionSection({ solution, index }: { solution: typeof solutions[0]; index: number }) {
  const Icon = solution.icon
  const isEven = index % 2 === 0
  const sectionRef = useRef<HTMLDivElement>(null)
  const sectionInView = useInView(sectionRef, { once: true, margin: '-80px' })

  return (
    <section
      ref={sectionRef}
      id={solution.id}
      className={isEven ? 'bg-muted/30 border-y border-border/40' : ''}
      aria-labelledby={`solution-${index}-heading`}
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={sectionInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] as [number, number, number, number] }}
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-24 lg:py-32"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Content Side */}
          <div className={isEven ? 'lg:order-1' : 'lg:order-2'}>
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary mb-6">
              <Icon className="h-7 w-7" aria-hidden="true" />
            </div>
            <h2 id={`solution-${index}-heading`} className="text-2xl sm:text-3xl font-bold tracking-tight mb-6">{solution.title}</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed mb-8">
              {solution.description.map((paragraph, pIdx) => (
                <p key={pIdx}>{paragraph}</p>
              ))}
            </div>
            <Button asChild className="shadow-md shadow-primary/25">
              <Link href="/contact">
                Learn More
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>

          {/* Features + Testimonial Side */}
          <div className={isEven ? 'lg:order-2' : 'lg:order-1'}>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-6 animate-fade-in"
            >
              {/* Key Features Card */}
              <motion.div variants={itemVariants}>
                <GlassCard>
                  <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-4">Key Features</h3>
                  <ul className="space-y-3" role="list">
                    {solution.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-sm">
                        <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </GlassCard>
              </motion.div>

              {/* Customer Story / Testimonial */}
              <motion.div variants={itemVariants}>
                <GlassCard className="!bg-gradient-to-br !from-primary/5 !to-purple-500/5">
                  <div className="flex items-start gap-3 mb-3">
                    <Quote className="h-5 w-5 text-primary/40 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <p className="text-xs font-semibold text-primary uppercase tracking-wider">Customer Story</p>
                  </div>
                  <blockquote className="text-sm text-foreground leading-relaxed mb-4 italic">
                    &ldquo;{solution.testimonial.quote}&rdquo;
                  </blockquote>
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold" aria-hidden="true">
                      {solution.testimonial.author.split(' ').slice(-1)[0][0]}
                      {solution.testimonial.author.split(' ')[1]?.[0] || ''}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{solution.testimonial.author}</p>
                      <p className="text-xs text-muted-foreground">{solution.testimonial.role}</p>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </section>
  )
}

export default function SolutionsPage() {
  const heroRef = useRef<HTMLDivElement>(null)
  const heroInView = useInView(heroRef, { once: true, margin: '-80px' })

  return (
    <div className="pt-16">
      <BreadcrumbJsonLd items={[{ name: 'Home', href: '/' }, { name: 'Solutions', href: '/solutions' }]} />

      {/* ── Hero Section ── */}
      <section ref={heroRef} className="relative py-20 sm:py-28 lg:py-36 overflow-hidden" aria-labelledby="solutions-hero-heading">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10" aria-hidden="true">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-blue-500/3 to-indigo-500/3" />
          <div className="absolute top-[15%] right-[10%] h-[400px] w-[400px] rounded-full bg-cyan-500/6 blur-[120px]" />
          <div className="absolute bottom-[10%] left-[5%] h-[350px] w-[350px] rounded-full bg-primary/100/5 blur-[100px]" />
          <div
            className="absolute inset-0 opacity-[0.012]"
            style={{
              backgroundImage: 'linear-gradient(rgba(99,102,241,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.3) 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={heroInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] as [number, number, number, number] }}
          className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
        >
          <div className="text-center max-w-3xl mx-auto">
            {/* Premium Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/5 px-4 py-1.5 text-sm font-medium text-cyan-600 dark:text-cyan-400 mb-6">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Solutions for Every Institution</span>
            </div>
            <h1 id="solutions-hero-heading" className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
              Solutions for{' '}
              <GradientText preset="cool">every institution</GradientText>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-muted-foreground leading-relaxed">
              Whether you are a small primary school or a national examination body,
              ExamForge AI adapts to your needs. Explore our solutions for different
              educational contexts.
            </p>
          </div>
        </motion.div>
      </section>

      {/* ── Solution Sections ── */}
      {solutions.map((solution, i) => (
        <SolutionSection key={solution.title} solution={solution} index={i} />
      ))}

      <CTASection />
    </div>
  )
}
