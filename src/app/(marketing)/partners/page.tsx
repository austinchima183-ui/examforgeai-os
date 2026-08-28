import type { Metadata } from 'next'
import { resolveIcon } from '@/lib/design/icon-registry'
import Link from 'next/link'
import { Handshake, Users, Globe, DollarSign, GraduationCap, Award, ArrowRight , Sparkles} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GradientText } from '@/components/marketing/gradient-text'
import { SectionWrapper } from '@/components/marketing/section-wrapper'
import { CTASection } from '@/components/marketing/cta-section'
import { BreadcrumbJsonLd } from '@/components/marketing/breadcrumb-jsonld'

export const metadata: Metadata = {
  title: 'Partners',
  description:
    'Join the ExamForge AI partner program. Become a reseller, implementation partner, or technology partner and grow with us.',
}

// ============================================================================
// ExamForge AI — Partners Page
// ============================================================================

const partnerTypes = [
  {
    icon: 'dollar-sign',
    title: 'Reseller Partners',
    description:
      'Earn recurring revenue by introducing ExamForge AI to schools and institutions in your network. As a reseller partner, you receive comprehensive sales training, marketing collateral, and a generous commission structure that rewards you for every school you bring on board. Our reseller program is designed for education consultants, school suppliers, and IT service providers who already work with schools and want to add a world-class SaaS product to their portfolio.',
    benefits: [
      '20-30% recurring commission on all subscription revenue',
      'Dedicated partner account manager and sales support',
      'Co-branded marketing materials and landing pages',
      'Deal registration and pipeline protection',
      'Quarterly business reviews and performance bonuses',
    ],
  },
  {
    icon: 'graduation-cap',
    title: 'Implementation Partners',
    description:
      'Deliver ExamForge AI deployments for schools and institutions as a certified implementation partner. You will receive hands-on training on our platform, access to implementation playbooks, and certification that positions you as a trusted advisor for schools transitioning to digital assessment. This program is ideal for IT consulting firms, educational technology companies, and training organizations with deep expertise in school operations and change management.',
    benefits: [
      'Certified Implementation Partner credential',
      'Access to deployment playbooks and training materials',
      'Priority support channel for implementation issues',
      'Professional services fees for each deployment',
      'Inclusion in our partner directory for school referrals',
    ],
  },
  {
    icon: 'globe',
    title: 'Technology Partners',
    description:
      'Integrate your product with ExamForge AI and deliver joint value to the education market. Whether you build school management systems, learning management platforms, or student information systems, our technology partnership gives you access to our API, co-marketing opportunities, and joint go-to-market strategies. We are committed to building an open ecosystem where schools can choose best-of-breed tools that work seamlessly together.',
    benefits: [
      'Full API access and sandbox environment',
      'Joint product development and roadmap alignment',
      'Co-marketing campaigns and event sponsorships',
      'Integration certification and co-selling opportunities',
      'Featured placement in our integration marketplace',
    ],
  },
]

const benefits = [
  {
    icon: 'dollar-sign',
    title: 'Recurring Revenue',
    description:
      'Our partner program is built on a revenue-sharing model that rewards you for every school you bring on board. Earn 20-30% recurring commission for the lifetime of each customer relationship, with no caps on earnings.',
  },
  {
    icon: 'graduation-cap',
    title: 'Training & Certification',
    description:
      'Get certified on the ExamForge AI platform through our structured training program. From sales certification to technical implementation credentials, our training ensures you can represent and deploy our product with confidence.',
  },
  {
    icon: 'users',
    title: 'Dedicated Support',
    description:
      'Every partner receives a dedicated account manager who understands your business goals and helps you succeed. From deal support to technical escalations, your partner manager is your direct line to our team.',
  },
  {
    icon: 'globe',
    title: 'Co-Marketing Opportunities',
    description:
      'Leverage our marketing resources to amplify your reach. Co-branded campaigns, joint webinars, conference sponsorships, and shared content creation — we invest in marketing alongside our partners to grow together.',
  },
  {
    icon: 'award',
    title: 'Partner Directory Listing',
    description:
      'Get listed in our official partner directory, which is visited by thousands of school administrators every month. Schools looking for implementation support or local resellers can find and contact you directly through the directory.',
  },
  {
    icon: 'handshake',
    title: 'Early Product Access',
    description:
      'Partners get early access to new features, product roadmaps, and beta programs. This gives you a competitive edge — you can prepare your customers for upcoming capabilities and position yourself as a forward-thinking advisor.',
  },
]

export default function PartnersPage() {
  return (
    <div className="pt-16">
      <BreadcrumbJsonLd items={[{ name: 'Home', href: '/' }, { name: 'Company', href: '/partners' }, { name: 'Partners', href: '/partners' }]} />
      {/* Hero */}
      <SectionWrapper>
        <div className="text-center max-w-3xl mx-auto">
          <p className="text-sm font-medium text-primary uppercase tracking-wider mb-4">Partner Program</p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Grow your business with{' '}
            <GradientText preset="primary">ExamForge AI</GradientText>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            Join our partner program and unlock new revenue streams by bringing
            Africa&apos;s leading education technology platform to schools and
            institutions in your market. Whether you resell, implement, or build
            integrations, we have a partnership model that fits your business.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="h-12 px-8 text-base" asChild>
              <Link href="/contact">
                Apply to Become a Partner
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="h-12 px-8 text-base" asChild>
              <Link href="/contact">
                <Handshake className="mr-2 h-4 w-4" />
                Talk to Our Partner Team
              </Link>
            </Button>
          </div>
        </div>
      </SectionWrapper>

      {/* Partner Types */}
      <SectionWrapper backgroundClassName="bg-muted/30 border-y border-border/40">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Partner Types</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Choose the partnership model that aligns with your business. Each path
            is designed to deliver mutual value and long-term growth.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {partnerTypes.map((partner) => {
            const Icon = resolveIcon(partner.icon) ?? Sparkles
            return (
              <div
                key={partner.title}
                className="rounded-xl border-white/[0.06] bg-card/80 p-6 flex flex-col"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary mb-6">
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold tracking-tight mb-3">{partner.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  {partner.description}
                </p>
                <div className="mt-auto">
                  <h4 className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">
                    Key Benefits
                  </h4>
                  <ul className="space-y-2.5">
                    {partner.benefits.map((benefit) => (
                      <li key={benefit} className="flex items-start gap-2.5 text-sm">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                        <span className="text-muted-foreground">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )
          })}
        </div>
      </SectionWrapper>

      {/* Benefits */}
      <SectionWrapper>
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Why partner with{' '}
            <GradientText preset="primary">ExamForge AI?</GradientText>
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Our partner program is designed to be a genuine growth engine for your
            business — not just a logo on a page. Here is what sets us apart.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((benefit) => {
            const Icon = resolveIcon(benefit.icon) ?? Sparkles
            return (
              <div key={benefit.title} className="rounded-xl border-white/[0.06] bg-card/80 p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold mb-2">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{benefit.description}</p>
              </div>
            )
          })}
        </div>
      </SectionWrapper>

      {/* Become a Partner CTA */}
      <SectionWrapper backgroundClassName="bg-muted/30 border-y border-border/40">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-8 sm:p-10">
            <div className="text-center mb-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary mx-auto mb-4">
                <Handshake className="h-7 w-7" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Become a Partner
              </h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Ready to join the ExamForge AI partner ecosystem? Fill out the form below
                and our partner team will reach out within 48 hours to discuss the right
                partnership model for your business.
              </p>
            </div>

            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block" htmlFor="firstName">
                    First Name
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    className="w-full rounded-lg border-white/[0.06] bg-card/80 px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="Austin"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block" htmlFor="lastName">
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    className="w-full rounded-lg border-white/[0.06] bg-card/80 px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="Chima"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block" htmlFor="company">
                  Company Name
                </label>
                <input
                  id="company"
                  type="text"
                  className="w-full rounded-lg border-white/[0.06] bg-card/80 px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Your company or organization"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block" htmlFor="email">
                  Work Email
                </label>
                <input
                  id="email"
                  type="email"
                  className="w-full rounded-lg border-white/[0.06] bg-card/80 px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="austin@company.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block" htmlFor="partnerType">
                  Partnership Type
                </label>
                <select
                  id="partnerType"
                  className="w-full rounded-lg border-white/[0.06] bg-card/80 px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Select a partnership type</option>
                  <option value="reseller">Reseller Partner</option>
                  <option value="implementation">Implementation Partner</option>
                  <option value="technology">Technology Partner</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block" htmlFor="message">
                  Tell us about your business
                </label>
                <textarea
                  id="message"
                  rows={4}
                  className="w-full rounded-lg border-white/[0.06] bg-card/80 px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  placeholder="Describe your business, target market, and how you see a partnership with ExamForge AI working..."
                />
              </div>
              <Button size="lg" className="w-full h-12 text-base" asChild>
                <Link href="/contact">
                  Submit Application
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                We review all applications within 48 hours. There is no fee to apply.
              </p>
            </div>
          </div>
        </div>
      </SectionWrapper>

      <CTASection />
    </div>
  )
}
