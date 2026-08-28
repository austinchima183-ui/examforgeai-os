'use client'

import {
  Shield, GraduationCap, BookOpen, Users,
  Settings, ClipboardList, BarChart3, FileText,
  Bell, CreditCard, Eye, MessageSquare,
  Download, PenTool, Award, Lock, Calendar,
  UserPlus, Bot
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

// ============================================================================
// ExamForge AI — Help Center Role-Based Guides (Client Component)
// ============================================================================
// Tabbed interface for role-specific help guides.
// ============================================================================

interface GuideArticle {
  icon: React.ElementType
  title: string
  description: string
}

interface RoleGuide {
  role: string
  tagline: string
  articles: GuideArticle[]
  quickLinks: { label: string; href: string }[]
}

const roleGuides: RoleGuide[] = [
  {
    role: 'administrator',
    tagline: 'Manage your school, configure settings, and oversee platform operations.',
    articles: [
      { icon: Settings, title: 'School Onboarding Checklist', description: 'Step-by-step checklist for setting up a new school on the platform.' },
      { icon: UserPlus, title: 'Staff Account Provisioning', description: 'Create and manage teacher, admin, and support staff accounts.' },
      { icon: Shield, title: 'Role-Based Access Control', description: 'Configure permissions for different user roles across modules.' },
      { icon: BarChart3, title: 'Analytics Dashboard Overview', description: 'Understand school-wide performance metrics and trends.' },
      { icon: CreditCard, title: 'Subscription & Billing Management', description: 'Manage plans, view invoices, and configure payment methods.' },
      { icon: Lock, title: 'Security Settings & Audit Logs', description: 'Review security configurations and audit log entries.' },
      { icon: Calendar, title: 'Academic Calendar Configuration', description: 'Set up terms, sessions, holidays, and exam schedules.' },
      { icon: Bell, title: 'Notification & Alert Preferences', description: 'Configure system-wide notification rules and delivery channels.' },
    ],
    quickLinks: [
      { label: 'School Settings', href: '/docs' },
      { label: 'User Management', href: '/docs' },
      { label: 'Billing', href: '/docs' },
      { label: 'Security', href: '/docs' },
    ],
  },
  {
    role: 'teacher',
    tagline: 'Create exams, manage classes, leverage AI, and review student performance.',
    articles: [
      { icon: ClipboardList, title: 'Creating Your First CBT Exam', description: 'Walk through the exam creation wizard from start to publish.' },
      { icon: Bot, title: 'AI Question Generation Guide', description: 'Generate curriculum-aligned questions using AI with topic and difficulty controls.' },
      { icon: Eye, title: 'Live Exam Monitoring', description: 'Monitor students during exams — track progress, flag irregularities, and intervene.' },
      { icon: PenTool, title: 'Manual Grading & Rubrics', description: 'Grade essay and short-answer questions with custom rubrics and AI assistance.' },
      { icon: BarChart3, title: 'Class Performance Analytics', description: 'View per-class and per-student performance data, trends, and rankings.' },
      { icon: Award, title: 'Report Card Generation', description: 'Generate and customize end-of-term report cards for students and parents.' },
    ],
    quickLinks: [
      { label: 'Exam Creation', href: '/docs' },
      { label: 'AI Features', href: '/docs' },
      { label: 'Grading', href: '/docs' },
      { label: 'Reports', href: '/docs' },
    ],
  },
  {
    role: 'student',
    tagline: 'Take exams, view results, and access learning resources.',
    articles: [
      { icon: BookOpen, title: 'Taking a CBT Exam', description: 'Complete guide to starting, navigating, and submitting computer-based tests.' },
      { icon: Download, title: 'Offline Exam Mode', description: 'Download exams for offline access when internet is unreliable.' },
      { icon: BarChart3, title: 'Viewing Your Results', description: 'Access scores, view marked answers, and understand performance breakdowns.' },
      { icon: GraduationCap, title: 'Practice Test Mode', description: 'Take practice exams to prepare without affecting your official records.' },
      { icon: MessageSquare, title: 'Contacting Your Teacher', description: 'Use the messaging feature to ask questions or get clarification.' },
    ],
    quickLinks: [
      { label: 'Exam Tips', href: '/docs' },
      { label: 'Offline Mode', href: '/docs' },
      { label: 'View Results', href: '/docs' },
      { label: 'Practice Tests', href: '/docs' },
    ],
  },
  {
    role: 'parent',
    tagline: 'Monitor your child\'s progress, view reports, and communicate with teachers.',
    articles: [
      { icon: Eye, title: 'Parent Portal Overview', description: 'Navigate the parent portal to access all child-related information.' },
      { icon: BarChart3, title: 'Viewing Child\'s Results', description: 'Access exam results, term grades, and performance trends.' },
      { icon: FileText, title: 'Downloading Report Cards', description: 'Download and print official report cards for your child.' },
      { icon: MessageSquare, title: 'Teacher Communication', description: 'Send messages to teachers and schedule parent-teacher conferences.' },
      { icon: CreditCard, title: 'Fee Payment Portal', description: 'View fee statements and make payments securely via Flutterwave.' },
      { icon: Bell, title: 'Notification Settings', description: 'Configure alerts for exam results, fee reminders, and school announcements.' },
    ],
    quickLinks: [
      { label: 'View Results', href: '/docs' },
      { label: 'Pay Fees', href: '/docs' },
      { label: 'Report Cards', href: '/docs' },
      { label: 'Contact Teacher', href: '/docs' },
    ],
  },
]

export function HelpRoleGuides() {
  return (
    <Tabs defaultValue="administrator" className="w-full">
      <TabsList className="w-full sm:w-auto flex flex-wrap h-auto gap-1 p-1">
        <TabsTrigger value="administrator" className="text-xs sm:text-sm">
          <Shield className="h-3.5 w-3.5 mr-1.5" />
          Administrator
        </TabsTrigger>
        <TabsTrigger value="teacher" className="text-xs sm:text-sm">
          <GraduationCap className="h-3.5 w-3.5 mr-1.5" />
          Teacher
        </TabsTrigger>
        <TabsTrigger value="student" className="text-xs sm:text-sm">
          <BookOpen className="h-3.5 w-3.5 mr-1.5" />
          Student
        </TabsTrigger>
        <TabsTrigger value="parent" className="text-xs sm:text-sm">
          <Users className="h-3.5 w-3.5 mr-1.5" />
          Parent
        </TabsTrigger>
      </TabsList>

      {roleGuides.map((guide) => (
        <TabsContent key={guide.role} value={guide.role}>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            {guide.tagline}
          </p>
          {/* Quick Links */}
          <div className="flex flex-wrap gap-2 mb-6">
            {guide.quickLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
              >
                → {link.label}
              </a>
            ))}
          </div>
          {/* Articles Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {guide.articles.map((article) => {
              const Icon = article.icon
              return (
                <a
                  key={article.title}
                  href="/docs"
                  className="group rounded-xl border border-border/50 bg-card/50 p-4 hover:border-primary/30 hover:shadow-sm transition-all duration-200"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary group-hover:bg-primary/15 transition-colors flex-shrink-0">
                      <Icon className="h-4 w-4" />
                    </div>
                    <h4 className="text-sm font-semibold group-hover:text-primary transition-colors leading-snug">
                      {article.title}
                    </h4>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed ml-11">
                    {article.description}
                  </p>
                </a>
              )
            })}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  )
}
