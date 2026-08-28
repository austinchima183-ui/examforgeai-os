'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import {
  Mail, Phone, MapPin, MessageSquare, Sparkles,
  Clock, Building2, HelpCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GradientText } from '@/components/marketing/gradient-text'
import { SectionWrapper } from '@/components/marketing/section-wrapper'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import { ContactForm } from '@/components/marketing/contact-form'

// ============================================================================
// ExamForge AI — Contact Page Content (Premium)
// ============================================================================

const contactMethods = [
  {
    icon: Mail,
    title: 'Email Us',
    description: 'Our team typically responds within 4 hours during business days.',
    value: 'hello@examforge.ai',
    href: 'mailto:hello@examforge.ai',
    color: 'from-blue-500/10 to-cyan-500/10',
    iconColor: 'text-primary',
  },
  {
    icon: Phone,
    title: 'Call Us',
    description: 'Available Monday to Friday, 9 AM to 6 PM WAT.',
    value: '+234 801 234 5678',
    href: 'tel:+2348012345678',
    color: 'from-green-500/10 to-emerald-500/10',
    iconColor: 'text-green-600 dark:text-green-400',
  },
  {
    icon: MapPin,
    title: 'Visit Us',
    description: 'Our Lagos office is open for scheduled visits.',
    value: 'Victoria Island, Lagos, Nigeria',
    href: 'https://maps.google.com/?q=ExamForge+Lagos+Nigeria',
    color: 'from-amber-500/10 to-orange-500/10',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
  },
  {
    icon: MessageSquare,
    title: 'Live Chat',
    description: 'Available for Professional and Enterprise customers.',
    value: 'Start a conversation',
    href: '#',
    color: 'from-purple-500/10 to-pink-500/10',
    iconColor: 'text-purple-600 dark:text-purple-400',
  },
]

const faqs = [
  {
    question: 'How do I schedule a demo for my school?',
    answer: 'You can schedule a demo by filling out the contact form above and selecting "Request a demo" as the subject. Our team will reach out within 24 hours to arrange a convenient time. Demos typically last 30-45 minutes and can be conducted via video call or in-person for schools in Lagos.',
  },
  {
    question: 'What is the typical response time for support tickets?',
    answer: 'Starter plan customers receive responses within 24 business hours. Professional plan customers get priority support with 4-hour response times. Enterprise customers have dedicated support with 1-hour response SLAs and a named account manager.',
  },
  {
    question: 'Can I get a custom quote for a school group or government agency?',
    answer: 'Absolutely! We offer custom pricing for school groups, chains, and government agencies with more than 5 schools or 5,000 students. Contact us with your requirements and we will prepare a tailored proposal within 48 hours.',
  },
  {
    question: 'Do you offer on-site training and implementation support?',
    answer: 'Yes, we provide on-site training and implementation support for all plans. Starter plans include virtual onboarding, while Professional and Enterprise plans include on-site visits from our implementation team. We also have a comprehensive help center with video tutorials and guides.',
  },
  {
    question: 'Is my data safe with ExamForge AI?',
    answer: 'Data security is our top priority. We are SOC 2 Type II compliant, use AES-256 encryption for all data at rest and in transit, and maintain GDPR-compliant data processing agreements. Student data is never sold or shared with third parties. You can read more on our Security page.',
  },
  {
    question: 'What happens after my free trial ends?',
    answer: 'After your 14-day free trial, you can choose to subscribe to any plan. If you decide not to continue, your data will be available for export for 30 days. No credit card is required to start the trial, and there are no hidden charges.',
  },
]

// Stagger animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all duration-200 p-6 h-full ${className}`}>
      {children}
    </div>
  )
}

// Contact method card component
function ContactMethodCard({ method }: { method: typeof contactMethods[0] }) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })
  const Icon = method.icon

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] as [number, number, number, number] }}
    >
      <a
        href={method.href}
        className="group block h-full"
        aria-label={`${method.title}: ${method.value}`}
        {...(method.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        <GlassCard>
          <div className="relative overflow-hidden rounded-xl">
            <div className={`absolute inset-0 bg-gradient-to-br ${method.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} aria-hidden="true" />
            <div className="relative">
              <div className={`flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br ${method.color} ${method.iconColor} mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="text-base font-semibold mb-1">{method.title}</h3>
              <p className="text-xs text-muted-foreground mb-2">{method.description}</p>
              <p className="text-sm font-medium text-primary">{method.value}</p>
            </div>
          </div>
        </GlassCard>
      </a>
    </motion.div>
  )
}

// Office map illustration
function OfficeIllustration() {
  return (
    <div className="relative rounded-2xl overflow-hidden border border-white/[0.04] bg-gradient-to-br from-primary/5 via-amber-400/5 to-cyan-400/5 p-8 sm:p-12" id="office-map" aria-label="Office location illustration">
      <div className="absolute inset-0 opacity-[0.03]" aria-hidden="true" style={{
        backgroundImage: `
          linear-gradient(rgba(79,70,229,0.5) 1px, transparent 1px),
          linear-gradient(90deg, rgba(79,70,229,0.5) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
      }} />

      <div className="relative text-center">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center" aria-hidden="true">
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                <MapPin className="h-6 w-6 text-primary" aria-hidden="true" />
              </div>
            </div>
            <div className="absolute inset-0 h-20 w-20 rounded-full border-2 border-primary/20 animate-ping" aria-hidden="true" />
          </div>
        </div>

        <h3 className="text-xl font-bold mb-2">ExamForge AI HQ</h3>
        <p className="text-muted-foreground mb-4">Victoria Island, Lagos, Nigeria</p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>Plot 12, Akin Adesola Street</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>Mon–Fri, 9 AM – 6 PM WAT</span>
          </div>
        </div>

        <div className="mt-6 flex justify-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <a
              href="https://maps.google.com/?q=ExamForge+Lagos+Nigeria"
              target="_blank"
              rel="noopener noreferrer"
            >
              <MapPin className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
              Get Directions
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href="tel:+2348012345678">
              <Phone className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
              Call Office
            </a>
          </Button>
        </div>
      </div>
    </div>
  )
}

export function ContactPageContent() {
  const heroRef = useRef<HTMLDivElement>(null)
  const heroInView = useInView(heroRef, { once: true, margin: '-80px' })

  return (
    <div className="pt-16 bg-[#090909]">
      {/* ── Hero Section ── */}
      <section ref={heroRef} className="relative py-20 sm:py-28 lg:py-36 overflow-hidden" aria-labelledby="contact-hero-heading">
        <div className="absolute inset-0 -z-10" aria-hidden="true">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-amber-400/3 to-cyan-400/3" />
          <div className="absolute inset-0 bg-[#090909]/80" />
          <div className="absolute top-[10%] right-[15%] h-[400px] w-[400px] rounded-full bg-primary/6 blur-[120px]" />
          <div className="absolute bottom-[10%] left-[5%] h-[350px] w-[350px] rounded-full bg-purple-500/5 blur-[100px]" />
          <div
            className="absolute inset-0 opacity-[0.012]"
            style={{
              backgroundImage: 'linear-gradient(rgba(79,70,229,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(79,70,229,0.3) 1px, transparent 1px)',
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
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-6">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>We&apos;d love to hear from you</span>
            </div>
            <h1 id="contact-hero-heading" className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
              Get in{' '}
              <GradientText preset="forge">touch</GradientText>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-muted-foreground leading-relaxed">
              Have questions about ExamForge AI? Want to schedule a demo for your school?
              We would love to hear from you. Reach out and our team will get back to you promptly.
            </p>
          </div>
        </motion.div>
      </section>

      {/* ── Contact Methods ── */}
      <SectionWrapper backgroundClassName="bg-[#0C0C0C] border-y border-white/[0.04]">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {contactMethods.map((method) => (
            <ContactMethodCard key={method.title} method={method} />
          ))}
        </motion.div>
      </SectionWrapper>

      {/* ── Form + Map ── */}
      <SectionWrapper>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Contact Form — Real production form */}
          <div>
            <div className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow max-w-xl">
              <div className="relative rounded-xl bg-[#1D1D1D]/50 p-6 sm:p-8">
                <h2 className="text-xl font-bold mb-2">Send us a message</h2>
                <p className="text-sm text-muted-foreground mb-6">Fill out the form and we&apos;ll get back to you within 4 hours.</p>
                <ContactForm />
              </div>
            </div>
          </div>

          {/* Office Illustration */}
          <div className="space-y-6">
            <OfficeIllustration />

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-4">
              <GlassCard>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 text-green-600 dark:text-green-400">
                    <Clock className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">4hr</p>
                    <p className="text-xs text-muted-foreground">Avg Response</p>
                  </div>
                </div>
              </GlassCard>
              <GlassCard>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/100/10 text-primary">
                    <HelpCircle className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">98%</p>
                    <p className="text-xs text-muted-foreground">Satisfaction</p>
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      </SectionWrapper>

      {/* ── FAQ Section ── */}
      <SectionWrapper backgroundClassName="bg-[#0C0C0C] border-y border-white/[0.04]">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Frequently Asked <GradientText preset="cool">Questions</GradientText>
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Find quick answers to common questions. Can&apos;t find what you&apos;re looking for? Contact us directly.
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <GlassCard>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger className="text-sm font-medium text-left hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </GlassCard>
        </div>
      </SectionWrapper>
    </div>
  )
}
