// ============================================================================
// ExamForge AI — Route Constants
// ============================================================================
// Centralized route definitions, metadata, and navigation items.
// All route paths are defined as constants to avoid magic strings.
// Navigation items are grouped by section and include role-based visibility.
// ============================================================================

import type { UserRole } from '@/lib/types'
import {
  LayoutDashboard,
  FileText,
  HelpCircle,
  Users,
  GraduationCap,
  BookOpen,
  BarChart3,
  Settings,
  CreditCard,
  Store,
  Brain,
  CalendarDays,
  FolderOpen,
  Shield,
  School,
  UserCog,
  Lock,
  Activity,
  Bell,
  Globe,
  Database,
  Cpu,
  Wallet,
  Ticket,
  FileSpreadsheet,
  ClipboardList,
  MessageSquare,
  Sparkles,
  Target,
  BookMarked,
  Lightbulb,
  PenTool,
  Presentation,
  type LucideIcon,
} from 'lucide-react'

// ──────────────────────────────────────────────────────────────
// Route Path Constants
// ──────────────────────────────────────────────────────────────

export const ROUTES = {
  // Public routes
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  VERIFY_EMAIL: '/verify-email',
  AUTH_CALLBACK: '/api/auth/callback',

  // Authenticated routes
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  SETTINGS: '/settings',
  NOTIFICATIONS: '/notifications',

  // Exam routes (redirected to /cbt which has an actual page)
  EXAMS: '/cbt',
  EXAM_CREATE: '/exams/create',
  EXAM_DETAIL: '/exams/[id]',
  EXAM_TAKE: '/exams/[id]/take',
  EXAM_RESULTS: '/exams/[id]/results',
  EXAM_TEMPLATES: '/exams/templates',

  // Question bank (redirected to /question-bank which has an actual page)
  QUESTIONS: '/question-bank',
  QUESTIONS_CREATE: '/question-bank/create',

  // Student portal (redirected to /dashboard/student which has an actual page)
  STUDENT_DASHBOARD: '/dashboard/student',
  STUDENT_PRACTICE: '/student/practice',
  STUDENT_FLASHCARDS: '/student/flashcards',
  STUDENT_AI_TUTOR: '/student/ai-tutor',
  STUDENT_STUDY_PLANNER: '/student/study-planner',
  STUDENT_PROGRESS: '/student/progress',
  STUDENT_REVISION_HUB: '/student/revision-hub',
  STUDENT_CERTIFICATES: '/student/certificates',
  STUDENT_EXPLAIN: '/student/explain',

  // Teacher workspace (redirected to /dashboard/teacher which has an actual page)
  TEACHER_DASHBOARD: '/dashboard/teacher',
  TEACHER_LESSON_PLANS: '/teacher/lesson-planner',
  TEACHER_WORKSHEETS: '/teacher/worksheet-builder',
  TEACHER_RUBRICS: '/teacher/rubric-builder',
  TEACHER_GRADING: '/teacher/grading',
  TEACHER_CONTENT_ASSISTANT: '/teacher/content-assistant',
  TEACHER_AI_QUESTION_GENERATOR: '/teacher/ai-question-generator',
  // Teacher calendar redirected to /school/calendar which has an actual page
  TEACHER_CALENDAR: '/school/calendar',

  // School admin
  SCHOOL_DASHBOARD: '/school',
  SCHOOL_CLASSES: '/school/classes',
  SCHOOL_TIMETABLE: '/school/timetable',
  SCHOOL_ATTENDANCE: '/school/attendance',
  SCHOOL_FEES: '/school/fees',
  SCHOOL_CALENDAR: '/school/calendar',

  // AI & Intelligence
  AI_INSIGHTS: '/school-admin/ai-insights',
  AI_PREDICTIVE: '/school-admin/predictive',
  AI_GOVERNMENT: '/government/district-intelligence',
  AI_PARENT_ADVISOR: '/parent/ai-advisor',

  // Super admin (redirected to closest existing pages)
  ADMIN_DASHBOARD: '/admin',
  ADMIN_USERS: '/admin/users',
  ADMIN_SCHOOLS: '/admin/organizations',
  ADMIN_ANALYTICS: '/analytics',
  ADMIN_BILLING: '/billing',
  ADMIN_MARKETPLACE: '/marketplace',
  ADMIN_SETTINGS: '/settings',
  ADMIN_SECURITY: '/admin/security',
  ADMIN_ROLES: '/admin/roles',
  ADMIN_BACKUPS: '/admin/backups',
  ADMIN_INTEGRATIONS: '/admin/integrations',
  ADMIN_ORG_SETTINGS: '/admin/organization-settings',
  ADMIN_AUDIT_LOGS: '/admin/audit-logs',
  ADMIN_BRANDING: '/admin/branding',
  ADMIN_AGENTS: '/admin/agents',
  ADMIN_PLUGINS: '/admin/plugins',
  ADMIN_DEVELOPERS: '/admin/developers',

  // Billing (redirected to /billing which has an actual page)
  BILLING: '/billing',
  BILLING_PLANS: '/billing',
  BILLING_HISTORY: '/billing',
  BILLING_CREDITS: '/billing',
  BILLING_ENTERPRISE: '/billing/enterprise',

  // Marketplace
  MARKETPLACE: '/marketplace',

  // Analytics
  ANALYTICS: '/analytics',
  ANALYTICS_ENTERPRISE: '/analytics/enterprise',

  // Reports
  REPORTS: '/reports',

  // Search
  SEARCH: '/search',

  // CBT
  CBT: '/cbt',

  // Results
  RESULTS: '/results',

  // Question Bank
  QUESTION_BANK: '/question-bank',

  // Workflows
  WORKFLOWS: '/workflows',
} as const

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES]

// ──────────────────────────────────────────────────────────────
// Route Metadata
// ──────────────────────────────────────────────────────────────

export interface RouteMeta {
  title: string
  description: string
  icon: LucideIcon
  requiredRoles?: UserRole[]
  isPublic?: boolean
  badge?: string
}

export const ROUTE_META: Partial<Record<RoutePath, RouteMeta>> = {
  [ROUTES.LOGIN]: {
    title: 'Sign In',
    description: 'Sign in to your ExamForge AI account',
    icon: Lock,
    isPublic: true,
  },
  [ROUTES.REGISTER]: {
    title: 'Create Account',
    description: 'Create a new ExamForge AI account',
    icon: UserCog,
    isPublic: true,
  },
  [ROUTES.FORGOT_PASSWORD]: {
    title: 'Forgot Password',
    description: 'Reset your password',
    icon: Lock,
    isPublic: true,
  },
  [ROUTES.DASHBOARD]: {
    title: 'Dashboard',
    description: 'Your personal dashboard overview',
    icon: LayoutDashboard,
  },
  [ROUTES.EXAMS]: {
    title: 'Exams',
    description: 'Manage and take exams',
    icon: FileText,
  },
  [ROUTES.QUESTIONS]: {
    title: 'Question Bank',
    description: 'Browse and create questions',
    icon: HelpCircle,
  },
  [ROUTES.PROFILE]: {
    title: 'Profile',
    description: 'Manage your profile',
    icon: Users,
  },
  [ROUTES.SETTINGS]: {
    title: 'Settings',
    description: 'Application settings',
    icon: Settings,
  },
  [ROUTES.STUDENT_DASHBOARD]: {
    title: 'Student Portal',
    description: 'Your learning dashboard',
    icon: GraduationCap,
    requiredRoles: ['student'],
  },
  [ROUTES.STUDENT_PRACTICE]: {
    title: 'Practice Mode',
    description: 'Practice with AI-generated questions',
    icon: Target,
    requiredRoles: ['student'],
  },
  [ROUTES.STUDENT_FLASHCARDS]: {
    title: 'Flashcards',
    description: 'Study with flashcards',
    icon: BookMarked,
    requiredRoles: ['student'],
  },
  [ROUTES.STUDENT_AI_TUTOR]: {
    title: 'AI Tutor',
    description: 'Get help from your AI tutor',
    icon: Brain,
    requiredRoles: ['student'],
  },
  [ROUTES.STUDENT_STUDY_PLANNER]: {
    title: 'Study Planner',
    description: 'Plan your study schedule',
    icon: CalendarDays,
    requiredRoles: ['student'],
  },
  [ROUTES.STUDENT_PROGRESS]: {
    title: 'Progress',
    description: 'Track your learning progress',
    icon: BarChart3,
    requiredRoles: ['student'],
  },
  [ROUTES.STUDENT_REVISION_HUB]: {
    title: 'Revision Hub',
    description: 'Focused revision resources',
    icon: BookOpen,
    requiredRoles: ['student'],
  },
  [ROUTES.STUDENT_CERTIFICATES]: {
    title: 'Certificates',
    description: 'Your earned certificates',
    icon: Ticket,
    requiredRoles: ['student'],
  },
  [ROUTES.TEACHER_DASHBOARD]: {
    title: 'Teacher Workspace',
    description: 'Your teaching workspace',
    icon: BookOpen,
    requiredRoles: ['teacher', 'school_admin', 'super_admin'],
  },
  [ROUTES.TEACHER_LESSON_PLANS]: {
    title: 'Lesson Plans',
    description: 'Create and manage lesson plans',
    icon: FileSpreadsheet,
    requiredRoles: ['teacher', 'school_admin', 'super_admin'],
  },
  [ROUTES.TEACHER_WORKSHEETS]: {
    title: 'Worksheets',
    description: 'Generate and manage worksheets',
    icon: FileText,
    requiredRoles: ['teacher', 'school_admin', 'super_admin'],
  },
  [ROUTES.TEACHER_RUBRICS]: {
    title: 'Rubrics',
    description: 'Create and manage rubrics',
    icon: ClipboardList,
    requiredRoles: ['teacher', 'school_admin', 'super_admin'],
  },
  [ROUTES.TEACHER_GRADING]: {
    title: 'Grading',
    description: 'Grade student submissions',
    icon: PenTool,
    requiredRoles: ['teacher', 'school_admin', 'super_admin'],
  },
  [ROUTES.TEACHER_CONTENT_ASSISTANT]: {
    title: 'Content Assistant',
    description: 'AI-powered content assistance',
    icon: Sparkles,
    requiredRoles: ['teacher', 'school_admin', 'super_admin'],
  },
  [ROUTES.TEACHER_CALENDAR]: {
    title: 'Calendar',
    description: 'Schedule and calendar',
    icon: CalendarDays,
    requiredRoles: ['teacher', 'school_admin', 'super_admin'],
  },
  [ROUTES.SCHOOL_DASHBOARD]: {
    title: 'School Admin',
    description: 'School administration dashboard',
    icon: School,
    requiredRoles: ['school_admin', 'super_admin'],
  },
  [ROUTES.ADMIN_DASHBOARD]: {
    title: 'Super Admin',
    description: 'Platform administration',
    icon: Shield,
    requiredRoles: ['super_admin'],
  },
  [ROUTES.ADMIN_USERS]: {
    title: 'User Management',
    description: 'Manage platform users',
    icon: UserCog,
    requiredRoles: ['super_admin'],
  },
  [ROUTES.ADMIN_SCHOOLS]: {
    title: 'Organizations',
    description: 'Manage organizations',
    icon: School,
    requiredRoles: ['super_admin'],
  },
  [ROUTES.ADMIN_SECURITY]: {
    title: 'Security Center',
    description: 'Security settings and monitoring',
    icon: Lock,
    requiredRoles: ['super_admin'],
  },
  [ROUTES.BILLING]: {
    title: 'Billing',
    description: 'Manage your subscription and billing',
    icon: CreditCard,
  },
  [ROUTES.MARKETPLACE]: {
    title: 'Marketplace',
    description: 'Browse and purchase educational content',
    icon: Store,
  },
  [ROUTES.ANALYTICS]: {
    title: 'Analytics',
    description: 'View detailed analytics',
    icon: BarChart3,
    requiredRoles: ['teacher', 'school_admin', 'super_admin'],
  },
}

// ──────────────────────────────────────────────────────────────
// Navigation Item Interface
// ──────────────────────────────────────────────────────────────

export interface NavItem {
  title: string
  href: string
  icon: LucideIcon
  requiredRoles?: UserRole[]
  badge?: string
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline'
  children?: NavItem[]
}

export interface NavSection {
  label: string
  items: NavItem[]
}

// ──────────────────────────────────────────────────────────────
// Navigation Items by Section
// ──────────────────────────────────────────────────────────────

export const MAIN_NAV: NavSection[] = [
  {
    label: 'Overview',
    items: [
      {
        title: 'Dashboard',
        href: ROUTES.DASHBOARD,
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: 'Exams',
    items: [
      {
        title: 'All Exams',
        href: ROUTES.CBT,
        icon: FileText,
      },
      {
        title: 'Results',
        href: ROUTES.RESULTS,
        icon: ClipboardList,
      },
      {
        title: 'Question Bank',
        href: ROUTES.QUESTION_BANK,
        icon: HelpCircle,
      },
    ],
  },
  {
    label: 'Student Portal',
    items: [
      {
        title: 'My Dashboard',
        href: ROUTES.STUDENT_DASHBOARD,
        icon: GraduationCap,
        requiredRoles: ['student'],
      },
      {
        title: 'Practice Mode',
        href: ROUTES.STUDENT_PRACTICE,
        icon: Target,
        requiredRoles: ['student'],
      },
      {
        title: 'Flashcards',
        href: ROUTES.STUDENT_FLASHCARDS,
        icon: BookMarked,
        requiredRoles: ['student'],
      },
      {
        title: 'AI Tutor',
        href: ROUTES.STUDENT_AI_TUTOR,
        icon: Brain,
        requiredRoles: ['student'],
      },
      {
        title: 'Explain Anything',
        href: ROUTES.STUDENT_EXPLAIN,
        icon: Sparkles,
        requiredRoles: ['student'],
        badge: 'AI',
        badgeVariant: 'secondary',
      },
      {
        title: 'Study Planner',
        href: ROUTES.STUDENT_STUDY_PLANNER,
        icon: CalendarDays,
        requiredRoles: ['student'],
      },
      {
        title: 'Revision Hub',
        href: ROUTES.STUDENT_REVISION_HUB,
        icon: BookOpen,
        requiredRoles: ['student'],
      },
      {
        title: 'Certificates',
        href: ROUTES.STUDENT_CERTIFICATES,
        icon: Ticket,
        requiredRoles: ['student'],
      },
      {
        title: 'Progress',
        href: ROUTES.STUDENT_PROGRESS,
        icon: BarChart3,
        requiredRoles: ['student'],
      },
    ],
  },
  {
    label: 'Teacher Workspace',
    items: [
      {
        title: 'Workspace',
        href: ROUTES.TEACHER_DASHBOARD,
        icon: BookOpen,
        requiredRoles: ['teacher', 'school_admin', 'super_admin'],
      },
      {
        title: 'Lesson Plans',
        href: ROUTES.TEACHER_LESSON_PLANS,
        icon: FileSpreadsheet,
        requiredRoles: ['teacher', 'school_admin', 'super_admin'],
      },
      {
        title: 'Worksheets',
        href: ROUTES.TEACHER_WORKSHEETS,
        icon: FileText,
        requiredRoles: ['teacher', 'school_admin', 'super_admin'],
      },
      {
        title: 'Grading',
        href: ROUTES.TEACHER_GRADING,
        icon: PenTool,
        requiredRoles: ['teacher', 'school_admin', 'super_admin'],
      },
      {
        title: 'Content Assistant',
        href: ROUTES.TEACHER_CONTENT_ASSISTANT,
        icon: Sparkles,
        requiredRoles: ['teacher', 'school_admin', 'super_admin'],
        badge: 'AI',
        badgeVariant: 'secondary',
      },
      {
        title: 'AI Question Generator',
        href: ROUTES.TEACHER_AI_QUESTION_GENERATOR,
        icon: Brain,
        requiredRoles: ['teacher', 'school_admin', 'super_admin'],
        badge: 'AI',
        badgeVariant: 'secondary',
      },
      {
        title: 'Rubrics',
        href: ROUTES.TEACHER_RUBRICS,
        icon: ClipboardList,
        requiredRoles: ['teacher', 'school_admin', 'super_admin'],
      },
      {
        title: 'Calendar',
        href: ROUTES.TEACHER_CALENDAR,
        icon: CalendarDays,
        requiredRoles: ['teacher', 'school_admin', 'super_admin'],
      },
    ],
  },
  {
    label: 'School Admin',
    items: [
      {
        title: 'Classes',
        href: '/school/classes',
        icon: Users,
        requiredRoles: ['school_admin', 'super_admin'],
      },
      {
        title: 'Timetable',
        href: '/school/timetable',
        icon: CalendarDays,
        requiredRoles: ['school_admin', 'super_admin'],
      },
      {
        title: 'Attendance',
        href: '/school/attendance',
        icon: ClipboardList,
        requiredRoles: ['school_admin', 'super_admin'],
      },
      {
        title: 'Fees',
        href: '/school/fees',
        icon: Wallet,
        requiredRoles: ['school_admin', 'super_admin'],
      },
      {
        title: 'Calendar',
        href: '/school/calendar',
        icon: CalendarDays,
        requiredRoles: ['school_admin', 'super_admin'],
      },
      {
        title: 'School Settings',
        href: '/school/settings',
        icon: Settings,
        requiredRoles: ['school_admin', 'super_admin'],
      },
      {
        title: 'AI Insights',
        href: ROUTES.AI_INSIGHTS,
        icon: Brain,
        requiredRoles: ['school_admin', 'super_admin'],
        badge: 'AI',
        badgeVariant: 'secondary',
      },
      {
        title: 'Predictive Analytics',
        href: ROUTES.AI_PREDICTIVE,
        icon: Activity,
        requiredRoles: ['school_admin', 'super_admin'],
        badge: 'AI',
        badgeVariant: 'secondary',
      },
    ],
  },
  {
    label: 'Parent Portal',
    items: [
      {
        title: 'Dashboard',
        href: '/parent/dashboard',
        icon: LayoutDashboard,
        requiredRoles: ['parent'],
      },
      {
        title: 'Child Progress',
        href: '/parent/child-progress',
        icon: BarChart3,
        requiredRoles: ['parent'],
      },
      {
        title: 'Attendance',
        href: '/parent/attendance',
        icon: ClipboardList,
        requiredRoles: ['parent'],
      },
      {
        title: 'Fees',
        href: '/parent/fees',
        icon: Wallet,
        requiredRoles: ['parent'],
      },
      {
        title: 'Messaging',
        href: '/parent/messaging',
        icon: MessageSquare,
        requiredRoles: ['parent'],
      },
      {
        title: 'AI Advisor',
        href: ROUTES.AI_PARENT_ADVISOR,
        icon: Brain,
        requiredRoles: ['parent'],
        badge: 'AI',
        badgeVariant: 'secondary',
      },
    ],
  },
  {
    label: 'Government & Policy',
    items: [
      {
        title: 'District Intelligence',
        href: ROUTES.AI_GOVERNMENT,
        icon: Globe,
        requiredRoles: ['super_admin'],
        badge: 'AI',
        badgeVariant: 'secondary',
      },
    ],
  },
  {
    label: 'Administration',
    items: [
      {
        title: 'User Management',
        href: '/admin/users',
        icon: UserCog,
        requiredRoles: ['super_admin', 'school_admin'],
      },
      {
        title: 'Roles & Permissions',
        href: '/admin/roles',
        icon: Shield,
        requiredRoles: ['super_admin'],
      },
      {
        title: 'Audit Logs',
        href: '/admin/audit-logs',
        icon: Activity,
        requiredRoles: ['super_admin', 'school_admin'],
      },
      {
        title: 'Backups',
        href: '/admin/backups',
        icon: Database,
        requiredRoles: ['super_admin'],
      },
      {
        title: 'Integrations',
        href: '/admin/integrations',
        icon: Globe,
        requiredRoles: ['super_admin'],
      },
      {
        title: 'Branding',
        href: '/admin/branding',
        icon: PenTool,
        requiredRoles: ['super_admin', 'school_admin'],
      },
      {
        title: 'Org Settings',
        href: '/admin/organization-settings',
        icon: Settings,
        requiredRoles: ['super_admin'],
      },
      {
        title: 'Agents',
        href: '/admin/agents',
        icon: Cpu,
        requiredRoles: ['super_admin'],
      },
      {
        title: 'Plugins',
        href: '/admin/plugins',
        icon: Database,
        requiredRoles: ['super_admin'],
      },
      {
        title: 'Developers',
        href: '/admin/developers',
        icon: Globe,
        requiredRoles: ['super_admin'],
      },
    ],
  },
  {
    label: 'Account',
    items: [
      {
        title: 'Billing',
        href: ROUTES.BILLING,
        icon: CreditCard,
        requiredRoles: ['teacher', 'school_admin', 'super_admin'],
      },
      {
        title: 'Marketplace',
        href: ROUTES.MARKETPLACE,
        icon: Store,
      },
      {
        title: 'Analytics',
        href: ROUTES.ANALYTICS,
        icon: BarChart3,
        requiredRoles: ['teacher', 'school_admin', 'super_admin'],
      },
      {
        title: 'Reports',
        href: ROUTES.REPORTS,
        icon: FileSpreadsheet,
        requiredRoles: ['teacher', 'school_admin', 'super_admin'],
      },
      {
        title: 'Search',
        href: ROUTES.SEARCH,
        icon: Globe,
      },
      {
        title: 'Settings',
        href: ROUTES.SETTINGS,
        icon: Settings,
      },
    ],
  },
]

// ──────────────────────────────────────────────────────────────
// Public Route Paths
// ──────────────────────────────────────────────────────────────

export const PUBLIC_ROUTES: string[] = [
  ROUTES.LOGIN,
  ROUTES.REGISTER,
  ROUTES.FORGOT_PASSWORD,
  ROUTES.RESET_PASSWORD,
  ROUTES.VERIFY_EMAIL,
  ROUTES.AUTH_CALLBACK,
]

// ──────────────────────────────────────────────────────────────
// Role-Based Route Access Map
// ──────────────────────────────────────────────────────────────

export const ROLE_ROUTE_ACCESS: Record<UserRole, string[]> = {
  student: [
    ROUTES.DASHBOARD,
    ROUTES.EXAMS,
    ROUTES.QUESTIONS,
    ROUTES.STUDENT_DASHBOARD,
    ROUTES.STUDENT_PRACTICE,
    ROUTES.STUDENT_FLASHCARDS,
    ROUTES.STUDENT_AI_TUTOR,
    ROUTES.STUDENT_STUDY_PLANNER,
    ROUTES.STUDENT_PROGRESS,
    ROUTES.STUDENT_REVISION_HUB,
    ROUTES.STUDENT_CERTIFICATES,
    ROUTES.MARKETPLACE,
    ROUTES.BILLING,
    ROUTES.PROFILE,
    ROUTES.SETTINGS,
    ROUTES.NOTIFICATIONS,
  ],
  teacher: [
    ROUTES.DASHBOARD,
    ROUTES.EXAMS,
    ROUTES.QUESTIONS,
    ROUTES.TEACHER_DASHBOARD,
    ROUTES.TEACHER_LESSON_PLANS,
    ROUTES.TEACHER_WORKSHEETS,
    ROUTES.TEACHER_RUBRICS,
    ROUTES.TEACHER_GRADING,
    ROUTES.TEACHER_CONTENT_ASSISTANT,
    ROUTES.TEACHER_AI_QUESTION_GENERATOR,
    ROUTES.TEACHER_CALENDAR,
    ROUTES.MARKETPLACE,
    ROUTES.BILLING,
    ROUTES.BILLING_PLANS,
    ROUTES.BILLING_CREDITS,
    ROUTES.ANALYTICS,
    ROUTES.PROFILE,
    ROUTES.SETTINGS,
    ROUTES.NOTIFICATIONS,
  ],
  school_admin: [
    ROUTES.DASHBOARD,
    ROUTES.EXAMS,
    ROUTES.QUESTIONS,
    ROUTES.TEACHER_DASHBOARD,
    ROUTES.TEACHER_LESSON_PLANS,
    ROUTES.TEACHER_WORKSHEETS,
    ROUTES.TEACHER_RUBRICS,
    ROUTES.TEACHER_GRADING,
    ROUTES.TEACHER_CONTENT_ASSISTANT,
    ROUTES.TEACHER_CALENDAR,
    ROUTES.SCHOOL_DASHBOARD,
    ROUTES.SCHOOL_CLASSES,
    ROUTES.AI_INSIGHTS,
    ROUTES.AI_PREDICTIVE,
    ROUTES.MARKETPLACE,
    ROUTES.BILLING,
    ROUTES.BILLING_PLANS,
    ROUTES.ANALYTICS,
    ROUTES.PROFILE,
    ROUTES.SETTINGS,
    ROUTES.NOTIFICATIONS,
  ],
  super_admin: [
    ROUTES.DASHBOARD,
    ROUTES.EXAMS,
    ROUTES.QUESTIONS,
    ROUTES.ADMIN_DASHBOARD,
    ROUTES.ADMIN_USERS,
    ROUTES.ADMIN_SCHOOLS,
    ROUTES.ADMIN_SECURITY,
    ROUTES.ADMIN_ROLES,
    ROUTES.ADMIN_BACKUPS,
    ROUTES.ADMIN_INTEGRATIONS,
    ROUTES.ADMIN_ORG_SETTINGS,
    ROUTES.ADMIN_AUDIT_LOGS,
    ROUTES.ADMIN_BRANDING,
    ROUTES.ADMIN_AGENTS,
    ROUTES.ADMIN_PLUGINS,
    ROUTES.ADMIN_DEVELOPERS,
    ROUTES.SCHOOL_DASHBOARD,
    ROUTES.SCHOOL_CLASSES,
    ROUTES.TEACHER_DASHBOARD,
    ROUTES.TEACHER_LESSON_PLANS,
    ROUTES.TEACHER_WORKSHEETS,
    ROUTES.TEACHER_RUBRICS,
    ROUTES.TEACHER_GRADING,
    ROUTES.TEACHER_CONTENT_ASSISTANT,
    ROUTES.MARKETPLACE,
    ROUTES.BILLING,
    ROUTES.ANALYTICS,
    ROUTES.PROFILE,
    ROUTES.SETTINGS,
    ROUTES.NOTIFICATIONS,
  ],
  parent: [
    ROUTES.DASHBOARD,
    ROUTES.EXAMS,
    ROUTES.STUDENT_DASHBOARD,
    ROUTES.STUDENT_PRACTICE,
    ROUTES.STUDENT_PROGRESS,
    ROUTES.MARKETPLACE,
    ROUTES.BILLING,
    ROUTES.PROFILE,
    ROUTES.SETTINGS,
    ROUTES.NOTIFICATIONS,
  ],
}

// ──────────────────────────────────────────────────────────────
// Route Segment Labels (for breadcrumbs)
// ──────────────────────────────────────────────────────────────

export const ROUTE_SEGMENT_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  login: 'Sign In',
  register: 'Create Account',
  'forgot-password': 'Forgot Password',
  'reset-password': 'Reset Password',
  'verify-email': 'Verify Email',
  profile: 'Profile',
  settings: 'Settings',
  notifications: 'Notifications',
  exams: 'Exams',
  create: 'Create',
  take: 'Take',
  results: 'Results',
  templates: 'Templates',
  'question-bank': 'Question Bank',
  student: 'Student Portal',
  parent: 'Parent Portal',
  practice: 'Practice',
  flashcards: 'Flashcards',
  'ai-tutor': 'AI Tutor',
  'study-planner': 'Study Planner',
  progress: 'Progress',
  'revision-hub': 'Revision Hub',
  certificates: 'Certificates',
  explain: 'Explain Anything',
  teacher: 'Teacher Workspace',
  'lesson-planner': 'Lesson Plans',
  'worksheet-builder': 'Worksheets',
  'rubric-builder': 'Rubrics',
  grading: 'Grading',
  'content-assistant': 'Content Assistant',
  'ai-question-generator': 'AI Question Generator',
  'ai-insights': 'AI Insights',
  predictive: 'Predictive Analytics',
  'district-intelligence': 'District Intelligence',
  'ai-advisor': 'AI Advisor',
  'child-progress': 'Child Progress',
  messaging: 'Messaging',
  school: 'School Admin',
  classes: 'Classes',
  timetable: 'Timetable',
  attendance: 'Attendance',
  fees: 'Fees',
  calendar: 'Calendar',
  admin: 'Admin',
  'audit-logs': 'Audit Logs',
  backups: 'Backups',
  integrations: 'Integrations',
  branding: 'Branding',
  'organization-settings': 'Org Settings',
  roles: 'Roles & Permissions',
  agents: 'Agents',
  plugins: 'Plugins',
  developers: 'Developers',
  organizations: 'Organizations',
  billing: 'Billing',
  analytics: 'Analytics',
  marketplace: 'Marketplace',
  security: 'Security',
  cbt: 'CBT',
  search: 'Search',
  reports: 'Reports',
  workflows: 'Workflows',
}
