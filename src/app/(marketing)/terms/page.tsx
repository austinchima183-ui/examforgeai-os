import type { Metadata } from 'next'
import { resolveIcon } from '@/lib/design/icon-registry'
import Link from 'next/link'
import { FileText, Scale, Gavel, Shield, AlertCircle , Sparkles} from 'lucide-react'
import { GradientText } from '@/components/marketing/gradient-text'
import { SectionWrapper } from '@/components/marketing/section-wrapper'
import { CTASection } from '@/components/marketing/cta-section'
import { BreadcrumbJsonLd } from '@/components/marketing/breadcrumb-jsonld'

// ============================================================================
// ExamForge AI — Terms of Service Page
// ============================================================================

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'ExamForge AI Terms of Service. Read the terms and conditions governing your use of the ExamForge AI platform.',
}

const termsSections = [
  {
    id: 'acceptance',
    icon: 'file-text',
    title: '1. Acceptance of Terms',
    content: [
      'These Terms of Service ("Terms") constitute a legally binding agreement between you ("User", "you", or "your") and ExamForge AI Ltd. ("ExamForge AI", "we", "our", or "us"), governing your access to and use of the ExamForge AI platform, including all associated websites, mobile applications, application programming interfaces (APIs), and related services (collectively, the "Services").',
      'By accessing or using our Services, you acknowledge that you have read, understood, and agree to be bound by these Terms, including our Privacy Policy, which is incorporated by reference. If you do not agree to these Terms, you must not access or use our Services.',
      'If you are using the Services on behalf of an educational institution or other organisation, you represent and warrant that you have the authority to bind that organisation to these Terms, and "you" and "your" will refer to that organisation.',
      'We reserve the right to modify these Terms at any time in accordance with Section 12 (Changes to Terms). Your continued use of the Services following the posting of revised Terms constitutes your acceptance of such changes.',
    ],
  },
  {
    id: 'account-terms',
    icon: 'shield',
    title: '2. Account Terms',
    content: [
      'To access and use our Services, you must create an account. By creating an account, you represent and warrant that:',
    ],
    subsections: [
      {
        title: 'Eligibility',
        description:
          'You are at least 18 years of age, or if you are under 18, you have obtained the consent of your parent or legal guardian, and such parent or guardian agrees to be bound by these Terms on your behalf. Students under the age of 13 may only use the Services through an account created and managed by their educational institution with appropriate parental consent.',
      },
      {
        title: 'Account Accuracy',
        description:
          'All information provided during account registration and thereafter is accurate, complete, and current. You must update your account information promptly when any details change. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.',
      },
      {
        title: 'Account Security',
        description:
          'You must immediately notify ExamForge AI of any unauthorised use of your account or any other breach of security. You are responsible for ensuring that your password is sufficiently complex and for enabling two-factor authentication where available. ExamForge AI will not be liable for any loss or damage arising from your failure to comply with these security obligations.',
      },
      {
        title: 'One Account Per User',
        description:
          'Each individual may maintain only one account on the platform. Educational institutions may create accounts on behalf of their students, teachers, and staff in accordance with our role-based access control system. Creating multiple accounts for the purpose of circumventing restrictions or exploiting the platform is strictly prohibited.',
      },
      {
        title: 'Account Suspension and Termination',
        description:
          'We reserve the right to suspend or terminate your account, without prior notice, if we reasonably believe that you have violated these Terms. Upon termination, your right to use the Services will immediately cease. Provisions that by their nature should survive termination shall remain in effect, including Sections 6, 7, 8, 9, 10, and 11.',
      },
    ],
  },
  {
    id: 'acceptable-use',
    icon: 'gavel',
    title: '3. Acceptable Use',
    content: [
      'You agree to use the Services only for lawful purposes and in accordance with these Terms. You shall not:',
    ],
    subsections: [
      {
        title: 'Prohibited Activities',
        description:
          'Use the Services for any purpose that is unlawful, fraudulent, or harmful; attempt to gain unauthorised access to any portion of the Services, other accounts, or computer systems; use the Services to transmit, store, or distribute content that is malicious, obscene, defamatory, or infringing on the intellectual property rights of others; interfere with or disrupt the integrity or performance of the Services; or use automated systems (bots, scrapers, or spiders) to access the Services without our prior written consent.',
      },
      {
        title: 'Examination Integrity',
        description:
          'You shall not use the Services to cheat, facilitate cheating, or undermine the integrity of any examination. This includes, but is not limited to, sharing exam questions or answers with unauthorised persons, using unauthorised materials or tools during an examination, impersonating another user during an examination, or attempting to manipulate examination results. Violations of examination integrity will result in immediate account suspension and may be reported to the relevant educational institution.',
      },
      {
        title: 'System Security',
        description:
          'You shall not attempt to probe, scan, or test the vulnerability of any ExamForge AI system or network, or breach any security or authentication measures. You shall not reverse engineer, decompile, disassemble, or otherwise attempt to derive the source code of the Services or any component thereof. Security vulnerabilities discovered through legitimate use should be reported to security@examforge.ai in accordance with our responsible disclosure programme.',
      },
      {
        title: 'Content Restrictions',
        description:
          'You are solely responsible for the content you upload, create, or distribute through the Services. You represent and warrant that you have all rights necessary to grant ExamForge AI the licence described in Section 6 (Intellectual Property) and that the content does not violate any applicable law or the rights of any third party.',
      },
    ],
  },
  {
    id: 'payment-terms',
    icon: 'scale',
    title: '4. Payment Terms',
    content: [
      'Certain features of the Services require payment of subscription fees or other charges. By selecting a paid plan, you agree to the following terms:',
    ],
    subsections: [
      {
        title: 'Subscription Fees',
        description:
          'Subscription fees are billed in advance on a monthly or annual basis, depending on the plan selected. All fees are stated in the currency indicated at the time of purchase and are exclusive of applicable taxes unless otherwise stated. We reserve the right to change our pricing with 30 days\' advance notice. Price changes will take effect at the start of your next billing cycle.',
      },
      {
        title: 'Payment Processing',
        description:
          'Payments are processed through our third-party payment provider, Flutterwave. By providing your payment information, you authorise ExamForge AI to charge the designated payment method for the total amount of your subscription, including any applicable taxes and fees. If a payment cannot be processed, we may suspend your access to the paid features until the outstanding balance is settled.',
      },
      {
        title: 'Refunds',
        description:
          'We offer a 14-day money-back guarantee for new subscriptions. If you are not satisfied with the Services within the first 14 days, you may request a full refund by contacting our support team. After the 14-day period, subscription fees are non-refundable except as required by applicable law. Annual subscriptions may be eligible for a pro-rated refund if cancelled after the 14-day period, at our sole discretion.',
      },
      {
        title: 'Free Trial',
        description:
          'We may offer free trial periods for certain plans. At the end of the trial period, your subscription will automatically convert to a paid plan at the then-current rate unless you cancel before the trial ends. You will be notified by email at least 7 days before the end of your trial period. No charges will be applied during the trial period without your explicit consent.',
      },
    ],
  },
  {
    id: 'intellectual-property',
    icon: 'file-text',
    title: '5. Intellectual Property',
    content: [
      'The Services and all associated content, features, and functionality — including but not limited to text, graphics, logos, icons, images, audio clips, software, and their compilation — are owned by ExamForge AI, its licensors, or other providers of such material and are protected by international copyright, trademark, patent, trade secret, and other intellectual property or proprietary rights laws.',
      'You are granted a limited, non-exclusive, non-transferable, revocable licence to access and use the Services for your internal, personal, or educational purposes, subject to these Terms. This licence does not include the right to modify, reproduce, distribute, or create derivative works from the Services or any component thereof.',
      'The ExamForge AI name, logo, and all related names, logos, product and service names, designs, and slogans are trademarks of ExamForge AI Ltd. You may not use such marks without our prior written permission. All other names, logos, product and service names, designs, and slogans on the Services are the trademarks of their respective owners.',
    ],
  },
  {
    id: 'data-ownership',
    icon: 'shield',
    title: '6. Data Ownership',
    content: [
      'We respect the ownership rights of our users and their institutions with respect to the data they create and store on our platform:',
    ],
    subsections: [
      {
        title: 'Your Data Remains Yours',
        description:
          'You retain all rights, title, and interest in and to the data you upload, create, or generate through the Services, including examination content, student records, question banks, and analytics. ExamForge AI does not claim ownership of your data. You grant us a limited, non-exclusive licence to process your data solely for the purpose of providing the Services as described in our Privacy Policy.',
      },
      {
        title: 'ExamForge AI Data',
        description:
          'ExamForge AI retains all rights to the platform, including the software, algorithms, AI models, user interface, and any aggregated, anonymised, or derived data that does not identify you or your institution. Usage patterns, performance metrics, and other anonymised data collected through the operation of the Services belong to ExamForge AI and may be used to improve our Services.',
      },
      {
        title: 'Data Export',
        description:
          'You may export your data at any time through the export functionality provided within the platform. Upon account termination, you will have a 30-day grace period to export your data before it is permanently deleted from our systems. We provide data export in standard formats (JSON, CSV, PDF) to ensure portability.',
      },
      {
        title: 'Data Processing Agreement',
        description:
          'For institutional customers, we provide a Data Processing Agreement (DPA) that defines the roles and responsibilities of the institution (as data controller) and ExamForge AI (as data processor). The DPA is available upon request and is executed as part of the enterprise onboarding process.',
      },
    ],
  },
  {
    id: 'limitation-of-liability',
    icon: 'alert-circle',
    title: '7. Limitation of Liability',
    content: [
      'To the maximum extent permitted by applicable law:',
      'ExamForge AI shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, use, goodwill, or other intangible losses, resulting from (a) your access to or use of, or inability to access or use, the Services; (b) any conduct or content of any third party on the Services; (c) any content obtained from the Services; or (d) unauthorised access, use, or alteration of your transmissions or content.',
      'In no event shall ExamForge AI\'s total aggregate liability to you for all claims arising out of or relating to the use of the Services exceed the amount you have paid to ExamForge AI in the twelve (12) months preceding the event giving rise to the claim, or one hundred United States dollars ($100), whichever is greater.',
      'The limitations set forth in this Section shall apply regardless of the legal theory under which such liability is asserted, whether in contract, tort (including negligence), strict liability, or any other legal theory, and whether or not ExamForge AI has been advised of the possibility of such liability. Some jurisdictions do not allow the exclusion or limitation of certain warranties or liabilities, so the above limitations may not apply to you.',
    ],
  },
  {
    id: 'indemnification',
    icon: 'gavel',
    title: '8. Indemnification',
    content: [
      'You agree to defend, indemnify, and hold harmless ExamForge AI, its officers, directors, employees, agents, licensors, and suppliers from and against any claims, actions, demands, liabilities, and settlements, including without limitation, reasonable legal and accounting fees, arising out of or in any way connected with:',
    ],
    subsections: [
      {
        title: 'Your Use of the Services',
        description:
          'Your access to or use of the Services, including any content you upload, create, or distribute through the platform.',
      },
      {
        title: 'Violation of Rights',
        description:
          'Your violation of these Terms, including any representation or warranty made herein, or any applicable law or regulation.',
      },
      {
        title: 'Third-Party Claims',
        description:
          'Your violation of any rights of a third party, including intellectual property rights, privacy rights, or any other proprietary rights.',
      },
    ],
    subsectionsAfter: [
      'ExamForge AI reserves the right, at its own expense, to assume the exclusive defence and control of any matter otherwise subject to indemnification by you, and in such case, you agree to cooperate with ExamForge AI\'s defence of such claim. The indemnification obligations under this Section shall survive the termination of these Terms.',
    ],
  },
  {
    id: 'termination',
    icon: 'file-text',
    title: '9. Termination',
    content: [
      'Either party may terminate this agreement at any time, for any reason, in accordance with the following provisions:',
    ],
    subsections: [
      {
        title: 'Termination by You',
        description:
          'You may terminate your account at any time by contacting our support team or using the account deletion feature within your profile settings. Upon termination, your right to use the Services will immediately cease. You will be responsible for any outstanding fees incurred prior to termination. We will retain your data for 30 days following termination to allow you to export your data, after which it will be permanently deleted.',
      },
      {
        title: 'Termination by ExamForge AI',
        description:
          'We may terminate or suspend your account and access to the Services immediately, without prior notice or liability, for any reason, including but not limited to a breach of these Terms. For institutional customers with a paid subscription, we will provide 30 days\' written notice of termination for convenience, and a pro-rated refund of any prepaid fees for the unused portion of the subscription period.',
      },
      {
        title: 'Effects of Termination',
        description:
          'Upon termination, all licences and other rights granted to you under these Terms will immediately cease. Provisions that by their nature should survive termination shall remain in effect, including but not limited to Sections 5 (Intellectual Property), 6 (Data Ownership), 7 (Limitation of Liability), 8 (Indemnification), 10 (Dispute Resolution), and 11 (Governing Law).',
      },
    ],
  },
  {
    id: 'dispute-resolution',
    icon: 'scale',
    title: '10. Dispute Resolution',
    content: [
      'We encourage you to contact us first at legal@examforge.ai to resolve any disputes informally. We will attempt to resolve your concern within 30 business days. If we are unable to resolve the dispute informally, the following provisions shall apply:',
    ],
    subsections: [
      {
        title: 'Arbitration',
        description:
          'Any dispute arising out of or relating to these Terms or the breach, termination, enforcement, interpretation, or validity thereof, including the determination of the scope or applicability of this agreement to arbitrate, shall be determined by arbitration in Lagos, Nigeria, in accordance with the Arbitration and Conciliation Act (Cap A18, Laws of the Federation of Nigeria, 2004). The arbitration shall be conducted by a single arbitrator appointed by mutual agreement, or failing agreement, by the Lagos Court of Arbitration. The language of the arbitration shall be English.',
      },
      {
        title: 'Exceptions to Arbitration',
        description:
          'Either party may seek injunctive or equitable relief in any court of competent jurisdiction for disputes related to intellectual property rights, unauthorised access to the Services, or breach of confidentiality obligations. Such relief may be sought without the requirement to post a bond or other security.',
      },
      {
        title: 'Waiver of Class Actions',
        description:
          'You agree that any dispute resolution proceedings will be conducted only on an individual basis and not in a class, consolidated, or representative action. You waive any right to participate in a class action lawsuit or class-wide arbitration against ExamForge AI. If a court or arbitrator determines in a final decision that this waiver is unenforceable, the agreement to arbitrate shall not apply.',
      },
    ],
  },
  {
    id: 'governing-law',
    icon: 'gavel',
    title: '11. Governing Law',
    content: [
      'These Terms shall be governed by and construed in accordance with the laws of the Federal Republic of Nigeria, without regard to its conflict of law provisions. Any disputes not subject to arbitration under Section 10 shall be submitted to the exclusive jurisdiction of the courts of Lagos State, Nigeria.',
      'For users located within the European Union, nothing in these Terms shall limit any mandatory consumer protection rights you may have under the laws of your EU member state of residence. If you are a consumer residing in the EU, you may also bring proceedings in the courts of your country of residence.',
      'The United Nations Convention on Contracts for the International Sale of Goods (CISG) shall not apply to these Terms. Any provision of these Terms that is found to be invalid or unenforceable shall be severed from the remaining provisions, which shall remain in full force and effect.',
    ],
  },
  {
    id: 'changes-to-terms',
    icon: 'file-text',
    title: '12. Changes to Terms',
    content: [
      'We reserve the right to modify or replace these Terms at any time at our sole discretion. If a revision is material, we will provide at least 30 days\' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion, but includes changes to payment terms, liability limitations, dispute resolution procedures, and data ownership provisions.',
      'We will notify you of material changes by (a) posting the revised Terms on our website with a revised "Effective Date" and (b) sending an email notification to the address associated with your account. For non-material changes, we may update the Terms without prior notice, but we will always update the "Effective Date" at the top of the document.',
      'Your continued use of the Services following the posting of revised Terms constitutes your acceptance of such changes. You are expected to check this page periodically so you are aware of any changes, as they are binding on you. If you do not agree with the revised Terms, you must discontinue use of the Services and close your account.',
    ],
  },
  {
    id: 'contact',
    icon: 'shield',
    title: '13. Contact',
    content: [
      'If you have any questions, concerns, or requests regarding these Terms of Service, please contact us:',
    ],
    subsections: [
      {
        title: 'Legal Department',
        description:
          'For questions about these Terms, contract negotiations, or legal matters, please contact our legal team at legal@examforge.ai.',
      },
      {
        title: 'Support',
        description:
          'For general questions about the platform, billing, or technical issues, please contact our support team at support@examforge.ai or through our Contact page.',
      },
      {
        title: 'Data Protection',
        description:
          'For questions about data processing, privacy, or to exercise your data protection rights, please contact our Data Protection Officer at dpo@examforge.ai.',
      },
    ],
    subsectionsAfter: [
      'ExamForge AI Ltd.\nLagos, Nigeria\nEmail: legal@examforge.ai\nWebsite: https://examforge.ai',
    ],
  },
]

export default function TermsPage() {
  return (
    <div className="pt-16">
      <BreadcrumbJsonLd items={[{ name: 'Home', href: '/' }, { name: 'Legal', href: '/terms' }, { name: 'Terms of Service', href: '/terms' }]} />
      {/* Hero */}
      <SectionWrapper>
        <div className="text-center max-w-3xl mx-auto">
          <p className="text-sm font-medium text-primary uppercase tracking-wider mb-4">Legal</p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            <GradientText preset="primary">Terms of Service</GradientText>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            These Terms of Service govern your use of the ExamForge AI platform. Please read them
            carefully before using our Services.
          </p>
          <div className="mt-6 text-sm text-muted-foreground">
            Effective Date: January 1, 2025
          </div>
        </div>
      </SectionWrapper>

      {/* Table of Contents */}
      <SectionWrapper backgroundClassName="bg-muted/30 border-y border-border/40">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-lg font-semibold mb-6">Table of Contents</h2>
          <nav aria-label="Terms of Service Table of Contents">
            <ol className="space-y-3 animate-fade-in">
              {termsSections.map((section) => (
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

      {/* Terms Sections */}
      {termsSections.map((section) => {
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
