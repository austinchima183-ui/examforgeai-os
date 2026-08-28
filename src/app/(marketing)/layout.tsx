import type { Metadata } from 'next'
import { MarketingNav } from '@/components/marketing/marketing-nav'
import { MarketingFooter } from '@/components/marketing/marketing-footer'
import { BackToTopButton } from '@/components/marketing/back-to-top-button'
import { AnnouncementBar } from '@/components/marketing/announcement-bar'
import { MarketingProviders } from '@/components/marketing/marketing-providers'

// ============================================================================
// ExamForge AI OS — Marketing Layout (Premium + WCAG AA Accessible)
// ============================================================================
// Layout for public marketing pages. #090909 bg, no visible section boundaries.
// SILENT. CALM. FOCUSED. EXPENSIVE.
// ============================================================================

export const metadata: Metadata = {
  title: {
    default: 'ExamForge AI — The AI Operating System for Modern Schools',
    template: '%s | ExamForge AI',
  },
  description:
    'One platform to manage schools, run CBT exams, automate administration, analyze performance, and empower learning with AI. Built for the future of education.',
  keywords: [
    'ExamForge AI',
    'school management software',
    'CBT platform',
    'AI exam generation',
    'computer-based testing',
    'school ERP',
    'student information system',
    'education technology',
    'Nigeria',
    'Africa',
    'auto marking',
    'exam software',
    'WAEC',
    'NECO',
    'JAMB',
  ],
  authors: [{ name: 'ExamForge AI', url: 'https://examforge.ai' }],
  creator: 'ExamForge AI',
  publisher: 'ExamForge AI',
  metadataBase: new URL('https://examforge.ai'),
  openGraph: {
    type: 'website',
    locale: 'en_NG',
    url: 'https://examforge.ai',
    siteName: 'ExamForge AI',
    title: 'ExamForge AI — The AI Operating System for Modern Schools',
    description:
      'One platform to manage schools, run CBT exams, automate administration, analyze performance, and empower learning with AI.',
    images: [
      {
        url: '/api/og?title=ExamForge+AI&description=The+AI+Operating+System+for+Modern+Schools',
        width: 1200,
        height: 630,
        alt: 'ExamForge AI — The AI Operating System for Modern Schools',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ExamForge AI — The AI Operating System for Modern Schools',
    description:
      'One platform to manage schools, run CBT exams, automate administration, analyze performance, and empower learning with AI.',
    images: ['/api/og?title=ExamForge+AI&description=The+AI+Operating+System+for+Modern+Schools'],
    creator: '@examforgeai',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

// JSON-LD Structured Data — Software Application
const softwareAppJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'ExamForge AI',
  description:
    'The AI Operating System for Modern Schools. One platform to manage schools, run CBT exams, automate administration, analyze performance, and empower learning with AI.',
  applicationCategory: 'EducationalApplication',
  operatingSystem: 'Web',
  url: 'https://examforge.ai',
  offers: {
    '@type': 'AggregateOffer',
    priceCurrency: 'USD',
    lowPrice: '39',
    highPrice: '149',
    offerCount: '3',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    ratingCount: '500',
    bestRating: '5',
    worstRating: '1',
  },
  creator: {
    '@type': 'Organization',
    name: 'ExamForge AI',
    url: 'https://examforge.ai',
  },
}

// JSON-LD Structured Data — Organization
const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'ExamForge AI',
  url: 'https://examforge.ai',
  logo: 'https://examforge.ai/logo.png',
  description: 'The AI Operating System for Modern Schools. One platform to manage schools, run CBT exams, automate administration, analyze performance, and empower learning with AI.',
  foundingDate: '2023',
  founders: [{ '@type': 'Person', name: 'Austin Chima', jobTitle: 'Founder & CEO' }],
  sameAs: [
    'https://twitter.com/examforgeai',
    'https://linkedin.com/company/examforgeai',
    'https://github.com/examforgeai',
    'https://youtube.com/@examforgeai',
  ],
  contactPoint: [
    { '@type': 'ContactPoint', contactType: 'sales', email: 'hello@examforge.ai', availableLanguage: ['English'] },
    { '@type': 'ContactPoint', contactType: 'customer support', email: 'support@examforge.ai', availableLanguage: ['English'] },
  ],
  areaServed: [
    { '@type': 'Place', name: 'Nigeria' },
    { '@type': 'Place', name: 'Kenya' },
    { '@type': 'Place', name: 'Ghana' },
    { '@type': 'Place', name: 'South Africa' },
  ],
}

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="min-h-screen flex flex-col bg-[#090909]">
      {/* ── Skip Navigation Link (WCAG AA) ── */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-lg focus:bg-blue-500 focus:px-4 focus:py-2 focus:text-xs focus:font-medium focus:text-white focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:ring-offset-2 focus:ring-offset-[#090909] focus:transition-all focus:duration-200"
      >
        Skip to main content
      </a>

      {/* ── Structured Data ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />

      {/* ── Announcement Bar ── */}
      <AnnouncementBar />

      {/* ── Header / Navigation ── */}
      <header role="banner">
        <MarketingNav />
      </header>

      {/* ── Main Content ── */}
      <main id="main-content" role="main" className="flex-1" tabIndex={-1}>
        <MarketingProviders>
          {children}
        </MarketingProviders>
      </main>

      {/* ── Footer ── */}
      <footer role="contentinfo">
        <MarketingFooter />
      </footer>

      {/* ── Back to Top Button (WCAG AA) ── */}
      <BackToTopButton />
    </div>
  )
}
