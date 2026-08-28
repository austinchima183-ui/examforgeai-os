'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import Link from 'next/link'
import { ArrowRight, TrendingUp, Clock, Users, BarChart3, GraduationCap, Award } from 'lucide-react'
import { SectionWrapper } from '@/components/marketing/section-wrapper'
import { GradientText } from '@/components/marketing/gradient-text'
import { Button } from '@/components/ui/button'

// ============================================================================
// ExamForge AI — Customer Stories Section (Premium AI OS)
// ============================================================================
// Showcases real customer success stories with metrics, quotes, and
// results. Story cards with quotes, metrics, logos. Forge glass cards
// with gradient accents and data highlights.
// ============================================================================

const stories = [
  {
    institution: 'Lagos State University',
    type: 'University',
    location: 'Lagos, Nigeria',
    quote: 'ExamForge AI reduced our exam preparation from 3 weeks to 2 days. The AI auto-marking alone saves us 85% of grading time across 15 departments.',
    metrics: [
      { label: 'Time Saved', value: '85%', icon: Clock },
      { label: 'Exams Delivered', value: '12K+', icon: BarChart3 },
      { label: 'Students Served', value: '35K+', icon: Users },
    ],
    gradient: 'from-indigo-500 to-amber-500',
  },
  {
    institution: 'Grace International School',
    type: 'Secondary School',
    location: 'Abuja, Nigeria',
    quote: 'We went from paper-based exams to full CBT in just 3 weeks. Our teachers now spend more time teaching and less time on administrative tasks.',
    metrics: [
      { label: 'Setup Time', value: '3 weeks', icon: Clock },
      { label: 'Teacher Hours Saved', value: '240/mo', icon: TrendingUp },
      { label: 'Pass Rate', value: '+12%', icon: GraduationCap },
    ],
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    institution: 'Federal Ministry of Education',
    type: 'Government Agency',
    location: 'Abuja, Nigeria',
    quote: 'We scaled to 50,000 concurrent exam sessions with zero downtime. ExamForge AI is the most reliable platform we have ever used for national assessments.',
    metrics: [
      { label: 'Concurrent Users', value: '50K', icon: Users },
      { label: 'Uptime', value: '99.99%', icon: Award },
      { label: 'Exams Processed', value: '500K+', icon: BarChart3 },
    ],
    gradient: 'from-amber-500 to-orange-600',
  },
]

export function CustomerStoriesSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <SectionWrapper id="customers" backgroundClassName="bg-[#090909]">
      <div ref={ref}>
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4 }}
            className="text-sm font-medium text-foreground/35 uppercase tracking-wider mb-4"
          >
            Customer Stories
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground"
          >
            Schools that{' '}
            <GradientText preset="ember">transformed with ExamForge AI</GradientText>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-4 text-lg text-muted-foreground leading-relaxed"
          >
            Real results from real institutions. See how schools across Africa are
            using ExamForge AI to deliver better education.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {stories.map((story, i) => (
            <motion.div
              key={story.institution}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
              className="group relative rounded-xl border border-white/[0.04] forge-glass-surface forge-card-shadow overflow-hidden hover:border-white/[0.08] hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] transition-all duration-300"
            >
              {/* Header with gradient */}
              <div className={`h-1 bg-gradient-to-r ${story.gradient}`} />
              <div className="p-6">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-foreground/35">{story.type}</span>
                  <span className="text-xs text-foreground/35">·</span>
                  <span className="text-xs text-foreground/35">{story.location}</span>
                </div>
                <h3 className="text-lg font-bold text-foreground mb-3">{story.institution}</h3>

                <blockquote className="text-sm text-muted-foreground leading-relaxed mb-6">
                  &ldquo;{story.quote}&rdquo;
                </blockquote>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {story.metrics.map((metric) => {
                    const Icon = metric.icon
                    return (
                      <div key={metric.label} className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-3 text-center">
                        <Icon className="h-3.5 w-3.5 text-primary mx-auto mb-1" />
                        <p className="text-sm font-bold text-foreground">{metric.value}</p>
                        <p className="text-[10px] text-foreground/35">{metric.label}</p>
                      </div>
                    )
                  })}
                </div>

                <Link
                  href="/case-studies"
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  Read full story
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="mt-10 text-center"
        >
          <Button variant="outline" size="lg" asChild className="border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-primary/30">
            <Link href="/customers">
              View All Customers
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </SectionWrapper>
  )
}
