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
    title: 'Encryption in Transit',
    description:
      'All data moving between browsers, our application servers, and the database is encrypted in transit with TLS. Data at rest is encrypted by our managed database provider (Supabase/Postgres). We do not make claims about column-level encryption or key rotation we have not implemented — see our published security documentation for the current posture.',
  },
  {
    icon: 'check-circle-2',
    title: 'Honest Compliance Position',
    description:
      'We are NOT currently SOC 2, ISO 27001, GDPR, or NDPR certified — and we will not pretend otherwise. We design with those frameworks in mind (least-privilege access, audit logging, encryption), and certification is on our roadmap as we grow with pilot customers. If your institution requires formal certification today, we will tell you plainly that we are not there yet.',
  },
  {
    icon: 'key',
    title: 'Two-Factor Authentication',
    description:
      'Accounts are protected by optional two-factor authentication (2FA) using time-based one-time passwords (TOTP) compatible with authenticator apps such as Google Authenticator, Authy, and 1Password. Failed 2FA attempts are rate-limited and logged for security review.',
  },
  {
    icon: 'eye',
    title: 'Role-Based Access Control',
    description:
      'Our granular role-based access control system defines five distinct roles — student, parent, teacher, school_admin, and super_admin — each with carefully scoped permissions. Every route and API endpoint enforces RBAC at the server level through middleware validation, ensuring that no client-side manipulation can bypass access controls.',
  },
  {
    icon: 'file-text',
    title: 'Audit Logging',
    description:
      'Significant platform actions are recorded in an audit log, capturing who performed the action, when it occurred, and the data affected. Audit logs cover authentication events, security events (including CBT tamper detection), administrative actions, and API calls, and are available for export for compliance review.',
  },
  {
    icon: 'shield',
    title: 'Row-Level Security',
    description:
      'Every table in our database is protected by Postgres row-level security policies — measured, not aspirational: 270 tables, all RLS-enabled, with 700+ scoped policies. Data isolation between schools and tenants is enforced at the database layer, not just in application code.',
  },
]

const certifications = [
  {
    name: 'SOC 2 Type II',
    description: 'Not yet certified. On our roadmap as we scale with pilot customers. We will announce it when a real audit exists.',
    status: 'Roadmap',
  },
  {
    name: 'GDPR',
    description: 'Not yet certified. We design with data-minimisation and access-control principles, but no formal GDPR assessment has been completed.',
    status: 'Roadmap',
  },
  {
    name: 'NDPR (Nigeria)',
    description: 'Not yet filed. As a Nigerian platform we intend to complete NDPR filing as part of formal launch.',
    status: 'Roadmap',
  },
  {
    name: 'TLS Encryption',
    description: 'All data in transit encrypted via TLS on every connection.',
    status: 'Enforced',
  },
  {
    name: 'Row-Level Security',
    description: 'Every database table protected by RLS policies (270/270 measured).',
    status: 'Enforced',
  },
  {
    name: 'RBAC + CSRF',
    description: 'Five-role access control enforced server-side, plus CSRF protection on state-changing endpoints.',
    status: 'Enforced',
  },
]

const infrastructureFeatures = [
  {
    icon: 'server',
    title: 'Managed Cloud Infrastructure',
    description:
      'Our application is served by Vercel with our managed Postgres database hosted by Supabase in a single European region. Our /api/health endpoint publishes live database and service status that anyone can check.',
  },
  {
    icon: 'shield',
    title: 'Rate Limiting & Input Validation',
    description:
      'All external-facing endpoints are protected by rate limiting and strict input validation (Zod schemas). CBT exams include tamper detection that records suspicious behavior such as tab-switching during exams.',
  },
  {
    icon: 'lock',
    title: 'Security Headers',
    description:
      'Every response ships with Content-Security-Policy, HSTS, X-Frame-Options DENY, and related security headers enforced before responses reach the client — verified by automated security scans.',
  },
  {
    icon: 'eye',
    title: 'Health Monitoring',
    description:
      'A public health endpoint reports database connectivity, service status, and latency in real time. Automated verification suites (1,000+ tests) run against every release, and our public status page reflects the same live data.',
  },
]

const dataProtectionPractices = [
  {
    icon: 'lock',
    title: 'Encryption at Rest and in Transit',
    description:
      'Data in transit is protected by TLS on every connection. Data at rest is encrypted by our managed database provider. Authentication is delegated to Supabase Auth, which handles password hashing and session management — we never store plaintext credentials.',
  },
  {
    icon: 'check-circle-2',
    title: 'Database Backups',
    description:
      'Managed database backups operate at the Supabase infrastructure layer for our project tier. For institutions with specific RTO/RPO requirements, contact us and we will give you a plain answer about current coverage and what a dedicated setup would involve.',
  },
  {
    icon: 'key',
    title: 'Access Management',
    description:
      'Access follows the principle of least privilege: server-side role checks on every route, service keys that never reach the browser, and per-tenant row-level security. Administrative actions are recorded in audit logs.',
  },
  {
    icon: 'file-text',
    title: 'Vulnerability Management',
    description:
      'Every release runs automated dependency audits (0 known vulnerabilities at last audit), static secret scanning of client and server bundles, and a 1,000+ test verification suite including dedicated security tests. We fix what we find before shipping.',
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
            Student data is sacred. ExamForge AI is built with security at every layer we control — from the
            database to the edge — and we are honest about the layers we are still building.
          </p>
        </div>
      </SectionWrapper>

      {/* Security Overview */}
      <SectionWrapper backgroundClassName="bg-[#0C0C0C] border-y border-white/[0.04]">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Security Overview</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Our security posture covers encryption, authentication, access control, auditing, and
            tenant isolation — the layers we control and can prove in code. Every claim on this page
            maps to something measurable in our repository.
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
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Compliance Status (Honest)</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            This is what is actually enforced today versus what is on our roadmap. We do not display
            certifications we have not earned.
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
