import type { Metadata } from 'next'
import { PricingSection } from '@/components/marketing/pricing-section'
import { CTASection } from '@/components/marketing/cta-section'
import { BreadcrumbJsonLd } from '@/components/marketing/breadcrumb-jsonld'

// ============================================================================
// ExamForge AI — Pricing Page
// ============================================================================

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Simple, transparent pricing for ExamForge AI. Start free for 14 days. Plans from $39/month for schools of all sizes.',
}

export default function PricingPage() {
  return (
    <div className="pt-16 bg-[#090909]">
      <BreadcrumbJsonLd items={[{ name: 'Home', href: '/' }, { name: 'Pricing', href: '/pricing' }]} />
      <PricingSection />
      <CTASection />
    </div>
  )
}
