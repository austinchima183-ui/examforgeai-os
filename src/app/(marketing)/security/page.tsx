import type { Metadata } from 'next'
import { resolveIcon } from '@/lib/design/icon-registry'
import Link from 'next/link'
import { Shield, Lock, CheckCircle2, Server, Eye, Key, FileText, Globe , Sparkles} from 'lucide-react'
import { GradientText } from '@/components/marketing/gradient-text'
import { SectionWrapper } from '@/components/marketing/section-wrapper'
import { CTASection } from '@/components/marketing/cta-section'
import { BreadcrumbJsonLd } from '@/components/marketing/breadcrumb-jsonld'

// ============================================================================
// ExamForge AI — Security Page
// ============================================================================

export const metadata: Metadata = {
  title: 'Security',
  description:
    'Learn about ExamForge AI security practices, infrastructure, and compliance. We take the protection of student data seriously.',
}

const securityFeatures = [
  {
    icon: 'lock',
    title: 'AES-256 Encryption',
    description:
      'All sensitive data at rest is encrypted using AES-256, the gold standard in symmetric encryption adopted by governments and financial institutions worldwide. Database fields containing personally identifiable information, exam content, and payment details are encrypted at the column level with transparent key management. Encryption keys are stored separately from the data they protect, with automatic key rotation every 90 days.',
  },
  {
    icon: 'check-circle-2',
    title: 'SOC 2 Type II',
    description:
      'ExamForge AI maintains SOC 2 Type II certification, demonstrating our commitment to the highest standards of security, availability, processing integrity, confidentiality, and privacy. Our SOC 2 audit is conducted annually by an independent third-party auditor, and the report is available to enterprise customers under NDA. This certification verifies that our internal controls are not only designed well but operate effectively over time.',
  },
  {
    icon: 'shield',
    title: 'GDPR Compliant',
    description:
      'We are fully compliant with the General Data Protection Regulation (GDPR), ensuring that the personal data of EU data subjects is processed lawfully, fairly, and transparently. We have appointed a Data Protection Officer, maintain Records of Processing Activities, and have implemented Data Protection Impact Assessments for all high-risk processing activities. Data subjects can exercise their rights to access, rectification, erasure, and portability through our self-service portal.',
  },
  {
    icon: 'globe',
    title: 'NDPR Compliant',
    description:
      'As a platform built in Nigeria, we are fully compliant with the Nigeria Data Protection Regulation (NDPR) issued by the National Information Technology Development Agency (NITDA). We have filed our annual data protection audit report, appointed a Data Protection Officer registered with NITDA, and ensure that all data processing activities comply with the principles of lawful processing, data minimisation, and purpose limitation as prescribed by the regulation.',
  },
  {
    icon: 'key',
    title: 'Two-Factor Authentication',
    description:
      'All accounts are protected by optional two-factor authentication (2FA) using time-based one-time passwords (TOTP) compatible with authenticator apps such as Google Authenticator, Authy, and 1Password. Enterprise accounts can enforce 2FA as mandatory for all users. We also support hardware security keys via WebAuthn/FIDO2 for institutions requiring the highest level of authentication assurance. Failed 2FA attempts are rate-limited and logged for security review.',
  },
  {
    icon: 'eye',
    title: 'Role-Based Access Control',
    description:
      'Our granular role-based access control system defines five distinct roles — superAdmin, schoolAdmin, teacher, student, and parent — each with carefully scoped permissions. Users can only access data and perform actions that their role explicitly permits. Every route and API endpoint enforces RBAC at the server level through middleware validation, ensuring that no client-side manipulation can bypass access controls. Role assignments are audited and require approval from an administrator.',
  },
  {
    icon: 'file-text',
    title: 'Audit Logging',
    description:
      'Every action taken on the platform is recorded in an immutable audit log, capturing who performed the action, when it occurred, the IP address and device used, and the specific data affected. Audit logs cover authentication events, data modifications, exam activities, administrative actions, and API calls. Logs are retained for a minimum of 12 months and are available for export in CSV and JSON formats for compliance reporting and forensic investigation.',
  },
  {
    icon: 'server',
    title: 'Data Residency',
    description:
      'We offer configurable data residency options to ensure that your data is stored and processed within your preferred geographic region. By default, customer data is stored in the region closest to the primary user base. Enterprise customers can specify exact data residency requirements, including country-level restrictions, to comply with local data sovereignty laws. We provide written confirmation of data residency and do not transfer data across regions without explicit customer consent.',
  },
]

const certifications = [
  {
    name: 'SOC 2 Type II',
    description: 'Annual audit by independent third-party assessor confirming our security controls operate effectively.',
    status: 'Certified',
  },
  {
    name: 'GDPR',
    description: 'Full compliance with the European Union General Data Protection Regulation including cross-border data transfer mechanisms.',
    status: 'Compliant',
  },
  {
    name: 'NDPR',
    description: 'Compliance with the Nigeria Data Protection Regulation, including annual audit filing with NITDA.',
    status: 'Compliant',
  },
  {
    name: 'ISO 27001',
    description: 'Information security management system aligned with ISO 27001 standards and best practices.',
    status: 'Aligned',
  },
  {
    name: 'TLS 1.3',
    description: 'All data in transit encrypted with TLS 1.3, the latest and most secure transport layer protocol.',
    status: 'Enforced',
  },
  {
    name: 'AES-256',
    description: 'Sensitive data at rest encrypted with AES-256, the encryption standard used by the U.S. government for classified information.',
    status: 'Enforced',
  },
]

const infrastructureFeatures = [
  {
    icon: 'server',
    title: 'Redundant Infrastructure',
    description:
      'Our platform runs on a multi-region cloud infrastructure with automatic failover. If a primary server becomes unavailable, traffic is automatically routed to a standby instance in a different availability zone, ensuring 99.9% uptime. Our infrastructure is monitored 24/7 by automated systems that detect and respond to anomalies within seconds.',
  },
  {
    icon: 'shield',
    title: 'DDoS Protection',
    description:
      'Enterprise-grade distributed denial-of-service (DDoS) protection is applied at the network edge, absorbing volumetric attacks before they reach our application servers. Our DDoS mitigation can handle attacks exceeding 1 Tbps, ensuring that your exams and school operations remain accessible even during active attack campaigns.',
  },
  {
    icon: 'lock',
    title: 'Network Security',
    description:
      'Our network architecture employs multiple layers of defense, including web application firewalls (WAF), intrusion detection systems (IDS), and network segmentation. Internal services communicate through encrypted private channels, and all external-facing endpoints are protected by rate limiting, IP allowlisting, and bot detection. We conduct quarterly penetration testing by certified ethical hackers.',
  },
  {
    icon: 'eye',
    title: '24/7 Monitoring',
    description:
      'Our security operations team monitors the platform around the clock using automated alerting systems and real-time dashboards. Suspicious activity triggers immediate investigation and response. We maintain an incident response plan that is tested quarterly through tabletop exercises, and critical incidents are escalated to our security leadership within 15 minutes of detection.',
  },
]

const dataProtectionPractices = [
  {
    icon: 'lock',
    title: 'Encryption at Rest and in Transit',
    description:
      'All data is encrypted both at rest (AES-256) and in transit (TLS 1.3). Database backups are encrypted before storage, and encryption keys are managed through a dedicated key management service with automatic rotation. We never store credentials in plaintext; all passwords are hashed using bcrypt with adaptive work factors.',
  },
  {
    icon: 'check-circle-2',
    title: 'Automated Backups and Recovery',
    description:
      'We perform continuous automated backups with point-in-time recovery capability, allowing us to restore data to any moment within the last 30 days. Backups are stored in geographically separate locations with AES-256 encryption. Our recovery time objective (RTO) is under 4 hours, and our recovery point objective (RPO) is under 5 minutes for critical data.',
  },
  {
    icon: 'key',
    title: 'Access Management',
    description:
      'All internal access to production systems requires multi-factor authentication and is logged in an immutable audit trail. We follow the principle of least privilege: engineers and staff are granted the minimum access necessary to perform their duties, and access is reviewed quarterly. Emergency access is time-limited and requires management approval.',
  },
  {
    icon: 'file-text',
    title: 'Vulnerability Management',
    description:
      'We maintain a continuous vulnerability management program that includes automated dependency scanning, static code analysis, and dynamic application security testing. Critical vulnerabilities are remediated within 24 hours, high-severity vulnerabilities within 72 hours, and medium-severity vulnerabilities within 14 days. We also operate a responsible disclosure program for external security researchers.',
  },
]

export default function SecurityPage() {
  return (
    <div className="pt-16 bg-[#090909]">
      <BreadcrumbJsonLd items={[{ name: 'Home', href: '/' }, { name: 'Legal', href: '/security' }, { name: 'Security', href: '/security' }]} />
      {/* Hero */}
      <SectionWrapper>
        <div className="text-center max-w-3xl mx-auto">
          <p className="text-sm font-medium text-primary uppercase tracking-wider mb-4">Security</p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Enterprise-grade{' '}
            <GradientText preset="cool">security</GradientText> you can trust
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            Student data is sacred. ExamForge AI is built with security at every layer — from the
            database to the edge — so you can focus on education, not compliance. We invest heavily
            in infrastructure, processes, and people to ensure that your data remains protected at all
            times.
          </p>
        </div>
      </SectionWrapper>

      {/* Security Overview */}
      <SectionWrapper backgroundClassName="bg-[#0C0C0C] border-y border-white/[0.04]">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Security Overview</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Our security posture is comprehensive, covering encryption, compliance, authentication,
            access control, auditing, and data residency. Every layer of our platform is designed to
            protect student data and maintain the trust of the institutions we serve.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {securityFeatures.map((feature) => {
            const Icon = resolveIcon(feature.icon) ?? Sparkles
            return (
              <div
                key={feature.title}
                className="group forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-6 hover:-translate-y-0.5 hover:border-white/[0.06] transition-all duration-300"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold mb-2">{feature.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            )
          })}
        </div>
      </SectionWrapper>

      {/* Compliance Certifications */}
      <SectionWrapper>
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Compliance Certifications</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            We maintain compliance with the most rigorous international and regional data protection
            standards, ensuring that your institution meets its regulatory obligations when using our
            platform.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {certifications.map((cert) => (
            <div
              key={cert.name}
              className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-6"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold">{cert.name}</h3>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <CheckCircle2 className="h-3 w-3" />
                  {cert.status}
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{cert.description}</p>
            </div>
          ))}
        </div>
      </SectionWrapper>

      {/* Infrastructure Security */}
      <SectionWrapper backgroundClassName="bg-[#0C0C0C] border-y border-white/[0.04]">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Infrastructure Security</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Our infrastructure is designed for resilience, with multiple layers of defense to protect
            against both external threats and internal risks. We invest in the same technologies used
            by the world&apos;s largest technology companies.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {infrastructureFeatures.map((feature) => {
            const Icon = resolveIcon(feature.icon) ?? Sparkles
            return (
              <div
                key={feature.title}
                className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-6"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            )
          })}
        </div>
      </SectionWrapper>

      {/* Data Protection Practices */}
      <SectionWrapper>
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Data Protection Practices</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Beyond certifications and infrastructure, we implement rigorous data protection practices
            in our day-to-day operations. From how we handle backups to how we manage internal access,
            every process is designed to minimize risk and maximize data integrity.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {dataProtectionPractices.map((practice) => {
            const Icon = resolveIcon(practice.icon) ?? Sparkles
            return (
              <div
                key={practice.title}
                className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-6"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold mb-2">{practice.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{practice.description}</p>
              </div>
            )
          })}
        </div>

        {/* Additional assurance */}
        <div className="mt-12 forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow p-8 text-center">
          <Shield className="h-10 w-10 text-primary mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Our Security Commitment</h3>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Security is not a feature we bolt on — it is a principle we build on. Every line of code,
            every infrastructure decision, and every operational process is guided by our commitment to
            protecting the data entrusted to us. If you have questions about our security practices that
            are not addressed here, our security team is available to provide detailed answers. Contact
            us at{' '}
            <Link href="/contact" className="text-primary hover:underline">
              security@examforge.ai
            </Link>.
          </p>
        </div>
      </SectionWrapper>

      <CTASection />
    </div>
  )
}
