import type { Metadata } from 'next'
import { resolveIcon } from '@/lib/design/icon-registry'
import Link from 'next/link'
import {
  Users, MessageCircle, Heart, Share2, Lightbulb, Calendar,
  Globe, Star, Code, GitBranch, BookOpen, Award,
  ExternalLink, MapPin, ArrowRight,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GradientText } from '@/components/marketing/gradient-text'
import { SectionWrapper } from '@/components/marketing/section-wrapper'
import { CTASection } from '@/components/marketing/cta-section'
import { BreadcrumbJsonLd } from '@/components/marketing/breadcrumb-jsonld'
import { OrganizationJsonLd } from '@/components/seo/organization-jsonld'
import { getCanonicalUrl, generateMetadata as genMeta } from '@/content/seo'

// ============================================================================
// ExamForge AI — Enhanced Community Page
// ============================================================================

export const metadata: Metadata = genMeta({
  title: 'Community — ExamForge AI',
  description:
    'Join the ExamForge AI community. Connect with educators and developers, share resources, contribute to open source, and help shape the future of education technology.',
  path: '/community',
})

// ─── Community Channels ───

const channels = [
  {
    icon: 'message-circle',
    title: 'GitHub Discussions',
    description: 'Ask questions, share integration patterns, and collaborate with the community. Maintainers and team members actively respond to help requests within 24 hours.',
    link: 'https://github.com/examforgeai/sdk-js/discussions',
    linkLabel: 'Join Discussions',
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-500/10',
    available: true,
  },
  {
    icon: 'message-circle',
    title: 'Discord',
    description: 'Real-time chat with developers and the ExamForge AI team. Get instant help with integration questions, share your projects, and stay updated on API changes.',
    link: '',
    linkLabel: 'Coming Soon',
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-500/10',
    available: false,
  },
  {
    icon: 'globe',
    title: 'Stack Overflow',
    description: 'Find answers to technical questions tagged [examforge-ai]. Our developer relations team monitors the tag and ensures questions get quality answers.',
    link: 'https://stackoverflow.com/questions/tagged/examforge-ai',
    linkLabel: 'Ask a Question',
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-500/10',
    available: true,
  },
  {
    icon: 'share-2',
    title: 'Twitter / X',
    description: 'Follow @examforgeai for product announcements, feature previews, EdTech insights, and community highlights. Engage with our growing community of educators.',
    link: 'https://twitter.com/examforgeai',
    linkLabel: 'Follow Us',
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-500/10',
    available: true,
  },
]

// ─── Open Source Projects ───

const openSourceProjects = [
  {
    name: '@examforge/sdk',
    description: 'Official JavaScript/TypeScript SDK with full type definitions and auto-pagination',
    language: 'TypeScript',
    stars: '1.2k',
    url: 'https://github.com/examforgeai/sdk-js',
  },
  {
    name: 'examforge-python',
    description: 'Official Python SDK with async support and Pandas integration for analytics',
    language: 'Python',
    stars: '890',
    url: 'https://github.com/examforgeai/sdk-python',
  },
  {
    name: 'examforge-examples',
    description: 'Complete working example apps — Next.js dashboard, Flask webhook handler, and more',
    language: 'TypeScript',
    stars: '340',
    url: 'https://github.com/examforgeai/examples',
  },
  {
    name: 'examforge-ai-utils',
    description: 'Community-maintained utility library with question validators, curriculum parsers, and report generators',
    language: 'TypeScript',
    stars: '156',
    url: 'https://github.com/examforgeai/utils',
  },
]

// ─── Contributing Guidelines ───

const contributingSteps = [
  {
    step: 1,
    title: 'Find an Issue',
    description: 'Browse open issues labeled "good first issue" or "help wanted" on our GitHub repositories. These are great entry points for new contributors.',
  },
  {
    step: 2,
    title: 'Fork & Branch',
    description: 'Fork the repository and create a feature branch from main. Use a descriptive branch name like "feat/add-question-filter" or "fix/timer-pause".',
  },
  {
    step: 3,
    title: 'Write Code & Tests',
    description: 'Implement your changes following our code style guide. Add tests for new functionality and ensure all existing tests pass.',
  },
  {
    step: 4,
    title: 'Submit a Pull Request',
    description: 'Push your branch and open a PR against main. Include a clear description, link to the issue, and screenshots for UI changes. Our team reviews PRs within 48 hours.',
  },
]

// ─── Events ───

const events = [
  {
    title: 'API Office Hours',
    schedule: 'Every Wednesday, 2:00 PM WAT',
    description: 'Live Q&A session with our developer relations team. Get help with integration challenges, API questions, and SDK usage in real-time.',
    type: 'Weekly',
  },
  {
    title: 'EdTech Hackathon',
    schedule: 'March 15–16, 2026',
    description: '48-hour hackathon to build innovative education tools on the ExamForge AI platform. $10,000 in prizes for the best integrations and applications.',
    type: 'Special Event',
  },
  {
    title: 'Community Demo Day',
    schedule: 'Last Friday of each month',
    description: 'Showcase your ExamForge AI integration or project to the community. Get feedback, find collaborators, and inspire others with your work.',
    type: 'Monthly',
  },
  {
    title: 'Product Roadmap Preview',
    schedule: 'First Thursday of each quarter',
    description: 'Get an exclusive preview of upcoming features and API changes. Provide feedback that directly influences our product direction.',
    type: 'Quarterly',
  },
]

// ─── Developer Spotlight ───

const spotlights = [
  {
    name: 'Adebayo Adeyemi',
    role: 'CTO, Lagos Prep Academy',
    quote: 'I built a custom parent notification system using the ExamForge AI webhook API and WhatsApp Business API. Parents now get real-time exam results — it took me two weekends.',
    avatar: 'AA',
  },
  {
    name: 'Fatima Abdullahi',
    role: 'Full-Stack Developer, Kano',
    quote: 'The TypeScript SDK is incredibly well-typed. I integrated exam scheduling into our school portal in a single afternoon. The auto-pagination and error handling saved me hours.',
    avatar: 'FA',
  },
  {
    name: 'Emmanuel Okonkwo',
    role: 'Data Scientist, University of Ibadan',
    quote: 'Using the Python SDK with Pandas, I built predictive models for student retention that reduced our dropout rate by 18%. The analytics API makes data access seamless.',
    avatar: 'EO',
  },
]

export default function CommunityPage() {
  return (
    <div className="pt-16 bg-[#090909]">
      {/* Structured Data */}
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', href: '/' },
          { name: 'Resources', href: '/community' },
          { name: 'Community', href: '/community' },
        ]}
      />
      <OrganizationJsonLd />

      {/* Hero */}
      <SectionWrapper>
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-6">
            <Users className="h-3.5 w-3.5" />
            <span>Community</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Join the{' '}
            <GradientText preset="primary">ExamForge AI Community</GradientText>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            Connect with educators, developers, and school administrators across Africa
            and beyond. Share resources, ask questions, contribute to open source, and
            help shape the future of education technology.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4 text-primary" />
              12,000+ Educators
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MessageCircle className="h-4 w-4 text-primary" />
              3,400+ Discussions
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-primary" />
              28 Countries
            </span>
          </div>
        </div>
      </SectionWrapper>

      {/* Community Channels */}
      <SectionWrapper backgroundClassName="bg-[#0C0C0C] border-y border-white/[0.04]">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Community <GradientText preset="cool">Channels</GradientText>
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Choose your preferred way to connect. Our team is active across all channels
            to help you succeed.
          </p>
        </div>
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {channels.map((channel) => {
            const Icon = resolveIcon(channel.icon) ?? Sparkles
            return (
              <div key={channel.title} className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-6 hover:-translate-y-0.5 hover:border-white/[0.06] transition-all duration-200 flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${channel.bg} flex-shrink-0`}>
                    <Icon className={`h-5 w-5 ${channel.color}`} />
                  </div>
                  <h3 className="text-base font-semibold">{channel.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1">
                  {channel.description}
                </p>
                {channel.available ? (
                  <Button variant="outline" size="sm" asChild>
                    <a href={channel.link} target="_blank" rel="noopener noreferrer">
                      {channel.linkLabel}
                      <ExternalLink className="ml-1.5 h-3 w-3" />
                    </a>
                  </Button>
                ) : (
                  <Badge variant="secondary" className="w-fit text-xs">Coming Soon</Badge>
                )}
              </div>
            )
          })}
        </div>
      </SectionWrapper>

      {/* Open Source Projects */}
      <SectionWrapper>
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Open <GradientText preset="warm">Source</GradientText>
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Our SDKs, example applications, and utilities are open source. Explore, contribute,
            and customize for your institution.
          </p>
        </div>
        <div className="max-w-4xl mx-auto space-y-4">
          {openSourceProjects.map((project) => (
            <a
              key={project.name}
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-4 forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-5 hover:-translate-y-0.5 hover:border-white/[0.06] transition-all duration-200 group"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1D1D1D] text-foreground">
                  <GitBranch className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold font-mono group-hover:text-primary transition-colors">{project.name}</p>
                  <p className="text-xs text-muted-foreground">{project.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0">
                <span className="hidden sm:inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  {project.language}
                </span>
                <span className="inline-flex items-center gap-1">
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                  {project.stars}
                </span>
              </div>
            </a>
          ))}
        </div>
      </SectionWrapper>

      {/* Contributing Guidelines */}
      <SectionWrapper backgroundClassName="bg-[#0C0C0C] border-y border-white/[0.04]">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Contributing <GradientText preset="primary">Guidelines</GradientText>
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            We welcome contributions from everyone — whether it is code, documentation,
            bug reports, or feature suggestions. Here is how to get started.
          </p>
        </div>
        <div className="max-w-3xl mx-auto space-y-6">
          {contributingSteps.map((item) => (
            <div key={item.step} className="flex gap-4 sm:gap-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold flex-shrink-0">
                {item.step}
              </div>
              <div>
                <h3 className="text-base font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
          <div className="mt-6 p-4 rounded-lg border border-primary/20 bg-primary/5">
            <div className="flex items-start gap-3">
              <BookOpen className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Full contributing guide:</strong> Read our{' '}
                <a
                  href="https://github.com/examforgeai/sdk-js/blob/main/CONTRIBUTING.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary font-medium hover:underline"
                >
                  CONTRIBUTING.md
                </a>{' '}
                for detailed setup instructions, code style guidelines, and PR review process.
              </p>
            </div>
          </div>
        </div>
      </SectionWrapper>

      {/* Community Events & Office Hours */}
      <SectionWrapper>
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Events & <GradientText preset="cool">Office Hours</GradientText>
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Learn, share, and connect with the team and community at our regular events.
          </p>
        </div>
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {events.map((event) => (
            <div key={event.title} className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-6 hover:-translate-y-0.5 hover:border-white/[0.06] transition-all duration-200">
              <div className="flex items-center justify-between gap-2 mb-3">
                <Badge variant="outline" className="text-xs">{event.type}</Badge>
              </div>
              <h3 className="text-base font-semibold mb-1">{event.title}</h3>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                <Calendar className="h-3 w-3" />
                <span>{event.schedule}</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{event.description}</p>
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* Developer Spotlight */}
      <SectionWrapper backgroundClassName="bg-[#0C0C0C] border-y border-white/[0.04]">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Developer <GradientText preset="warm">Spotlight</GradientText>
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Hear from developers who are building amazing things on the ExamForge AI platform.
          </p>
        </div>
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {spotlights.map((person) => (
            <div key={person.name} className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm mb-4">
                {person.avatar}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4 italic">
                &ldquo;{person.quote}&rdquo;
              </p>
              <div>
                <p className="text-sm font-semibold">{person.name}</p>
                <p className="text-xs text-muted-foreground">{person.role}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* Community Guidelines */}
      <SectionWrapper>
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Community Guidelines</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            These guidelines help us maintain a welcoming, productive, and safe environment
            for all members.
          </p>
        </div>
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { icon: 'heart', title: 'Be Respectful', description: 'Treat every community member with respect and professionalism. Disagreements are natural, but personal attacks, harassment, and discriminatory language are never acceptable.' },
            { icon: 'star', title: 'Share Quality Content', description: 'Ensure shared resources are accurate, relevant, and aligned with curriculum standards. Provide clear descriptions and proper attribution.' },
            { icon: 'users', title: 'Help Others Grow', description: 'If you see a question you can answer, jump in. Share your experience, offer constructive feedback, and celebrate others\' successes.' },
            { icon: 'globe', title: 'Stay On Topic', description: 'Keep discussions relevant to education technology and ExamForge AI. Use the appropriate channel or category so others can find it easily.' },
          ].map((guideline) => {
            const Icon = resolveIcon(guideline.icon) ?? Sparkles
            return (
              <div key={guideline.title} className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-6">
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-semibold mt-1.5">{guideline.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed ml-13">{guideline.description}</p>
              </div>
            )
          })}
        </div>
        <div className="max-w-3xl mx-auto mt-8 forge-glass-surface border-primary/20 rounded-xl p-6 text-center">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Violations may result in content removal, temporary suspension, or permanent ban.
            Report violations to{' '}
            <Link href="mailto:community@examforge.ai" className="text-primary font-medium hover:underline">
              community@examforge.ai
            </Link>.
          </p>
        </div>
      </SectionWrapper>

      <CTASection />
    </div>
  )
}
