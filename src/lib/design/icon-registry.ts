// ============================================================================
// ExamForge AI — Icon Registry (RSC-safe)
// ============================================================================
// Server Components CANNOT pass function references (like Lucide icon
// components) as props to Client Components — it throws:
//   "Functions cannot be passed directly to Client Components"
//
// Solution: pass icon NAME STRINGS across the RSC boundary and resolve
// them to components inside the Client Component via this registry.
//
// Usage:
//   Server:  <KpiCard icon="calendar-days" ... />
//   Client:  const Icon = resolveIcon('calendar-days')
// ============================================================================

import * as React from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Award,
  BarChart3,
  Bell,
  BookOpen,
  BookMarked,
  Brain,
  Building2,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  Cpu,
  CreditCard,
  Database,
  DollarSign,
  FileText,
  Flame,
  Globe,
  GraduationCap,
  Heart,
  HelpCircle,
  LayoutDashboard,
  LayoutGrid,
  Lightbulb,
  LineChart,
  Lock,
  Mail,
  Megaphone,
  MessageSquare,
  PieChart,
  Plus,
  School,
  Server,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  UserPlus,
  Users,
  Zap,
  type LucideIcon,
  AlertCircle, Bot, Code, Cookie, Crown, Eye, FileImage, Gavel, Handshake, HardDrive, Key, Landmark, Laptop, MessageCircle, MonitorPlay, Palette, Phone, Puzzle, Scale, Share2, Terminal, UserCheck, Webhook, XCircle,
} from 'lucide-react'

export const ICON_REGISTRY: Record<string, LucideIcon> = {
  activity: Activity,
  'alert-triangle': AlertTriangle,
  'arrow-right': ArrowRight,
  award: Award,
  'bar-chart-3': BarChart3,
  bell: Bell,
  'book-open': BookOpen,
  'book-marked': BookMarked,
  brain: Brain,
  'building-2': Building2,
  calendar: Calendar,
  'calendar-days': CalendarDays,
  'check-circle-2': CheckCircle2,
  'chevron-right': ChevronRight,
  'clipboard-list': ClipboardList,
  clock: Clock,
  cpu: Cpu,
  'credit-card': CreditCard,
  database: Database,
  'dollar-sign': DollarSign,
  'file-text': FileText,
  flame: Flame,
  globe: Globe,
  'graduation-cap': GraduationCap,
  heart: Heart,
  'help-circle': HelpCircle,
  'layout-dashboard': LayoutDashboard,
  'layout-grid': LayoutGrid,
  lightbulb: Lightbulb,
  'line-chart': LineChart,
  lock: Lock,
  mail: Mail,
  megaphone: Megaphone,
  'message-square': MessageSquare,
  'pie-chart': PieChart,
  plus: Plus,
  school: School,
  server: Server,
  settings: Settings,
  shield: Shield,
  'shield-check': ShieldCheck,
  sparkles: Sparkles,
  star: Star,
  target: Target,
  'trending-down': TrendingDown,
  'trending-up': TrendingUp,
  trophy: Trophy,
  'user-plus': UserPlus,
  users: Users,
  'alert-circle': AlertCircle,
  'bot': Bot,
  'code': Code,
  'cookie': Cookie,
  'crown': Crown,
  'eye': Eye,
  'file-image': FileImage,
  'gavel': Gavel,
  'handshake': Handshake,
  'hard-drive': HardDrive,
  'key': Key,
  'landmark': Landmark,
  'laptop': Laptop,
  'message-circle': MessageCircle,
  'monitor-play': MonitorPlay,
  'palette': Palette,
  'phone': Phone,
  'puzzle': Puzzle,
  'scale': Scale,
  'share-2': Share2,
  'terminal': Terminal,
  'user-check': UserCheck,
  'webhook': Webhook,
  'x-circle': XCircle,
  zap: Zap,
}

/**
 * Resolve an icon name (or fall back to a component reference for
 * client-side callers) to a renderable Lucide component.
 */
export function resolveIcon(
  icon: string | LucideIcon | React.ComponentType<{ className?: string }> | undefined,
  fallback?: LucideIcon
): LucideIcon | null {
  if (!icon) return null
  if (typeof icon === 'string') {
    return ICON_REGISTRY[icon] ?? fallback ?? null
  }
  return icon as LucideIcon
}
