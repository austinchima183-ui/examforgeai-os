import type { Metadata } from 'next'
import { Sparkles } from 'lucide-react'
import { GradientText } from '@/components/marketing/gradient-text'
import { SectionWrapper } from '@/components/marketing/section-wrapper'
import { BreadcrumbJsonLd } from '@/components/marketing/breadcrumb-jsonld'
import { OrganizationJsonLd } from '@/components/seo/organization-jsonld'
import { CTASection } from '@/components/marketing/cta-section'
import { ChangelogTimeline } from '@/components/marketing/changelog-timeline'
import { getCanonicalUrl, generateMetadata as genMeta } from '@/content/seo'

// ============================================================================
// ExamForge AI — Enhanced Changelog Page
// ============================================================================

export const metadata: Metadata = genMeta({
  title: 'Changelog — ExamForge AI',
  description:
    'See what is new in ExamForge AI. Track product updates, feature releases, bug fixes, and improvements across every version.',
  path: '/changelog',
})

export default function ChangelogPage() {
  return (
    <div className="pt-16">
      {/* Structured Data */}
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', href: '/' },
          { name: 'Resources', href: '/changelog' },
          { name: 'Changelog', href: '/changelog' },
        ]}
      />
      <OrganizationJsonLd />

      {/* Hero */}
      <SectionWrapper>
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Changelog</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            What&apos;s new in{' '}
            <GradientText preset="primary">ExamForge AI</GradientText>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            We ship new features, improvements, and fixes every week. Follow our
            progress as we build the future of school technology.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-green-50 dark:bg-green-9500" />
              v3.2.0 — Current Release
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-purple-500" />
              8 Releases
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-cyan-500" />
              Updated weekly
            </span>
          </div>
        </div>
      </SectionWrapper>

      {/* Timeline with Filters */}
      <ChangelogTimeline />

      <CTASection />
    </div>
  )
}
