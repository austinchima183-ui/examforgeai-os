'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Smartphone, Tablet, Monitor, ChevronRight } from 'lucide-react'
import { SectionWrapper } from '@/components/marketing/section-wrapper'
import { GradientText } from '@/components/marketing/gradient-text'
import { SectionHeader, ForgeBackground, forgePatternColors } from '@/components/marketing/design-system'
import { useAnalytics } from '@/hooks/use-analytics'
import {
  MobileDeviceFrame,
  TabletDeviceFrame,
  MobileCBTPreview,
  TabletDashboardPreview,
  CBTExamInterfaceScreen,
  AdminDashboardScreen,
} from '@/components/marketing/illustrations'

// ============================================================================
// ExamForge AI — Device Previews Section
// ============================================================================
// Shows ExamForge running on mobile, tablet, and desktop to prove
// the product is real and works everywhere.
// ============================================================================

export function DevicePreviewsSection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const { trackEvent } = useAnalytics()

  return (
    <SectionWrapper id="devices" backgroundClassName="bg-[#0C0C0C] border-y border-white/[0.04]">
      <div ref={ref}>
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4 }}
            className="text-sm font-medium text-primary uppercase tracking-wider mb-4"
          >
            Every Device
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight"
          >
            Works on{' '}
            <GradientText preset="neural">every screen</GradientText>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-4 text-lg text-muted-foreground leading-relaxed"
          >
            Students take exams on any device. Teachers monitor from their laptop.
            Parents check progress on their phone. ExamForge works everywhere.
          </motion.p>
        </div>

        {/* Device previews */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12"
        >
          {/* Mobile */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col items-center"
          >
            <div className="flex items-center gap-2 mb-4">
              <Smartphone className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Mobile</span>
            </div>
            <MobileDeviceFrame>
              <MobileCBTPreview />
            </MobileDeviceFrame>
            <p className="mt-3 text-xs text-muted-foreground text-center max-w-[260px]">
              CBT exams with auto-save, offline support &amp; <span className="text-green-600 dark:text-green-400 font-medium">real-time sync</span>
            </p>
          </motion.div>

          {/* Tablet */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="flex flex-col items-center"
          >
            <div className="flex items-center gap-2 mb-4">
              <Tablet className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Tablet</span>
            </div>
            <TabletDeviceFrame>
              <TabletDashboardPreview />
            </TabletDeviceFrame>
            <p className="mt-3 text-xs text-muted-foreground text-center max-w-[440px]">
              Live exam monitoring &amp; <span className="text-primary font-medium">analytics dashboard</span> on tablet
            </p>
          </motion.div>

          {/* Desktop — scaled down */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="flex flex-col items-center"
          >
            <div className="flex items-center gap-2 mb-4">
              <Monitor className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Desktop</span>
            </div>
            <div className="w-[340px] rounded-xl border-[3px] border-white/[0.08] overflow-hidden shadow-2xl forge-glass-surface">
              <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-white/[0.04] bg-white/[0.01]">
                <div className="flex gap-1">
                  <div className="h-2 w-2 rounded-full bg-red-400/70" />
                  <div className="h-2 w-2 rounded-full bg-yellow-400/70" />
                  <div className="h-2 w-2 rounded-full bg-green-400/70" />
                </div>
                <span className="text-[9px] text-muted-foreground ml-2">app.examforge.ai</span>
              </div>
              <div className="h-[240px] overflow-hidden">
                <div className="transform scale-[0.45] origin-top-left" style={{ width: '755px', height: '534px' }}>
                  <AdminDashboardScreen />
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground text-center max-w-[300px]">
              Full admin dashboard with <span className="text-primary font-medium">real-time monitoring</span> &amp; AI tools
            </p>
          </motion.div>
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="mt-16 text-center"
        >
          <a
            href="/demo"
            onClick={() => { try { trackEvent('cta_click', { cta: 'try_live_demo', location: 'device_previews' }) } catch {} }}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25"
          >
            Try it on your device
            <ChevronRight className="h-4 w-4" />
          </a>
        </motion.div>
      </div>
    </SectionWrapper>
  )
}
