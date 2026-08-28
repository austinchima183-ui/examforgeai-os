'use client'

import { motion } from 'framer-motion'
import {
  Home, Users, MonitorPlay, BarChart3, Bot, Store,
  Settings, Bell, Search, ChevronDown, Plus, Filter,
  Calendar, Clock, CheckCircle2, AlertTriangle, TrendingUp,
  FileText, GraduationCap, BookOpen, MessageSquare,
  CreditCard, Shield, MoreHorizontal, ArrowRight,
  Star, Download, Eye, Zap, Award, Mail, Phone,
  Building2, Globe, Layers, ChevronRight, X,
  Play, Pause, SkipForward, RefreshCw, Share2,
  Copy, ExternalLink, Bookmark, Heart, ThumbsUp,
  Mic, Image, Paperclip, Send, Circle, Check,
  Moon, Sun, LogOut, HelpCircle, Layout, PieChart,
  Target, Activity, FolderOpen, Tag, Hash,
  Flame, Keyboard, Sparkles, Flag, Timer,
  ChevronLeft,
  PenTool, Crown,
  Wifi, Save, XCircle, Upload, Columns3,
  FileSpreadsheet, FlaskConical
} from 'lucide-react'

// ============================================================================
// ExamForge AI — Production-Quality Product UI Screens
// ============================================================================
// These are NOT illustrations or mockups. They replicate the exact UI of the
// shipped ExamForge product with real data density, proper chrome, and
// authentic detail. Every pixel should say "this product exists."
// ============================================================================

// ─── Sparkline SVG helper ───

function Sparkline({ data, color = 'text-indigo-500', className = '' }: { data: number[]; color?: string; className?: string }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const w = 40
  const h = 14
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={`w-10 h-3.5 ${color} ${className}`} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points={points} />
    </svg>
  )
}

// ─── Mini circular progress ring ───

function ProgressRing({ progress, size = 28, strokeWidth = 3, className = '' }: { progress: number; size?: number; strokeWidth?: number; className?: string }) {
  const r = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference - (progress / 100) * circumference
  return (
    <svg width={size} height={size} className={className} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-muted/30" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="text-green-600 dark:text-green-400" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </svg>
  )
}

// ─── Shared App Chrome ───

const sidebarItems = [
  { icon: Home, label: 'Dashboard', active: false, badge: 0 },
  { icon: Users, label: 'Students', active: false, badge: 0 },
  { icon: MonitorPlay, label: 'CBT Exams', active: true, badge: 2 },
  { icon: Bot, label: 'AI Generate', active: false, badge: 1 },
  { icon: BarChart3, label: 'Analytics', active: false, badge: 0 },
  { icon: Store, label: 'Marketplace', active: false, badge: 0 },
  { icon: MessageSquare, label: 'Messages', active: false, badge: 3 },
  { icon: Settings, label: 'Settings', active: false, badge: 0 },
]

function AppSidebar({ items = sidebarItems, className = '' }: { items?: typeof sidebarItems; className?: string }) {
  return (
    <div className={`w-[180px] shrink-0 border-r border-border/30 bg-card/50 py-3 px-2 flex flex-col hidden md:block ${className}`} aria-hidden="true">
      {/* Logo with Pro badge */}
      <div className="flex items-center gap-2 px-2 py-2 mb-3">
        <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
          <BookOpen className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-xs font-bold tracking-tight">ExamForge</span>
        <span className="ml-auto rounded bg-primary/15 px-1.5 py-0 text-[8px] font-bold text-primary">PRO</span>
      </div>
      <div className="flex-1 space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <div
              key={item.label}
              className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors ${
                item.active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted/50'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
              {item.badge > 0 && (
                <span className="ml-auto rounded-full bg-primary px-1 py-0 text-[9px] text-primary-foreground font-bold">{item.badge}</span>
              )}
            </div>
          )
        })}
      </div>
      {/* User section at bottom */}
      <div className="border-t border-border/30 pt-2 mt-2">
        <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-500 to-amber-500 flex items-center justify-center text-[9px] font-bold text-white shrink-0">AO</div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold truncate">Admin Okafor</p>
            <p className="text-[8px] text-muted-foreground">School Admin</p>
          </div>
          <LogOut className="h-3 w-3 text-muted-foreground shrink-0" />
        </div>
      </div>
    </div>
  )
}

function AppTopBar({ title, subtitle, breadcrumb, showSearch = true, showUser = true, showLive = false }: { title: string; subtitle?: string; breadcrumb?: string; showSearch?: boolean; showUser?: boolean; showLive?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-border/30 px-4 py-2 bg-card/30" aria-hidden="true">
      <div className="flex items-center gap-3">
        <div>
          {breadcrumb && (
            <p className="text-[9px] text-muted-foreground mb-0.5">{breadcrumb}</p>
          )}
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold">{title}</p>
            {showLive && (
              <span className="flex items-center gap-1 rounded-full bg-green-50 dark:bg-green-9500/10 px-1.5 py-0 text-[8px] font-medium text-green-600 dark:text-green-400">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-50 dark:bg-green-9500" />
                </span>
                Live
              </span>
            )}
          </div>
          {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {showSearch && (
          <div className="flex items-center gap-1.5 rounded-md border border-border/30 bg-muted/30 px-2 py-1">
            <Search className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground w-20">Search...</span>
            <span className="text-[9px] text-muted-foreground border border-border/30 rounded px-1">&#8984;K</span>
          </div>
        )}
        <div className="relative">
          <Bell className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive/100" />
        </div>
        {showUser && (
          <div className="flex items-center gap-1.5">
            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-indigo-500 to-amber-500 flex items-center justify-center text-[8px] font-bold text-white">AO</div>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── 1. Admin Dashboard ───

export function AdminDashboardScreen() {
  const chartBars = [42, 58, 52, 67, 61, 73, 68, 82, 77, 89, 84, 91]
  const chartMonths = ['Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun']
  return (
    <div className="flex rounded-xl border border-border/40 bg-card/95 overflow-hidden shadow-2xl" aria-hidden="true">
      <AppSidebar items={[
        { icon: Home, label: 'Dashboard', active: true, badge: 0 },
        { icon: Users, label: 'Students', active: false, badge: 0 },
        { icon: MonitorPlay, label: 'CBT Exams', active: false, badge: 2 },
        { icon: Bot, label: 'AI Generate', active: false, badge: 1 },
        { icon: BarChart3, label: 'Analytics', active: false, badge: 0 },
        { icon: Store, label: 'Marketplace', active: false, badge: 0 },
        { icon: MessageSquare, label: 'Messages', active: false, badge: 3 },
        { icon: Settings, label: 'Settings', active: false, badge: 0 },
      ]} />
      <div className="flex-1 min-w-0">
        <AppTopBar title="Overview" subtitle="Kingsley College · 2024/25 Academic Year" breadcrumb="Dashboard" showLive />
        <div className="p-4 space-y-4">
          {/* KPI Cards with sparklines */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Total Students', value: '2,847', change: '+12.5%', icon: Users, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-500/10', sparkData: [2100, 2200, 2350, 2400, 2500, 2600, 2847] },
              { label: 'Active Exams', value: '23', change: '3 today', icon: MonitorPlay, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500/10', sparkData: [12, 15, 14, 18, 20, 19, 23] },
              { label: 'Pass Rate', value: '94.7%', change: '+3.2%', icon: TrendingUp, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-9500/10', sparkData: [88, 89, 90, 91, 92, 93, 94.7] },
              { label: 'AI Accuracy', value: '99.1%', change: '+0.4%', icon: Bot, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-9500/10', sparkData: [98.2, 98.4, 98.5, 98.7, 98.9, 99.0, 99.1] },
            ].map(kpi => (
              <div key={kpi.label} className="rounded-lg border border-border/30 bg-background p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-muted-foreground">{kpi.label}</span>
                  <div className={`h-5 w-5 rounded-md ${kpi.bg} flex items-center justify-center`}>
                    <kpi.icon className={`h-3 w-3 ${kpi.color}`} />
                  </div>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-lg font-bold tracking-tight">{kpi.value}</p>
                    <p className="text-[10px] text-green-600 dark:text-green-400 font-medium">{kpi.change}</p>
                  </div>
                  <Sparkline data={kpi.sparkData} />
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            {[
              { label: 'Create Exam', icon: Plus, color: 'bg-primary text-primary-foreground' },
              { label: 'Generate Questions', icon: Sparkles, color: 'bg-violet-600 text-white' },
              { label: 'View Reports', icon: FileText, color: 'bg-emerald-600 text-white' },
              { label: 'Send Message', icon: Send, color: 'bg-amber-600 text-white' },
            ].map(action => (
              <button key={action.label} className={`flex items-center gap-1.5 rounded-lg ${action.color} px-3 py-1.5 text-[10px] font-medium shadow-sm`}>
                <action.icon className="h-3 w-3" />
                {action.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* Exam Activity Chart with animated bars */}
            <div className="col-span-2 rounded-lg border border-border/30 bg-background p-3">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold">Exam Performance Trend</p>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-muted-foreground rounded-md border border-border/30 px-1.5 py-0.5">6 months</span>
                </div>
              </div>
              <div className="flex items-end gap-1 h-24">
                {chartBars.map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                    <motion.div
                      className="w-full rounded-t-sm bg-gradient-to-t from-indigo-500/80 to-indigo-500/30 min-h-[2px]"
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ duration: 0.6, delay: i * 0.04 }}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-1 mt-1">
                {chartMonths.map(m => (
                  <span key={m} className="flex-1 text-center text-[7px] text-muted-foreground">{m}</span>
                ))}
              </div>
            </div>

            {/* Recent Activity - 7 items */}
            <div className="rounded-lg border border-border/30 bg-background p-3">
              <p className="text-xs font-semibold mb-3">Recent Activity</p>
              <div className="space-y-2">
                {[
                  { icon: CheckCircle2, text: 'SS2 Biology marked', time: '2m ago', color: 'text-green-600 dark:text-green-400' },
                  { icon: Bot, text: 'AI generated 40 questions', time: '5m ago', color: 'text-violet-500' },
                  { icon: AlertTriangle, text: '3 students flagged', time: '12m ago', color: 'text-yellow-600 dark:text-yellow-400' },
                  { icon: Users, text: '14 new enrollments', time: '1h ago', color: 'text-primary' },
                  { icon: CreditCard, text: '₦2.4M fees collected', time: '2h ago', color: 'text-cyan-500' },
                  { icon: MonitorPlay, text: 'SS3 Math exam started', time: '3h ago', color: 'text-indigo-500' },
                  { icon: Shield, text: 'Security audit passed', time: '5h ago', color: 'text-green-600 dark:text-green-400' },
                ].map(a => (
                  <div key={a.text} className="flex items-start gap-2">
                    <a.icon className={`h-3 w-3 mt-0.5 ${a.color}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] truncate">{a.text}</p>
                      <p className="text-[9px] text-muted-foreground">{a.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Active Exams Table - 6 rows */}
          <div className="rounded-lg border border-border/30 bg-background">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/20">
              <p className="text-xs font-semibold">Active CBT Exams</p>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-muted-foreground border border-border/30 rounded px-1.5 py-0.5 flex items-center gap-1"><Filter className="h-2.5 w-2.5" /> Filter</span>
                <span className="text-[9px] text-primary font-medium">View all</span>
              </div>
            </div>
            <div className="divide-y divide-border/10">
              {[
                { name: 'SS2 Biology Mid-Term', students: 156, progress: 73, status: 'Live', statusColor: 'bg-green-50 dark:bg-green-9500/10 text-green-600 dark:text-green-400', time: '32:45' },
                { name: 'SS3 Mathematics WAEC Prep', students: 243, progress: 45, status: 'Live', statusColor: 'bg-green-50 dark:bg-green-9500/10 text-green-600 dark:text-green-400', time: '1:12:30' },
                { name: 'SS1 English Continuous Assessment', students: 89, progress: 100, status: 'Marking', statusColor: 'bg-yellow-50 dark:bg-yellow-9500/10 text-yellow-600 dark:text-yellow-400', time: 'Completed' },
                { name: 'JAMB Physics Mock Exam', students: 312, progress: 0, status: 'Scheduled', statusColor: 'bg-primary/100/10 text-primary', time: 'Starts 2:00 PM' },
                { name: 'SS2 Chemistry NECO Practice', students: 128, progress: 88, status: 'Live', statusColor: 'bg-green-50 dark:bg-green-9500/10 text-green-600 dark:text-green-400', time: '08:21' },
                { name: 'SS1 Civic Education Test', students: 67, progress: 100, status: 'Marking', statusColor: 'bg-yellow-50 dark:bg-yellow-9500/10 text-yellow-600 dark:text-yellow-400', time: 'Completed' },
              ].map(exam => (
                <div key={exam.name} className="flex items-center gap-3 px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium truncate">{exam.name}</p>
                    <p className="text-[9px] text-muted-foreground">{exam.students} students</p>
                  </div>
                  <div className="w-20">
                    <div className="h-1 rounded-full bg-muted/50 overflow-hidden">
                      <div className={`h-full rounded-full ${exam.progress === 100 ? 'bg-yellow-50 dark:bg-yellow-9500' : 'bg-indigo-500'}`} style={{ width: `${exam.progress}%` }} />
                    </div>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium flex items-center gap-1 ${exam.statusColor}`}>
                    {exam.status === 'Live' && (
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-50 dark:bg-green-9500" />
                      </span>
                    )}
                    {exam.status}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono w-20 text-right">{exam.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── 2. CBT Exam Interface (Live Student View) ───

export function CBTExamInterfaceScreen() {
  return (
    <div className="flex rounded-xl border border-border/40 bg-card/95 overflow-hidden shadow-2xl" aria-hidden="true">
      {/* Left: Question navigation panel */}
      <div className="w-[160px] shrink-0 border-r border-border/30 bg-muted/20 p-3 hidden lg:block">
        <p className="text-[10px] font-semibold mb-2">Question Navigator</p>
        <div className="grid grid-cols-5 gap-1.5">
          {Array.from({ length: 40 }, (_, i) => {
            const answered = i < 14
            const current = i === 14
            const flagged = i === 7 || i === 22
            return (
              <div
                key={i}
                className={`h-5 w-5 rounded text-[8px] font-bold flex items-center justify-center ${
                  current
                    ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                    : answered
                    ? 'bg-green-50 dark:bg-green-9500/20 text-green-600 dark:text-green-400'
                    : flagged
                    ? 'bg-yellow-50 dark:bg-yellow-9500/20 text-yellow-600 dark:text-yellow-400'
                    : 'bg-muted/50 text-muted-foreground'
                }`}
              >
                {i + 1}
              </div>
            )
          })}
        </div>
        <div className="mt-3 space-y-1">
          <div className="flex items-center gap-1.5 text-[9px]">
            <div className="h-2 w-2 rounded bg-green-50 dark:bg-green-9500/20" /> Answered (14)
          </div>
          <div className="flex items-center gap-1.5 text-[9px]">
            <div className="h-2 w-2 rounded bg-yellow-50 dark:bg-yellow-9500/20" /> Flagged (2)
          </div>
          <div className="flex items-center gap-1.5 text-[9px]">
            <div className="h-2 w-2 rounded bg-muted/50" /> Not visited (24)
          </div>
        </div>
      </div>

      {/* Right: Question content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between border-b border-border/30 px-4 py-2">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-primary flex items-center justify-center">
              <BookOpen className="h-3 w-3 text-primary-foreground" />
            </div>
            <div>
              <p className="text-[11px] font-semibold">SS2 Biology — Mid-Term Examination</p>
              <p className="text-[9px] text-muted-foreground">Kingsley College · 40 Questions · 60 Minutes</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Pulsing timer */}
            <div className="flex items-center gap-1.5 rounded-md bg-destructive/100/10 border border-destructive/20 px-2.5 py-1 animate-pulse">
              <Clock className="h-3 w-3 text-destructive" />
              <span className="text-xs font-mono font-bold text-destructive">27:42</span>
            </div>
            {/* Connected with pulsing green dot */}
            <span className="flex items-center gap-1.5 rounded-full bg-green-50 dark:bg-green-9500/10 px-2 py-0.5 text-[9px] font-medium text-green-600 dark:text-green-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-50 dark:bg-green-9500" />
              </span>
              Connected
            </span>
          </div>
        </div>

        <div className="p-4 space-y-4 max-w-2xl">
          {/* Progress */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium">Question 15 of 40</span>
            <span className="text-[10px] text-muted-foreground">Section A — Multiple Choice</span>
          </div>
          <div className="h-1 rounded-full bg-muted/50 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: '37.5%' }} />
          </div>

          {/* Question with AI assist button */}
          <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-indigo-500/10 px-1.5 py-0.5 text-[9px] font-medium text-indigo-600">BIO-15</span>
                <span className="text-[9px] text-muted-foreground">2 marks · Difficulty: Medium</span>
              </div>
              <button className="flex items-center gap-1 rounded-md bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 text-[8px] font-medium text-violet-600">
                <Sparkles className="h-2.5 w-2.5" /> AI Hint
              </button>
            </div>
            <p className="text-sm font-medium leading-relaxed">Which of the following organelles is responsible for converting light energy into chemical energy in plant cells during photosynthesis?</p>
          </div>

          {/* Answer Options */}
          <div className="grid grid-cols-1 gap-2">
            {[
              { letter: 'A', text: 'Mitochondria — the powerhouse of the cell' },
              { letter: 'B', text: 'Chloroplast — contains chlorophyll pigments' },
              { letter: 'C', text: 'Ribosome — site of protein synthesis' },
              { letter: 'D', text: 'Golgi apparatus — modifies and packages proteins' },
            ].map((opt, i) => (
              <div
                key={opt.letter}
                className={`flex items-center gap-3 rounded-lg border p-3 transition-all cursor-pointer ${
                  i === 1
                    ? 'border-indigo-500/40 bg-indigo-500/8 ring-1 ring-indigo-500/20'
                    : 'border-border/30 bg-background/50 hover:border-border/50'
                }`}
              >
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  i === 1
                    ? 'bg-indigo-500 text-white'
                    : 'bg-muted/50 text-muted-foreground'
                }`}>
                  {i === 1 ? <Check className="h-3.5 w-3.5" /> : opt.letter}
                </span>
                <span className={`text-xs ${i === 1 ? 'font-medium' : ''}`}>{opt.text}</span>
                {i === 1 && <span className="ml-auto text-[9px] text-indigo-600 font-medium">Selected</span>}
              </div>
            ))}
          </div>

          {/* Action bar with keyboard shortcuts */}
          <div className="flex items-center justify-between pt-2 border-t border-border/20">
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1 rounded-md border border-amber-500/30 bg-yellow-50 dark:bg-yellow-9500/5 px-2.5 py-1.5 text-[10px] font-medium text-yellow-600 dark:text-yellow-400">
                <Bookmark className="h-3 w-3" /> Flag for review
              </button>
              <button className="flex items-center gap-1 rounded-md border border-border/30 px-2.5 py-1.5 text-[10px] text-muted-foreground">
                <Image className="h-3 w-3" /> Report issue
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button className="rounded-md border border-border/30 px-3 py-1.5 text-[10px] font-medium text-muted-foreground flex items-center gap-1.5">
                <ChevronLeft className="h-3 w-3" /> Previous
                <span className="text-[8px] text-foreground/40 border border-border/20 rounded px-1 ml-1">&#8592;</span>
              </button>
              <button className="rounded-md bg-primary px-4 py-1.5 text-[10px] font-medium text-primary-foreground shadow-sm flex items-center gap-1.5">
                Next Question <ChevronRight className="h-3 w-3" />
                <span className="text-[8px] text-primary-foreground/60 border border-primary-foreground/20 rounded px-1 ml-1">&#8594;</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── 3. AI Question Generator Interface ───

export function AIQuestionGeneratorScreen() {
  return (
    <div className="flex rounded-xl border border-border/40 bg-card/95 overflow-hidden shadow-2xl" aria-hidden="true">
      <AppSidebar items={[
        { icon: Home, label: 'Dashboard', active: false, badge: 0 },
        { icon: Users, label: 'Students', active: false, badge: 0 },
        { icon: MonitorPlay, label: 'CBT Exams', active: false, badge: 2 },
        { icon: Bot, label: 'AI Generate', active: true, badge: 1 },
        { icon: BarChart3, label: 'Analytics', active: false, badge: 0 },
        { icon: Store, label: 'Marketplace', active: false, badge: 0 },
        { icon: MessageSquare, label: 'Messages', active: false, badge: 3 },
        { icon: Settings, label: 'Settings', active: false, badge: 0 },
      ]} />
      <div className="flex-1 min-w-0">
        <AppTopBar title="AI Question Generator" subtitle="Create exam questions with AI" breadcrumb="AI Generate" />
        <div className="p-4 space-y-4">
          {/* Config panel */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-border/30 bg-background p-3">
              <p className="text-[10px] font-medium text-muted-foreground mb-1.5">Subject & Curriculum</p>
              <div className="rounded-md border border-border/30 bg-muted/30 px-2.5 py-1.5 flex items-center justify-between">
                <span className="text-[11px] font-medium">SS2 Biology — WAEC</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </div>
            </div>
            <div className="rounded-lg border border-border/30 bg-background p-3">
              <p className="text-[10px] font-medium text-muted-foreground mb-1.5">Question Type</p>
              <div className="rounded-md border border-border/30 bg-muted/30 px-2.5 py-1.5 flex items-center justify-between">
                <span className="text-[11px] font-medium">Multiple Choice (A-D)</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </div>
            </div>
            <div className="rounded-lg border border-border/30 bg-background p-3">
              <p className="text-[10px] font-medium text-muted-foreground mb-1.5">Count & Difficulty</p>
              <div className="rounded-md border border-border/30 bg-muted/30 px-2.5 py-1.5 flex items-center justify-between">
                <span className="text-[11px] font-medium">40 questions · Mixed</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </div>
            </div>
          </div>

          {/* Prompt input */}
          <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-3">
            <p className="text-[10px] font-medium text-violet-600 mb-1.5">AI Prompt</p>
            <div className="rounded-md bg-background border border-border/30 p-2.5 flex items-start gap-2">
              <Bot className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
              <p className="text-xs text-foreground/80 leading-relaxed">Generate 40 multiple-choice questions covering photosynthesis, cellular respiration, and ecology for SS2 Biology mid-term exam. Include 15 easy, 15 medium, and 10 hard questions aligned with WAEC syllabus sections B2.1-B2.4.</p>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-violet-500/10 px-2 py-0.5 text-[9px] text-violet-600 font-medium">WAEC Aligned</span>
                <span className="rounded-md bg-violet-500/10 px-2 py-0.5 text-[9px] text-violet-600 font-medium">Auto Answer Key</span>
                <span className="rounded-md bg-violet-500/10 px-2 py-0.5 text-[9px] text-violet-600 font-medium">Blooms Taxonomy</span>
              </div>
              <button className="flex items-center gap-1.5 rounded-md bg-violet-600 px-3 py-1.5 text-[10px] font-medium text-white shadow-sm">
                <Zap className="h-3 w-3" /> Generate
              </button>
            </div>
          </div>

          {/* Generated questions preview - 4 questions + typing indicator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold">Generated Questions</p>
                <ProgressRing progress={100} size={20} strokeWidth={2.5} />
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-green-50 dark:bg-green-9500/10 px-2 py-0.5 text-[9px] font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                  <CheckCircle2 className="h-2.5 w-2.5" /> 40/40 complete
                </span>
                <span className="text-[9px] text-muted-foreground">28s elapsed</span>
              </div>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-3 px-1">
              <span className="text-[9px] text-muted-foreground flex items-center gap-1"><Timer className="h-2.5 w-2.5" /> Estimated time: 30s</span>
              <span className="text-[9px] text-muted-foreground flex items-center gap-1"><Hash className="h-2.5 w-2.5" /> Token usage: 2,847</span>
              <span className="text-[9px] text-muted-foreground flex items-center gap-1"><Bot className="h-2.5 w-2.5" /> Model: GPT-4o</span>
            </div>

            {[
              { num: 1, q: 'Which organelle contains chlorophyll and is the site of photosynthesis?', options: ['Mitochondria', 'Chloroplast', 'Ribosome', 'Nucleus'], answer: 1, difficulty: 'Easy', blooms: 'Remember' },
              { num: 2, q: 'During the light-dependent reactions of photosynthesis, water is split to produce...', options: ['CO₂ and H₂O', 'O₂ and H⁺ ions', 'Glucose and ATP', 'NADPH and FADH₂'], answer: 1, difficulty: 'Medium', blooms: 'Understand' },
              { num: 3, q: 'Which factor would most likely limit the rate of photosynthesis in a tropical rainforest?', options: ['Light intensity', 'CO₂ concentration', 'Temperature', 'Water availability'], answer: 1, difficulty: 'Hard', blooms: 'Analyze' },
              { num: 4, q: 'The Calvin cycle occurs in the ___ of the chloroplast and produces ___ as its primary output.', options: ['Thylakoid space; ATP', 'Stroma; G3P', 'Inner membrane; NADPH', 'Outer membrane; O₂'], answer: 1, difficulty: 'Medium', blooms: 'Understand' },
            ].map(q => (
              <div key={q.num} className="rounded-lg border border-border/30 bg-background p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold text-muted-foreground">Q{q.num}</span>
                  <span className={`rounded px-1.5 py-0.5 text-[8px] font-medium ${
                    q.difficulty === 'Easy' ? 'bg-green-50 dark:bg-green-9500/10 text-green-600 dark:text-green-400' :
                    q.difficulty === 'Medium' ? 'bg-yellow-50 dark:bg-yellow-9500/10 text-yellow-600 dark:text-yellow-400' :
                    'bg-destructive/100/10 text-destructive'
                  }`}>{q.difficulty}</span>
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[8px] font-medium text-primary">{q.blooms}</span>
                </div>
                <p className="text-[11px] font-medium mb-2 line-clamp-2">{q.q}</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {q.options.map((opt, i) => (
                    <div key={opt} className={`flex items-center gap-1.5 rounded px-2 py-1 text-[10px] ${
                      i === q.answer ? 'bg-green-50 dark:bg-green-9500/10 text-green-600 dark:text-green-400 font-medium' : 'text-muted-foreground'
                    }`}>
                      <span className={`h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-bold ${
                        i === q.answer ? 'bg-green-50 dark:bg-green-9500 text-white' : 'bg-muted/30'
                      }`}>{String.fromCharCode(65 + i)}</span>
                      {opt}
                      {i === q.answer && <Check className="h-2.5 w-2.5 ml-auto" />}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex items-center justify-center gap-2 py-2 text-[10px] text-muted-foreground">
              <span className="h-1 w-1 rounded-full bg-muted-foreground animate-pulse" />
              <span className="h-1 w-1 rounded-full bg-muted-foreground animate-pulse [animation-delay:200ms]" />
              <span className="h-1 w-1 rounded-full bg-muted-foreground animate-pulse [animation-delay:400ms]" />
              <span className="ml-1">Generating question 5</span>
              <span className="inline-block w-1.5 h-3 bg-muted-foreground/60 animate-pulse ml-0.5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── 4. Analytics Dashboard ───

export function AnalyticsDashboardScreen() {
  const barData = [62, 58, 71, 68, 82, 76, 89, 84, 91, 87, 94, 96]
  const months = ['J','F','M','A','M','J','J','A','S','O','N','D']
  return (
    <div className="flex rounded-xl border border-border/40 bg-card/95 overflow-hidden shadow-2xl" aria-hidden="true">
      <AppSidebar items={[
        { icon: Home, label: 'Dashboard', active: false, badge: 0 },
        { icon: Users, label: 'Students', active: false, badge: 0 },
        { icon: MonitorPlay, label: 'CBT Exams', active: false, badge: 2 },
        { icon: Bot, label: 'AI Generate', active: false, badge: 1 },
        { icon: BarChart3, label: 'Analytics', active: true, badge: 0 },
        { icon: Store, label: 'Marketplace', active: false, badge: 0 },
        { icon: MessageSquare, label: 'Messages', active: false, badge: 3 },
        { icon: Settings, label: 'Settings', active: false, badge: 0 },
      ]} />
      <div className="flex-1 min-w-0">
        <AppTopBar title="Analytics & Insights" subtitle="Kingsley College · Term 2, 2024/25" breadcrumb="Dashboard > Analytics" />
        <div className="p-4 space-y-4">
          {/* KPI row with sparklines */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Avg Pass Rate', value: '94.7%', change: '+3.2%', icon: TrendingUp, positive: true, sparkData: [88, 89, 91, 92, 93, 94, 94.7] },
              { label: 'Mean Score', value: '72.4', change: '+4.8', icon: BarChart3, positive: true, sparkData: [62, 64, 66, 68, 70, 71, 72.4] },
              { label: 'At-Risk Students', value: '23', change: '-8', icon: AlertTriangle, positive: true, sparkData: [45, 40, 37, 33, 30, 27, 23] },
              { label: 'Exams Analyzed', value: '1,247', change: '+156', icon: FileText, positive: true, sparkData: [800, 900, 980, 1050, 1100, 1180, 1247] },
            ].map(kpi => (
              <div key={kpi.label} className="rounded-lg border border-border/30 bg-background p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-muted-foreground">{kpi.label}</span>
                  <kpi.icon className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xl font-bold tracking-tight">{kpi.value}</p>
                    <span className={`text-[10px] font-medium ${kpi.positive ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>{kpi.change} vs last term</span>
                  </div>
                  <Sparkline data={kpi.sparkData} />
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-5 gap-3">
            {/* Performance chart - larger with animated bars */}
            <div className="col-span-3 rounded-lg border border-border/30 bg-background p-3">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold">School Performance Trend</p>
                {/* Date range selector */}
                <div className="flex items-center gap-1">
                  {['Today', '7 Days', '30 Days', 'This Term'].map((p, i) => (
                    <span key={p} className={`text-[9px] px-1.5 py-0.5 rounded ${i === 2 ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground'}`}>{p}</span>
                  ))}
                </div>
              </div>
              <div className="flex items-end gap-1.5 h-32">
                {barData.map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <motion.div
                      className="w-full rounded-t-sm bg-gradient-to-t from-indigo-500/80 to-indigo-500/30 min-h-[3px]"
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ duration: 0.6, delay: i * 0.04 }}
                    />
                    <span className="text-[7px] text-muted-foreground">{months[i]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Subject breakdown */}
            <div className="col-span-2 rounded-lg border border-border/30 bg-background p-3">
              <p className="text-xs font-semibold mb-3">Subject Performance</p>
              <div className="space-y-2.5">
                {[
                  { subject: 'Mathematics', score: 78, color: 'from-indigo-500 to-purple-500' },
                  { subject: 'English', score: 85, color: 'from-cyan-500 to-blue-500' },
                  { subject: 'Physics', score: 72, color: 'from-emerald-500 to-teal-500' },
                  { subject: 'Chemistry', score: 68, color: 'from-amber-500 to-orange-500' },
                  { subject: 'Biology', score: 81, color: 'from-amber-500 to-orange-500' },
                ].map(s => (
                  <div key={s.subject}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-muted-foreground">{s.subject}</span>
                      <span className="text-[10px] font-bold">{s.score}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                      <div className={`h-full rounded-full bg-gradient-to-r ${s.color}`} style={{ width: `${s.score}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Student Performance Table - 8 rows */}
          <div className="rounded-lg border border-border/30 bg-background">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/20">
              <p className="text-xs font-semibold">Student Performance Ranking</p>
              <button className="text-[9px] text-primary font-medium flex items-center gap-1">Download report <Download className="h-2.5 w-2.5" /></button>
            </div>
            <div className="divide-y divide-border/10">
              {[
                { rank: 1, name: 'Adebayo Okonkwo', id: 'EXF-2847', score: 96, grade: 'A+', trend: 'up' },
                { rank: 2, name: 'Fatima Abubakar', id: 'EXF-2851', score: 94, grade: 'A', trend: 'up' },
                { rank: 3, name: 'Chukwuma Eze', id: 'EXF-2839', score: 91, grade: 'A-', trend: 'same' },
                { rank: 4, name: 'Adaeze Nwosu', id: 'EXF-2862', score: 88, grade: 'B+', trend: 'up' },
                { rank: 5, name: 'Emeka Okafor', id: 'EXF-2844', score: 84, grade: 'B', trend: 'down' },
                { rank: 6, name: 'Ngozi Obi', id: 'EXF-2871', score: 81, grade: 'B-', trend: 'up' },
                { rank: 7, name: 'Tunde Bakare', id: 'EXF-2855', score: 78, grade: 'C+', trend: 'same' },
                { rank: 8, name: 'Halima Usman', id: 'EXF-2880', score: 75, grade: 'C', trend: 'down' },
              ].map(s => (
                <div key={s.id} className="flex items-center gap-3 px-3 py-2">
                  <span className="text-[10px] font-bold text-muted-foreground w-4">{s.rank}</span>
                  <div className="h-6 w-6 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-[8px] font-bold text-white">
                    {s.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium truncate">{s.name}</p>
                    <p className="text-[9px] text-muted-foreground">{s.id}</p>
                  </div>
                  <span className="text-[11px] font-bold">{s.score}%</span>
                  <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                    s.grade.startsWith('A') ? 'bg-green-50 dark:bg-green-9500/10 text-green-600 dark:text-green-400' : s.grade.startsWith('B') ? 'bg-primary/100/10 text-primary' : 'bg-yellow-50 dark:bg-yellow-9500/10 text-yellow-600 dark:text-yellow-400'
                  }`}>{s.grade}</span>
                  <TrendingUp className={`h-3 w-3 ${s.trend === 'up' ? 'text-green-600 dark:text-green-400' : s.trend === 'down' ? 'text-destructive rotate-180' : 'text-muted-foreground rotate-90'}`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── 5. Student Portal ───

export function StudentPortalScreen() {
  return (
    <div className="flex rounded-xl border border-border/40 bg-card/95 overflow-hidden shadow-2xl" aria-hidden="true">
      <AppSidebar items={[
        { icon: Home, label: 'My Dashboard', active: true, badge: 0 },
        { icon: MonitorPlay, label: 'My Exams', active: false, badge: 1 },
        { icon: BarChart3, label: 'My Results', active: false, badge: 0 },
        { icon: Bot, label: 'AI Tutor', active: false, badge: 0 },
        { icon: BookOpen, label: 'Study Materials', active: false, badge: 0 },
        { icon: MessageSquare, label: 'Messages', active: false, badge: 2 },
      ]} />
      <div className="flex-1 min-w-0">
        <AppTopBar title="Welcome back, Adebayo" subtitle="SS3A · Kingsley College" showUser={false} breadcrumb="Student Portal" />
        <div className="p-4 space-y-4">
          {/* Student stats + Study Streak */}
          <div className="grid grid-cols-5 gap-3">
            {[
              { label: 'My Average', value: '87.3%', icon: GraduationCap, color: 'text-indigo-600', bg: 'bg-indigo-500/10' },
              { label: 'Class Rank', value: '#4 of 42', icon: Award, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-9500/10' },
              { label: 'Upcoming Exams', value: '4', icon: Calendar, color: 'text-violet-600', bg: 'bg-violet-500/10' },
              { label: 'Completed', value: '12', icon: CheckCircle2, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-9500/10' },
              { label: 'Study Streak', value: '14 days', icon: Flame, color: 'text-orange-600', bg: 'bg-orange-500/10' },
            ].map(s => (
              <div key={s.label} className="rounded-lg border border-border/30 bg-background p-3">
                <div className={`h-6 w-6 rounded-md ${s.bg} flex items-center justify-center mb-2`}>
                  <s.icon className={`h-3 w-3 ${s.color}`} />
                </div>
                <p className="text-lg font-bold">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {/* AI Tutor chat preview */}
          <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-5 w-5 rounded-full bg-violet-500 flex items-center justify-center">
                <Bot className="h-3 w-3 text-white" />
              </div>
              <p className="text-[10px] font-semibold text-violet-600">AI Tutor</p>
              <span className="text-[8px] text-muted-foreground ml-auto">2m ago</span>
            </div>
            <p className="text-[10px] leading-relaxed">Great job on your Biology quiz! You scored 92%. For photosynthesis, remember: light reactions happen in the thylakoid, Calvin cycle in the stroma. Want me to quiz you on the differences?</p>
            <button className="mt-2 flex items-center gap-1 rounded-md bg-violet-600 px-2 py-1 text-[9px] font-medium text-white">
              <MessageSquare className="h-2.5 w-2.5" /> Continue chat
            </button>
          </div>

          {/* Upcoming exams - 4 items */}
          <div className="rounded-lg border border-border/30 bg-background">
            <div className="px-3 py-2 border-b border-border/20">
              <p className="text-xs font-semibold">Upcoming Exams</p>
            </div>
            <div className="divide-y divide-border/10">
              {[
                { subject: 'Physics — WAEC Mock', date: 'Tomorrow', time: '10:00 AM', duration: '2 hrs', questions: 60, status: 'Tomorrow', color: 'bg-yellow-50 dark:bg-yellow-9500/10 text-yellow-600 dark:text-yellow-400' },
                { subject: 'Mathematics — Continuous Assessment', date: 'Wed, 14 Feb', time: '8:00 AM', duration: '1 hr', questions: 40, status: 'In 3 days', color: 'bg-primary/100/10 text-primary' },
                { subject: 'English — Mid-Term', date: 'Fri, 16 Feb', time: '2:00 PM', duration: '90 min', questions: 50, status: 'In 5 days', color: 'bg-muted/30 text-muted-foreground' },
                { subject: 'Chemistry — NECO Practice', date: 'Mon, 19 Feb', time: '11:00 AM', duration: '1.5 hrs', questions: 45, status: 'In 8 days', color: 'bg-muted/30 text-muted-foreground' },
              ].map(exam => (
                <div key={exam.subject} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <MonitorPlay className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium">{exam.subject}</p>
                    <p className="text-[9px] text-muted-foreground">{exam.date} · {exam.time} · {exam.duration} · {exam.questions} questions</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${exam.color}`}>{exam.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent results + Recommended Practice */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border/30 bg-background p-3">
              <p className="text-xs font-semibold mb-3">Recent Results</p>
              {[
                { subject: 'Biology Mid-Term', score: 92, grade: 'A' },
                { subject: 'Chemistry CA', score: 84, grade: 'B+' },
                { subject: 'English Mock', score: 88, grade: 'A-' },
              ].map(r => (
                <div key={r.subject} className="flex items-center justify-between py-1.5 border-b border-border/10 last:border-0">
                  <span className="text-[10px]">{r.subject}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold">{r.score}%</span>
                    <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold ${r.grade.startsWith('A') ? 'bg-green-50 dark:bg-green-9500/10 text-green-600 dark:text-green-400' : 'bg-primary/100/10 text-primary'}`}>{r.grade}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-border/30 bg-background p-3">
              <p className="text-xs font-semibold mb-3">Recommended Practice</p>
              <div className="space-y-2">
                {[
                  { topic: 'Organic Chemistry', reason: 'Weak area · 68% avg', icon: FlaskConical as any },
                  { topic: 'Trigonometry', reason: 'JAMB focus · High yield', icon: Target },
                  { topic: 'Essay Writing', reason: 'Improving · +8% trend', icon: PenTool },
                ].map(p => {
                  const PIcon = p.icon
                  return (
                    <div key={p.topic} className="flex items-center gap-2 rounded-md border border-border/20 p-1.5">
                      <div className="h-5 w-5 rounded bg-primary/10 flex items-center justify-center shrink-0">
                        <PIcon className="h-2.5 w-2.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-medium">{p.topic}</p>
                        <p className="text-[8px] text-muted-foreground">{p.reason}</p>
                      </div>
                      <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── 6. Teacher Portal ───

export function TeacherPortalScreen() {
  return (
    <div className="flex rounded-xl border border-border/40 bg-card/95 overflow-hidden shadow-2xl" aria-hidden="true">
      <AppSidebar items={[
        { icon: Home, label: 'Dashboard', active: true, badge: 0 },
        { icon: Users, label: 'My Classes', active: false, badge: 0 },
        { icon: MonitorPlay, label: 'Exam Manager', active: false, badge: 1 },
        { icon: Bot, label: 'AI Generate', active: false, badge: 0 },
        { icon: BarChart3, label: 'Grade Book', active: false, badge: 0 },
        { icon: MessageSquare, label: 'Messages', active: false, badge: 5 },
      ]} />
      <div className="flex-1 min-w-0">
        <AppTopBar title="Teacher Dashboard" subtitle="Mrs. Bello · Biology Department" breadcrumb="Dashboard" />
        <div className="p-4 space-y-4">
          {/* Teacher stats */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'My Students', value: '342', icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-500/10' },
              { label: 'Exams Created', value: '28', icon: FileText, color: 'text-violet-600', bg: 'bg-violet-500/10' },
              { label: 'Avg Class Score', value: '78.4%', icon: BarChart3, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-9500/10' },
              { label: 'AI Questions', value: '1,120', icon: Bot, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-9500/10' },
            ].map(s => (
              <div key={s.label} className="rounded-lg border border-border/30 bg-background p-3">
                <div className={`h-6 w-6 rounded-md ${s.bg} flex items-center justify-center mb-2`}>
                  <s.icon className={`h-3 w-3 ${s.color}`} />
                </div>
                <p className="text-lg font-bold">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Quick action buttons */}
          <div className="flex items-center gap-2">
            {[
              { label: 'Create Exam', icon: Plus, color: 'bg-primary text-primary-foreground' },
              { label: 'AI Generate', icon: Sparkles, color: 'bg-violet-600 text-white' },
              { label: 'Grade Book', icon: BookOpen, color: 'bg-emerald-600 text-white' },
              { label: 'Take Attendance', icon: CheckCircle2, color: 'bg-amber-600 text-white' },
            ].map(action => (
              <button key={action.label} className={`flex items-center gap-1.5 rounded-lg ${action.color} px-3 py-1.5 text-[10px] font-medium shadow-sm`}>
                <action.icon className="h-3 w-3" />
                {action.label}
              </button>
            ))}
          </div>

          {/* Today's Schedule + My Classes in 2x2 grid */}
          <div className="grid grid-cols-3 gap-3">
            {/* Today's Schedule */}
            <div className="rounded-lg border border-border/30 bg-background p-3">
              <p className="text-xs font-semibold mb-2">Today's Schedule</p>
              <div className="space-y-2">
                {[
                  { time: '8:00', event: 'SS2A Biology', room: 'Room 14', status: 'Now', color: 'bg-green-50 dark:bg-green-9500/10 text-green-600 dark:text-green-400' },
                  { time: '10:00', event: 'SS2B Biology', room: 'Lab 3', status: 'Next', color: 'bg-yellow-50 dark:bg-yellow-9500/10 text-yellow-600 dark:text-yellow-400' },
                  { time: '12:00', event: 'SS3 Biology Mock', room: 'Hall A', status: '12:00', color: 'bg-muted/30 text-muted-foreground' },
                ].map(s => (
                  <div key={s.time + s.event} className="flex items-center gap-2">
                    <span className="text-[9px] text-muted-foreground font-mono w-7">{s.time}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-medium truncate">{s.event}</p>
                      <p className="text-[8px] text-muted-foreground">{s.room}</p>
                    </div>
                    <span className={`rounded-full px-1.5 py-0 text-[8px] font-medium ${s.color}`}>{s.status}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Class cards - 4 in 2x2 grid */}
            <div className="col-span-2 grid grid-cols-2 gap-3">
              {[
                { name: 'SS2A Biology', students: 42, avgScore: 82, nextExam: 'Mid-Term · Tomorrow', color: 'from-indigo-500 to-indigo-600' },
                { name: 'SS2B Biology', students: 38, avgScore: 76, nextExam: 'CA · Next week', color: 'from-emerald-500 to-teal-600' },
                { name: 'SS3 Biology', students: 45, avgScore: 84, nextExam: 'WAEC Mock · Fri', color: 'from-amber-500 to-orange-600' },
                { name: 'SS1 Biology', students: 41, avgScore: 71, nextExam: 'Intro Test · Mon', color: 'from-cyan-500 to-blue-600' },
              ].map(cls => (
                <div key={cls.name} className="rounded-lg border border-border/30 bg-background p-3">
                  <div className={`h-1.5 rounded-full bg-gradient-to-r ${cls.color} mb-3`} />
                  <p className="text-xs font-semibold">{cls.name}</p>
                  <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
                    <span>{cls.students} students</span>
                    <span>Avg: {cls.avgScore}%</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[9px] text-muted-foreground">{cls.nextExam}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent marking with AI stats */}
          <div className="rounded-lg border border-border/30 bg-background">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/20">
              <p className="text-xs font-semibold">Recent Marking</p>
              <span className="text-[9px] text-primary font-medium">View all</span>
            </div>
            <div className="divide-y divide-border/10">
              {[
                { exam: 'SS2A Biology Quiz 4', marked: '42/42', avg: '81.3%', status: 'Complete', statusColor: 'bg-green-50 dark:bg-green-9500/10 text-green-600 dark:text-green-400', aiNote: 'AI marked 42/42 in 8s' },
                { exam: 'SS2B Biology CA 2', marked: '31/38', avg: '74.8%', status: 'In Progress', statusColor: 'bg-yellow-50 dark:bg-yellow-9500/10 text-yellow-600 dark:text-yellow-400', aiNote: 'AI marked 31/38 in 6s' },
                { exam: 'SS3 Biology Mock', marked: '0/45', avg: '—', status: 'Pending', statusColor: 'bg-muted/30 text-muted-foreground', aiNote: '' },
              ].map(m => (
                <div key={m.exam} className="flex items-center gap-3 px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium">{m.exam}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-[9px] text-muted-foreground">{m.marked} marked · Avg: {m.avg}</p>
                      {m.aiNote && <p className="text-[8px] text-violet-500 font-medium">{m.aiNote}</p>}
                    </div>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${m.statusColor}`}>{m.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── 7. Parent Portal ───

export function ParentPortalScreen() {
  return (
    <div className="flex rounded-xl border border-border/40 bg-card/95 overflow-hidden shadow-2xl" aria-hidden="true">
      <AppSidebar items={[
        { icon: Home, label: 'Dashboard', active: true, badge: 0 },
        { icon: GraduationCap, label: 'My Children', active: false, badge: 0 },
        { icon: BarChart3, label: 'Reports', active: false, badge: 0 },
        { icon: CreditCard, label: 'Payments', active: false, badge: 1 },
        { icon: MessageSquare, label: 'Messages', active: false, badge: 2 },
      ]} />
      <div className="flex-1 min-w-0">
        <AppTopBar title="Parent Dashboard" subtitle="Okonkwo Family" breadcrumb="Home" />
        <div className="p-4 space-y-4">
          {/* Alert notification */}
          <div className="flex items-center gap-2.5 rounded-lg border border-amber-500/30 bg-yellow-50 dark:bg-yellow-9500/5 p-2.5">
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-yellow-700 dark:text-yellow-400">Attention Needed</p>
              <p className="text-[9px] text-yellow-600 dark:text-yellow-400">Chioma's Mathematics score dropped below 70% — Current: 68.2%. Consider scheduling extra tutoring.</p>
            </div>
            <X className="h-3 w-3 text-yellow-600 dark:text-yellow-400 shrink-0 cursor-pointer" />
          </div>

          {/* Children cards */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { name: 'Adebayo Okonkwo', class: 'SS3A', school: 'Kingsley College', avg: '87.3%', rank: '#4 of 42', status: 'Performing well', statusColor: 'text-green-600 dark:text-green-400' },
              { name: 'Chioma Okonkwo', class: 'SS1B', school: 'Kingsley College', avg: '72.1%', rank: '#18 of 44', status: 'Needs attention', statusColor: 'text-yellow-600 dark:text-yellow-400' },
            ].map(child => (
              <div key={child.name} className="rounded-lg border border-border/30 bg-background p-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-amber-500 flex items-center justify-center text-[10px] font-bold text-white">
                    {child.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold">{child.name}</p>
                    <p className="text-[9px] text-muted-foreground">{child.class} · {child.school}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <div className="rounded bg-muted/30 p-1.5 text-center">
                    <p className="text-xs font-bold">{child.avg}</p>
                    <p className="text-[8px] text-muted-foreground">Average</p>
                  </div>
                  <div className="rounded bg-muted/30 p-1.5 text-center">
                    <p className="text-xs font-bold">{child.rank}</p>
                    <p className="text-[8px] text-muted-foreground">Rank</p>
                  </div>
                  <div className="rounded bg-muted/30 p-1.5 text-center">
                    <p className="text-xs font-bold">94%</p>
                    <p className="text-[8px] text-muted-foreground">Attendance</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Circle className={`h-2 w-2 ${child.statusColor}`} />
                  <span className={`text-[9px] font-medium ${child.statusColor}`}>{child.status}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Latest Report Card preview */}
          <div className="rounded-lg border border-border/30 bg-background p-3">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold">Latest Report Card — Adebayo</p>
              <span className="text-[9px] text-primary font-medium flex items-center gap-1">View full report <ExternalLink className="h-2.5 w-2.5" /></span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { subject: 'Mathematics', score: 92, grade: 'A' },
                { subject: 'English', score: 88, grade: 'A-' },
                { subject: 'Biology', score: 95, grade: 'A+' },
                { subject: 'Physics', score: 84, grade: 'B+' },
                { subject: 'Chemistry', score: 79, grade: 'B' },
                { subject: 'Civic Ed.', score: 91, grade: 'A' },
              ].map(r => (
                <div key={r.subject} className="flex items-center justify-between rounded bg-muted/30 px-2 py-1">
                  <span className="text-[9px]">{r.subject}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold">{r.score}%</span>
                    <span className={`rounded px-1 py-0 text-[7px] font-bold ${r.grade.startsWith('A') ? 'bg-green-50 dark:bg-green-9500/10 text-green-600 dark:text-green-400' : 'bg-primary/100/10 text-primary'}`}>{r.grade}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming exams for children + School calendar */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border/30 bg-background p-3">
              <p className="text-xs font-semibold mb-3">Upcoming Exams</p>
              <div className="space-y-2">
                {[
                  { child: 'Adebayo', exam: 'Physics WAEC Mock', date: 'Tomorrow, 10:00 AM', subject: 'Physics' },
                  { child: 'Chioma', exam: 'Mathematics CA', date: 'Wednesday, 8:00 AM', subject: 'Mathematics' },
                ].map(e => (
                  <div key={e.child + e.exam} className="flex items-center gap-2 rounded-md border border-border/20 p-2">
                    <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center">
                      <MonitorPlay className="h-3 w-3 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-medium">{e.child}: {e.exam}</p>
                      <p className="text-[9px] text-muted-foreground">{e.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* School Calendar Event */}
            <div className="rounded-lg border border-border/30 bg-background p-3">
              <p className="text-xs font-semibold mb-3">School Calendar</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 p-2">
                  <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center">
                    <Calendar className="h-3 w-3 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium">Parent-Teacher Conference</p>
                    <p className="text-[9px] text-muted-foreground">Fri, 23 Feb · 2:00 PM · Main Hall</p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-1.5 py-0 text-[8px] font-medium text-primary">Upcoming</span>
                </div>
                <div className="flex items-center gap-2 rounded-md border border-border/20 p-2">
                  <div className="h-6 w-6 rounded bg-muted/30 flex items-center justify-center">
                    <GraduationCap className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium">Mid-Term Break</p>
                    <p className="text-[9px] text-muted-foreground">Mon, 26 Feb — Fri, 1 Mar</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Fee status with outstanding balance */}
          <div className="rounded-lg border border-border/30 bg-background p-3">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold">Fee Status</p>
              <span className="text-[9px] text-primary font-medium flex items-center gap-1">Payment history <ExternalLink className="h-2.5 w-2.5" /></span>
            </div>
            <div className="space-y-2">
              {[
                { term: 'Term 2, 2024/25', amount: '₦180,000', status: 'Paid', statusColor: 'bg-green-50 dark:bg-green-9500/10 text-green-600 dark:text-green-400' },
                { term: 'Term 3, 2024/25', amount: '₦180,000', status: 'Due Mar 15', statusColor: 'bg-yellow-50 dark:bg-yellow-9500/10 text-yellow-600 dark:text-yellow-400' },
              ].map(f => (
                <div key={f.term} className="flex items-center justify-between py-1.5 border-b border-border/10 last:border-0">
                  <div>
                    <p className="text-[10px] font-medium">{f.term}</p>
                    <p className="text-[9px] text-muted-foreground">{f.amount}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${f.statusColor}`}>{f.status}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between rounded-md bg-yellow-50 dark:bg-yellow-9500/5 border border-amber-500/20 px-2.5 py-1.5">
              <span className="text-[10px] font-medium text-yellow-700 dark:text-yellow-400">Outstanding Balance</span>
              <span className="text-[10px] font-bold text-yellow-700 dark:text-yellow-400">₦180,000</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── 8. Marketplace Preview ───

export function MarketplacePreviewScreen() {
  return (
    <div className="flex rounded-xl border border-border/40 bg-card/95 overflow-hidden shadow-2xl" aria-hidden="true">
      <AppSidebar items={[
        { icon: Home, label: 'Dashboard', active: false, badge: 0 },
        { icon: Store, label: 'Marketplace', active: true, badge: 0 },
        { icon: BookOpen, label: 'My Resources', active: false, badge: 0 },
        { icon: Plus, label: 'Publish', active: false, badge: 0 },
        { icon: Settings, label: 'Settings', active: false, badge: 0 },
      ]} />
      <div className="flex-1 min-w-0">
        <AppTopBar title="Resource Marketplace" subtitle="Browse and share educational content" breadcrumb="Marketplace" />
        <div className="p-4 space-y-4">
          {/* Search */}
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 rounded-lg border border-border/30 bg-muted/20 px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Search question banks, exam templates, lesson plans...</span>
            </div>
            <div className="flex items-center gap-1.5">
              {['All', 'WAEC', 'JAMB', 'NECO'].map((t, i) => (
                <span key={t} className={`rounded-lg px-2.5 py-1.5 text-[10px] font-medium ${i === 0 ? 'bg-primary/10 text-primary' : 'border border-border/30 text-muted-foreground'}`}>{t}</span>
              ))}
            </div>
          </div>

          {/* Category filter chips */}
          <div className="flex items-center gap-1.5">
            {['All', 'Question Banks', 'Exam Templates', 'Lesson Plans', 'Study Guides'].map((t, i) => (
              <span key={t} className={`rounded-full px-3 py-1 text-[10px] font-medium ${i === 0 ? 'bg-primary text-primary-foreground' : 'border border-border/30 text-muted-foreground'}`}>{t}</span>
            ))}
          </div>

          {/* Featured - 6 resource cards in 2 rows of 3 */}
          <div>
            <p className="text-xs font-semibold mb-2">Featured Resources</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { title: 'WAEC Mathematics Complete Pack', author: 'Dr. Adeyemi', rating: 4.9, downloads: '2,847', price: 'Free', tags: ['WAEC', 'Math'], color: 'from-indigo-500 to-amber-500' },
                { title: 'JAMB English Question Bank', author: 'Prof. Okafor', rating: 4.8, downloads: '1,823', price: '₦5,000', tags: ['JAMB', 'English'], color: 'from-amber-500 to-orange-600' },
                { title: 'NECO Physics Lab Manual', author: 'Mrs. Bello', rating: 4.7, downloads: '956', price: '₦3,000', tags: ['NECO', 'Physics'], color: 'from-emerald-500 to-teal-600' },
                { title: 'SS2 Biology Diagram Pack', author: 'Mr. Eze', rating: 4.9, downloads: '1,402', price: 'Free', tags: ['WAEC', 'Biology'], color: 'from-amber-500 to-orange-600' },
                { title: 'JAMB Chemistry 1000 Questions', author: 'Dr. Nwosu', rating: 4.6, downloads: '2,198', price: '₦4,500', tags: ['JAMB', 'Chem'], color: 'from-cyan-500 to-blue-600' },
                { title: 'WAEC Civic Education Guide', author: 'Mrs. Adebayo', rating: 4.8, downloads: '756', price: '₦2,000', tags: ['WAEC', 'Civic'], color: 'from-indigo-500 to-indigo-600' },
              ].map(r => (
                <div key={r.title} className="rounded-lg border border-border/30 bg-background overflow-hidden hover:border-primary/20 transition-colors">
                  <div className={`h-16 bg-gradient-to-br ${r.color} flex items-center justify-center`}>
                    <BookOpen className="h-6 w-6 text-white/80" />
                  </div>
                  <div className="p-2.5">
                    <div className="flex items-center gap-1 mb-1">
                      {r.tags.map(t => (
                        <span key={t} className="rounded bg-primary/10 px-1 py-0 text-[8px] text-primary font-medium">{t}</span>
                      ))}
                    </div>
                    <p className="text-[10px] font-semibold line-clamp-2 mb-1">{r.title}</p>
                    <p className="text-[9px] text-muted-foreground">{r.author}</p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1">
                        <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                        <span className="text-[9px] font-medium">{r.rating}</span>
                        <span className="text-[9px] text-muted-foreground">({r.downloads})</span>
                      </div>
                      <span className={`text-[10px] font-bold ${r.price === 'Free' ? 'text-green-600 dark:text-green-400' : 'text-primary'}`}>{r.price}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* My Resources + Recently Viewed */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border/30 bg-background p-3">
              <p className="text-xs font-semibold mb-2">My Resources</p>
              <div className="space-y-2">
                {[
                  { title: 'SS2 Biology Mid-Term Set', type: 'Question Bank', status: 'Published', statusColor: 'bg-green-50 dark:bg-green-9500/10 text-green-600 dark:text-green-400' },
                  { title: 'SS3 WAEC Prep Questions', type: 'Exam Template', status: 'Draft', statusColor: 'bg-yellow-50 dark:bg-yellow-9500/10 text-yellow-600 dark:text-yellow-400' },
                ].map(r => (
                  <div key={r.title} className="flex items-center gap-2 rounded-md border border-border/20 p-2">
                    <FolderOpen className="h-4 w-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-medium truncate">{r.title}</p>
                      <p className="text-[8px] text-muted-foreground">{r.type}</p>
                    </div>
                    <span className={`rounded-full px-1.5 py-0 text-[8px] font-medium ${r.statusColor}`}>{r.status}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-border/30 bg-background p-3">
              <p className="text-xs font-semibold mb-2">Recently Viewed</p>
              <div className="space-y-2">
                {[
                  { title: 'JAMB Use of English Pack', author: 'Prof. Okafor' },
                  { title: 'NECO Biology Study Guide', author: 'Dr. Adeyemi' },
                ].map(r => (
                  <div key={r.title} className="flex items-center gap-2 rounded-md border border-border/20 p-2">
                    <Eye className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-medium truncate">{r.title}</p>
                      <p className="text-[8px] text-muted-foreground">{r.author}</p>
                    </div>
                    <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Device Frames ───

export function MobileDeviceFrame({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative inline-flex flex-col ${className}`} aria-hidden="true">
      {/* Phone frame */}
      <div className="relative rounded-[2rem] border-[3px] border-foreground/15 bg-card shadow-2xl overflow-hidden" style={{ width: '280px', height: '560px' }}>
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-foreground/15 rounded-b-2xl z-10" />
        {/* Screen content */}
        <div className="h-full w-full overflow-y-auto p-0 pt-7 text-[9px]">
          {children}
        </div>
        {/* Home indicator */}
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-24 h-1 rounded-full bg-foreground/20" />
      </div>
      <p className="text-center text-xs text-muted-foreground mt-3 font-medium">Mobile</p>
    </div>
  )
}

export function TabletDeviceFrame({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative inline-flex flex-col ${className}`} aria-hidden="true">
      {/* Tablet frame */}
      <div className="relative rounded-[1.2rem] border-[3px] border-foreground/15 bg-card shadow-2xl overflow-hidden" style={{ width: '480px', height: '360px' }}>
        {/* Camera */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-foreground/15 z-10" />
        {/* Screen content */}
        <div className="h-full w-full overflow-y-auto pt-4">
          {children}
        </div>
      </div>
      <p className="text-center text-xs text-muted-foreground mt-3 font-medium">Tablet</p>
    </div>
  )
}

// ─── Mobile CBT Preview (for device frame) ───

export function MobileCBTPreview() {
  return (
    <div className="bg-card h-full">
      {/* Mobile header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/20">
        <div className="flex items-center gap-1.5">
          <div className="h-5 w-5 rounded bg-primary flex items-center justify-center">
            <BookOpen className="h-2.5 w-2.5 text-primary-foreground" />
          </div>
          <span className="text-[9px] font-semibold">SS2 Biology</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Flagged count */}
          <span className="flex items-center gap-0.5 rounded bg-yellow-50 dark:bg-yellow-9500/10 px-1 py-0.5">
            <Flag className="h-2 w-2 text-yellow-600 dark:text-yellow-400" />
            <span className="text-[7px] font-bold text-yellow-600 dark:text-yellow-400">2</span>
          </span>
          <div className="flex items-center gap-1 rounded bg-destructive/100/10 px-1.5 py-0.5 animate-pulse">
            <Clock className="h-2.5 w-2.5 text-destructive" />
            <span className="text-[8px] font-bold text-destructive">27:42</span>
          </div>
        </div>
      </div>

      {/* Question navigation dots */}
      <div className="flex items-center justify-center gap-0.5 px-3 py-1.5 border-b border-border/10">
        {Array.from({ length: 20 }, (_, i) => {
          const answered = i < 7
          const current = i === 7
          const flagged = i === 3 || i === 11
          return (
            <div
              key={i}
              className={`h-1.5 w-1.5 rounded-full ${
                current ? 'bg-primary ring-1 ring-primary/30' :
                answered ? 'bg-green-50 dark:bg-green-9500' :
                flagged ? 'bg-yellow-50 dark:bg-yellow-9500' :
                'bg-muted/50'
              }`}
            />
          )
        })}
      </div>

      <div className="p-3 space-y-3">
        {/* Progress + auto-save */}
        <div className="flex items-center justify-between">
          <span className="text-[8px] font-medium">Q15 of 40</span>
          <span className="text-[8px] text-green-600 dark:text-green-400 flex items-center gap-0.5">
            <Check className="h-2 w-2" /> Auto-saved 5s ago
          </span>
        </div>
        <div className="h-1 rounded-full bg-muted/50 overflow-hidden">
          <div className="h-full rounded-full bg-primary" style={{ width: '37.5%' }} />
        </div>

        {/* Question */}
        <div className="rounded border border-indigo-500/20 bg-indigo-500/5 p-2">
          <p className="text-[9px] font-medium leading-relaxed">Which organelle is responsible for converting light energy into chemical energy in plant cells?</p>
        </div>

        {/* Options */}
        <div className="space-y-1.5">
          {[
            { letter: 'A', text: 'Mitochondria' },
            { letter: 'B', text: 'Chloroplast', selected: true },
            { letter: 'C', text: 'Ribosome' },
            { letter: 'D', text: 'Golgi apparatus' },
          ].map(opt => (
            <div key={opt.letter} className={`flex items-center gap-2 rounded border p-2 ${
              opt.selected ? 'border-indigo-500/40 bg-indigo-500/10' : 'border-border/30'
            }`}>
              <span className={`h-4 w-4 rounded-full flex items-center justify-center text-[7px] font-bold ${
                opt.selected ? 'bg-indigo-500 text-white' : 'bg-muted/50 text-muted-foreground'
              }`}>{opt.letter}</span>
              <span className="text-[9px]">{opt.text}</span>
            </div>
          ))}
        </div>

        {/* Nav */}
        <div className="flex items-center justify-between pt-2">
          <button className="rounded border border-border/30 px-2 py-1 text-[8px] text-muted-foreground">Previous</button>
          <div className="flex items-center gap-1.5">
            <button className="rounded bg-primary px-3 py-1 text-[8px] text-primary-foreground font-medium">Next</button>
          </div>
        </div>

        {/* End Exam button */}
        <button className="w-full rounded border border-destructive/20 bg-destructive/100/5 px-3 py-1.5 text-[8px] font-medium text-destructive flex items-center justify-center gap-1">
          <XCircle className="h-2.5 w-2.5" /> End Exam
        </button>
      </div>
    </div>
  )
}

// ─── Tablet Dashboard Preview (for device frame) ───

export function TabletDashboardPreview() {
  const tabletChartBars = [42, 58, 52, 67, 61, 73, 68, 82, 77, 89, 84, 91]
  return (
    <div className="bg-card h-full flex">
      {/* Mini sidebar icons */}
      <div className="w-8 shrink-0 border-r border-border/20 py-2 flex flex-col items-center gap-2">
        <div className="h-5 w-5 rounded bg-primary flex items-center justify-center">
          <BookOpen className="h-2.5 w-2.5 text-primary-foreground" />
        </div>
        {[
          { icon: Home, active: true },
          { icon: Users, active: false },
          { icon: MonitorPlay, active: false },
          { icon: Bot, active: false },
          { icon: BarChart3, active: false },
          { icon: Store, active: false },
          { icon: Settings, active: false },
        ].map((item, i) => (
          <item.icon key={i} className={`h-3.5 w-3.5 ${item.active ? 'text-primary' : 'text-muted-foreground'}`} />
        ))}
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Top bar with notification badge */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/20">
          <span className="text-[9px] font-semibold">Dashboard</span>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Bell className="h-3 w-3 text-muted-foreground" />
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive/100" />
              <span className="absolute -top-2 -right-2 rounded-full bg-destructive/100 text-[6px] text-white font-bold px-0.5 leading-none">5</span>
            </div>
            <div className="h-5 w-5 rounded-full bg-gradient-to-br from-indigo-500 to-amber-500 flex items-center justify-center text-[7px] font-bold text-white">AO</div>
          </div>
        </div>

        <div className="p-3 space-y-3">
          {/* KPIs - 6 cards */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Students', value: '2,847' },
              { label: 'Exams', value: '23' },
              { label: 'Pass Rate', value: '94.7%' },
              { label: 'AI Acc.', value: '99.1%' },
              { label: 'Questions', value: '12.4K' },
              { label: 'Revenue', value: '₦4.2M' },
            ].map(k => (
              <div key={k.label} className="rounded border border-border/20 bg-background p-1.5 text-center">
                <p className="text-[10px] font-bold">{k.value}</p>
                <p className="text-[7px] text-muted-foreground">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Chart with animated bars */}
          <div className="rounded border border-border/20 bg-background p-2">
            <p className="text-[9px] font-semibold mb-2">Performance Trend</p>
            <div className="flex items-end gap-0.5 h-16">
              {tabletChartBars.map((h, i) => (
                <motion.div
                  key={i}
                  className="flex-1 rounded-t bg-gradient-to-t from-indigo-500/70 to-indigo-500/20 min-h-[1px]"
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  transition={{ duration: 0.6, delay: i * 0.04 }}
                />
              ))}
            </div>
          </div>

          {/* Live Exams + Recent Results */}
          <div className="grid grid-cols-2 gap-2">
            {/* Live Exams with mini progress bars */}
            <div className="rounded border border-border/20 bg-background">
              <div className="px-2 py-1.5 border-b border-border/10">
                <p className="text-[9px] font-semibold flex items-center gap-1">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-50 dark:bg-green-9500" />
                  </span>
                  Live Exams
                </p>
              </div>
              {[
                { name: 'SS2 Biology', progress: 73 },
                { name: 'SS3 Math', progress: 45 },
                { name: 'SS2 Chemistry', progress: 88 },
              ].map(e => (
                <div key={e.name} className="px-2 py-1.5 border-b border-border/10 last:border-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-[8px] font-medium">{e.name}</p>
                    <span className="text-[7px] text-muted-foreground">{e.progress}%</span>
                  </div>
                  <div className="h-1 rounded-full bg-muted/50 overflow-hidden">
                    <div className="h-full rounded-full bg-green-50 dark:bg-green-9500" style={{ width: `${e.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Recent Results */}
            <div className="rounded border border-border/20 bg-background">
              <div className="px-2 py-1.5 border-b border-border/10">
                <p className="text-[9px] font-semibold">Recent Results</p>
              </div>
              {[
                { name: 'Adebayo O.', score: 96, grade: 'A+' },
                { name: 'Fatima A.', score: 94, grade: 'A' },
                { name: 'Chukwuma E.', score: 91, grade: 'A-' },
              ].map(s => (
                <div key={s.name} className="flex items-center justify-between px-2 py-1 border-b border-border/10 last:border-0">
                  <span className="text-[8px]">{s.name}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[8px] font-bold">{s.score}%</span>
                    <span className="rounded bg-green-50 dark:bg-green-9500/10 px-0.5 text-[7px] font-bold text-green-600 dark:text-green-400">{s.grade}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
