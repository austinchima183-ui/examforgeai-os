'use client'

import { useState, useMemo } from 'react'
import { useApi } from '@/lib/hooks/use-api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Search, Plus, Play, Pause, Edit, Copy, Zap, Clock, BarChart3,
  Workflow, Sparkles, BookOpen, DollarSign, GraduationCap,
  ClipboardCheck, FileText, Bell, CheckCircle, AlertCircle,
  RotateCcw, ChevronDown, ChevronUp, MoreHorizontal
} from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { WorkflowStatus, WorkflowTriggerType } from '@/lib/workflow/types'

// ── Status Config ────────────────────────────────────────────

const STATUS_CONFIG: Record<WorkflowStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof CheckCircle }> = {
  draft: { label: 'Draft', variant: 'secondary', icon: FileText },
  active: { label: 'Active', variant: 'default', icon: CheckCircle },
  paused: { label: 'Paused', variant: 'outline', icon: Pause },
  archived: { label: 'Archived', variant: 'secondary', icon: Clock },
  error: { label: 'Error', variant: 'destructive', icon: AlertCircle },
}

const TRIGGER_LABELS: Record<string, string> = {
  exam_submitted: 'Exam Submitted',
  student_enrolled: 'Student Enrolled',
  payment_completed: 'Payment Completed',
  schedule: 'Scheduled',
  manual: 'Manual',
  webhook_received: 'Webhook',
  ai_completed: 'AI Completed',
  attendance_marked: 'Attendance Marked',
  certificate_issued: 'Certificate Issued',
}

// ── Workflow API type ────────────────────────────────────────
interface WorkflowItem {
  id: string
  name: string
  triggerType: WorkflowTriggerType
  status: WorkflowStatus
  executionCount: number
  lastRun: string
  category: string
  successRate: number
  avgDuration: string
}

// ── 8 Templates (as specified in requirements) ───────────────

const TEMPLATES = [
  { id: 't1', name: 'Exam Grading', description: 'Automatically grade submitted exams using AI-powered marking with rubric support', icon: GraduationCap, category: 'grading', popular: true },
  { id: 't2', name: 'Student Onboarding', description: 'Welcome new students, create accounts, assign classes, and send orientation materials', icon: BookOpen, category: 'onboarding', popular: true },
  { id: 't3', name: 'At-Risk Intervention', description: 'Detect at-risk students via attendance and grade patterns, trigger counselor alerts', icon: ClipboardCheck, category: 'intervention', popular: true },
  { id: 't4', name: 'Attendance Alert', description: 'Notify parents and advisors when attendance drops below threshold', icon: Bell, category: 'attendance', popular: false },
  { id: 't5', name: 'Payment Flow', description: 'Automate invoice generation, payment reminders, and receipt issuance', icon: DollarSign, category: 'billing', popular: true },
  { id: 't6', name: 'Certificate Issuance', description: 'Auto-issue certificates upon course completion or exam pass threshold', icon: FileText, category: 'certification', popular: false },
  { id: 't7', name: 'Weekly Report', description: 'Generate and distribute weekly performance and attendance reports to stakeholders', icon: BarChart3, category: 'reporting', popular: false },
  { id: 't8', name: 'Fee Reminder', description: 'Send automated fee reminders based on due dates and outstanding balances', icon: DollarSign, category: 'billing', popular: false },
]

// ── Main Component ───────────────────────────────────────────

export default function WorkflowsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<WorkflowStatus | 'all'>('all')
  const [templateOpen, setTemplateOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data: workflowsData, loading: isLoading, error } = useApi<WorkflowItem[] | { data: WorkflowItem[]; total: number; hasMore: boolean }>('/api/workflows')
  // API may return a paginated envelope ({ data, total, hasMore }) — normalize to an array
  const workflows = Array.isArray(workflowsData) ? workflowsData : workflowsData?.data ?? []

  const filtered = useMemo(() => {
    let list = workflows
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(w => w.name.toLowerCase().includes(q) || w.category.toLowerCase().includes(q))
    }
    if (statusFilter !== 'all') list = list.filter(w => w.status === statusFilter)
    return list
  }, [search, statusFilter])

  // ── Loading State ─────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-5 w-48" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-10 w-44" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-[160px]" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href="/workflows">Workflows</BreadcrumbLink></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Workflow className="h-6 w-6 text-primary" />
            Workflow Automation
          </h1>
          <p className="text-sm text-muted-foreground">Automate processes across your educational organization</p>
        </div>
        <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Create Workflow</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl forge-glass-elevated border-white/[0.06] rounded-xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Choose a Template
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-4">
              {TEMPLATES.map(t => (
                <Card
                  key={t.id}
                  className="cursor-pointer forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] hover:border-white/[0.08] transition-all duration-200 border-dashed group"
                  onClick={() => setTemplateOpen(false)}
                >
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <t.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium text-sm">{t.name}</p>
                        {t.popular && <Badge variant="secondary" className="text-[10px] px-1.5">Popular</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{t.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Button variant="outline" className="w-full" onClick={() => setTemplateOpen(false)}>
              <Plus className="h-4 w-4 mr-2" />Start from Blank
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9 forge-input-glow" placeholder="Search workflows by name or category..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as WorkflowStatus | 'all')}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Active', count: workflows.filter(w => w.status === 'active').length, color: 'text-green-600 dark:text-green-400' },
          { label: 'Draft', count: workflows.filter(w => w.status === 'draft').length, color: 'text-yellow-600 dark:text-yellow-400' },
          { label: 'Paused', count: workflows.filter(w => w.status === 'paused').length, color: 'text-sky-600' },
          { label: 'Error', count: workflows.filter(w => w.status === 'error').length, color: 'text-destructive' },
        ].map(stat => (
          <Card key={stat.label} className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
            <CardContent className="p-4 text-center">
              <p className={`text-3xl font-bold tracking-tight ${stat.color}`}>{stat.count}</p>
              <p className="text-xs text-muted-foreground">{stat.label} Workflows</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Workflow List */}
      {filtered.length === 0 ? (
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
          <CardContent className="py-16 text-center">
            <Workflow className="h-12 w-12 mx-auto text-foreground/30" />
            <h3 className="mt-4 text-lg font-semibold">No workflows found</h3>
            <p className="text-muted-foreground text-sm">Create your first workflow to get started</p>
            <Button className="mt-4" onClick={() => setTemplateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />Create Workflow
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(wf => {
            const isExpanded = expandedId === wf.id
            return (
              <Card key={wf.id} className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] hover:border-white/[0.08] transition-all duration-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                        wf.status === 'active' ? 'bg-green-50 dark:bg-green-950 dark:bg-emerald-900' :
                        wf.status === 'error' ? 'bg-destructive/10 dark:bg-red-900' :
                        wf.status === 'paused' ? 'bg-yellow-50 dark:bg-yellow-950 dark:bg-amber-900' :
                        'bg-primary/10'
                      }`}>
                        <Zap className={`h-5 w-5 ${
                          wf.status === 'active' ? 'text-green-600 dark:text-green-400' :
                          wf.status === 'error' ? 'text-destructive' :
                          wf.status === 'paused' ? 'text-yellow-600 dark:text-yellow-400' :
                          'text-primary'
                        }`} />
                      </div>
                      <div>
                        <CardTitle className="text-base">{wf.name}</CardTitle>
                        <CardDescription className="text-xs">{TRIGGER_LABELS[wf.triggerType] ?? wf.triggerType}</CardDescription>
                      </div>
                    </div>
                    <Badge variant={STATUS_CONFIG[wf.status].variant}>{STATUS_CONFIG[wf.status].label}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    <span className="flex items-center gap-1"><BarChart3 className="h-3.5 w-3.5" />{wf.executionCount.toLocaleString()} runs</span>
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{wf.lastRun}</span>
                    {wf.successRate > 0 && (
                      <span className="flex items-center gap-1">
                        <CheckCircle className="h-3.5 w-3.5" />{wf.successRate}%
                      </span>
                    )}
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="mb-3 p-3 rounded-md bg-muted/50 text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Category</span>
                        <span className="font-medium capitalize">{wf.category}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Success Rate</span>
                        <span className="font-medium">{wf.successRate > 0 ? `${wf.successRate}%` : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Avg Duration</span>
                        <span className="font-medium">{wf.avgDuration}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Trigger</span>
                        <span className="font-medium">{TRIGGER_LABELS[wf.triggerType] ?? wf.triggerType}</span>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    {wf.status === 'active' && (
                      <Button variant="outline" size="sm" className="flex-1"><Pause className="h-3.5 w-3.5 mr-1" />Pause</Button>
                    )}
                    {(wf.status === 'paused' || wf.status === 'draft') && (
                      <Button variant="outline" size="sm" className="flex-1"><Play className="h-3.5 w-3.5 mr-1" />Run</Button>
                    )}
                    {wf.status === 'error' && (
                      <Button variant="outline" size="sm" className="flex-1"><RotateCcw className="h-3.5 w-3.5 mr-1" />Retry</Button>
                    )}
                    <Button variant="outline" size="sm" className="flex-1"><Edit className="h-3.5 w-3.5 mr-1" />Edit</Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem><Copy className="h-4 w-4 mr-2" />Duplicate</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setExpandedId(isExpanded ? null : wf.id)}>
                          {isExpanded ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
                          {isExpanded ? 'Less Details' : 'More Details'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
