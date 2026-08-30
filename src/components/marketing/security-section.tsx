'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import {
  Shield, Lock, Eye, Server, RefreshCw,
  FileCheck, ShieldCheck, CloudCog, BadgeCheck
} from 'lucide-react'
import { SectionWrapper } from '@/components/marketing/section-wrapper'
import { GradientText } from '@/components/marketing/gradient-text'
import { SecurityIllustration } from '@/components/marketing/illustrations'

// ============================================================================
// ExamForge AI — Security Section (Premium AI OS)
// ============================================================================
// Highlights enterprise-grade security features with animated icons,
// forge-glass-surface cards, icon containers, certification badges
// with verified checkmarks, and a subtle grid background pattern.
// ============================================================================

const securityFeatures = [
  {
    icon: Shield,
    title: 'Role-Based Access Control',
    description:
      'Five distinct roles — superAdmin, schoolAdmin, teacher, student, and parent — each with granular permissions.',
    detail: 'Middleware-enforced RBAC at the route level with server-side validation on every request.',
    gradient: 'from-indigo-600 to-indigo-800',
  },
  {
    icon: Lock,
    title: 'End-to-End Encryption',
    description:
      'All data in transit is encrypted with TLS 1.3. Sensitive data at rest is encrypted using AES-256.',
    detail: 'Supabase handles encryption at the database layer with transparent key management.',
    gradient: 'from-cyan-500 to-blue-600',
  },
  {
    icon: Eye,
    title: 'Comprehensive Audit Logs',
    description:
      'Every action is logged — who did what, when, and from where. Complete accountability for all operations.',
    detail: 'Immutable audit trail with retention policies and exportable reports for compliance.',
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    icon: Server,
    title: 'Supabase Infrastructure',
    description:
      'Built on Supabase with enterprise-grade Postgres, real-time subscriptions, and edge functions.',
    detail: 'SOC 2 Type II certified infrastructure with automatic failover and point-in-time recovery.',
    gradient: 'from-amber-500 to-orange-600',
  },
  {
    icon: RefreshCw,
    title: 'Real-Time Data Sync',
    description:
      'Real-time subscriptions ensure data consistency across all connected clients with instant updates.',
    detail: 'WebSocket-based real-time with automatic reconnection and offline queue management.',
    gradient: 'from-amber-500 to-orange-600',
  },
  {
    icon: FileCheck,
    title: 'Automated Backups',
    description:
      'Daily automated backups with point-in-time recovery. Your data is never more than a moment away.',
    detail: 'Geographic redundancy with backups stored in multiple regions for disaster recovery.',
    gradient: 'from-cyan-500 to-indigo-600',
  },
  {
    icon: ShieldCheck,
    title: 'Security Headers',
    description:
      'HTTP security headers including CSP, HSTS, X-Frame-Options enforced at the edge.',
    detail: 'Next.js middleware enforces security headers on every response before it reaches the client.',
    gradient: 'from-teal-500 to-cyan-600',
  },
  {
    icon: CloudCog,
    title: 'Enterprise Security',
    description:
      'Multi-tenant data isolation, SSO readiness, and data residency options for regulated institutions.',
    detail: 'Row-level security policies ensure complete data isolation between schools and tenants.',
    gradient: 'from-indigo-500 to-indigo-700',
  },
]

const certifications = [
  { name: 'SOC 2 Compliant', verified: true },
  { name: 'GDPR Ready', verified: true },
  { name: 'TLS 1.3', verified: true },
  { name: 'AES-256', verified: true },
  { name: '99.9% SLA', verified: true },
  { name: 'ISO 27001 Aligned', verified: true },
]

export function SecuritySection() {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <SectionWrapper id="security" backgroundClassName="bg-[#090909]">
      <div ref={ref}>
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4 }}
            className="text-sm font-medium text-foreground/60 uppercase tracking-wider mb-4"
          >
            Security
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground"
          >
            Enterprise-grade{' '}
            <GradientText preset="cool">security</GradientText>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-4 text-lg text-muted-foreground leading-relaxed"
          >
            Student data is sacred. We built ExamForge AI with security at every layer —
            from the database to the edge — so you can focus on education, not compliance.
          </motion.p>
        </div>

        {/* Security Illustration */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex justify-center mb-12"
        >
          <SecurityIllustration className="h-36 w-auto sm:h-44" />
        </motion.div>

        {/* Security Feature Cards - Forge Glass */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {securityFeatures.map((feature, i) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 25 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.3 + i * 0.06 }}
                className="group relative"
              >
                {/* Gradient border glow on hover */}
                <div
                  className={`absolute -inset-px rounded-xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-25 transition-opacity duration-500 blur-[1px]`}
                  aria-hidden="true"
                />
                <div className="relative rounded-xl border border-white/[0.04] forge-glass-surface forge-card-shadow p-6 hover:border-white/[0.08] hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] transition-all duration-500 h-full">
                  {/* Icon container */}
                  <div className="relative mb-4">
                    <div
                      className={`absolute -inset-2 rounded-xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 blur-lg transition-opacity duration-500`}
                      aria-hidden="true"
                    />
                    <div className={`relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient} shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-2 group-hover:text-primary transition-colors duration-300">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
                  {/* Expandable detail on hover */}
                  <p className="text-[11px] text-foreground/60 leading-relaxed mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {feature.detail}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Certification Badges / Trust Badges */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="mt-12"
        >
          <div className="relative rounded-xl border border-white/[0.04] forge-glass-surface forge-card-shadow p-6 sm:p-8 overflow-hidden">
            {/* Subtle grid background */}
            <div className="absolute inset-0 opacity-[0.03]" aria-hidden="true">
              <svg width="100%" height="100%">
                <defs>
                  <pattern id="security-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                    <path d="M 24 0 L 0 0 0 24" fill="none" stroke="currentColor" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#security-grid)" />
              </svg>
            </div>

            <div className="relative">
              <p className="text-center text-xs font-semibold text-foreground/60 uppercase tracking-wider mb-4">
                Certifications & Compliance
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                {certifications.map((cert, i) => (
                  <motion.div
                    key={cert.name}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={isInView ? { opacity: 1, scale: 1 } : {}}
                    transition={{ duration: 0.3, delay: 0.9 + i * 0.05 }}
                    className="group/badge inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 hover:border-primary/30 hover:bg-white/[0.05] hover:shadow-md hover:shadow-primary/5 transition-all duration-300"
                  >
                    <div className="relative">
                      <BadgeCheck className="h-4 w-4 text-primary" />
                      <motion.div
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                        className="absolute inset-0 rounded-full bg-primary/20 blur-sm"
                        aria-hidden="true"
                      />
                    </div>
                    <span className="text-xs font-medium text-foreground">{cert.name}</span>
                    {cert.verified && (
                      <span className="text-[9px] text-primary font-semibold bg-primary/10 rounded-full px-1.5 py-0.5">
                        Verified
                      </span>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </SectionWrapper>
  )
}
