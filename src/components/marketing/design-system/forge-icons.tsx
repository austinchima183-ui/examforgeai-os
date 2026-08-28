// ============================================================================
// ExamForge AI — Signature Icon Kit
// ============================================================================
// Custom SVG iconography exclusive to ExamForge AI.
// These icons represent education + AI + assessment concepts that don't
// exist in Lucide or any other icon library.
//
// Every icon is designed to be:
// - Recognizable at 16px, 20px, and 24px
// - Visually distinct from generic SaaS icons
// - Thematically tied to education/AI/assessment
// ============================================================================

import { type SVGProps } from 'react'
import { cn } from '@/lib/utils'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function createIcon(viewBox: string, path: string) {
  return function Icon({ size = 20, className, ...props }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox={viewBox}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn('flex-shrink-0', className)}
        {...props}
      >
        <path d={path} />
      </svg>
    )
  }
}

// ─── The Forge Anvil ───
// Our primary brand icon — an anvil representing the "forge" metaphor.
// Knowledge is forged, not just delivered.

export const ForgeAnvil = createIcon(
  '0 0 24 24',
  'M4 18h16M5 18v-3a1 1 0 011-1h12a1 1 0 011 1v3M7 14V8a1 1 0 011-1h8a1 1 0 011 1v6M9 7V4M15 7V4M9 11h6'
)

// ─── Neural Network ───
// Connected nodes representing AI — not a generic brain icon.
// This is specifically a neural architecture visualization.

export const NeuralNetwork = createIcon(
  '0 0 24 24',
  'M6 5m-1.5 0a1.5 1.5 0 103 0 1.5 1.5 0 10-3 0M18 5m-1.5 0a1.5 1.5 0 103 0 1.5 1.5 0 10-3 0M6 19m-1.5 0a1.5 1.5 0 103 0 1.5 1.5 0 10-3 0M18 19m-1.5 0a1.5 1.5 0 103 0 1.5 1.5 0 10-3 0M12 12m-1.5 0a1.5 1.5 0 103 0 1.5 1.5 0 10-3 0M7.3 6.2l3.4 4.6M16.7 6.2l-3.4 4.6M7.3 17.8l3.4-4.6M16.7 17.8l-3.4-4.6'
)

// ─── Exam Paper ───
// A paper with checkmark — representing CBT/assessment.
// Distinct from generic "document" icons.

export const ExamPaper = createIcon(
  '0 0 24 24',
  'M9 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6H9zM14 2v6h6M9 13l2 2 4-4'
)

// ─── Auto Mark ───
// AI marking/grading — a pen with neural spark.
// Represents the AI auto-marking superpower.

export function AutoMark({ size = 20, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('flex-shrink-0', className)}
      {...props}
    >
      <path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
      <path d="M15 5l4 4" />
      <path d="M20 12v2M22 14h-2M18 10l1-1" />
    </svg>
  )
}

// ─── Live Monitor ───
// Real-time exam monitoring — heartbeat/pulse with screen.
// Represents the live proctoring/supervision feature.

export function LiveMonitor({ size = 20, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('flex-shrink-0', className)}
      {...props}
    >
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
      <path d="M6 10h2l2-4 2 8 2-4h4" />
    </svg>
  )
}

// ─── Student Graph ───
// Student performance trending up — a graduation cap with upward arrow.
// Represents analytics + student outcomes.

export function StudentGraph({ size = 20, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('flex-shrink-0', className)}
      {...props}
    >
      <path d="M22 10V6a2 2 0 00-2-2H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2v-4" />
      <path d="M4 14l4-4 3 3 5-5 4 4" />
      <path d="M20 10h0" />
      <circle cx="20" cy="10" r="1" fill="currentColor" />
    </svg>
  )
}

// ─── Question Spark ───
// AI question generation — a question mark with neural sparkles.
// Represents the AI generator superpower.

export function QuestionSpark({ size = 20, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('flex-shrink-0', className)}
      {...props}
    >
      <path d="M9 9a3 3 0 015.12 1.5c0 1.5-2.12 2-2.12 3.5" />
      <circle cx="12" cy="18" r="0.5" fill="currentColor" />
      <path d="M18 2l1 2 2 1-2 1-1 2-1-2-2-1 2-1zM5 4l.5 1 1 .5-1 .5-.5 1-.5-1-1-.5 1-.5z" />
    </svg>
  )
}

// ─── School Shield ───
// Institutional security — a shield with education pillar.
// Represents security, compliance, trust.

export function SchoolShield({ size = 20, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('flex-shrink-0', className)}
      {...props}
    >
      <path d="M12 2L3 7v5c0 5.25 3.75 10.13 9 11.25C17.25 22.13 21 17.25 21 12V7l-9-5z" />
      <path d="M12 8v8M9 12h6" />
    </svg>
  )
}

// ─── Data Stream ───
// Data flowing through the platform — parallel lines with movement.
// Represents analytics, data flow, integration.

export function DataStream({ size = 20, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('flex-shrink-0', className)}
      {...props}
    >
      <path d="M4 6h16M4 12h12M4 18h8" />
      <path d="M20 12l2-1-2-1M16 18l2-1-2-1" />
    </svg>
  )
}

// ─── Marketplace Shelf ───
// Exam marketplace — a shelf/store with exam papers.
// Represents the marketplace/community feature.

export function MarketplaceShelf({ size = 20, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('flex-shrink-0', className)}
      {...props}
    >
      <path d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v6M15 3v6M9 15v6M15 15v6" />
    </svg>
  )
}

// ─── Parent Connect ───
// Parent portal — two people connected with a bridge/link.
// Represents the parent portal/communication feature.

export function ParentConnect({ size = 20, className, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('flex-shrink-0', className)}
      {...props}
    >
      <circle cx="8" cy="6" r="3" />
      <circle cx="16" cy="6" r="3" />
      <path d="M2 21v-2a4 4 0 014-4h0M22 21v-2a4 4 0 00-4-4h0" />
      <path d="M10 10h4M12 8v4" />
    </svg>
  )
}

// ─── Feature Icon Mapping ───
// Maps feature domain names to their signature icons + gradients.
// This ensures every feature card is consistently branded.

export const featureIconMap = {
  administration: { icon: 'SchoolShield', gradient: 'administration' as const },
  exams: { icon: 'ExamPaper', gradient: 'exams' as const },
  ai: { icon: 'NeuralNetwork', gradient: 'ai' as const },
  analytics: { icon: 'StudentGraph', gradient: 'analytics' as const },
  students: { icon: 'StudentGraph', gradient: 'students' as const },
  security: { icon: 'SchoolShield', gradient: 'security' as const },
  marketplace: { icon: 'MarketplaceShelf', gradient: 'marketplace' as const },
  community: { icon: 'ParentConnect', gradient: 'community' as const },
  integration: { icon: 'DataStream', gradient: 'integration' as const },
  performance: { icon: 'StudentGraph', gradient: 'performance' as const },
  autoMarking: { icon: 'AutoMark', gradient: 'ai' as const },
  liveMonitoring: { icon: 'LiveMonitor', gradient: 'exams' as const },
  questionGeneration: { icon: 'QuestionSpark', gradient: 'ai' as const },
} as const
