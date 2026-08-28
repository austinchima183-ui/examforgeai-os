import dynamic from 'next/dynamic'

// ── Static imports — lightweight, no client-side JS ──
import { BreadcrumbJsonLd } from '@/components/marketing/breadcrumb-jsonld'
import { FAQJsonLd } from '@/components/marketing/faq-jsonld'
import { faqData } from '@/components/marketing/faq-data'
import { SectionSkeleton } from '@/components/marketing/section-skeleton'

// ── Dynamic imports — above-the-fold (code-split for memory efficiency) ──
const HeroSection = dynamic(
  () => import('@/components/marketing/hero-section').then(mod => ({ default: mod.HeroSection })),
  { loading: () => <SectionSkeleton /> }
)

const TrustedBySection = dynamic(
  () => import('@/components/marketing/trusted-by-section').then(mod => ({ default: mod.TrustedBySection })),
  { loading: () => <SectionSkeleton /> }
)

// ── Dynamic imports — below-the-fold (code-split) ──
const PlatformOverviewSection = dynamic(
  () => import('@/components/marketing/platform-overview-section').then(mod => ({ default: mod.PlatformOverviewSection })),
  { loading: () => <SectionSkeleton /> }
)

const CoreProductsSection = dynamic(
  () => import('@/components/marketing/core-products-section').then(mod => ({ default: mod.CoreProductsSection })),
  { loading: () => <SectionSkeleton /> }
)

const EcosystemSection = dynamic(
  () => import('@/components/marketing/ecosystem-section').then(mod => ({ default: mod.EcosystemSection })),
  { loading: () => <SectionSkeleton /> }
)

const AIFeaturesSection = dynamic(
  () => import('@/components/marketing/ai-features-section').then(mod => ({ default: mod.AIFeaturesSection })),
  { loading: () => <SectionSkeleton /> }
)

const CBTExperienceSection = dynamic(
  () => import('@/components/marketing/cbt-experience-section').then(mod => ({ default: mod.CBTExperienceSection })),
  { loading: () => <SectionSkeleton /> }
)

const ComparisonSection = dynamic(
  () => import('@/components/marketing/comparison-section').then(mod => ({ default: mod.ComparisonSection })),
  { loading: () => <SectionSkeleton /> }
)

const SecuritySection = dynamic(
  () => import('@/components/marketing/security-section').then(mod => ({ default: mod.SecuritySection })),
  { loading: () => <SectionSkeleton /> }
)

const AnalyticsSection = dynamic(
  () => import('@/components/marketing/analytics-section').then(mod => ({ default: mod.AnalyticsSection })),
  { loading: () => <SectionSkeleton /> }
)

const CustomerStoriesSection = dynamic(
  () => import('@/components/marketing/customer-stories-section').then(mod => ({ default: mod.CustomerStoriesSection })),
  { loading: () => <SectionSkeleton /> }
)

const PricingSection = dynamic(
  () => import('@/components/marketing/pricing-section').then(mod => ({ default: mod.PricingSection })),
  { loading: () => <SectionSkeleton /> }
)

const TestimonialsSection = dynamic(
  () => import('@/components/marketing/testimonials-section').then(mod => ({ default: mod.TestimonialsSection })),
  { loading: () => <SectionSkeleton /> }
)

const FAQSection = dynamic(
  () => import('@/components/marketing/faq-section').then(mod => ({ default: mod.FAQSection })),
  { loading: () => <SectionSkeleton /> }
)

const TimelineSection = dynamic(
  () => import('@/components/marketing/timeline-section').then(mod => ({ default: mod.TimelineSection })),
  { loading: () => <SectionSkeleton /> }
)

const CTASection = dynamic(
  () => import('@/components/marketing/cta-section').then(mod => ({ default: mod.CTASection })),
  { loading: () => <SectionSkeleton /> }
)

const DevicePreviewsSection = dynamic(
  () => import('@/components/marketing/device-previews-section').then(mod => ({ default: mod.DevicePreviewsSection })),
  { loading: () => <SectionSkeleton /> }
)

const InteractiveDemosSection = dynamic(
  () => import('@/components/marketing/interactive-demos-section').then(mod => ({ default: mod.InteractiveDemosSection })),
  { loading: () => <SectionSkeleton /> }
)

const ROICalculatorSection = dynamic(
  () => import('@/components/marketing/roi-calculator-section').then(mod => ({ default: mod.ROICalculatorSection })),
  { loading: () => <SectionSkeleton /> }
)

const EnhancedSocialProofSection = dynamic(
  () => import('@/components/marketing/enhanced-social-proof-section').then(mod => ({ default: mod.EnhancedSocialProofSection })),
  { loading: () => <SectionSkeleton /> }
)

// ============================================================================
// ExamForge AI — Landing Page
// ============================================================================
// The main marketing landing page assembling all sections into a
// single, scrollable page. This is a Server Component — each section
// handles its own client-side interactivity via 'use client'.
//
// Performance optimizations:
//   - HeroSection & TrustedBySection are statically imported (above-the-fold)
//   - All below-the-fold sections use next/dynamic for code splitting
//   - SectionSkeleton provides a visual placeholder while chunks load
//   - Font loading uses next/font/google with display: swap
//   - All Framer Motion animations use GPU-accelerated properties
//     (transform, opacity) and useInView with once: true
// ============================================================================

export default function LandingPage() {
  return (
    <div className="animate-fade-in">
      <BreadcrumbJsonLd items={[{ name: 'Home', href: '/' }]} />
      <FAQJsonLd items={faqData} />
      {/* 1. Navigation — rendered by (marketing)/layout.tsx */}
      {/* 2. Hero — Premium interactive dashboard preview */}
      <HeroSection />
      {/* 3. Trusted By — Logo cloud + metrics + testimonial */}
      <TrustedBySection />
      {/* 4. Platform Overview */}
      <PlatformOverviewSection />
      {/* 5. Core Products — 10 modules */}
      <CoreProductsSection />
      {/* 6. Product Ecosystem — How modules connect */}
      <EcosystemSection />
      {/* 7. AI Features — 8 features */}
      <AIFeaturesSection />
      {/* 8. CBT Experience — 7 steps */}
      <CBTExperienceSection />
      {/* 9. Why Schools Choose ExamForge */}
      <ComparisonSection />
      {/* 10. Security */}
      <SecuritySection />
      {/* 11. Analytics */}
      <AnalyticsSection />
      {/* 11b. Interactive Demos */}
      <InteractiveDemosSection />
      {/* 11c. ROI Calculator */}
      <ROICalculatorSection />
      {/* 12. Device Previews — Mobile, Tablet, Desktop */}
      <DevicePreviewsSection />
      {/* 12b. Enhanced Social Proof */}
      <EnhancedSocialProofSection />
      {/* 13. Customer Stories */}
      <CustomerStoriesSection />
      {/* 13. Pricing — 3 tiers */}
      <PricingSection />
      {/* 14. Testimonials */}
      <TestimonialsSection />
      {/* 15. Timeline — Our journey */}
      <TimelineSection />
      {/* 16. FAQ */}
      <FAQSection />
      {/* 17. Final CTA */}
      <CTASection />
      {/* 18. Footer — rendered by (marketing)/layout.tsx */}
    </div>
  )
}
