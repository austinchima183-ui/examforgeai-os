'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useApi } from '@/lib/hooks/use-api'
import { DndContext, DragEndEvent, DragOverlay, useDraggable, useDroppable } from '@dnd-kit/core'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import {
  Workflow, Zap, Play, Save, Upload, GitBranch, Clock,
  CheckCircle, XCircle, AlertCircle, Settings, Pause,
  GripVertical, Timer, Shield, MessageSquare, ArrowRight,
  Plus, Trash2, Copy, RotateCcw, CircleDot
} from 'lucide-react'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

interface WorkflowNode {
  id: string
  type: 'trigger' | 'action' | 'condition' | 'approval' | 'delay'
  name: string
  actionType: string
  x: number
  y: number
  config: Record<string, unknown>
}

interface Connection {
  from: string
  to: string
  label?: string
}

interface Execution {
  id: string
  status: 'completed' | 'failed' | 'running'
  startedAt: string
  duration: string
  trigger: string
  stepsCompleted: number
  totalSteps: number
}

// ──────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────

const NODE_COLORS: Record<WorkflowNode['type'], { bg: string; border: string; icon: string; badge: string }> = {
  trigger:   { bg: 'bg-green-50 dark:bg-green-950 dark:bg-emerald-950/50', border: 'border-emerald-400 dark:border-emerald-600', icon: 'text-green-600 dark:text-green-400', badge: 'bg-green-50 dark:bg-green-950 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' },
  action:    { bg: 'bg-sky-50 dark:bg-sky-950/50', border: 'border-sky-400 dark:border-sky-600', icon: 'text-sky-600', badge: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200' },
  condition: { bg: 'bg-yellow-50 dark:bg-yellow-950 dark:bg-amber-950/50', border: 'border-amber-400 dark:border-amber-600', icon: 'text-yellow-600 dark:text-yellow-400', badge: 'bg-yellow-50 dark:bg-yellow-950 text-amber-800 dark:bg-amber-900 dark:text-amber-200' },
  approval:  { bg: 'bg-purple-50 dark:bg-purple-950/50', border: 'border-purple-400 dark:border-purple-600', icon: 'text-purple-600', badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  delay:     { bg: 'bg-gray-50 dark:bg-gray-900/50', border: 'border-gray-400 dark:border-gray-600', icon: 'text-gray-600', badge: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' },
}

const NODE_ICONS: Record<WorkflowNode['type'], typeof Zap> = {
  trigger: Zap, action: GitBranch, condition: AlertCircle, approval: Shield, delay: Timer,
}

const NODE_TYPE_LABELS: Record<WorkflowNode['type'], string> = {
  trigger: 'Trigger', action: 'Action', condition: 'Condition', approval: 'Approval', delay: 'Delay',
}

const NODE_WIDTH = 200
const NODE_HEIGHT = 80

// ── API Response Types ──────────────────────────────────────
interface WorkflowDetailData {
  nodes: WorkflowNode[]
  connections: Connection[]
  executions: Execution[]
}

// ──────────────────────────────────────────────────────────────
// Draggable Node Component
// ──────────────────────────────────────────────────────────────

function DraggableNode({ node, isSelected, onClick }: { node: WorkflowNode; isSelected: boolean; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: node.id })
  const colors = NODE_COLORS[node.type]
  const Icon = NODE_ICONS[node.type]

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${node.x}px`,
    top: `${node.y}px`,
    width: `${NODE_WIDTH}px`,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    zIndex: isDragging ? 10 : isSelected ? 5 : 1,
    opacity: isDragging ? 0.8 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border-2 p-3 cursor-pointer transition-all ${colors.bg} ${isSelected ? 'ring-2 ring-primary ring-offset-2 ' + colors.border : colors.border} ${isDragging ? 'shadow-lg' : 'hover:shadow-md'}`}
      onClick={onClick}
      {...listeners}
      {...attributes}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <GripVertical className="h-3.5 w-3.5 text-foreground/60 shrink-0" />
        <Icon className={`h-4 w-4 ${colors.icon} shrink-0`} />
        <span className="text-sm font-medium truncate flex-1">{node.name}</span>
      </div>
      <div className="flex items-center gap-1.5 pl-6">
        <Badge className={`text-[10px] px-1.5 py-0 ${colors.badge}`}>{NODE_TYPE_LABELS[node.type]}</Badge>
        <span className="text-[10px] text-muted-foreground truncate">{node.actionType}</span>
      </div>
    </div>
  )
}

function DroppableCanvas({ children, canvasRef }: { children: React.ReactNode; canvasRef: (node: HTMLElement | null) => void }) {
  const { setNodeRef } = useDroppable({ id: 'canvas' })
  const ref = useCallback((node: HTMLElement | null) => {
    setNodeRef(node)
    canvasRef(node)
  }, [setNodeRef, canvasRef])

  return (
    <div ref={ref} className="relative w-full h-full min-h-[700px]">
      {children}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// SVG Connection Lines
// ──────────────────────────────────────────────────────────────

function ConnectionLines({ connections, nodes }: { connections: Connection[]; nodes: WorkflowNode[] }) {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
      <defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" className="fill-muted-foreground/50" />
        </marker>
      </defs>
      {connections.map((conn, i) => {
        const from = nodes.find(n => n.id === conn.from)
        const to = nodes.find(n => n.id === conn.to)
        if (!from || !to) return null
        const x1 = from.x + NODE_WIDTH / 2
        const y1 = from.y + NODE_HEIGHT
        const x2 = to.x + NODE_WIDTH / 2
        const y2 = to.y
        const midY = (y1 + y2) / 2
        const path = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`
        return (
          <g key={i}>
            <path d={path} stroke="currentColor" strokeWidth="2" fill="none" className="text-foreground/60" markerEnd="url(#arrowhead)" />
            {conn.label && (
              <g>
                <rect x={(x1 + x2) / 2 - 14} y={midY - 8} width="28" height="16" rx="4" className="fill-background stroke-muted-foreground/30" strokeWidth="1" />
                <text x={(x1 + x2) / 2} y={midY + 4} textAnchor="middle" className="fill-muted-foreground text-[10px]" fontSize="10" fontWeight="500">{conn.label}</text>
              </g>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ──────────────────────────────────────────────────────────────
// Node Configuration Panel
// ──────────────────────────────────────────────────────────────

function NodeConfigPanel({ node }: { node: WorkflowNode | null }) {
  if (!node) {
    return (
      <div className="text-center py-8">
        <CircleDot className="h-8 w-8 mx-auto text-foreground/60 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">Select a node to configure</p>
        <p className="text-xs text-muted-foreground mt-1">Click any node in the editor</p>
      </div>
    )
  }

  const colors = NODE_COLORS[node.type]
  const Icon = NODE_ICONS[node.type]

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${colors.icon}`} />
        <Badge className={`text-xs ${colors.badge}`}>{NODE_TYPE_LABELS[node.type]}</Badge>
      </div>
      <Separator />
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Name</Label>
          <Input defaultValue={node.name} className="h-8 text-sm forge-input-glow" />
        </div>

        {node.type === 'trigger' && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Trigger Type</Label>
              <Select defaultValue="exam_submitted"><SelectTrigger className="h-8 text-sm" /><SelectContent>
                <SelectItem value="exam_submitted">Exam Submitted</SelectItem>
                <SelectItem value="student_enrolled">Student Enrolled</SelectItem>
                <SelectItem value="grade_released">Grade Released</SelectItem>
                <SelectItem value="schedule">Scheduled</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="webhook">Webhook</SelectItem>
              </SelectContent></Select>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Active</Label>
              <Switch defaultChecked />
            </div>
          </div>
        )}

        {node.type === 'condition' && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Field</Label>
              <Select defaultValue="score"><SelectTrigger className="h-8 text-sm" /><SelectContent>
                <SelectItem value="score">Score</SelectItem>
                <SelectItem value="attendance">Attendance</SelectItem>
                <SelectItem value="submission_count">Submission Count</SelectItem>
                <SelectItem value="custom">Custom Field</SelectItem>
              </SelectContent></Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Operator</Label>
              <Select defaultValue="less_than"><SelectTrigger className="h-8 text-sm" /><SelectContent>
                <SelectItem value="equals">Equals</SelectItem>
                <SelectItem value="not_equals">Not Equals</SelectItem>
                <SelectItem value="less_than">Less Than</SelectItem>
                <SelectItem value="greater_than">Greater Than</SelectItem>
                <SelectItem value="contains">Contains</SelectItem>
              </SelectContent></Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Value</Label>
              <Input type="number" defaultValue="50" className="h-8 text-sm forge-input-glow" />
            </div>
          </div>
        )}

        {node.type === 'action' && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Action Type</Label>
              <Select defaultValue="notify_user"><SelectTrigger className="h-8 text-sm" /><SelectContent>
                <SelectItem value="notify_user">Notify User</SelectItem>
                <SelectItem value="send_email">Send Email</SelectItem>
                <SelectItem value="send_sms">Send SMS</SelectItem>
                <SelectItem value="update_record">Update Record</SelectItem>
                <SelectItem value="generate_report">Generate Report</SelectItem>
                <SelectItem value="api_call">API Call</SelectItem>
              </SelectContent></Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Recipient</Label>
              <Select defaultValue="parent"><SelectTrigger className="h-8 text-sm" /><SelectContent>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="parent">Parent</SelectItem>
                <SelectItem value="teacher">Teacher</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent></Select>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Retry on Failure</Label>
              <Switch defaultChecked />
            </div>
          </div>
        )}

        {node.type === 'delay' && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Duration Type</Label>
              <Select defaultValue="hours"><SelectTrigger className="h-8 text-sm" /><SelectContent>
                <SelectItem value="minutes">Minutes</SelectItem>
                <SelectItem value="hours">Hours</SelectItem>
                <SelectItem value="days">Days</SelectItem>
                <SelectItem value="until_date">Until Specific Date</SelectItem>
              </SelectContent></Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Duration Value</Label>
              <Input type="number" defaultValue="24" className="h-8 text-sm forge-input-glow" />
            </div>
          </div>
        )}

        {node.type === 'approval' && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Approver Role</Label>
              <Select defaultValue="teacher"><SelectTrigger className="h-8 text-sm" /><SelectContent>
                <SelectItem value="teacher">Teacher</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="principal">Principal</SelectItem>
                <SelectItem value="hod">Head of Department</SelectItem>
              </SelectContent></Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Timeout (hours)</Label>
              <Input type="number" defaultValue="24" className="h-8 text-sm forge-input-glow" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">On Timeout</Label>
              <Select defaultValue="auto_approve"><SelectTrigger className="h-8 text-sm" /><SelectContent>
                <SelectItem value="auto_approve">Auto-Approve</SelectItem>
                <SelectItem value="auto_reject">Auto-Reject</SelectItem>
                <SelectItem value="escalate">Escalate</SelectItem>
              </SelectContent></Select>
            </div>
          </div>
        )}
      </div>

      <Separator />
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1"><Copy className="h-3.5 w-3.5 mr-1" />Duplicate</Button>
        <Button variant="outline" size="sm" className="flex-1 text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5 mr-1" />Delete</Button>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Main Page Component
// ──────────────────────────────────────────────────────────────

export default function WorkflowDetailPage() {
  const params = useParams()
  const workflowId = params.id as string
  const { data: workflowDetail } = useApi<WorkflowDetailData>(`/api/workflows/${workflowId}`)
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null)
  const [nodes, setNodes] = useState<WorkflowNode[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [executions, setExecutions] = useState<Execution[]>([])
  const [workflowStatus, setWorkflowStatus] = useState<'active' | 'draft' | 'paused'>('active')
  const [canvasEl, setCanvasEl] = useState<HTMLElement | null>(null)

  useEffect(() => {
    if (workflowDetail) {
      setNodes(workflowDetail.nodes)
      setConnections(workflowDetail.connections)
      setExecutions(workflowDetail.executions)
    }
  }, [workflowDetail])

  const handleNodeClick = useCallback((node: WorkflowNode) => {
    setSelectedNode(prev => prev?.id === node.id ? null : node)
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, delta } = event
    setNodes(prev => prev.map(n =>
      n.id === active.id ? { ...n, x: n.x + delta.x, y: n.y + delta.y } : n
    ))
  }, [])

  const canvasRef = useCallback((node: HTMLElement | null) => {
    setCanvasEl(node)
  }, [])

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/workflows">Workflows</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href={`/workflows/${workflowId}`}>Auto-Grade Exams</BreadcrumbLink></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center forge-glow">
            <Workflow className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">Auto-Grade Exams</h1>
              <Badge variant={workflowStatus === 'active' ? 'default' : workflowStatus === 'paused' ? 'secondary' : 'outline'}>
                {workflowStatus === 'active' && <CheckCircle className="h-3 w-3 mr-1" />}
                {workflowStatus === 'paused' && <Pause className="h-3 w-3 mr-1" />}
                {workflowStatus.charAt(0).toUpperCase() + workflowStatus.slice(1)}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Last saved 2 minutes ago</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm"><RotateCcw className="h-4 w-4 mr-1" />Undo</Button>
          <Button variant="outline" size="sm" onClick={() => setWorkflowStatus('paused')}><Pause className="h-4 w-4 mr-1" />Pause</Button>
          <Button variant="outline" size="sm"><Play className="h-4 w-4 mr-1" />Run</Button>
          <Button size="sm"><Save className="h-4 w-4 mr-1" />Save</Button>
          <Button size="sm"><Upload className="h-4 w-4 mr-1" />Publish</Button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <div className="space-y-4 animate-fade-in">
          {/* Visual Editor Canvas */}
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2"><GitBranch className="h-4 w-4" />Visual Editor</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-7 text-xs">
                    <Plus className="h-3.5 w-3.5 mr-1" />Add Node
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="border rounded-lg mx-4 mb-4 overflow-auto bg-[repeating-conic-gradient(#f0f0f0_0%_25%,transparent_0%_50%)] dark:bg-[repeating-conic-gradient(#1e1e2e_0%_25%,transparent_0%_50%)] bg-[length:20px_20px]">
                <DndContext onDragEnd={handleDragEnd}>
                  <DroppableCanvas canvasRef={canvasRef}>
                    <ConnectionLines connections={connections} nodes={nodes} />
                    {nodes.map(node => (
                      <DraggableNode
                        key={node.id}
                        node={node}
                        isSelected={selectedNode?.id === node.id}
                        onClick={() => handleNodeClick(node)}
                      />
                    ))}
                  </DroppableCanvas>
                  <DragOverlay>
                    {selectedNode ? (
                      <div className={`rounded-xl border-2 p-3 ${NODE_COLORS[selectedNode.type].bg} ${NODE_COLORS[selectedNode.type].border} shadow-lg opacity-80`} style={{ width: NODE_WIDTH }}>
                        <div className="flex items-center gap-2">
                          {(() => { const Icon = NODE_ICONS[selectedNode.type]; return <Icon className={`h-4 w-4 ${NODE_COLORS[selectedNode.type].icon}`} /> })()}
                          <span className="text-sm font-medium">{selectedNode.name}</span>
                        </div>
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              </div>
            </CardContent>
          </Card>

          {/* Execution History */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4" />Execution History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-64">
                <div className="divide-y">
                  {executions.map(ex => (
                    <div key={ex.id} className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center gap-3">
                        {ex.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />}
                        {ex.status === 'failed' && <XCircle className="h-4 w-4 text-destructive shrink-0" />}
                        {ex.status === 'running' && <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0" />}
                        <div>
                          <span className="text-sm">{ex.trigger}</span>
                          <p className="text-xs text-muted-foreground">{ex.stepsCompleted}/{ex.totalSteps} steps completed</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="font-mono">{ex.duration}</span>
                        <span>{ex.startedAt}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel: Node Configuration */}
        <div>
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow sticky top-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings className="h-4 w-4" />
                {selectedNode ? `Configure: ${selectedNode.name}` : 'Node Configuration'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <NodeConfigPanel node={selectedNode} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
