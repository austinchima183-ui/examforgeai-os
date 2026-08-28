import type { Metadata } from 'next'
import { resolveIcon } from '@/lib/design/icon-registry'
import Link from 'next/link'
import { Cookie, Shield, Settings, Info, Globe , Sparkles} from 'lucide-react'
import { GradientText } from '@/components/marketing/gradient-text'
import { SectionWrapper } from '@/components/marketing/section-wrapper'
import { CTASection } from '@/components/marketing/cta-section'
import { BreadcrumbJsonLd } from '@/components/marketing/breadcrumb-jsonld'

// ============================================================================
// ExamForge AI — Cookie Policy Page
// ============================================================================

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description:
    'ExamForge AI Cookie Policy. Learn about the cookies we use, why we use them, and how to manage your preferences.',
}

const cookieTypes = [
  {
    icon: 'shield',
    title: 'Essential Cookies',
    description:
      'These cookies are strictly necessary for the platform to function. They enable core features such as authentication, session management, and security. You cannot opt out of essential cookies, as the platform cannot operate without them.',
    examples: [
      'Session authentication token — keeps you logged in as you navigate between pages',
      'CSRF protection token — prevents cross-site request forgery attacks on your account',
      'Load balancer cookie — ensures your requests are routed to the correct server during exams',
      'Cookie consent preference — remembers your cookie choices across visits',
    ],
    canDisable: false,
  },
  {
    icon: 'globe',
    title: 'Analytics Cookies',
    description:
      'Analytics cookies help us understand how educators and students interact with the platform. This data drives product improvements, identifies performance bottlenecks, and ensures we are building features that genuinely help schools. All analytics data is aggregated and anonymized.',
    examples: [
      'Page view tracking — identifies which features are most used and which need improvement',
      'Performance metrics — measures page load times and API response durations to optimize speed',
      'Error tracking — captures JavaScript errors so we can fix bugs before they affect your exams',
      'Feature usage — shows which AI tools and question types are most popular',
    ],
    canDisable: true,
  },
  {
    icon: 'settings',
    title: 'Functional Cookies',
    description:
      'Functional cookies remember your preferences and customization choices, providing a more personalized experience. They allow the platform to recall settings such as your preferred theme, language, and default exam configurations.',
    examples: [
      'Theme preference — remembers whether you selected light or dark mode',
      'Language selection — stores your preferred interface language for the CBT platform',
      'Dashboard layout — preserves your custom widget arrangement on the dashboard',
      'Exam defaults — remembers your preferred question count, duration, and difficulty settings',
    ],
    canDisable: true,
  },
  {
    icon: 'cookie',
    title: 'Marketing Cookies',
    description:
      'Marketing cookies are used to deliver relevant content and measure the effectiveness of our outreach. They help us understand which resources and features are most valuable to prospective schools so we can improve our communication and support.',
    examples: [
      'Campaign attribution — identifies which marketing channel brought you to ExamForge AI',
      'Content engagement — tracks which blog posts, guides, and case studies you find most useful',
      'Referral tracking — helps us credit partners and ambassadors who refer new schools',
      'A/B testing — allows us to test different messaging to find what resonates with educators',
    ],
    canDisable: true,
  },
]

const managementSteps = [
  {
    step: '1',
    title: 'Browser Settings',
    description:
      'Most browsers allow you to manage cookies through their settings panel. You can block all cookies, block only third-party cookies, or delete cookies after each session. Access your browser settings under Privacy or Security to configure these options.',
  },
  {
    step: '2',
    title: 'Cookie Consent Banner',
    description:
      'When you first visit ExamForge AI, a cookie consent banner allows you to accept or customize which categories of cookies you would like to enable. You can change your preferences at any time by clicking the cookie icon in the footer.',
  },
  {
    step: '3',
    title: 'Opt-Out Tools',
    description:
      'For analytics cookies, you can use the Google Analytics opt-out browser add-on or the Network Advertising Initiative opt-out page. These tools allow you to opt out of tracking across all websites that use these services.',
  },
  {
    step: '4',
    title: 'Do Not Track',
    description:
      'If your browser sends a Do Not Track (DNT) signal, we honor that preference by disabling non-essential cookies. Note that DNT is not universally supported across all browsers, so we recommend using the cookie consent banner for the most reliable control.',
  },
]

export default function CookiePolicyPage() {
  return (
    <div className="pt-16">
      <BreadcrumbJsonLd items={[{ name: 'Home', href: '/' }, { name: 'Legal', href: '/cookies' }, { name: 'Cookie Policy', href: '/cookies' }]} />
      {/* Hero */}
      <SectionWrapper>
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-6">
            <Cookie className="h-3.5 w-3.5" />
            <span>Cookie Policy</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            How we use{' '}
            <GradientText preset="primary">cookies</GradientText>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            We believe in transparency about data collection. This policy explains what cookies
            ExamForge AI uses, why we use them, and how you can control your preferences at any time.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Last updated: January 1, 2025
          </p>
        </div>
      </SectionWrapper>

      {/* What Are Cookies */}
      <SectionWrapper backgroundClassName="bg-muted/30 border-y border-border/40">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Info className="h-5 w-5" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">What Are Cookies?</h2>
          </div>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              Cookies are small text files that are stored on your device when you visit a website.
              They serve a variety of purposes: some are essential for the website to function,
              others help us understand how you use the platform so we can improve it, and some
              enable personalized features.
            </p>
            <p>
              Cookies can be &ldquo;first-party&rdquo; (set by ExamForge AI directly) or
              &ldquo;third-party&rdquo; (set by trusted partners such as analytics providers).
              They can also be &ldquo;session&rdquo; cookies (deleted when you close your browser)
              or &ldquo;persistent&rdquo; cookies (remain on your device for a set period or until
              you manually delete them).
            </p>
            <p>
              At ExamForge AI, we use cookies responsibly. We never sell cookie data to third parties,
              and we only set cookies that serve a clear, beneficial purpose for our users. Below is
              a detailed breakdown of every cookie category we use.
            </p>
          </div>
        </div>
      </SectionWrapper>

      {/* Types of Cookies */}
      <SectionWrapper>
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Types of Cookies We Use</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            We categorize our cookies into four groups. Each group has a distinct purpose and
            different controls available to you.
          </p>
        </div>
        <div className="max-w-4xl mx-auto space-y-8">
          {cookieTypes.map((type) => {
            const Icon = resolveIcon(type.icon) ?? Sparkles
            return (
              <div key={type.title} className="rounded-xl border border-border/50 bg-card/80 p-6 sm:p-8">
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">{type.title}</h3>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${type.canDisable ? 'bg-yellow-50 dark:bg-yellow-9500/10 text-yellow-600 dark:text-yellow-400' : 'bg-green-50 dark:bg-green-9500/10 text-green-600 dark:text-green-400'}`}>
                        {type.canDisable ? 'Optional' : 'Required'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{type.description}</p>
                  </div>
                </div>
                <div className="ml-15 sm:ml-16 mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Examples</p>
                  <ul className="space-y-2 animate-fade-in">
                    {type.examples.map((example, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/60 flex-shrink-0" />
                        <span className="text-muted-foreground leading-relaxed">{example}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )
          })}
        </div>
      </SectionWrapper>

      {/* How to Manage Cookies */}
      <SectionWrapper backgroundClassName="bg-muted/30 border-y border-border/40">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">How to Manage Your Cookies</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            You have full control over non-essential cookies. Here are the ways you can manage your
            preferences.
          </p>
        </div>
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {managementSteps.map((item) => (
            <div key={item.step} className="rounded-xl border border-border/50 bg-card/80 p-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm mb-4">
                {item.step}
              </div>
              <h3 className="text-base font-semibold mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* Third-Party Cookies */}
      <SectionWrapper>
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Globe className="h-5 w-5" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Third-Party Cookies</h2>
          </div>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              Some cookies on ExamForge AI are set by trusted third-party services that help us
              deliver and improve the platform. These partners have their own privacy policies
              governing how they collect and use data. We carefully vet each third-party service
              to ensure they meet our standards for data protection.
            </p>
            <p>
              Our current third-party cookie providers include:
            </p>
            <div className="rounded-xl border border-border/50 bg-card/80 p-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Google Analytics</span>
                <span className="text-xs text-muted-foreground">Analytics &amp; Performance</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Sentry</span>
                <span className="text-xs text-muted-foreground">Error Monitoring</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Flutterwave</span>
                <span className="text-xs text-muted-foreground">Payment Processing</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Vercel</span>
                <span className="text-xs text-muted-foreground">Hosting &amp; Performance</span>
              </div>
            </div>
            <p>
              We do not allow third-party advertising networks to set cookies on ExamForge AI.
              We never participate in cross-site tracking, retargeting, or data brokering of any kind.
            </p>
          </div>
        </div>
      </SectionWrapper>

      {/* Updates to Policy */}
      <SectionWrapper backgroundClassName="bg-muted/30 border-y border-border/40">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Shield className="h-5 w-5" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Updates to This Policy</h2>
          </div>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              We may update this Cookie Policy from time to time to reflect changes in technology,
              regulation, or our data practices. When we make material changes, we will notify you
              by updating the &ldquo;Last updated&rdquo; date at the top of this page and, where
              appropriate, displaying a prominent notice on the platform.
            </p>
            <p>
              We encourage you to review this policy periodically to stay informed about how we use
              cookies. Continued use of the platform after any changes constitutes your acceptance
              of the updated policy. If you do not agree with the changes, you may manage your
              cookie preferences or discontinue use of the platform.
            </p>
          </div>
        </div>
      </SectionWrapper>

      {/* Contact */}
      <SectionWrapper>
        <div className="max-w-3xl mx-auto text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary mx-auto mb-4">
            <Info className="h-5 w-5" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">Questions About Cookies?</h2>
          <p className="text-muted-foreground leading-relaxed mb-6">
            If you have any questions about our use of cookies or this Cookie Policy, please do not
            hesitate to contact us. We are committed to helping you understand and control your data.
          </p>
          <div className="rounded-xl border border-border/50 bg-card/80 p-6 inline-block">
            <p className="text-sm text-muted-foreground">
              Email us at{' '}
              <Link href="mailto:privacy@examforge.ai" className="text-primary font-medium hover:underline">
                privacy@examforge.ai
              </Link>
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Or visit our{' '}
              <Link href="/gdpr" className="text-primary font-medium hover:underline">
                GDPR compliance page
              </Link>{' '}
              for more information about data protection.
            </p>
          </div>
        </div>
      </SectionWrapper>

      <CTASection />
    </div>
  )
}
