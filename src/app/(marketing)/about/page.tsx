'use client'

import { useRef, useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import {
  BookOpen, Heart, Globe, Zap, Users, Shield, Sparkles,
  ArrowRight, Target, TrendingUp, GraduationCap, Building2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GradientText } from '@/components/marketing/gradient-text'
import { SectionWrapper } from '@/components/marketing/section-wrapper'
import { CTASection } from '@/components/marketing/cta-section'
import { BreadcrumbJsonLd } from '@/components/marketing/breadcrumb-jsonld'
import { ProfessionalAvatar } from '@/components/marketing/illustrations'

// ============================================================================
// ExamForge AI — About Page (Premium)
// ============================================================================

const values = [
  {
    icon: Heart,
    title: 'Education First',
    description:
      'Every feature we build starts with a question: does this help students learn better? We believe technology should serve education, not the other way around. Our AI is designed to amplify great teaching, not replace it.',
  },
  {
    icon: Globe,
    title: 'Built for Africa',
    description:
      'We started in Nigeria because we saw the biggest gap between educational ambition and available technology. Our platform is built to work in environments with limited connectivity, diverse curricula, and unique administrative challenges.',
  },
  {
    icon: Zap,
    title: 'Simplicity Over Complexity',
    description:
      'School software should not require a PhD to operate. We obsess over making complex workflows simple. If a teacher cannot figure out a feature in 30 seconds, we redesign it until they can.',
  },
  {
    icon: Users,
    title: 'Community Driven',
    description:
      'Our marketplace, our feature roadmap, and our support model are all built around community. Educators share resources, suggest features, and help each other succeed. ExamForge AI is as much a community as it is a product.',
  },
  {
    icon: Shield,
    title: 'Trust & Transparency',
    description:
      'We handle student data, and that responsibility is sacred. We are transparent about our security practices, our data handling policies, and our pricing. No hidden fees, no data selling, no surprises.',
  },
  {
    icon: BookOpen,
    title: 'Continuous Innovation',
    description:
      'Education is evolving, and so are we. We ship new features every week, powered by the latest advances in AI and web technology. Our customers always have access to the most advanced tools available.',
  },
]

const team = [
  { name: 'Austin Chima', role: 'Founder & CEO', gradient: 'from-primary to-purple-600', bio: 'Former teacher turned tech entrepreneur. Passionate about making world-class education accessible across Africa.' },
  { name: 'Dr. Ada Okafor', role: 'Head of Education', gradient: 'from-emerald-500 to-teal-600', bio: 'PhD in Educational Technology. 15 years shaping curriculum and assessment standards in West Africa.' },
  { name: 'Emeka Nwosu', role: 'CTO', gradient: 'from-cyan-500 to-blue-600', bio: 'Full-stack architect with experience scaling platforms to millions of users. Led engineering at two YC startups.' },
  { name: 'Zainab Musa', role: 'Head of Product', gradient: 'from-amber-500 to-orange-600', bio: 'Product leader with a decade of experience building tools for educators and institutions.' },
  { name: 'Chidi Eze', role: 'Lead Engineer', gradient: 'from-rose-500 to-pink-600', bio: 'Distributed systems expert. Passionate about building reliable, high-performance software for education.' },
  { name: 'Amina Bello', role: 'Head of Design', gradient: 'from-violet-500 to-indigo-600', bio: 'UX designer focused on creating intuitive, accessible interfaces for complex educational workflows.' },
]

const milestones = [
  { year: '2023 Q1', title: 'ExamForge AI Founded', description: 'Austin Chima founded ExamForge AI after witnessing the painful manual exam process at a school in Lagos.' },
  { year: '2023 Q2', title: 'First Prototype', description: 'Built the first CBT prototype with AI question generation. Tested with 3 pilot schools in Lagos.' },
  { year: '2023 Q4', title: 'Beta Launch', description: 'Launched beta to 50 schools across Nigeria. Processed over 10,000 exams in the first month.' },
  { year: '2024 Q1', title: 'School ERP Module', description: 'Expanded beyond CBT with full School ERP, student information system, and billing modules.' },
  { year: '2024 Q2', title: 'Series A Funding', description: 'Raised $2.5M in Series A funding to expand across West Africa and build the AI engine.' },
  { year: '2024 Q3', title: 'Multi-Country Expansion', description: 'Expanded to Ghana and Kenya. Reached 300+ schools across 3 countries.' },
  { year: '2024 Q4', title: 'AI Assistant & Marketplace', description: 'Launched AI Assistant and Marketplace. 500+ schools actively using the platform.' },
  { year: '2025 Q1', title: 'Predictive Analytics', description: 'Introduced predictive analytics and AI essay marking. Surpassed 500 schools and 120,000 students.' },
]

const impactStats = [
  { icon: Building2, value: 500, suffix: '+', label: 'Schools' },
  { icon: GraduationCap, value: 120000, suffix: '+', label: 'Students' },
  { icon: Target, value: 85, suffix: '%', label: 'Time Saved' },
  { icon: TrendingUp, value: 4, suffix: '', label: 'Countries' },
]

// Animated counter hook
function useCounter(target: number, inView: boolean, duration = 2000) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!inView) return
    let start = 0
    const startTime = performance.now()

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = Math.floor(eased * target)
      setCount(current)
      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setCount(target)
      }
    }

    requestAnimationFrame(animate)
  }, [inView, target, duration])

  return count
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`
  return num.toString()
}

// Stagger animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] as [number, number, number, number] },
  },
}

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all duration-200 p-6 h-full ${className}`}>
      {children}
    </div>
  )
}

// Impact counter component
function ImpactCounter({ icon: Icon, value, suffix, label }: { icon: typeof Building2; value: number; suffix: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })
  const count = useCounter(value, isInView)

  return (
    <div ref={ref} className="text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary mx-auto mb-4">
        <Icon className="h-7 w-7" aria-hidden="true" />
      </div>
      <div className="text-4xl sm:text-5xl font-bold tracking-tight mb-2">
        <GradientText preset="primary">{formatNumber(count)}{suffix}</GradientText>
      </div>
      <p className="text-sm text-muted-foreground font-medium">{label}</p>
    </div>
  )
}

// Team member card component
function TeamCard({ member }: { member: typeof team[0] }) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      <GlassCard>
        <div className="text-center group">
          <div className="mx-auto mb-3 group-hover:scale-110 transition-transform duration-300">
            <ProfessionalAvatar
              name={member.name}
              role={member.role}
              gradient={member.gradient}
              size="lg"
            />
          </div>
          <p className="text-sm font-semibold mb-0.5">{member.name}</p>
          <p className="text-xs text-primary font-medium mb-2">{member.role}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{member.bio}</p>
        </div>
      </GlassCard>
    </motion.div>
  )
}

export default function AboutPage() {
  const heroRef = useRef<HTMLDivElement>(null)
  const heroInView = useInView(heroRef, { once: true, margin: '-80px' })
  const storyRef = useRef<HTMLDivElement>(null)
  const storyInView = useInView(storyRef, { once: true, margin: '-80px' })
  const timelineRef = useRef<HTMLDivElement>(null)
  const timelineInView = useInView(timelineRef, { once: true, margin: '-80px' })

  return (
    <div className="pt-16 bg-[#090909]">
      <BreadcrumbJsonLd items={[{ name: 'Home', href: '/' }, { name: 'About', href: '/about' }]} />

      {/* ── Hero Section ── */}
      <section ref={heroRef} className="relative py-20 sm:py-28 lg:py-36 overflow-hidden" aria-labelledby="about-hero-heading">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10" aria-hidden="true">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-purple-500/3 to-pink-500/3" />
          <div className="absolute inset-0 bg-[#090909]/80" />
          <div className="absolute top-[10%] left-[5%] h-[400px] w-[400px] rounded-full bg-primary/6 blur-[120px]" />
          <div className="absolute bottom-[5%] right-[10%] h-[350px] w-[350px] rounded-full bg-purple-500/5 blur-[100px]" />
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
          transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
        >
          <div className="text-center max-w-3xl mx-auto">
            {/* Premium Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-6">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Our Story</span>
            </div>
            <h1 id="about-hero-heading" className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
              Building the future of{' '}
              <GradientText preset="primary">African education</GradientText>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-muted-foreground leading-relaxed">
              ExamForge AI was founded with a simple mission: give every school in Africa
              access to world-class technology that makes education better, faster, and more
              equitable. We believe that every student deserves the best tools, regardless of
              their school&apos;s budget or location.
            </p>
          </div>
        </motion.div>
      </section>

      {/* ── Our Story ── */}
      <SectionWrapper backgroundClassName="bg-[#0C0C0C] border-y border-white/[0.04]">
        <motion.div
          ref={storyRef}
          initial={{ opacity: 0, y: 24 }}
          animate={storyInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="max-w-3xl mx-auto"
        >
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-8">Our Story</h2>
          <div className="space-y-5 text-muted-foreground leading-relaxed">
            <p>
              In 2023, our founder was volunteering at a school in Lagos when he witnessed
              something that would change his life. A teacher spent three full weeks manually
              creating exam questions for 12 different subjects, then another two weeks marking
              answer sheets by hand. The process was error-prone, exhausting, and ultimately
              unfair to students who deserved better.
            </p>
            <p>
              That experience sparked a question: why does school software in Africa still look
              like it was built in 2005? While the rest of the world moved to AI, real-time
              collaboration, and cloud infrastructure, African schools were stuck with desktop
              applications, manual processes, and fragmented tools that did not talk to each other.
            </p>
            <p>
              ExamForge AI was built to change that. We started with the most painful problem —
              CBT exams — and built an AI-powered platform that takes exam creation from weeks to
              minutes and marking from weeks to seconds. Then we kept going: student management,
              analytics, billing, marketplace, and more. Every module is designed to work together
              seamlessly, powered by AI, and accessible on any device.
            </p>
            <p>
              Today, over 500 schools across Nigeria, Ghana, Kenya, and South Africa trust
              ExamForge AI to manage their operations, deliver exams, and improve student outcomes.
              We are just getting started.
            </p>
          </div>
        </motion.div>
      </SectionWrapper>

      {/* ── Our Impact ── */}
      <SectionWrapper>
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Our <GradientText preset="primary">Impact</GradientText>
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Real numbers from real schools. Every metric represents improved outcomes for students and teachers.
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {impactStats.map((stat) => (
            <ImpactCounter
              key={stat.label}
              icon={stat.icon}
              value={stat.value}
              suffix={stat.suffix}
              label={stat.label}
            />
          ))}
        </div>
      </SectionWrapper>

      {/* ── Timeline / Milestones ── */}
      <SectionWrapper backgroundClassName="bg-[#0C0C0C] border-y border-white/[0.04]">
        <motion.div
          ref={timelineRef}
          initial={{ opacity: 0, y: 24 }}
          animate={timelineInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
        >
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Our <GradientText preset="cool">Journey</GradientText>
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              From a Lagos classroom to 500+ schools across Africa — here are the milestones that shaped us.
            </p>
          </div>

          <div className="relative max-w-3xl mx-auto">
            {/* Timeline line */}
            <div className="absolute left-4 sm:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-primary/40 via-purple-500/30 to-cyan-500/20 sm:-translate-x-px" aria-hidden="true" />

            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-8 animate-fade-in"
            >
              {milestones.map((milestone, i) => (
                <motion.div
                  key={milestone.year}
                  variants={itemVariants}
                  className={`relative flex items-start gap-6 sm:gap-0 ${i % 2 === 0 ? 'sm:flex-row' : 'sm:flex-row-reverse'}`}
                >
                  {/* Dot */}
                  <div className="absolute left-4 sm:left-1/2 w-3 h-3 rounded-full bg-primary border-2 border-background -translate-x-1.5 sm:-translate-x-1.5 mt-1.5 z-10" aria-hidden="true" />

                  {/* Content */}
                  <div className={`ml-10 sm:ml-0 sm:w-1/2 ${i % 2 === 0 ? 'sm:pr-12 sm:text-right' : 'sm:pl-12 sm:text-left'}`}>
                    <GlassCard>
                      <span className="text-xs font-mono text-primary font-semibold">{milestone.year}</span>
                      <h3 className="text-sm font-semibold mt-1 mb-1">{milestone.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">{milestone.description}</p>
                    </GlassCard>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </SectionWrapper>

      {/* ── Values ── */}
      <SectionWrapper>
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Our Values</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            These principles guide every decision we make, from product design to hiring to customer support.
          </p>
        </div>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {values.map((value) => {
            const Icon = value.icon
            return (
              <motion.div key={value.title} variants={itemVariants}>
                <GlassCard>
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="text-base font-semibold mb-2">{value.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{value.description}</p>
                </GlassCard>
              </motion.div>
            )
          })}
        </motion.div>
      </SectionWrapper>

      {/* ── Team ── */}
      <SectionWrapper backgroundClassName="bg-[#0C0C0C] border-y border-white/[0.04]">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Our Team</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            A passionate team of engineers, educators, and designers building the future of school technology.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {team.map((member) => (
            <TeamCard key={member.name} member={member} />
          ))}
        </div>
      </SectionWrapper>

      <CTASection />
    </div>
  )
}
