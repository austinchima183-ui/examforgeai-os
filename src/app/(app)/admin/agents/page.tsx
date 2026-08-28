'use client'

import { useState, useCallback, useEffect } from 'react'
import { useApi } from '@/lib/hooks/use-api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import {
  Brain, Play, Pause, Settings, Clock, DollarSign, Zap,
  BookOpen, Building2, UserPlus, Globe, FlaskConical,
  ShieldCheck, Megaphone, Calendar, HeadphonesIcon,
  CheckCircle2, XCircle, Loader2, RefreshCw
} from 'lucide-react'
import type { AgentType, AgentCapability, AgentState } from '@/lib/ai/orchestration/types'
import { AGENT_CAPABILITIES } from '@/lib/ai/orchestration/types'

// ── Agent Configuration ──────────────────────────────────────────
interface AgentInfo {
  type: AgentType
  name: string
  icon: typeof Brain
  color: string
  bgColor: string
  description: string
}

const AGENT_CONFIG: AgentInfo[] = [
  { type: 'teacher', name: 'Teacher Agent', icon: BookOpen, color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-950', description: 'Lesson planning, exam creation, student assessment & grading' },
  { type: 'principal', name: 'Principal Agent', icon: Building2, color: 'text-violet-600', bgColor: 'bg-violet-500', description: 'School-wide insights, intervention coordination & scheduling' },
  { type: 'admissions', name: 'Admissions Agent', icon: UserPlus, color: 'text-sky-600', bgColor: 'bg-sky-500', description: 'Enrollment management, prospect communication & prediction' },
  { type: 'finance', name: 'Finance Agent', icon: DollarSign, color: 'text-yellow-600 dark:text-yellow-400', bgColor: 'bg-yellow-50 dark:bg-yellow-950', description: 'Financial analysis, billing reports & compliance checking' },
  { type: 'government', name: 'Government Agent', icon: Globe, color: 'text-destructive', bgColor: 'bg-destructive/100', description: 'Compliance monitoring, regulatory reporting & research' },
  { type: 'research', name: 'Research Agent', icon: FlaskConical, color: 'text-teal-600', bgColor: 'bg-teal-500', description: 'Academic research, predictive analysis & data mining' },
  { type: 'compliance', name: 'Compliance Agent', icon: ShieldCheck, color: 'text-orange-600', bgColor: 'bg-orange-500', description: 'Regulatory compliance checking, audit trails & communication' },
  { type: 'marketing', name: 'Marketing Agent', icon: Megaphone, color: 'text-pink-600', bgColor: 'bg-pink-500', description: 'Campaign management, lead nurturing & analytics' },
  { type: 'scheduling', name: 'Scheduling Agent', icon: Calendar, color: 'text-cyan-600', bgColor: 'bg-cyan-500', description: 'Timetable optimization, resource allocation & conflict resolution' },
  { type: 'support', name: 'Support Agent', icon: HeadphonesIcon, color: 'text-lime-600', bgColor: 'bg-lime-500', description: 'User support, ticket resolution & knowledge management' },
]

const CAPABILITY_LABELS: Record<AgentCapability, string> = {
  lesson_planning: 'Lesson Planning', exam_creation: 'Exam Creation', student_assessment: 'Student Assessment',
  intervention: 'Intervention', enrollment: 'Enrollment', scheduling: 'Scheduling',
  financial_analysis: 'Financial Analysis', compliance_check: 'Compliance Check',
  communication: 'Communication', research: 'Research', marketing: 'Marketing',
  support: 'Support', reporting: 'Reporting', prediction: 'Prediction',
}

// ── Agent State (Local Default) ───────────────────────────────────
interface AgentLocalState {
  enabled: boolean
  status: AgentState
  lastExecution: string
  totalRuns: number
  totalCost: number
}

const INITIAL_STATE: Record<AgentType, AgentLocalState> = {
  teacher: { enabled: true, status: 'idle', lastExecution: 'Never', totalRuns: 0, totalCost: 0 },
  principal: { enabled: true, status: 'idle', lastExecution: 'Never', totalRuns: 0, totalCost: 0 },
  admissions: { enabled: true, status: 'idle', lastExecution: 'Never', totalRuns: 0, totalCost: 0 },
  finance: { enabled: true, status: 'idle', lastExecution: 'Never', totalRuns: 0, totalCost: 0 },
  government: { enabled: false, status: 'idle', lastExecution: 'Never', totalRuns: 0, totalCost: 0 },
  research: { enabled: true, status: 'idle', lastExecution: 'Never', totalRuns: 0, totalCost: 0 },
  compliance: { enabled: true, status: 'idle', lastExecution: 'Never', totalRuns: 0, totalCost: 0 },
  marketing: { enabled: false, status: 'idle', lastExecution: 'Never', totalRuns: 0, totalCost: 0 },
  scheduling: { enabled: true, status: 'idle', lastExecution: 'Never', totalRuns: 0, totalCost: 0 },
  support: { enabled: true, status: 'idle', lastExecution: 'Never', totalRuns: 0, totalCost: 0 },
}

// ── Execution History ────────────────────────────────────────────
interface ExecutionRecord {
  id: string
  agent: string
  goal: string
  status: 'completed' | 'running' | 'failed'
  duration: string
  cost: string
  tokens: number
  time: string
}

interface AgentsData {
  agents: Record<AgentType, AgentLocalState>
  executions: ExecutionRecord[]
}

// ── Status Indicator ─────────────────────────────────────────────
function StatusIndicator({ status }: { status: AgentState }) {
  switch (status) {
    case 'executing':
      return (
        <span className="flex items-center gap-1.5 text-xs text-yellow-600 dark:text-yellow-400">
          <Loader2 className="h-3 w-3 animate-spin" />Executing
        </span>
      )
    case 'thinking':
      return (
        <span className="flex items-center gap-1.5 text-xs text-violet-600">
          <Brain className="h-3 w-3 animate-pulse" />Thinking
        </span>
      )
    case 'idle':
      return (
        <span className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-3 w-3" />Idle
        </span>
      )
    case 'error':
      return (
        <span className="flex items-center gap-1.5 text-xs text-destructive">
          <XCircle className="h-3 w-3" />Error
        </span>
      )
    default:
      return (
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Pause className="h-3 w-3" />{status}
        </span>
      )
  }
}

// ── Main Component ───────────────────────────────────────────────
export default function AgentManagementPage() {
  const { data: agentsData, loading, error } = useApi<AgentsData>('/api/agents')
  const [agents, setAgents] = useState<Record<AgentType, AgentLocalState>>(INITIAL_STATE)
  const [executions, setExecutions] = useState<ExecutionRecord[]>([])
  const [executeOpen, setExecuteOpen] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<AgentType | null>(null)
  const [goalInput, setGoalInput] = useState('')
  const [activeTab, setActiveTab] = useState('agents')

  // Sync from API
  useEffect(() => {
    if (agentsData) {
      setAgents(agentsData.agents)
      setExecutions(agentsData.executions)
    }
  }, [agentsData])

  const toggleAgent = (type: AgentType) => {
    setAgents(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        enabled: !prev[type].enabled,
        status: !prev[type].enabled ? 'idle' : prev[type].status,
      },
    }))
  }

  const totalCost = Object.values(agents).reduce((sum, a) => sum + a.totalCost, 0)
  const totalRuns = Object.values(agents).reduce((sum, a) => sum + a.totalRuns, 0)
  const activeAgents = Object.values(agents).filter(a => a.enabled).length

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href="/admin/agents">AI Agents</BreadcrumbLink></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Agent Management</h1>
        <p className="text-muted-foreground">Configure and execute autonomous AI agents across your organization</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2"><Brain className="h-4 w-4" />Active Agents</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{activeAgents}<span className="text-sm font-normal text-muted-foreground">/{AGENT_CONFIG.length}</span></p>
          </CardContent>
        </Card>
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2"><Zap className="h-4 w-4" />Total Executions</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalRuns.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2"><DollarSign className="h-4 w-4" />Total Cost</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${totalCost.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2"><Clock className="h-4 w-4" />Avg Duration</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">—</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="agents" className="gap-2"><Settings className="h-4 w-4" />Agents</TabsTrigger>
          <TabsTrigger value="history" className="gap-2"><Clock className="h-4 w-4" />Execution History</TabsTrigger>
        </TabsList>

        {/* ── Agents Tab ───────────────────────────────────────── */}
        <TabsContent value="agents" className="mt-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {AGENT_CONFIG.map(agent => {
                const state = agents[agent.type]
                const capabilities = AGENT_CAPABILITIES[agent.type]
                const Icon = agent.icon
                return (
                  <Card key={agent.type} className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] hover:border-white/[0.08] transition-all duration-200 group">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-lg ${agent.bgColor} flex items-center justify-center shrink-0`}>
                            <Icon className="h-5 w-5 text-white" />
                          </div>
                          <div className="min-w-0">
                            <CardTitle className="text-base">{agent.name}</CardTitle>
                            <CardDescription className="text-xs mt-0.5 line-clamp-1">{agent.description}</CardDescription>
                          </div>
                        </div>
                        <Switch checked={state.enabled} onCheckedChange={() => toggleAgent(agent.type)} />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Capabilities */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {capabilities.slice(0, 3).map(cap => (
                          <Badge key={cap} variant="outline" className="text-xs">{CAPABILITY_LABELS[cap]}</Badge>
                        ))}
                        {capabilities.length > 3 && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">+{capabilities.length - 3} more</Badge>
                        )}
                      </div>

                      <Separator />

                      {/* Stats Row */}
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <StatusIndicator status={state.status} />
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />{state.lastExecution}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{state.totalRuns.toLocaleString()} runs</span>
                          <span>·</span>
                          <span>${state.totalCost.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Execute Button */}
                      <Dialog open={executeOpen && selectedAgent === agent.type} onOpenChange={open => { setExecuteOpen(open); if (open) setSelectedAgent(agent.type) }}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" disabled={!state.enabled} className="w-full gap-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            <Play className="h-3.5 w-3.5" />Execute Agent
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="forge-glass-elevated border-white/[0.06] rounded-xl">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <div className={`h-8 w-8 rounded-lg ${agent.bgColor} flex items-center justify-center`}>
                                <Icon className="h-4 w-4 text-white" />
                              </div>
                              Execute {agent.name}
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label>Goal</Label>
                              <Textarea
                                value={goalInput}
                                onChange={e => setGoalInput(e.target.value)}
                                placeholder={`Describe what you want ${agent.name} to accomplish...`}
                                rows={3}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Available Capabilities</Label>
                              <div className="flex gap-1.5 flex-wrap">
                                {capabilities.map(cap => (
                                  <Badge key={cap} variant="outline" className="text-xs">{CAPABILITY_LABELS[cap]}</Badge>
                                ))}
                              </div>
                            </div>
                            <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                              <Zap className="h-4 w-4 inline mr-1" />
                              Estimated cost: ~$0.05 — Max guardrail: $2.00
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="ghost" onClick={() => { setExecuteOpen(false); setGoalInput('') }}>Cancel</Button>
                            <Button onClick={() => { setExecuteOpen(false); setGoalInput('') }} disabled={!goalInput.trim()}>
                              <Play className="h-4 w-4 mr-2" />Execute
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Execution History Tab ────────────────────────────── */}
        <TabsContent value="history" className="mt-6">
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" />Recent Executions</CardTitle>
              <CardDescription>{executions.length} recent agent runs</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[480px]">
                <div className="divide-y">
                  {executions.map(ex => (
                    <div key={ex.id} className="flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs font-medium">{ex.agent}</Badge>
                          {ex.status === 'completed' && <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />}
                          {ex.status === 'running' && <Loader2 className="h-4 w-4 text-primary animate-spin" />}
                          {ex.status === 'failed' && <XCircle className="h-4 w-4 text-destructive" />}
                          <Badge variant={ex.status === 'completed' ? 'default' : ex.status === 'failed' ? 'destructive' : 'secondary'} className="text-xs">
                            {ex.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-foreground truncate">{ex.goal}</p>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0 ml-4">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{ex.duration}</span>
                        <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{ex.cost}</span>
                        <span className="flex items-center gap-1"><Zap className="h-3 w-3" />{ex.tokens.toLocaleString()} tokens</span>
                        <span>{ex.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
