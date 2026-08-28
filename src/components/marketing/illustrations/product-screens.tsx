'use client'

import { motion } from 'framer-motion'
import { Search, FileText } from 'lucide-react'

// ============================================================================
// ExamForge AI — High-Fidelity Product Screen Illustrations
// ============================================================================
// Replaces all CSS skeleton mockups with realistic SVG-based product screens
// that represent actual ExamForge UI modules. Each screen shows meaningful
// content, realistic data layouts, and proper visual hierarchy.
// ============================================================================

// ─── Shared Styles ───
const screenBase = "relative w-full rounded-lg border border-border/40 bg-card/90 overflow-hidden"
const titleBar = "flex items-center gap-2 px-3 py-2 border-b border-border/30 bg-muted/30"
const titleDot = "h-2 w-2 rounded-full"
const content = "p-3 space-y-2"

// ─── Student Information System Screen ───
export function SIScreen({ animate = false }: { animate?: boolean }) {
  return (
    <div className={screenBase} aria-hidden="true">
      <div className={titleBar}>
        <div className={`${titleDot} bg-red-400/70`} />
        <div className={`${titleDot} bg-yellow-400/70`} />
        <div className={`${titleDot} bg-green-400/70`} />
        <span className="ml-2 text-[10px] text-muted-foreground font-medium">Student Information System</span>
      </div>
      <div className={content}>
        {/* Student profile header */}
        <div className="flex items-center gap-2.5 pb-2 border-b border-border/20">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">AO</div>
          <div className="flex-1">
            <p className="text-xs font-semibold">Adebayo Okonkwo</p>
            <p className="text-[10px] text-muted-foreground">SS3A · Student ID: EXF-2847</p>
          </div>
          <span className="rounded-full bg-green-50 dark:bg-green-9500/15 px-2 py-0.5 text-[9px] font-medium text-green-600 dark:text-green-400">Active</span>
        </div>
        {/* Student details grid */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Enrollment', value: '2023', icon: '📋' },
            { label: 'Attendance', value: '94.2%', icon: '✓' },
            { label: 'Avg Grade', value: 'B+', icon: '★' },
          ].map(item => (
            <div key={item.label} className="rounded-md bg-primary/100/5 border border-blue-500/10 p-2 text-center">
              <span className="text-[10px] font-bold text-primary/70">{item.icon}</span>
              <p className="text-xs font-bold mt-0.5">{item.value}</p>
              <p className="text-[9px] text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>
        {/* Recent grades */}
        <div className="pt-1">
          <p className="text-[10px] font-medium text-muted-foreground mb-1.5">Recent Grades</p>
          {[
            { subject: 'Mathematics', grade: 'A', score: '92/100' },
            { subject: 'English', grade: 'B+', score: '84/100' },
            { subject: 'Physics', grade: 'A-', score: '88/100' },
          ].map(g => (
            <div key={g.subject} className="flex items-center justify-between py-1 border-b border-border/10 last:border-0">
              <span className="text-[10px] text-muted-foreground">{g.subject}</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px]">{g.score}</span>
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">{g.grade}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── CBT Platform Screen ───
export function CBTScreen({ animate = false }: { animate?: boolean }) {
  return (
    <div className={screenBase} aria-hidden="true">
      <div className={titleBar}>
        <div className={`${titleDot} bg-red-400/70`} />
        <div className={`${titleDot} bg-yellow-400/70`} />
        <div className={`${titleDot} bg-green-400/70`} />
        <span className="ml-2 text-[10px] text-muted-foreground font-medium">CBT Exam — SS2 Biology Mid-Term</span>
      </div>
      <div className={content}>
        {/* Exam progress */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-medium">Question 15 of 40</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground">⏱ 42:18</span>
            <span className="rounded-full bg-green-50 dark:bg-green-9500/15 px-1.5 py-0.5 text-[9px] font-medium text-green-600 dark:text-green-400">In Progress</span>
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden mb-2">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
            initial={{ width: '0%' }}
            animate={{ width: '37.5%' }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
        </div>
        {/* Question */}
        <div className="rounded-md bg-indigo-500/5 border border-indigo-500/15 p-2.5">
          <p className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 mb-1">Multiple Choice</p>
          <p className="text-xs font-medium leading-relaxed">Which of the following organelles is responsible for converting light energy into chemical energy in plant cells?</p>
        </div>
        {/* Answer options */}
        <div className="grid grid-cols-1 gap-1.5">
          {[
            { letter: 'A', text: 'Mitochondria', selected: false },
            { letter: 'B', text: 'Chloroplast', selected: true },
            { letter: 'C', text: 'Ribosome', selected: false },
            { letter: 'D', text: 'Nucleus', selected: false },
          ].map(opt => (
            <div key={opt.letter} className={`flex items-center gap-2 rounded-md border p-2 text-xs transition-all ${opt.selected ? 'border-indigo-500/40 bg-indigo-500/10' : 'border-border/30 bg-background/50'}`}>
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold ${opt.selected ? 'bg-indigo-500 text-white' : 'bg-muted/50 text-muted-foreground'}`}>{opt.letter}</span>
              <span className={opt.selected ? 'font-medium' : ''}>{opt.text}</span>
              {opt.selected && <span className="ml-auto text-[9px] text-indigo-600">Selected</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── School ERP Screen ───
export function ERPScreen({ animate = false }: { animate?: boolean }) {
  return (
    <div className={screenBase} aria-hidden="true">
      <div className={titleBar}>
        <div className={`${titleDot} bg-red-400/70`} />
        <div className={`${titleDot} bg-yellow-400/70`} />
        <div className={`${titleDot} bg-green-400/70`} />
        <span className="ml-2 text-[10px] text-muted-foreground font-medium">School ERP Dashboard</span>
      </div>
      <div className={content}>
        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          {[
            { label: 'Staff', value: '142', change: '+3', color: 'emerald' },
            { label: 'Classes', value: '48', change: '+2', color: 'blue' },
          ].map(s => (
            <div key={s.label} className="rounded-md bg-green-50 dark:bg-green-9500/5 border border-emerald-500/10 p-2">
              <p className="text-[9px] text-muted-foreground">{s.label}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold">{s.value}</span>
                <span className="text-[9px] text-green-600 dark:text-green-400">{s.change} this term</span>
              </div>
            </div>
          ))}
        </div>
        {/* Timetable preview */}
        <p className="text-[10px] font-medium text-muted-foreground">Today&apos;s Schedule</p>
        {[
          { time: '08:00', subject: 'Mathematics', teacher: 'Mr. Eze', room: 'Hall A' },
          { time: '09:30', subject: 'English', teacher: 'Mrs. Bello', room: 'Room 12' },
          { time: '11:00', subject: 'Physics', teacher: 'Dr. Adeyemi', room: 'Lab 1' },
        ].map(s => (
          <div key={s.time} className="flex items-center gap-2 rounded-md bg-background/50 border border-border/20 p-1.5">
            <span className="text-[9px] font-mono text-muted-foreground w-10">{s.time}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-medium truncate">{s.subject}</p>
              <p className="text-[9px] text-muted-foreground">{s.teacher} · {s.room}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Analytics Screen ───
export function AnalyticsScreen({ animate = false }: { animate?: boolean }) {
  const barHeights = [40, 65, 45, 80, 55, 70, 90, 75, 85, 95, 88, 92]
  const barLabels = ['J','F','M','A','M','J','J','A','S','O','N','D']
  return (
    <div className={screenBase} aria-hidden="true">
      <div className={titleBar}>
        <div className={`${titleDot} bg-red-400/70`} />
        <div className={`${titleDot} bg-yellow-400/70`} />
        <div className={`${titleDot} bg-green-400/70`} />
        <span className="ml-2 text-[10px] text-muted-foreground font-medium">Analytics Dashboard</span>
      </div>
      <div className={content}>
        {/* KPI row */}
        <div className="grid grid-cols-3 gap-1.5 mb-2">
          {[
            { label: 'Pass Rate', value: '94.7%' },
            { label: 'Avg Score', value: '72.4' },
            { label: 'At Risk', value: '23' },
          ].map(kpi => (
            <div key={kpi.label} className="rounded-md bg-yellow-50 dark:bg-yellow-9500/5 border border-amber-500/10 p-1.5 text-center">
              <p className="text-xs font-bold">{kpi.value}</p>
              <p className="text-[9px] text-muted-foreground">{kpi.label}</p>
            </div>
          ))}
        </div>
        {/* Chart */}
        <div className="rounded-md bg-background/50 border border-border/20 p-2">
          <p className="text-[10px] font-medium mb-2">Performance Trend</p>
          <div className="flex items-end gap-1 h-20">
            {barHeights.map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <motion.div
                  className="w-full rounded-t-sm bg-gradient-to-t from-amber-500/70 to-amber-500/30 min-h-[2px]"
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  transition={{ duration: 0.6, delay: i * 0.04, ease: 'easeOut' }}
                />
                <span className="text-[7px] text-muted-foreground">{barLabels[i]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Marketplace Screen ───
export function MarketplaceScreen({ animate = false }: { animate?: boolean }) {
  return (
    <div className={screenBase} aria-hidden="true">
      <div className={titleBar}>
        <div className={`${titleDot} bg-red-400/70`} />
        <div className={`${titleDot} bg-yellow-400/70`} />
        <div className={`${titleDot} bg-green-400/70`} />
        <span className="ml-2 text-[10px] text-muted-foreground font-medium">Resource Marketplace</span>
      </div>
      <div className={content}>
        {/* Search bar */}
        <div className="flex items-center gap-2 rounded-md bg-background/50 border border-border/30 p-1.5 mb-2">
          <Search className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">Search question banks...</span>
        </div>
        {/* Resource cards */}
        {[
          { title: 'WAEC Math Prep', author: 'Dr. Adeyemi', downloads: '2.4K', rating: '4.9', color: 'from-indigo-500/20 to-indigo-500/10' },
          { title: 'JAMB English Pack', author: 'Prof. Okafor', downloads: '1.8K', rating: '4.8', color: 'from-amber-500/20 to-orange-500/10' },
          { title: 'NECO Physics Bank', author: 'Mrs. Bello', downloads: '956', rating: '4.7', color: 'from-emerald-500/20 to-teal-500/10' },
        ].map(item => (
          <div key={item.title} className="flex items-center gap-2 rounded-md bg-background/50 border border-border/20 p-2 hover:border-primary/20 transition-colors">
            <div className={`h-10 w-10 rounded-md bg-gradient-to-br ${item.color} flex items-center justify-center shrink-0`}>
              <FileText className="h-4 w-4 text-primary/40" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold truncate">{item.title}</p>
              <p className="text-[9px] text-muted-foreground">{item.author}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[9px] font-medium text-primary">{item.downloads}</p>
              <p className="text-[9px] text-yellow-600 dark:text-yellow-400">★ {item.rating}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Billing Screen ───
export function BillingScreen({ animate = false }: { animate?: boolean }) {
  return (
    <div className={screenBase} aria-hidden="true">
      <div className={titleBar}>
        <div className={`${titleDot} bg-red-400/70`} />
        <div className={`${titleDot} bg-yellow-400/70`} />
        <div className={`${titleDot} bg-green-400/70`} />
        <span className="ml-2 text-[10px] text-muted-foreground font-medium">Billing & Payments</span>
      </div>
      <div className={content}>
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="rounded-md bg-cyan-400/5 border border-cyan-500/10 p-2 text-center">
            <p className="text-xs font-bold">₦12.4M</p>
            <p className="text-[9px] text-muted-foreground">Collected</p>
          </div>
          <div className="rounded-md bg-green-50 dark:bg-green-9500/5 border border-emerald-500/10 p-2 text-center">
            <p className="text-xs font-bold">94%</p>
            <p className="text-[9px] text-muted-foreground">On-time Rate</p>
          </div>
        </div>
        {/* Invoice list */}
        <p className="text-[10px] font-medium text-muted-foreground">Recent Invoices</p>
        {[
          { id: 'INV-2847', student: 'Adebayo C.', amount: '₦45,000', status: 'Paid', statusColor: 'emerald' },
          { id: 'INV-2846', student: 'Fatima A.', amount: '₦45,000', status: 'Pending', statusColor: 'amber' },
          { id: 'INV-2845', student: 'Emeka O.', amount: '₦38,500', status: 'Paid', statusColor: 'emerald' },
        ].map(inv => (
          <div key={inv.id} className="flex items-center justify-between rounded-md bg-background/50 border border-border/20 p-1.5">
            <div>
              <p className="text-[10px] font-medium">{inv.id}</p>
              <p className="text-[9px] text-muted-foreground">{inv.student}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold">{inv.amount}</p>
              <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-medium ${inv.statusColor === 'emerald' ? 'bg-green-50 dark:bg-green-9500/10 text-green-600 dark:text-green-400' : 'bg-yellow-50 dark:bg-yellow-9500/10 text-yellow-600 dark:text-yellow-400'}`}>{inv.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── AI Assistant Screen ───
export function AIAssistantScreen({ animate = false }: { animate?: boolean }) {
  return (
    <div className={screenBase} aria-hidden="true">
      <div className={titleBar}>
        <div className={`${titleDot} bg-red-400/70`} />
        <div className={`${titleDot} bg-yellow-400/70`} />
        <div className={`${titleDot} bg-green-400/70`} />
        <span className="ml-2 text-[10px] text-muted-foreground font-medium">AI Assistant</span>
      </div>
      <div className="p-3 space-y-2.5">
        {/* User message */}
        <div className="flex justify-end">
          <div className="rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 max-w-[85%]">
            <p className="text-[10px]">Show me students at risk of failing in SS3</p>
          </div>
        </div>
        {/* AI response */}
        <div className="flex gap-2">
          <div className="h-6 w-6 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shrink-0">
            <span className="text-[8px] font-bold text-white">AI</span>
          </div>
          <div className="rounded-lg bg-violet-500/5 border border-violet-500/15 px-3 py-2 flex-1">
            <p className="text-[10px] leading-relaxed">I found <strong>23 students</strong> in SS3 at risk based on current trends. Top concerns:</p>
            <div className="mt-1.5 space-y-1">
              {['Math score dropped 15%', '3 consecutive low scores', 'Attendance below 60%'].map(item => (
                <div key={item} className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
                  <span className="h-1 w-1 rounded-full bg-yellow-50 dark:bg-yellow-9500" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Messaging Screen ───
export function MessagingScreen({ animate = false }: { animate?: boolean }) {
  return (
    <div className={screenBase} aria-hidden="true">
      <div className={titleBar}>
        <div className={`${titleDot} bg-red-400/70`} />
        <div className={`${titleDot} bg-yellow-400/70`} />
        <div className={`${titleDot} bg-green-400/70`} />
        <span className="ml-2 text-[10px] text-muted-foreground font-medium">Messages — SS3 Teachers</span>
      </div>
      <div className="p-3 space-y-2">
        {[
          { sender: 'Mrs. Bello', initials: 'MB', gradient: 'from-teal-500 to-cyan-600', text: 'The biology exam results are ready for review', time: '2m ago' },
          { sender: 'You', initials: 'YO', gradient: 'from-indigo-500 to-amber-500', text: 'Thanks! I\'ll check them after lunch', time: '1m ago', isOwn: true },
          { sender: 'Mr. Eze', initials: 'ME', gradient: 'from-amber-500 to-orange-600', text: 'Can we discuss the SS2 curriculum alignment?', time: 'just now' },
        ].map(msg => (
          <div key={msg.sender + msg.time} className={`flex gap-2 ${msg.isOwn ? 'justify-end' : ''}`}>
            {!msg.isOwn && (
              <div className={`h-6 w-6 rounded-full bg-gradient-to-br ${msg.gradient} flex items-center justify-center shrink-0`}>
                <span className="text-[7px] font-bold text-white">{msg.initials}</span>
              </div>
            )}
            <div className={`rounded-lg px-3 py-1.5 max-w-[80%] ${msg.isOwn ? 'bg-primary/10 border border-primary/20' : 'bg-background/50 border border-border/20'}`}>
              {!msg.isOwn && <p className="text-[9px] font-medium text-muted-foreground">{msg.sender}</p>}
              <p className="text-[10px]">{msg.text}</p>
              <p className="text-[8px] text-muted-foreground mt-0.5">{msg.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Collaboration Screen ───
export function CollabScreen({ animate = false }: { animate?: boolean }) {
  return (
    <div className={screenBase} aria-hidden="true">
      <div className={titleBar}>
        <div className={`${titleDot} bg-red-400/70`} />
        <div className={`${titleDot} bg-yellow-400/70`} />
        <div className={`${titleDot} bg-green-400/70`} />
        <span className="ml-2 text-[10px] text-muted-foreground font-medium">Collaborative Editor — SS2 Exam Draft</span>
      </div>
      <div className="p-3 space-y-2">
        {/* Presence indicators */}
        <div className="flex items-center gap-2 mb-1">
          <div className="flex -space-x-1.5">
            {[
              { initials: 'ME', color: 'from-amber-500 to-orange-600' },
              { initials: 'MB', color: 'from-teal-500 to-cyan-600' },
              { initials: 'YO', color: 'from-indigo-500 to-amber-500' },
            ].map((u, i) => (
              <div key={i} className={`h-5 w-5 rounded-full bg-gradient-to-br ${u.color} flex items-center justify-center ring-2 ring-background`}>
                <span className="text-[7px] font-bold text-white">{u.initials}</span>
              </div>
            ))}
          </div>
          <span className="text-[9px] text-muted-foreground">3 people editing</span>
          <span className="ml-auto rounded-full bg-green-50 dark:bg-green-9500/10 px-1.5 py-0.5 text-[8px] text-green-600 dark:text-green-400">● Live</span>
        </div>
        {/* Document content */}
        <div className="rounded-md bg-background/50 border border-border/20 p-2.5">
          <p className="text-xs font-semibold mb-1">SS2 Biology — Mid-Term Examination</p>
          <p className="text-[10px] text-muted-foreground leading-relaxed">Section A: Multiple Choice (40 marks)</p>
          <p className="text-[10px] text-muted-foreground leading-relaxed">1. Which organelle is responsible for photosynthesis? <span className="text-green-600 dark:text-green-400">[Added by ME]</span></p>
          <p className="text-[10px] text-muted-foreground leading-relaxed">2. The process of mitosis results in... <span className="text-yellow-600 dark:text-yellow-400">[Editing by YO]</span></p>
        </div>
      </div>
    </div>
  )
}

// ─── Notifications Screen ───
export function NotificationsScreen({ animate = false }: { animate?: boolean }) {
  return (
    <div className={screenBase} aria-hidden="true">
      <div className={titleBar}>
        <div className={`${titleDot} bg-red-400/70`} />
        <div className={`${titleDot} bg-yellow-400/70`} />
        <div className={`${titleDot} bg-green-400/70`} />
        <span className="ml-2 text-[10px] text-muted-foreground font-medium">Notifications</span>
      </div>
      <div className="p-3 space-y-1.5">
        {[
          { icon: '🔴', title: 'Exam Alert', text: 'Math 101 exam started — 45 students logged in', time: '2m ago', unread: true },
          { icon: '🟡', title: 'AI Complete', text: 'Question generation finished: 40/40 questions', time: '5m ago', unread: true },
          { icon: '🟢', title: 'Results Ready', text: 'English 201 auto-marking complete — avg 78.3%', time: '12m ago', unread: false },
          { icon: '📧', title: 'Payment', text: 'Invoice INV-2847 paid by Adebayo family', time: '1h ago', unread: false },
        ].map(n => (
          <div key={n.title + n.time} className={`flex items-start gap-2 rounded-md p-2 ${n.unread ? 'bg-primary/5 border border-primary/10' : 'bg-background/50 border border-border/20'}`}>
            <span className={`h-2 w-2 rounded-full mt-1 shrink-0 ${n.icon === '🔴' ? 'bg-destructive/100' : n.icon === '🟡' ? 'bg-yellow-50 dark:bg-yellow-9500' : n.icon === '🟢' ? 'bg-green-50 dark:bg-green-9500' : 'bg-primary/100'}}`}></span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold">{n.title}</p>
                {n.unread && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
              </div>
              <p className="text-[9px] text-muted-foreground line-clamp-1">{n.text}</p>
              <p className="text-[8px] text-muted-foreground mt-0.5">{n.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
