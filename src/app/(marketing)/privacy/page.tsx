import type { Metadata } from 'next'
import { resolveIcon } from '@/lib/design/icon-registry'
import Link from 'next/link'
import { Shield, Lock, Eye, FileText, Globe, UserCheck , Sparkles} from 'lucide-react'
import { GradientText } from '@/components/marketing/gradient-text'
import { SectionWrapper } from '@/components/marketing/section-wrapper'
import { CTASection } from '@/components/marketing/cta-section'
import { BreadcrumbJsonLd } from '@/components/marketing/breadcrumb-jsonld'

// ============================================================================
// ExamForge AI — Privacy Policy Page
// ============================================================================

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'ExamForge AI Privacy Policy. Learn how we collect, use, and protect your personal data and student information.',
}

const policySections = [
  {
    id: 'introduction',
    icon: 'shield',
    title: '1. Introduction',
    content: [
      'ExamForge AI ("we", "our", "us") is committed to protecting the privacy and personal data of all users of our platform, including students, teachers, school administrators, parents, and other individuals who interact with our services. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform at examforge.ai and any associated subdomains, mobile applications, and services (collectively, the "Services").',
      'We recognise that educational institutions process some of the most sensitive categories of personal data, including information relating to minors. We take this responsibility with the utmost seriousness and have designed our data processing practices to comply with the Nigeria Data Protection Regulation (NDPR), the General Data Protection Regulation (GDPR), and other applicable data protection laws.',
      'By accessing or using our Services, you agree to the collection and use of information in accordance with this Privacy Policy. If you do not agree with the terms of this Privacy Policy, you should not access or use our Services.',
    ],
  },
  {
    id: 'data-we-collect',
    icon: 'eye',
    title: '2. Data We Collect',
    content: [
      'We collect and process the following categories of personal data in order to provide and improve our Services:',
    ],
    subsections: [
      {
        title: 'Account Information',
        description:
          'When you create an account, we collect your full name, email address, phone number, password (stored as a cryptographic hash), role designation (student, teacher, administrator, parent), and the name and address of your educational institution. For school administrator accounts, we may also collect verification documents such as staff identification or letters of authorisation.',
      },
      {
        title: 'Student Data',
        description:
          'In the course of providing our Services, we process student information including academic records, examination results, attendance data, class enrolment, and performance analytics. This data is entered by authorised school personnel or generated through the use of our examination and assessment features. We act as a data processor on behalf of the educational institution, which acts as the data controller for student data.',
      },
      {
        title: 'Usage Data',
        description:
          'We automatically collect information about how you interact with our Services, including log data (IP address, browser type, operating system, referring URLs), device information (device type, unique device identifiers, screen resolution), interaction data (pages visited, features used, time spent, click patterns), and session data (login times, duration of sessions, logout events). This data is collected through cookies, similar technologies, and server logs.',
      },
      {
        title: 'Examination Data',
        description:
          'We collect and process data related to examinations created and administered through our platform, including exam questions, answer responses, grading results, time stamps, and proctoring data. Examination content is owned by the creating institution and is not used by ExamForge AI for any purpose other than providing the Services.',
      },
      {
        title: 'Payment Information',
        description:
          'When you make a purchase, we collect billing information including the name on the account, billing address, and transaction details. Credit card numbers and other sensitive payment data are processed directly by our payment service provider (Flutterwave) and are never stored on our servers. We retain only a tokenised reference and the last four digits of the card for receipt purposes.',
      },
      {
        title: 'Communication Data',
        description:
          'We collect and store the content of communications you send to us, including support requests, feedback, and correspondence. If you contact our support team, we may retain the content of your messages, your email address, and any attachments you provide for the purpose of resolving your inquiry and improving our Services.',
      },
    ],
  },
  {
    id: 'how-we-use-data',
    icon: 'user-check',
    title: '3. How We Use Data',
    content: [
      'We use the personal data we collect for the following purposes, each supported by a lawful basis for processing under applicable data protection legislation:',
    ],
    subsections: [
      {
        title: 'Service Delivery',
        description:
          'To provide, maintain, and improve our Services, including creating and managing user accounts, delivering examinations, computing results, generating analytics and reports, and facilitating communication between users and their institutions. This processing is necessary for the performance of our contract with you.',
      },
      {
        title: 'Platform Improvement',
        description:
          'To analyse usage patterns, identify bugs, and improve the functionality, performance, and user experience of our platform. We use aggregated and anonymised data for these purposes wherever possible. This processing is based on our legitimate interest in improving our Services.',
      },
      {
        title: 'Security and Fraud Prevention',
        description:
          'To detect, prevent, and address security issues, fraud, and other illegal activities. This includes monitoring for unauthorised access, detecting suspicious account activity, and protecting against examination malpractice. This processing is based on our legitimate interest in maintaining the security and integrity of our platform.',
      },
      {
        title: 'Compliance',
        description:
          'To comply with applicable laws, regulations, legal processes, or enforceable governmental requests. This includes retaining records as required by education regulations and responding to lawful data requests from regulatory authorities. This processing is necessary for compliance with our legal obligations.',
      },
      {
        title: 'Communication',
        description:
          'To send you service-related communications, such as account verification emails, security alerts, and important updates about our Services. With your consent, we may also send marketing communications about new features, events, and offers. You may opt out of marketing communications at any time.',
      },
    ],
  },
  {
    id: 'data-sharing',
    icon: 'globe',
    title: '4. Data Sharing',
    content: [
      'We do not sell, rent, or trade your personal data to third parties. We share your data only in the following limited circumstances:',
    ],
    subsections: [
      {
        title: 'Educational Institutions',
        description:
          'Student data, examination results, and analytics are shared with the educational institution that administers the student\'s account. The institution acts as the data controller for this data, and ExamForge AI acts as the data processor. We provide tools for institutions to manage and export their data at any time.',
      },
      {
        title: 'Service Providers',
        description:
          'We engage third-party service providers who perform services on our behalf, including cloud hosting (Supabase), payment processing (Flutterwave), email delivery, and analytics. These providers are bound by data processing agreements that require them to process data only as instructed by us and to maintain appropriate security measures.',
      },
      {
        title: 'Legal Requirements',
        description:
          'We may disclose personal data when required to do so by law, in response to valid legal process (such as a court order or subpoena), or when we believe in good faith that disclosure is necessary to protect our rights, protect your safety or the safety of others, investigate fraud, or respond to a government request.',
      },
      {
        title: 'Business Transfers',
        description:
          'In the event of a merger, acquisition, reorganisation, or sale of all or a portion of our assets, personal data may be transferred as part of such transaction. We will notify you via email and/or a prominent notice on our website of any change in ownership or uses of your personal data.',
      },
    ],
  },
  {
    id: 'data-security',
    icon: 'lock',
    title: '5. Data Security',
    content: [
      'We implement industry-leading technical and organisational measures to protect your personal data against unauthorised access, alteration, disclosure, or destruction. These measures include:',
    ],
    subsections: [
      {
        title: 'Encryption',
        description:
          'All data in transit is encrypted using TLS 1.3. Sensitive data at rest is encrypted using AES-256 with separate key management. Database backups are encrypted before storage, and encryption keys are automatically rotated every 90 days.',
      },
      {
        title: 'Access Controls',
        description:
          'We implement role-based access control with the principle of least privilege. Internal access to production systems requires multi-factor authentication and is logged in an immutable audit trail. Access is reviewed quarterly and revoked immediately upon role change or termination.',
      },
      {
        title: 'Infrastructure Security',
        description:
          'Our infrastructure runs on SOC 2 Type II certified cloud providers with automatic failover, DDoS protection, web application firewalls, and intrusion detection systems. We conduct quarterly penetration testing by certified ethical hackers.',
      },
      {
        title: 'Incident Response',
        description:
          'We maintain a documented incident response plan that is tested quarterly. In the event of a data breach, we will notify affected users and the relevant supervisory authorities within 72 hours, in accordance with GDPR and NDPR requirements.',
      },
    ],
  },
  {
    id: 'your-rights',
    icon: 'user-check',
    title: '6. Your Rights',
    content: [
      'Depending on your jurisdiction, you may have the following rights regarding your personal data:',
    ],
    subsections: [
      {
        title: 'Right of Access',
        description:
          'You have the right to request a copy of the personal data we hold about you. You can access and export most of your data directly through your account settings. For additional data requests, please contact our Data Protection Officer.',
      },
      {
        title: 'Right to Rectification',
        description:
          'You have the right to request correction of inaccurate or incomplete personal data. You can update most of your account information directly through your profile settings. For data that cannot be self-edited, please submit a rectification request.',
      },
      {
        title: 'Right to Erasure',
        description:
          'You have the right to request deletion of your personal data, subject to certain exceptions (such as legal retention requirements or legitimate interests). Upon account deletion, we will remove your personal data within 30 days, except where we are required to retain it by law.',
      },
      {
        title: 'Right to Data Portability',
        description:
          'You have the right to receive your personal data in a structured, commonly used, and machine-readable format (such as JSON or CSV). You can export your data through your account settings or by contacting our support team.',
      },
      {
        title: 'Right to Object',
        description:
          'You have the right to object to the processing of your personal data for direct marketing purposes or when processing is based on our legitimate interests. We will cease processing unless we have compelling legitimate grounds that override your interests.',
      },
      {
        title: 'Right to Restrict Processing',
        description:
          'You have the right to request restriction of processing of your personal data in certain circumstances, such as when you contest the accuracy of the data or object to processing based on legitimate interests.',
      },
    ],
  },
  {
    id: 'data-retention',
    icon: 'file-text',
    title: '7. Data Retention',
    content: [
      'We retain your personal data only for as long as necessary to fulfil the purposes for which it was collected, including to satisfy any legal, accounting, or reporting requirements. Our retention periods are as follows:',
    ],
    subsections: [
      {
        title: 'Account Data',
        description:
          'We retain your account information for the duration of your account and for 12 months after account deletion, in case you wish to reactivate your account. After this period, your account data is permanently deleted from our systems.',
      },
      {
        title: 'Examination Data',
        description:
          'Examination data, including questions, responses, and results, is retained for the duration of the institution\'s subscription and for 5 years after the end of the subscription, in accordance with education record retention requirements. Institutions may request earlier deletion of their examination data.',
      },
      {
        title: 'Usage and Log Data',
        description:
          'Server logs and usage analytics are retained for 12 months for security and debugging purposes. After this period, the data is either permanently deleted or aggregated and anonymised so that it can no longer be linked to an identifiable individual.',
      },
      {
        title: 'Audit Logs',
        description:
          'Security audit logs are retained for a minimum of 24 months to support forensic investigations and compliance reporting. These logs contain only metadata (timestamps, IP addresses, action types) and do not contain the content of user data.',
      },
    ],
  },
  {
    id: 'childrens-privacy',
    icon: 'shield',
    title: '8. Children\'s Privacy',
    content: [
      'Our Services are used by educational institutions that serve students under the age of 18. We are fully committed to protecting the privacy of children and young people in accordance with applicable data protection laws, including the NDPR and GDPR.',
      'We do not knowingly collect personal data directly from children under the age of 13. Student accounts for children under 13 are created and managed by their educational institution, which acts as the data controller and is responsible for obtaining appropriate parental or guardian consent. We process student data only as instructed by the institution and in accordance with our data processing agreement.',
      'For students aged 13 to 17, accounts may be created by the institution or by the student with parental consent. We provide institutions with tools to manage parental consent and to restrict data processing activities for minor students.',
      'If we become aware that we have collected personal data from a child under the age of 13 without verified parental consent, we will take steps to delete that information as quickly as possible. If you believe that a child\'s data has been collected without appropriate consent, please contact us immediately at privacy@examforge.ai.',
    ],
  },
  {
    id: 'international-transfers',
    icon: 'globe',
    title: '9. International Transfers',
    content: [
      'ExamForge AI is a company incorporated in Nigeria, and our primary data processing infrastructure is located in Africa and Europe. However, in certain circumstances, your personal data may be transferred to, stored, and processed in countries other than your country of residence.',
      'When we transfer personal data outside the European Economic Area (EEA), we ensure that appropriate safeguards are in place to protect your data in accordance with applicable data protection laws. These safeguards include:',
    ],
    subsections: [
      {
        title: 'Standard Contractual Clauses',
        description:
          'We use European Commission-approved Standard Contractual Clauses (SCCs) for transfers of personal data from the EEA to countries that have not been deemed adequate by the European Commission.',
      },
      {
        title: 'Adequacy Decisions',
        description:
          'Where available, we rely on adequacy decisions by the European Commission or other relevant authorities confirming that the destination country provides an adequate level of data protection.',
      },
      {
        title: 'Data Residency Options',
        description:
          'Enterprise customers may specify data residency requirements, ensuring that their data is stored and processed within a designated geographic region. We provide written confirmation of data residency upon request.',
      },
    ],
  },
  {
    id: 'cookies',
    icon: 'eye',
    title: '10. Cookies',
    content: [
      'We use cookies and similar tracking technologies to collect information about your browsing activities. Cookies are small text files stored on your device that help us improve our Services and your experience. We use the following categories of cookies:',
    ],
    subsections: [
      {
        title: 'Essential Cookies',
        description:
          'These cookies are strictly necessary for the operation of our Services. They enable core functionality such as authentication, security, and session management. You cannot opt out of essential cookies as the Services cannot function without them.',
      },
      {
        title: 'Analytics Cookies',
        description:
          'These cookies allow us to analyse how visitors use our Services, including the number of visitors, the pages they visit, and the time they spend on each page. We use this information to improve our Services. Analytics cookies are set only after you have provided your consent.',
      },
      {
        title: 'Functional Cookies',
        description:
          'These cookies enable enhanced functionality and personalisation, such as remembering your preferences and settings. They may be set by us or by third-party providers whose services we have added to our pages. Functional cookies are set only after you have provided your consent.',
      },
    ],
    subsectionsAfter: [
      'You can manage your cookie preferences at any time through the cookie consent banner on our website or through your browser settings. Please note that disabling certain cookies may affect the functionality of our Services.',
    ],
  },
  {
    id: 'changes-to-policy',
    icon: 'file-text',
    title: '11. Changes to This Policy',
    content: [
      'We may update this Privacy Policy from time to time to reflect changes in our practices, technologies, legal requirements, or other factors. When we make material changes, we will notify you by:',
      'Posting the updated Privacy Policy on our website with a revised "Last Updated" date.',
      'Sending an email notification to the address associated with your account for significant changes that affect your rights or the way we process your data.',
      'Displaying a prominent notice on our platform for changes that require your affirmative consent.',
      'We encourage you to review this Privacy Policy periodically to stay informed about how we protect your information. Your continued use of our Services after the posting of changes constitutes your acceptance of such changes.',
    ],
  },
  {
    id: 'contact',
    icon: 'shield',
    title: '12. Contact',
    content: [
      'If you have any questions, concerns, or requests regarding this Privacy Policy or our data processing practices, please contact us:',
    ],
    subsections: [
      {
        title: 'Data Protection Officer',
        description:
          'Our Data Protection Officer can be reached at dpo@examforge.ai for all matters relating to data protection, including requests to exercise your rights under the GDPR or NDPR.',
      },
      {
        title: 'General Inquiries',
        description:
          'For general questions about our privacy practices, please contact us at privacy@examforge.ai or through our Contact page.',
      },
      {
        title: 'Supervisory Authorities',
        description:
          'If you are in the European Union, you have the right to lodge a complaint with your local supervisory authority if you believe that our processing of your personal data violates the GDPR. In Nigeria, you may contact the National Information Technology Development Agency (NITDA).',
      },
    ],
    subsectionsAfter: [
      'ExamForge AI Ltd.\nLagos, Nigeria\nEmail: privacy@examforge.ai\nWebsite: https://examforge.ai',
    ],
  },
]

export default function PrivacyPage() {
  return (
    <div className="pt-16">
      <BreadcrumbJsonLd items={[{ name: 'Home', href: '/' }, { name: 'Legal', href: '/privacy' }, { name: 'Privacy Policy', href: '/privacy' }]} />
      {/* Hero */}
      <SectionWrapper>
        <div className="text-center max-w-3xl mx-auto">
          <p className="text-sm font-medium text-primary uppercase tracking-wider mb-4">Legal</p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            <GradientText preset="primary">Privacy Policy</GradientText>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            Your privacy matters to us. This policy explains how ExamForge AI collects, uses,
            discloses, and safeguards your personal data when you use our platform.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-muted-foreground">
            <span>Effective Date: January 1, 2025</span>
            <span className="hidden sm:inline">·</span>
            <span>Last Updated: March 4, 2026</span>
          </div>
        </div>
      </SectionWrapper>

      {/* Table of Contents */}
      <SectionWrapper backgroundClassName="bg-muted/30 border-y border-border/40">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-lg font-semibold mb-6">Table of Contents</h2>
          <nav aria-label="Privacy Policy Table of Contents">
            <ol className="space-y-3 animate-fade-in">
              {policySections.map((section, index) => (
                <li key={section.id}>
                  <Link
                    href={`#${section.id}`}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200"
                  >
                    {section.title}
                  </Link>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </SectionWrapper>

      {/* Policy Sections */}
      {policySections.map((section) => {
        const Icon = resolveIcon(section.icon) ?? Sparkles
        return (
          <SectionWrapper key={section.id} id={section.id}>
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="text-xl sm:text-3xl font-bold tracking-tight tracking-tight">{section.title}</h2>
              </div>

              <div className="space-y-4 text-muted-foreground leading-relaxed">
                {section.content.map((paragraph, pIndex) => (
                  <p key={pIndex}>{paragraph}</p>
                ))}

                {section.subsections && (
                  <div className="space-y-5 mt-6">
                    {section.subsections.map((sub) => (
                      <div
                        key={sub.title}
                        className="rounded-xl border border-border/50 bg-card/80 p-5"
                      >
                        <h3 className="text-sm font-semibold text-foreground mb-2">{sub.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{sub.description}</p>
                      </div>
                    ))}
                  </div>
                )}

                {section.subsectionsAfter && (
                  <div className="space-y-4 mt-4">
                    {section.subsectionsAfter.map((paragraph, pIndex) => (
                      <p key={pIndex} className="whitespace-pre-line">{paragraph}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </SectionWrapper>
        )
      })}

      <CTASection />
    </div>
  )
}
