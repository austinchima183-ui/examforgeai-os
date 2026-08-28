'use client'

import { useState, useRef, useMemo } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { Search, MessageCircle, ArrowRight, ChevronDown } from 'lucide-react'
import { SectionWrapper } from '@/components/marketing/section-wrapper'
import { GradientText } from '@/components/marketing/gradient-text'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { cn } from '@/lib/utils'

// ============================================================================
// ExamForge AI — FAQ Section (Premium AI OS)
// ============================================================================
// Accordion with smooth expand/collapse, search/filter functionality,
// category tabs, clean minimal design, and a "Still have questions?" CTA.
// ============================================================================

type FAQCategory = 'All' | 'Product' | 'Pricing' | 'Security' | 'Technical'

const faqs: {
  question: string
  answer: string
  category: FAQCategory
}[] = [
  {
    category: 'Product',
    question: 'What is ExamForge AI?',
    answer:
      'ExamForge AI is an all-in-one platform for modern schools. It combines a Student Information System, AI-powered CBT (Computer-Based Testing) platform, School ERP, analytics engine, and AI assistant into a single, integrated solution. Schools use ExamForge AI to manage students, create and deliver exams, automate grading, analyze performance, and run their entire administration digitally.',
  },
  {
    category: 'Product',
    question: 'How does the AI question generation work?',
    answer:
      'Our AI engine generates exam questions based on the subject, topic, difficulty level, and curriculum standards you specify. You simply describe what you need — for example, "5 multiple-choice questions on photosynthesis for SS2 Biology" — and the AI creates questions with answer keys, explanations, and difficulty ratings. You can edit, approve, or regenerate any question before publishing.',
  },
  {
    category: 'Product',
    question: 'Is ExamForge AI suitable for primary and secondary schools?',
    answer:
      'Yes. ExamForge AI is designed for all levels of education — primary, secondary, and tertiary. The platform adapts to your school\'s needs, whether you are managing a small primary school or a large university. The CBT interface is intuitive enough for younger students, and the analytics are powerful enough for institutional research.',
  },
  {
    category: 'Product',
    question: 'How does auto-marking work for essay questions?',
    answer:
      'Our AI uses natural language processing and rubric-based scoring to evaluate essay and short-answer questions. You define the marking rubric, and the AI scores each response against it, providing detailed feedback for students. Teachers can review and adjust AI-generated scores before they are finalized. This reduces marking time by up to 85% while maintaining accuracy.',
  },
  {
    category: 'Technical',
    question: 'What devices can students use to take exams?',
    answer:
      'ExamForge AI works on any modern device — desktop computers, laptops, tablets, and smartphones. The CBT interface is fully responsive and optimized for touch screens. We also support offline mode with automatic sync, so students can continue their exam even if they lose internet connectivity.',
  },
  {
    category: 'Security',
    question: 'How secure is the platform?',
    answer:
      'Security is built into every layer. We use end-to-end encryption (TLS 1.3 in transit, AES-256 at rest), role-based access control with five distinct roles, comprehensive audit logging, and Supabase\'s enterprise-grade infrastructure. We also enforce HTTP security headers, support multi-tenant data isolation, and offer 99.9% uptime SLA for enterprise customers.',
  },
  {
    category: 'Technical',
    question: 'Can I migrate from my existing school software?',
    answer:
      'Yes. We provide migration tools and support to help you import your existing student data, question banks, and historical records into ExamForge AI. Our onboarding team will work with you to ensure a smooth transition with minimal disruption to your school\'s operations.',
  },
  {
    category: 'Pricing',
    question: 'Is there a free trial?',
    answer:
      'Yes. Every plan includes a 14-day free trial with full access to all features. No credit card is required to start. At the end of your trial, you can choose the plan that best fits your school\'s needs, or continue with a limited free tier.',
  },
  {
    category: 'Pricing',
    question: 'How does billing work?',
    answer:
      'Billing is handled through Flutterwave, which supports multiple payment methods including bank transfers, cards, and mobile money. You can choose monthly or annual billing. Annual plans save you 20% compared to monthly billing. Enterprise customers can arrange custom billing cycles and payment terms.',
  },
  {
    category: 'Product',
    question: 'Can I manage multiple schools on one account?',
    answer:
      'Yes. Our Enterprise plan supports multi-school management from a single dashboard. Each school has its own data isolation, branding, and admin controls, while the central administration can manage all schools, view aggregate analytics, and enforce policies across the organization.',
  },
  {
    category: 'Technical',
    question: 'What happens if a student loses internet during an exam?',
    answer:
      'ExamForge AI includes offline support with automatic sync. If a student loses connectivity during an exam, their progress is saved locally and automatically synced when the connection is restored. The built-in timer continues running, and no answers are lost.',
  },
  {
    category: 'Product',
    question: 'How does live exam monitoring work?',
    answer:
      'During an active exam, administrators and teachers can view a real-time dashboard showing every connected student. You can see their progress, time remaining, and current status. The system automatically flags suspicious activity such as tab-switching, multiple login attempts, or unusual response patterns.',
  },
  {
    category: 'Product',
    question: 'Can parents access the platform?',
    answer:
      'Yes. Parents get their own portal with read-only access to their child\'s performance data, exam results, attendance records, and school announcements. They can also communicate with teachers through the built-in messaging system and receive notifications about important events.',
  },
  {
    category: 'Product',
    question: 'What curriculum standards does ExamForge AI support?',
    answer:
      'ExamForge AI supports multiple curriculum frameworks including WAEC, NECO, JAMB, Cambridge IGCSE, and IB. The AI question generation can be aligned to specific curriculum standards, and you can create custom curriculum mappings for your school\'s unique requirements.',
  },
  {
    category: 'Product',
    question: 'How does the marketplace work?',
    answer:
      'The marketplace is a community-driven resource library where educators can share and download exam templates, question banks, lesson plans, and other educational resources. You can publish your own content for others to use, or browse and import content created by verified educators. All marketplace content is reviewed for quality and curriculum alignment.',
  },
  {
    category: 'Product',
    question: 'Can ExamForge AI generate certificates?',
    answer:
      'Yes. After an exam is completed and results are finalized, ExamForge AI can automatically generate certificates for qualifying students. Certificates are customizable with your school\'s branding, include QR codes for digital verification, and can be delivered directly to students via email or downloaded from their portal.',
  },
  {
    category: 'Pricing',
    question: 'What kind of support do you offer?',
    answer:
      'Starter plans include standard email support with 24-hour response times. Professional plans get priority support with 4-hour response times and live chat. Enterprise customers receive dedicated account managers, 24/7 premium support, custom onboarding, and training sessions for their staff.',
  },
  {
    category: 'Security',
    question: 'Is my data backed up?',
    answer:
      'Yes. We perform daily automated backups with point-in-time recovery capability. Your data is stored with geographic redundancy across multiple regions. Enterprise customers can also configure custom backup schedules and retention policies to meet their compliance requirements.',
  },
]

const categories: FAQCategory[] = ['All', 'Product', 'Pricing', 'Security', 'Technical']

function FAQItem({
  question,
  answer,
  isOpen,
  onToggle,
  index,
}: {
  question: string
  answer: string
  isOpen: boolean
  onToggle: () => void
  index: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
      className="group"
    >
      <div
        className={cn(
          'rounded-xl border transition-all duration-300',
          isOpen
            ? 'border-primary/20 bg-primary/[0.02] shadow-md shadow-primary/5'
            : 'border-white/[0.04] forge-glass-surface hover:border-white/[0.08] hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)]'
        )}
      >
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-between p-5 text-left"
          aria-expanded={isOpen}
        >
          <span className={cn(
            'text-base font-medium pr-4 transition-colors duration-200',
            isOpen ? 'text-primary' : 'text-foreground'
          )}>
            {question}
          </span>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="flex-shrink-0"
          >
            <ChevronDown className={cn(
              'h-5 w-5 transition-colors duration-200',
              isOpen ? 'text-primary' : 'text-foreground/35'
            )} />
          </motion.div>
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 pt-0">
                <p className="text-muted-foreground leading-relaxed text-sm">{answer}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

export function FAQSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<FAQCategory>('All')
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const filteredFaqs = useMemo(() => {
    return faqs.filter((faq) => {
      const matchesCategory = activeCategory === 'All' || faq.category === activeCategory
      const matchesSearch = !searchQuery ||
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [activeCategory, searchQuery])

  return (
    <SectionWrapper id="resources" backgroundClassName="bg-[#090909]">
      <div ref={ref}>
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4 }}
            className="text-sm font-medium text-foreground/35 uppercase tracking-wider mb-4"
          >
            FAQ
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground"
          >
            Frequently asked{' '}
            <GradientText preset="cool">questions</GradientText>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-4 text-lg text-muted-foreground leading-relaxed"
          >
            Everything you need to know about ExamForge AI. Can&apos;t find the answer
            you&apos;re looking for? Reach out to our support team.
          </motion.p>
        </div>

        {/* Search and Category Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="max-w-3xl mx-auto mb-8 space-y-4"
        >
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/35" />
            <input
              type="text"
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-white/[0.06] forge-glass-surface pl-10 pr-4 py-3 text-sm placeholder:text-foreground/35 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
              aria-label="Search frequently asked questions"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear search"
              >
                Clear
              </button>
            )}
          </div>

          {/* Category tabs */}
          <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as FAQCategory)}>
            <TabsList className="w-full justify-start flex-wrap h-auto gap-1 bg-transparent p-0">
              {categories.map((cat) => (
                <TabsTrigger
                  key={cat}
                  value={cat}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-medium data-[state=active]:bg-primary/10 data-[state=active]:text-primary',
                  )}
                >
                  {cat}
                  {cat !== 'All' && (
                    <span className="ml-1 text-[10px] text-foreground/35">
                      ({faqs.filter((f) => f.category === cat).length})
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </motion.div>

        {/* FAQ List */}
        <div className="max-w-3xl mx-auto space-y-3">
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((faq, i) => (
              <FAQItem
                key={faq.question}
                question={faq.question}
                answer={faq.answer}
                isOpen={openIndex === i}
                onToggle={() => setOpenIndex(openIndex === i ? null : i)}
                index={i}
              />
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <p className="text-muted-foreground">No questions found matching &ldquo;{searchQuery}&rdquo;</p>
              <button
                onClick={() => {
                  setSearchQuery('')
                  setActiveCategory('All')
                }}
                className="mt-2 text-sm text-primary hover:text-primary/80 transition-colors"
              >
                Clear filters
              </button>
            </motion.div>
          )}
        </div>

        {/* Still have questions? CTA */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-12 text-center"
        >
          <div className="relative rounded-xl border border-white/[0.04] forge-glass-surface forge-card-shadow p-8 sm:p-10 max-w-2xl mx-auto overflow-hidden">
            {/* Subtle gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-50" aria-hidden="true" />
            <div className="relative">
              <MessageCircle className="h-8 w-8 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-bold text-foreground mb-2">Still have questions?</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                Can&apos;t find what you&apos;re looking for? Our team is here to help.
                Get in touch and we&apos;ll respond as soon as we can.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button asChild className="shadow-md shadow-primary/25">
                  <Link href="/contact">
                    Contact Support
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
                <Button variant="ghost" asChild className="border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-primary/30">
                  <Link href="/help-center">
                    Help Center
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </SectionWrapper>
  )
}
