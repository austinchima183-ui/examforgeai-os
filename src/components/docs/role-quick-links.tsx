'use client'

import {
  Shield, GraduationCap, BookOpen, Users, BarChart3,
  ClipboardList, Bell, Settings, FileText, Lock,
  Calendar, CreditCard, MessageSquare, Eye,
  Download, PenTool, Award, BookmarkCheck
} from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

// ============================================================================
// ExamForge AI — Role-Based Quick Links (Client Component)
// ============================================================================
// Tabbed interface showing role-specific documentation quick links
// for Admin, Teacher, Student, and Parent roles.
// ============================================================================

interface RoleLink {
  icon: React.ElementType
  label: string
  href: string
}

interface RoleData {
  role: string
  description: string
  links: RoleLink[]
}

const rolesData: RoleData[] = [
  {
    role: 'admin',
    description: 'Resources for school administrators and IT managers to configure, manage, and oversee the platform.',
    links: [
      { icon: Settings, label: 'School Configuration', href: '/docs' },
      { icon: Shield, label: 'User Roles & Permissions', href: '/docs' },
      { icon: Users, label: 'Staff Management', href: '/docs' },
      { icon: BarChart3, label: 'Analytics Dashboard', href: '/docs' },
      { icon: CreditCard, label: 'Billing & Subscriptions', href: '/docs' },
      { icon: Bell, label: 'Notification Preferences', href: '/docs' },
      { icon: Lock, label: 'Security Settings', href: '/docs' },
      { icon: Calendar, label: 'Academic Calendar Setup', href: '/docs' },
    ],
  },
  {
    role: 'teacher',
    description: 'Guides for teachers to create exams, manage classes, generate AI questions, and review results.',
    links: [
      { icon: ClipboardList, label: 'Creating an Exam', href: '/docs' },
      { icon: GraduationCap, label: 'AI Question Generation', href: '/docs' },
      { icon: Eye, label: 'Live Exam Monitoring', href: '/docs' },
      { icon: FileText, label: 'Auto-Marking Setup', href: '/docs' },
      { icon: BarChart3, label: 'Viewing Results', href: '/docs' },
      { icon: Users, label: 'Class Management', href: '/docs' },
      { icon: PenTool, label: 'Manual Grading', href: '/docs' },
      { icon: Award, label: 'Report Card Generation', href: '/docs' },
    ],
  },
  {
    role: 'student',
    description: 'Help for students to take exams, view results, and use the learning portal effectively.',
    links: [
      { icon: BookOpen, label: 'Taking a CBT Exam', href: '/docs' },
      { icon: Download, label: 'Offline Exam Mode', href: '/docs' },
      { icon: BarChart3, label: 'Viewing Your Results', href: '/docs' },
      { icon: BookmarkCheck, label: 'Practice Tests', href: '/docs' },
      { icon: GraduationCap, label: 'Learning Resources', href: '/docs' },
      { icon: MessageSquare, label: 'Contacting Your Teacher', href: '/docs' },
    ],
  },
  {
    role: 'parent',
    description: 'Resources for parents to monitor student progress, view reports, and communicate with teachers.',
    links: [
      { icon: Eye, label: 'Parent Portal Overview', href: '/docs' },
      { icon: BarChart3, label: 'Viewing Child Results', href: '/docs' },
      { icon: MessageSquare, label: 'Teacher Communication', href: '/docs' },
      { icon: Bell, label: 'Notification Settings', href: '/docs' },
      { icon: CreditCard, label: 'Fee Payment Portal', href: '/docs' },
      { icon: FileText, label: 'Downloading Report Cards', href: '/docs' },
    ],
  },
]

export function RoleQuickLinks() {
  return (
    <Tabs defaultValue="admin" className="w-full">
      <TabsList className="w-full sm:w-auto flex flex-wrap h-auto gap-1 p-1">
        <TabsTrigger value="admin" className="text-xs sm:text-sm">
          <Shield className="h-3.5 w-3.5 mr-1.5" />
          Admin
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

      {rolesData.map((roleData) => (
        <TabsContent key={roleData.role} value={roleData.role}>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            {roleData.description}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {roleData.links.map((link) => {
              const Icon = link.icon
              return (
                <a
                  key={link.label}
                  href={link.href}
                  className="group flex items-center gap-3 rounded-lg border border-border/50 bg-card/50 p-3 hover:border-primary/30 hover:shadow-sm transition-all duration-200"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary group-hover:bg-primary/15 transition-colors flex-shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium group-hover:text-primary transition-colors">
                    {link.label}
                  </span>
                </a>
              )
            })}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  )
}
