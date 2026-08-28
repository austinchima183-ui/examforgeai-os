import type { Metadata } from 'next'
import { resolveIcon } from '@/lib/design/icon-registry'
import Link from 'next/link'
import { Download, FileImage, Palette, FileText, Globe, Mail, BookOpen , Sparkles} from 'lucide-react'
import { GradientText } from '@/components/marketing/gradient-text'
import { SectionWrapper } from '@/components/marketing/section-wrapper'
import { CTASection } from '@/components/marketing/cta-section'
import { BreadcrumbJsonLd } from '@/components/marketing/breadcrumb-jsonld'

// ============================================================================
// ExamForge AI — Press Kit Page
// ============================================================================

export const metadata: Metadata = {
  title: 'Press Kit',
  description:
    'ExamForge AI press resources. Download logos, brand assets, screenshots, and fact sheets for media coverage.',
}

const brandAssets = [
  {
    icon: 'file-image',
    title: 'Logo Downloads',
    description:
      'Our logo is available in multiple formats and variations for both digital and print use. Download the full brand pack including SVG, PNG (transparent and with backgrounds), and EPS versions for all use cases.',
    variants: [
      { name: 'Primary Logo (Dark)', format: 'SVG / PNG', bg: 'bg-white border-white/[0.06]' },
      { name: 'Primary Logo (Light)', format: 'SVG / PNG', bg: 'bg-gray-900' },
      { name: 'Icon Mark Only', format: 'SVG / PNG', bg: 'bg-white border-white/[0.06]' },
      { name: 'Horizontal Layout', format: 'SVG / PNG', bg: 'bg-white border-white/[0.06]' },
    ],
  },
  {
    icon: 'palette',
    title: 'Color Palette',
    description:
      'Our brand colors are designed to convey trust, innovation, and accessibility. The primary palette centers on indigo, representing intelligence and technology, while supporting colors add warmth and energy.',
    colors: [
      { name: 'Primary Indigo', hex: '#6366F1', className: 'bg-indigo-500' },
      { name: 'Purple Accent', hex: '#A855F7', className: 'bg-purple-500' },
      { name: 'Emerald Success', hex: '#10B981', className: 'bg-green-50 dark:bg-green-9500' },
      { name: 'Amber Warning', hex: '#F59E0B', className: 'bg-yellow-50 dark:bg-yellow-9500' },
      { name: 'Slate Dark', hex: '#1E293B', className: 'bg-slate-800' },
      { name: 'Light Background', hex: '#F8FAFC', className: 'bg-slate-50 border-white/[0.06]' },
    ],
  },
  {
    icon: 'book-open',
    title: 'Typography',
    description:
      'We use Inter as our primary typeface for digital interfaces and marketing materials. It is a highly legible, open-source sans-serif typeface designed specifically for screen readability. For headings and display text, we use Inter with tight tracking and bold weights.',
    details: [
      'Headings: Inter Bold (700) and Semibold (600), tight tracking',
      'Body text: Inter Regular (400) and Medium (500), normal tracking',
      'Minimum body size: 14px for digital, 10pt for print',
      'Line height: 1.5 for body text, 1.2 for headings',
    ],
  },
]

const factSheet = [
  { label: 'Company', value: 'ExamForge AI' },
  { label: 'Founded', value: '2023' },
  { label: 'Headquarters', value: 'Lagos, Nigeria' },
  { label: 'Founder & CEO', value: 'Austin Chima' },
  { label: 'Team Size', value: '45+ employees' },
  { label: 'Schools Served', value: '500+' },
  { label: 'Students Reached', value: '120K+' },
  { label: 'Markets', value: 'Nigeria, Ghana, Kenya, South Africa' },
  { label: 'Funding', value: 'Series A ($2.5M)' },
  { label: 'Product', value: 'AI-powered school management & CBT platform' },
]

const pressReleases = [
  {
    date: 'July 28, 2026',
    title: 'ExamForge AI Launches AI Question Generation v2 with 3x Faster Performance',
    excerpt:
      'The latest update to ExamForge AI\'s question generation engine delivers significantly faster response times and improved accuracy, enabling teachers to create comprehensive exams in minutes rather than hours. The new engine supports 12 additional question types and curriculum standards across four African countries.',
    category: 'Product',
  },
  {
    date: 'July 14, 2026',
    title: 'ExamForge AI Marketplace Opens to Educators Across Africa',
    excerpt:
      'The new ExamForge AI Marketplace allows educators to browse, share, and download exam templates and question banks. Over 8,500 resources are available at launch, covering subjects from mathematics to civic education. Top contributors can earn revenue through premium resource sales.',
    category: 'Launch',
  },
  {
    date: 'June 30, 2026',
    title: 'ExamForge AI 3.0 Introduces Complete Platform Redesign and AI Assistant',
    excerpt:
      'ExamForge AI 3.0 marks the most significant update in the company\'s history, featuring a complete UI redesign, dark mode support, an AI-powered natural language assistant, and real-time collaboration tools. The update also achieves SOC 2 Type II certification, underscoring the company\'s commitment to data security.',
    category: 'Major Release',
  },
]

export default function PressKitPage() {
  return (
    <div className="pt-16">
      <BreadcrumbJsonLd items={[{ name: 'Home', href: '/' }, { name: 'Company', href: '/press-kit' }, { name: 'Press Kit', href: '/press-kit' }]} />
      {/* Hero */}
      <SectionWrapper>
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-6">
            <Download className="h-3.5 w-3.5" />
            <span>Press Kit</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Press &{' '}
            <GradientText preset="primary">media resources</GradientText>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            Everything you need to write about ExamForge AI. Download logos, brand assets,
            screenshots, and fact sheets. If you need something not listed here, please
            contact our media team.
          </p>
        </div>
      </SectionWrapper>

      {/* Brand Assets */}
      <SectionWrapper backgroundClassName="bg-muted/30 border-y border-border/40">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Brand Assets</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Our brand assets are available for editorial and media use. Please follow the
            usage guidelines provided in the brand pack.
          </p>
        </div>
        <div className="max-w-4xl mx-auto space-y-8">
          {brandAssets.map((asset) => {
            const Icon = resolveIcon(asset.icon) ?? Sparkles
            return (
              <div key={asset.title} className="rounded-xl border-white/[0.06] bg-card/80 p-6 sm:p-8">
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{asset.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{asset.description}</p>
                  </div>
                </div>

                {/* Logo Variants */}
                {asset.variants && (
                  <div className="mt-4 ml-15 sm:ml-16 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {asset.variants.map((variant) => (
                      <div key={variant.name} className={`rounded-lg p-4 flex flex-col items-center justify-center h-20 ${variant.bg}`}>
                        <span className="text-xs font-medium text-center text-slate-700">{variant.name}</span>
                        <span className="text-[10px] text-slate-500 mt-1">{variant.format}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Color Palette */}
                {asset.colors && (
                  <div className="mt-4 ml-15 sm:ml-16 grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {asset.colors.map((color) => (
                      <div key={color.name} className="text-center">
                        <div className={`h-12 rounded-lg ${color.className} mb-2`} />
                        <p className="text-xs font-medium">{color.name}</p>
                        <p className="text-[10px] text-muted-foreground">{color.hex}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Typography Details */}
                {asset.details && (
                  <div className="mt-4 ml-15 sm:ml-16 space-y-2">
                    {asset.details.map((detail, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-sm">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/60 flex-shrink-0" />
                        <span className="text-muted-foreground">{detail}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 ml-15 sm:ml-16">
                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                  >
                    <Download className="h-4 w-4" />
                    Download {asset.title} Pack
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </SectionWrapper>

      {/* Fact Sheet */}
      <SectionWrapper>
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Fact Sheet</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Key facts and figures about ExamForge AI for quick reference in your coverage.
          </p>
        </div>
        <div className="max-w-3xl mx-auto">
          <div className="rounded-xl border-white/[0.06] bg-card/80 overflow-hidden">
            <div className="divide-y divide-border/50">
              {factSheet.map((item) => (
                <div key={item.label} className="flex items-center justify-between px-6 py-4">
                  <span className="text-sm font-medium text-muted-foreground">{item.label}</span>
                  <span className="text-sm font-semibold">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionWrapper>

      {/* Press Releases */}
      <SectionWrapper backgroundClassName="bg-muted/30 border-y border-border/40">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Press Releases</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Recent announcements from ExamForge AI.
          </p>
        </div>
        <div className="max-w-3xl mx-auto space-y-6">
          {pressReleases.map((release) => (
            <div key={release.title} className="rounded-xl border-white/[0.06] bg-card/80 p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium">
                  {release.category}
                </span>
                <span className="text-xs text-muted-foreground">{release.date}</span>
              </div>
              <h3 className="text-base font-semibold mb-2">{release.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{release.excerpt}</p>
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* Media Contact */}
      <SectionWrapper>
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Mail className="h-5 w-5" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Media Contact</h2>
          </div>
          <div className="rounded-xl border-white/[0.06] bg-card/80 p-6 sm:p-8">
            <div className="space-y-4 animate-fade-in">
              <p className="text-muted-foreground leading-relaxed">
                For press inquiries, interview requests, and media partnerships, please
                contact our communications team. We typically respond within 24 hours on
                business days.
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm">
                    Press email:{' '}
                    <Link href="mailto:press@examforge.ai" className="text-primary font-medium hover:underline">
                      press@examforge.ai
                    </Link>
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm">
                    For general inquiries:{' '}
                    <Link href="mailto:info@examforge.ai" className="text-primary font-medium hover:underline">
                      info@examforge.ai
                    </Link>
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Please note that the press kit assets are intended for editorial and media use only.
                Commercial use of our brand assets requires prior written permission. Contact our
                legal team at legal@examforge.ai for commercial licensing inquiries.
              </p>
            </div>
          </div>
        </div>
      </SectionWrapper>

      <CTASection />
    </div>
  )
}
