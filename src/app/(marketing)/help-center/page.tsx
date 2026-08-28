import type { Metadata } from 'next'
import { resolveIcon } from '@/lib/design/icon-registry'
import Link from 'next/link'
import {
  HelpCircle, MessageCircle, BookOpen, CreditCard, Shield, Settings,
  Phone, Search, ArrowRight, CheckCircle2, Bot, MonitorPlay,
  Zap, Users, FileText, BarChart3, Clock, Mail, Wifi
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GradientText } from '@/components/marketing/gradient-text'
import { SectionWrapper } from '@/components/marketing/section-wrapper'
import { CTASection } from '@/components/marketing/cta-section'
import { BreadcrumbJsonLd } from '@/components/marketing/breadcrumb-jsonld'
import { FAQJsonLd } from '@/components/marketing/faq-jsonld'
import { OrganizationJsonLd } from '@/components/seo/organization-jsonld'
import { HowToJsonLd } from '@/components/seo/howto-jsonld'
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from '@/components/ui/accordion'
import { DocsBreadcrumbs } from '@/components/docs/docs-breadcrumbs'
import { DocsSearchBar } from '@/components/docs/docs-search-bar'
import { InteractiveWalkthrough } from '@/components/docs/interactive-walkthrough'
import { HelpRoleGuides } from '@/components/help/help-role-guides'
import { getCanonicalUrl, generateMetadata as genMeta } from '@/content/seo'

// ============================================================================
// ExamForge AI — Enhanced Help Center
// ============================================================================

export const metadata: Metadata = genMeta({
  title: 'Help Center — ExamForge AI',
  description:
    'Get help with ExamForge AI. Find answers to common questions, explore role-based guides, interactive walkthroughs, and contact our support team.',
  path: '/help-center',
})

// ─── Data ───

const helpCategories = [
  {
    icon: 'book-open',
    title: 'Getting Started',
    description: 'Set up your school, import students, and configure your first exam in under 30 minutes.',
    articles: 12,
    color: 'text-yellow-600 dark:text-yellow-400',
  },
  {
    icon: 'monitor-play',
    title: 'CBT Platform',
    description: 'Create, schedule, and deliver computer-based tests with AI-powered question generation and auto-marking.',
    articles: 24,
    color: 'text-primary',
  },
  {
    icon: 'bot',
    title: 'AI Features',
    description: 'Learn how to use AI question generation, predictive analytics, and the AI assistant for data analysis.',
    articles: 18,
    color: 'text-purple-600 dark:text-purple-400',
  },
  {
    icon: 'credit-card',
    title: 'Billing & Payments',
    description: 'Manage subscriptions, process payments, view invoices, and configure Flutterwave integration.',
    articles: 15,
    color: 'text-green-600 dark:text-green-400',
  },
  {
    icon: 'shield',
    title: 'Account & Security',
    description: 'Two-factor authentication, password management, role-based access control, and data protection.',
    articles: 10,
    color: 'text-destructive',
  },
  {
    icon: 'settings',
    title: 'Integrations',
    description: 'Connect ExamForge AI with your existing tools — Google Workspace, Microsoft 365, and custom APIs.',
    articles: 8,
    color: 'text-cyan-600 dark:text-cyan-400',
  },
]

const faqs = [
  {
    question: 'How do I create my first exam on ExamForge AI?',
    answer:
      'Navigate to the CBT module from your dashboard, click "Create Exam," and follow the guided wizard. You can manually add questions, import from a question bank, or use AI to generate questions from any topic. Specify the subject, duration, and class, then publish the exam. Students will see it immediately on their dashboard.',
  },
  {
    question: 'Can students take exams offline?',
    answer:
      'Yes. ExamForge AI supports offline exam delivery. Students can download the exam to their device before the scheduled time and take it without an internet connection. Answers are automatically synced when connectivity is restored. This feature is specifically designed for schools in areas with unreliable internet.',
  },
  {
    question: 'How does the AI question generation work?',
    answer:
      'Our AI engine analyzes the subject, curriculum standards, and difficulty level you specify, then generates questions that are pedagogically sound and aligned with your syllabus. You can generate multiple-choice, fill-in-the-blank, short answer, and essay questions. Each question comes with an answer key and explanation. You can review, edit, or regenerate any question before including it in your exam.',
  },
  {
    question: 'What anti-cheating measures are available during CBT exams?',
    answer:
      'ExamForge AI includes a comprehensive suite of anti-cheating tools: tab-switch detection and alerts, copy-paste prevention, random question ordering per student, webcam monitoring (optional), time-limited sessions with auto-submit, and a detailed audit log for each student session. School administrators can configure which measures to enable per exam.',
  },
  {
    question: 'How do I import existing student data into the platform?',
    answer:
      'You can import student data via CSV upload or manual entry. Navigate to the Students module, click "Import," and upload your CSV file. The system will automatically map columns and flag any errors before processing. You can also integrate with your existing student information system through our API.',
  },
  {
    question: 'What payment methods are supported?',
    answer:
      'We support payments through Flutterwave, which accepts bank transfers, card payments (Visa, Mastercard), mobile money, and USSD. Schools can also pay via direct bank transfer or wire transfer for annual subscriptions. All payment processing is PCI DSS compliant.',
  },
  {
    question: 'Can I customize the platform for my school\'s branding?',
    answer:
      'Yes. School administrators can customize the platform with their school logo, colors, and name. The CBT interface that students see during exams can be fully branded. You can also customize email templates, report headers, and the parent portal to match your school\'s identity.',
  },
  {
    question: 'How do I get a refund if I\'m not satisfied?',
    answer:
      'We offer a 14-day money-back guarantee for new subscriptions. If you are not satisfied within the first 14 days, contact our support team and we will process a full refund — no questions asked. For subsequent billing periods, we evaluate refund requests on a case-by-case basis and always aim to be fair.',
  },
  {
    question: 'Is my school data secure and compliant?',
    answer:
      'Absolutely. ExamForge AI is SOC 2 Type II certified and complies with GDPR and the Nigeria Data Protection Regulation (NDPR). All data is encrypted at rest with AES-256 and in transit with TLS 1.3. We perform regular penetration testing, and our infrastructure is hosted on ISO 27001-certified cloud providers.',
  },
  {
    question: 'How do I add or remove teacher accounts?',
    answer:
      'Navigate to Settings > User Management and click "Add User." Enter the teacher\'s details and assign the Teacher role. You can also bulk-import staff via CSV. To remove a teacher, find their profile, click the three-dot menu, and select "Deactivate." Deactivated users lose access immediately but their data (created exams, grades) is preserved.',
  },
]

const contactMethods = [
  {
    icon: 'message-circle',
    title: 'Live Chat',
    description: 'Chat with our support team in real-time during business hours (Mon-Fri, 8am-6pm WAT). Average response time is under 2 minutes.',
    action: 'Start a Chat',
    href: '/contact',
    available: true,
  },
  {
    icon: 'phone',
    title: 'Phone Support',
    description: 'Call our dedicated support line for urgent issues. Available for Pro and Enterprise plans during business hours.',
    action: 'View Phone Numbers',
    href: '/contact',
    available: true,
  },
  {
    icon: 'book-open',
    title: 'Documentation',
    description: 'Browse our comprehensive documentation with step-by-step guides, video tutorials, and API references.',
    action: 'Read the Docs',
    href: '/docs',
    available: true,
  },
  {
    icon: 'mail',
    title: 'Email Support',
    description: 'Send us a detailed message and we will respond within 24 hours. Include screenshots for faster resolution.',
    action: 'support@examforge.ai',
    href: 'mailto:support@examforge.ai',
    available: true,
  },
]

const walkthroughs = [
  {
    title: 'First Exam Setup',
    steps: [
      {
        title: 'Choose Your Subject',
        description: 'Select the subject and class for your exam. The platform automatically loads the curriculum standards and available question templates for your selection.',
      },
      {
        title: 'Add Questions',
        description: 'Add questions manually, import from your question bank, or use AI to generate curriculum-aligned questions. Mix and match question types: MCQ, short answer, essay, and fill-in-the-blank.',
      },
      {
        title: 'Configure Settings',
        description: 'Set exam duration, shuffle options, enable auto-marking, and configure anti-cheating measures like tab detection and copy-paste prevention.',
      },
      {
        title: 'Publish to Students',
        description: 'Review your exam, then publish it. Students will see it immediately on their dashboard. You can schedule it for a specific date or make it available immediately.',
      },
    ],
  },
  {
    title: 'Student Import',
    steps: [
      {
        title: 'Prepare Your CSV',
        description: 'Format your student data as a CSV file with columns for first name, last name, admission number, class, and optional fields like date of birth and gender.',
      },
      {
        title: 'Upload and Map Columns',
        description: 'Upload the CSV file. The platform auto-detects column headers and lets you manually map any unrecognized columns. Preview the data before importing.',
      },
      {
        title: 'Review and Confirm',
        description: 'The system validates all records and flags duplicates or errors. Review the summary, fix any issues, and confirm the import.',
      },
      {
        title: 'Accounts Created',
        description: 'Student accounts are created automatically with generated login credentials. You can print credentials or send them via email/SMS to parents.',
      },
    ],
  },
  {
    title: 'AI Question Generation',
    steps: [
      {
        title: 'Select Subject and Topic',
        description: 'Choose the subject area and specific topic. The AI supports WAEC, NECO, JAMB, and international curricula with syllabus-aligned content.',
      },
      {
        title: 'Configure Parameters',
        description: 'Set the number of questions, difficulty level, question type, and Bloom\'s taxonomy level. You can target specific cognitive levels from Knowledge to Evaluation.',
      },
      {
        title: 'Generate and Review',
        description: 'The AI generates questions with answer keys and explanations. Review each question, edit content, regenerate unsatisfactory items, and approve the ones you want.',
      },
      {
        title: 'Add to Question Bank',
        description: 'Approved questions are added to your school\'s question bank for reuse in future exams. Tag them by topic, difficulty, and curriculum standard for easy retrieval.',
      },
    ],
  },
  {
    title: 'Report Builder',
    steps: [
      {
        title: 'Choose Report Type',
        description: 'Select from templates: Student Performance, Class Summary, Attendance, Financial, or Exam Analysis. Or start from scratch with a custom report.',
      },
      {
        title: 'Set Parameters',
        description: 'Define the scope — class, term, session, date range. Add filters, groupings, and select the metrics to include in your report.',
      },
      {
        title: 'Preview and Customize',
        description: 'Preview the report with sample data. Customize layout, add school branding, choose chart types, and arrange sections to match your needs.',
      },
      {
        title: 'Generate and Share',
        description: 'Generate the report as PDF, CSV, or Excel. Schedule automatic generation and delivery via email to stakeholders on a recurring basis.',
      },
    ],
  },
]

export default function HelpCenterPage() {
  return (
    <div className="pt-16">
      {/* Structured Data */}
      <BreadcrumbJsonLd items={[{ name: 'Home', href: '/' }, { name: 'Resources', href: '/help-center' }, { name: 'Help Center', href: '/help-center' }]} />
      <FAQJsonLd items={faqs} />
      <OrganizationJsonLd />
      <HowToJsonLd
        name="Setting Up Your First Exam"
        description="Interactive walkthrough for creating your first CBT exam on ExamForge AI."
        steps={walkthroughs[0].steps.map((s) => ({ name: s.title, text: s.description }))}
      />

      {/* Hero */}
      <SectionWrapper>
        <div className="text-center max-w-3xl mx-auto">
          <DocsBreadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Resources', href: '/help-center' }, { label: 'Help Center', href: '/help-center' }]} />
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-6">
            <HelpCircle className="h-3.5 w-3.5" />
            <span>Help Center</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            How can we{' '}
            <GradientText preset="primary">help you?</GradientText>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            Find answers to common questions, explore detailed guides, or reach out to our
            support team. We are here to make sure you get the most out of ExamForge AI.
          </p>
          <div className="mt-8">
            <DocsSearchBar placeholder="Search help articles, FAQs, guides..." />
          </div>
        </div>
      </SectionWrapper>

      {/* Help Categories Grid */}
      <SectionWrapper backgroundClassName="bg-muted/30 border-y border-border/40">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Browse by <GradientText preset="cool">Category</GradientText>
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Select a topic below to find relevant articles, guides, and tutorials.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {helpCategories.map((category) => {
            const Icon = resolveIcon(category.icon) ?? Zap
            return (
              <Link
                key={category.title}
                href="/docs"
                className="group rounded-xl border-white/[0.06] bg-card/80 p-6 hover:border-primary/30 hover:shadow-md transition-all duration-200"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4 group-hover:bg-primary/15 transition-colors">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold mb-2 group-hover:text-primary transition-colors">{category.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">{category.description}</p>
                <span className="text-xs text-primary font-medium">{category.articles} articles</span>
              </Link>
            )
          })}
        </div>
      </SectionWrapper>

      {/* Role-Based Guides */}
      <SectionWrapper>
        <div className="text-center max-w-3xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Guides by <GradientText preset="primary">Role</GradientText>
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Find the most relevant help articles and quick links based on your role in the school. Whether you manage the platform, teach, learn, or monitor — we have you covered.
          </p>
        </div>
        <HelpRoleGuides />
      </SectionWrapper>

      {/* Interactive Walkthroughs */}
      <SectionWrapper backgroundClassName="bg-muted/30 border-y border-border/40">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-4">
            <Zap className="h-3.5 w-3.5" />
            <span>Interactive Walkthroughs</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Learn by <GradientText preset="warm">Doing</GradientText>
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Follow step-by-step interactive walkthroughs for the most common workflows. Each walkthrough guides you through the entire process with practical instructions.
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {walkthroughs.map((wt) => (
            <InteractiveWalkthrough
              key={wt.title}
              title={wt.title}
              steps={wt.steps}
            />
          ))}
        </div>
      </SectionWrapper>

      {/* FAQ with Accordion */}
      <SectionWrapper>
        <div className="text-center max-w-3xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Frequently Asked <GradientText preset="cool">Questions</GradientText>
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Quick answers to the questions we hear most often from educators and administrators.
          </p>
        </div>
        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-3 animate-fade-in">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="rounded-xl border-white/[0.06] bg-card/80 px-6 data-[state=open]:border-primary/20 data-[state=open]:shadow-sm transition-all duration-200"
              >
                <AccordionTrigger className="text-left text-sm font-semibold hover:no-underline">
                  <div className="flex items-start gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold">{i + 1}</span>
                    </div>
                    <span className="leading-snug">{faq.question}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="ml-10 text-sm text-muted-foreground leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </SectionWrapper>

      {/* Contact Support */}
      <SectionWrapper backgroundClassName="bg-muted/30 border-y border-border/40">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Contact <GradientText preset="primary">Support</GradientText>
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Could not find what you were looking for? Our support team is ready to help
            through multiple channels.
          </p>
        </div>
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-6">
          {contactMethods.map((method) => {
            const Icon = resolveIcon(method.icon) ?? Zap
            return (
              <div key={method.title} className="rounded-xl border-white/[0.06] bg-card/80 p-6 hover:border-primary/20 hover:shadow-sm transition-all duration-200">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold mb-2">{method.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{method.description}</p>
                <Link href={method.href} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                  {method.action}
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            )
          })}
        </div>
      </SectionWrapper>

      {/* System Status */}
      <SectionWrapper>
        <div className="max-w-3xl mx-auto">
          <div className="rounded-xl border-white/[0.06] bg-card/80 p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative flex h-4 w-4">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex h-4 w-4 rounded-full bg-green-50 dark:bg-green-9500" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">All Systems Operational</h3>
                  <p className="text-sm text-muted-foreground">
                    All ExamForge AI services are running normally. Last checked 2 minutes ago.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Wifi className="h-3 w-3 text-green-600 dark:text-green-400" />
                  99.9% Uptime
                </span>
                <Link
                  href="/status"
                  className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                >
                  View Status Page
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
            {/* Service indicators */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { name: 'API', status: 'Operational' },
                { name: 'CBT Engine', status: 'Operational' },
                { name: 'AI Service', status: 'Operational' },
                { name: 'Payments', status: 'Operational' },
              ].map((service) => (
                <div key={service.name} className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />
                  <span className="font-medium">{service.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionWrapper>

      <CTASection />
    </div>
  )
}
