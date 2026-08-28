import type { Metadata } from 'next'
import { resolveIcon } from '@/lib/design/icon-registry'
import Link from 'next/link'
import { Shield, CheckCircle2, FileText, Globe, UserCheck, Lock , Sparkles} from 'lucide-react'
import { GradientText } from '@/components/marketing/gradient-text'
import { SectionWrapper } from '@/components/marketing/section-wrapper'
import { CTASection } from '@/components/marketing/cta-section'
import { BreadcrumbJsonLd } from '@/components/marketing/breadcrumb-jsonld'

// ============================================================================
// ExamForge AI — GDPR Compliance Page
// ============================================================================

export const metadata: Metadata = {
  title: 'GDPR',
  description:
    'ExamForge AI GDPR compliance. Learn about our data processing practices, your rights under GDPR, and our commitment to data protection.',
}

const processingPurposes = [
  {
    purpose: 'Service Delivery',
    lawfulBasis: 'Contractual necessity (Art. 6(1)(b))',
    description:
      'We process your personal data to deliver the ExamForge AI platform, including exam creation, student management, CBT delivery, and analytics. Without this processing, we cannot provide the services you have subscribed to.',
    dataCategories: 'Account details, school information, exam content, student records',
  },
  {
    purpose: 'Platform Improvement',
    lawfulBasis: 'Legitimate interest (Art. 6(1)(f))',
    description:
      'We analyze usage patterns and performance data to improve the platform, fix bugs, and develop new features. Our legitimate interest is building a better product, and we always balance this against your privacy rights.',
    dataCategories: 'Usage analytics, error reports, feature interaction data',
  },
  {
    purpose: 'Security & Fraud Prevention',
    lawfulBasis: 'Legitimate interest (Art. 6(1)(f))',
    description:
      'We process data to protect the platform and our users from unauthorized access, cheating during exams, and fraudulent activity. This includes monitoring exam sessions and detecting anomalous behavior patterns.',
    dataCategories: 'Login records, IP addresses, device fingerprints, exam session logs',
  },
  {
    purpose: 'Communication',
    lawfulBasis: 'Consent (Art. 6(1)(a)) or Legitimate interest (Art. 6(1)(f))',
    description:
      'We send service-related communications (account updates, security alerts) as part of our contract. Marketing communications require your explicit consent, which you can withdraw at any time.',
    dataCategories: 'Email address, communication preferences, notification settings',
  },
  {
    purpose: 'Legal Compliance',
    lawfulBasis: 'Legal obligation (Art. 6(1)(c))',
    description:
      'We process data as required by applicable laws and regulations, including tax requirements, data retention obligations, and responses to lawful requests from public authorities.',
    dataCategories: 'Billing records, tax information, compliance documentation',
  },
]

const dataSubjectRights = [
  {
    icon: 'check-circle-2',
    title: 'Right of Access',
    article: 'Art. 15',
    description:
      'You have the right to obtain confirmation of whether we process your personal data and, if so, access to that data along with a copy. We provide a comprehensive data export tool in your account settings that allows you to download all your data at any time.',
  },
  {
    icon: 'user-check',
    title: 'Right to Rectification',
    article: 'Art. 16',
    description:
      'If your personal data is inaccurate or incomplete, you have the right to request correction. You can update most of your information directly through your account settings. For data that requires verification, our support team will process your request within 30 days.',
  },
  {
    icon: 'shield',
    title: 'Right to Erasure',
    article: 'Art. 17',
    description:
      'You can request the deletion of your personal data when it is no longer necessary for the purposes for which it was collected, when you withdraw consent, or when you object to processing. We will erase your data unless we are required to retain it by law or for legitimate legal claims.',
  },
  {
    icon: 'file-text',
    title: 'Right to Data Portability',
    article: 'Art. 20',
    description:
      'You have the right to receive your personal data in a structured, commonly used, and machine-readable format (such as JSON or CSV). You can also request that we transmit your data directly to another service provider where technically feasible.',
  },
  {
    icon: 'lock',
    title: 'Right to Restriction',
    article: 'Art. 18',
    description:
      'You can request that we restrict the processing of your personal data in certain circumstances: if you contest the accuracy of the data, if our processing is unlawful but you prefer restriction over erasure, or if you need the data for legal claims.',
  },
  {
    icon: 'globe',
    title: 'Right to Object',
    article: 'Art. 21',
    description:
      'You have the right to object to the processing of your personal data based on legitimate interest or for direct marketing purposes. When you object to processing for direct marketing, we will stop processing your data for that purpose immediately.',
  },
]

const subprocessors = [
  { name: 'Vercel Inc.', location: 'United States', purpose: 'Application hosting and deployment', dataTypes: 'Application code, deployment logs' },
  { name: 'Supabase Inc.', location: 'United States', purpose: 'Database hosting and authentication', dataTypes: 'User data, authentication tokens' },
  { name: 'Google LLC', location: 'United States', purpose: 'Analytics and cloud services', dataTypes: 'Aggregated usage data' },
  { name: 'Flutterwave Inc.', location: 'Nigeria', purpose: 'Payment processing', dataTypes: 'Billing information, transaction records' },
  { name: 'Sentry.io', location: 'United States', purpose: 'Error monitoring and performance tracking', dataTypes: 'Error logs, performance metrics' },
  { name: 'Amazon Web Services', location: 'United States / EU', purpose: 'File storage and CDN', dataTypes: 'Uploaded files, media assets' },
]

export default function GDPRPage() {
  return (
    <div className="pt-16">
      <BreadcrumbJsonLd items={[{ name: 'Home', href: '/' }, { name: 'Legal', href: '/gdpr' }, { name: 'GDPR', href: '/gdpr' }]} />
      {/* Hero */}
      <SectionWrapper>
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-6">
            <Shield className="h-3.5 w-3.5" />
            <span>GDPR Compliance</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Your data,{' '}
            <GradientText preset="primary">your rights</GradientText>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            ExamForge AI is fully committed to GDPR compliance. We process personal data
            lawfully, transparently, and only for specified purposes. This page outlines our
            data processing practices, your rights, and how we protect your information.
          </p>
        </div>
      </SectionWrapper>

      {/* Our Commitment */}
      <SectionWrapper backgroundClassName="bg-muted/30 border-y border-border/40">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Shield className="h-5 w-5" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Our Commitment to Data Protection</h2>
          </div>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              ExamForge AI handles sensitive educational data — student records, exam results,
              and institutional information. We treat this responsibility with the gravity it
              deserves. Our data protection practices are not merely about compliance; they
              reflect our core belief that educational data deserves the highest standard of care.
            </p>
            <p>
              We have implemented a comprehensive data protection program that includes:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                'Privacy-by-design in all product development',
                'Data minimization — we only collect what we need',
                'End-to-end encryption for data in transit and at rest',
                'Regular third-party security audits (SOC 2 Type II)',
                'Annual GDPR compliance training for all staff',
                'Documented data processing agreements with all partners',
                'Automated data retention and deletion policies',
                'Incident response plan with 72-hour breach notification',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionWrapper>

      {/* Data Processing */}
      <SectionWrapper>
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Data Processing Practices</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            We process personal data only under a valid lawful basis as defined by GDPR Article 6.
            Below is a detailed account of each processing purpose, the lawful basis relied upon,
            and the categories of data involved.
          </p>
        </div>
        <div className="max-w-4xl mx-auto space-y-6">
          {processingPurposes.map((item) => (
            <div key={item.purpose} className="rounded-xl border border-border/50 bg-card/80 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                <h3 className="text-lg font-semibold">{item.purpose}</h3>
                <span className="rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium whitespace-nowrap">
                  {item.lawfulBasis}
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">{item.description}</p>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Data Categories</p>
                <p className="text-sm text-muted-foreground">{item.dataCategories}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* Data Subject Rights */}
      <SectionWrapper backgroundClassName="bg-muted/30 border-y border-border/40">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Your Rights Under GDPR</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            GDPR grants you powerful rights over your personal data. We have built tools and
            processes to make exercising these rights as straightforward as possible.
          </p>
        </div>
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {dataSubjectRights.map((right) => {
            const Icon = resolveIcon(right.icon) ?? Sparkles
            return (
              <div key={right.title} className="rounded-xl border border-border/50 bg-card/80 p-6">
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold">{right.title}</h3>
                    <p className="text-xs text-primary font-medium">{right.article}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{right.description}</p>
              </div>
            )
          })}
        </div>
        <div className="max-w-3xl mx-auto mt-8 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
          <p className="text-sm text-muted-foreground leading-relaxed">
            To exercise any of these rights, email our Data Protection Officer at{' '}
            <Link href="mailto:dpo@examforge.ai" className="text-primary font-medium hover:underline">
              dpo@examforge.ai
            </Link>
            . We will respond to all requests within 30 days. There is no charge for exercising
            your rights, unless the request is manifestly unfounded or excessive.
          </p>
        </div>
      </SectionWrapper>

      {/* Data Processing Agreement */}
      <SectionWrapper>
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Data Processing Agreement</h2>
          </div>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              For schools and organizations that act as data controllers, we provide a
              comprehensive Data Processing Agreement (DPA) that meets the requirements of
              GDPR Article 28. Our DPA clearly defines the roles and responsibilities of both
              parties, the scope and duration of processing, and the technical and organizational
              measures we have implemented to protect your data.
            </p>
            <p>
              Key provisions of our DPA include:
            </p>
            <div className="rounded-xl border border-border/50 bg-card/80 p-6 space-y-3">
              {[
                'Clear delineation of controller and processor responsibilities',
                'Documented instructions for data processing activities',
                'Confidentiality obligations for all personnel with data access',
                'Subprocessor management with prior authorization requirements',
                'Technical and organizational security measures (Art. 32)',
                'Data breach notification within 72 hours of awareness',
                'Data return and deletion upon contract termination',
                'Audit rights for the data controller',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </div>
            <p>
              To request a signed DPA, please contact us at{' '}
              <Link href="mailto:legal@examforge.ai" className="text-primary font-medium hover:underline">
                legal@examforge.ai
              </Link>.
            </p>
          </div>
        </div>
      </SectionWrapper>

      {/* Subprocessors */}
      <SectionWrapper backgroundClassName="bg-muted/30 border-y border-border/40">
        <div className="max-w-3xl mx-auto mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Subprocessors</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            We engage the following subprocessors to process personal data on our behalf. Each
            subprocessor has been vetted for GDPR compliance and operates under a data processing
            agreement that provides equivalent levels of data protection.
          </p>
        </div>
        <div className="max-w-4xl mx-auto">
          <div className="rounded-xl border border-border/50 bg-card/80 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30">
                    <th className="text-left p-4 font-semibold">Subprocessor</th>
                    <th className="text-left p-4 font-semibold">Location</th>
                    <th className="text-left p-4 font-semibold">Purpose</th>
                    <th className="text-left p-4 font-semibold hidden sm:table-cell">Data Types</th>
                  </tr>
                </thead>
                <tbody>
                  {subprocessors.map((sp) => (
                    <tr key={sp.name} className="border-b border-border/30 last:border-0">
                      <td className="p-4 font-medium">{sp.name}</td>
                      <td className="p-4 text-muted-foreground">{sp.location}</td>
                      <td className="p-4 text-muted-foreground">{sp.purpose}</td>
                      <td className="p-4 text-muted-foreground hidden sm:table-cell">{sp.dataTypes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            We notify all customers at least 30 days before adding or replacing a subprocessor.
            You can object to a new subprocessor by contacting our DPO.
          </p>
        </div>
      </SectionWrapper>

      {/* International Transfers */}
      <SectionWrapper>
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Globe className="h-5 w-5" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">International Data Transfers</h2>
          </div>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              ExamForge AI operates across multiple jurisdictions, including Nigeria, Ghana, Kenya,
              South Africa, and the European Union. When personal data is transferred outside the
              EEA, we ensure appropriate safeguards are in place to maintain the level of data
              protection required by GDPR Chapter V.
            </p>
            <p>
              Our transfer mechanisms include:
            </p>
            <div className="rounded-xl border border-border/50 bg-card/80 p-6 space-y-3">
              {[
                'Standard Contractual Clauses (SCCs) adopted by the European Commission',
                'Adequacy decisions where applicable (e.g., countries recognized by the EU)',
                'Binding Corporate Rules for intra-group transfers',
                'Supplementary measures including encryption, pseudonymization, and access controls',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </div>
            <p>
              We continuously monitor developments in EU data transfer law, including decisions
              related to the EU-US Data Privacy Framework, and update our practices accordingly.
            </p>
          </div>
        </div>
      </SectionWrapper>

      {/* Data Protection Officer */}
      <SectionWrapper backgroundClassName="bg-muted/30 border-y border-border/40">
        <div className="max-w-3xl mx-auto text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary mx-auto mb-4">
            <Lock className="h-5 w-5" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">Data Protection Officer</h2>
          <p className="text-muted-foreground leading-relaxed mb-6">
            ExamForge AI has appointed a dedicated Data Protection Officer (DPO) who is responsible
            for overseeing our data protection strategy and ensuring compliance with GDPR and other
            applicable data protection laws. Our DPO operates independently and reports directly
            to senior management.
          </p>
          <div className="rounded-xl border border-border/50 bg-card/80 p-6 inline-block">
            <p className="text-sm text-muted-foreground">
              Contact our DPO at{' '}
              <Link href="mailto:dpo@examforge.ai" className="text-primary font-medium hover:underline">
                dpo@examforge.ai
              </Link>
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              For general privacy inquiries, visit our{' '}
              <Link href="/cookies" className="text-primary font-medium hover:underline">
                Cookie Policy
              </Link>{' '}
              or{' '}
              <Link href="/contact" className="text-primary font-medium hover:underline">
                Contact Us
              </Link>.
            </p>
          </div>
        </div>
      </SectionWrapper>

      <CTASection />
    </div>
  )
}
