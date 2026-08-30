'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Calendar, Sparkles, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GradientText } from '@/components/marketing/gradient-text'
import { NewsletterForm } from '@/components/marketing/newsletter-form'
import { useAnalytics } from '@/hooks/use-analytics'
import { MagneticButton, FloatingParticles, MeshBackground, ConditionalMotion, springs, durations, easings } from '@/components/marketing/motion'
import { ForgeBackground, ForgeGradientBorder, forgePatternColors } from '@/components/marketing/design-system'

// ============================================================================
// ExamForge AI — Final CTA Section (Signature AI OS)
// ============================================================================
// Dark, dramatic call-to-action. Large headline with gradient text.
// Premium CTA button. Uses the ExamForge signature design system.
// Every gradient, every glow, every pattern is branded.
// ============================================================================

export function CTASection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const { trackEvent } = useAnalytics()

  return (
    <section
      ref={ref}
      className="relative py-24 sm:py-32 lg:py-40 overflow-hidden bg-[#090909]"
      aria-labelledby="cta-heading"
    >
      {/* ── Signature Forge Background ── */}
      <ForgeBackground variant="hero" orbs mesh particles />

      <div className="absolute inset-0 -z-10" aria-hidden="true">
        {/* Premium radial glow orbs */}
        <div className="absolute top-0 left-1/3 h-[500px] w-[500px] rounded-full bg-primary/12 blur-[140px]" />
        <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-cyan-400/8 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-amber-400/5 blur-[160px]" />
      </div>

      {/* Ambient particles (additional layer) */}
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <ConditionalMotion>
          <FloatingParticles
            count={12}
            color={`rgba(${forgePatternColors.primaryRgb}, 0.15)`}
            minSize={1}
            maxSize={3}
            className="opacity-50"
          />
        </ConditionalMotion>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          {/* ── Signature Forge Gradient Border ── */}
          <ForgeGradientBorder gradient="forge" glow className="max-w-4xl mx-auto">
            <div className="relative rounded-xl forge-glass-surface border border-white/[0.04] p-8 sm:p-12 lg:p-16 forge-card-shadow">
              {/* Decorative sparkle */}
              <div className="absolute top-6 right-8 text-primary/10" aria-hidden="true">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L14.09 8.26L20 9.27L15.55 13.97L16.91 20L12 16.9L7.09 20L8.45 13.97L4 9.27L9.91 8.26L12 2Z" />
                </svg>
              </div>

              {/* Badge */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/8 px-5 py-2 text-sm font-medium text-primary forge-glow">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Ready to transform your school?</span>
                </div>
              </div>

              {/* Heading — large dramatic gradient text */}
              <h2
                id="cta-heading"
                className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground text-center"
              >
                Start building the{' '}
                <GradientText preset="forge">future of education</GradientText>{' '}
                today
              </h2>

              {/* Description */}
              <p className="mt-6 text-lg sm:text-xl text-muted-foreground leading-relaxed text-center max-w-2xl mx-auto">
                Join 500+ schools already using ExamForge AI to deliver better exams,
                automate administration, and empower learning with AI. Get started with
                a free 14-day trial — no credit card required.
              </p>

              {/* ── Social Proof ── */}
              <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4 text-primary" aria-hidden="true" />
                <span>
                  Trusted by <strong className="text-foreground font-semibold">500+</strong> institutions across Africa
                </span>
              </div>

              {/* ── Multiple Conversion Paths — Premium CTA buttons ── */}
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <MagneticButton strength={0.15} radius={200}>
                  <Button
                    size="lg"
                    className="h-12 px-8 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300 forge-glow"
                    asChild
                  >
                    <Link href="/register" aria-label="Start your free 14-day trial" onClick={() => { try { trackEvent('cta_click', { cta: 'start_free_trial', location: 'cta_section' }) } catch {} }}>
                      Start Free Trial
                      <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                </MagneticButton>
                <MagneticButton strength={0.12} radius={200}>
                  <Button
                    variant="ghost"
                    size="lg"
                    className="h-12 px-8 text-base font-medium border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-primary/30 transition-all duration-300"
                    asChild
                  >
                    <Link href="/contact" aria-label="Book a demo with our team" onClick={() => { try { trackEvent('cta_click', { cta: 'book_demo', location: 'cta_section' }) } catch {} }}>
                      <Calendar className="mr-2 h-4 w-4" aria-hidden="true" />
                      Book a Demo
                    </Link>
                  </Button>
                </MagneticButton>
              </div>

              {/* Trust line */}
              <p className="mt-6 text-sm text-foreground/60 text-center">
                Free 14-day trial · No credit card required · Cancel anytime
              </p>

              {/* ── Newsletter Signup ── */}
              <div className="mt-10 pt-8 border-t border-white/[0.04]">
                <p className="text-sm text-muted-foreground text-center mb-1">
                  Not ready yet? Stay in the loop:
                </p>
                <p className="text-xs text-foreground/60 text-center mb-4">
                  Get product updates, EdTech insights, and exclusive early access.
                </p>
                <NewsletterForm />
              </div>
            </div>
          </ForgeGradientBorder>
        </motion.div>
      </div>
    </section>
  )
}
