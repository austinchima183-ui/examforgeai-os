'use client'
import { apiFetch } from '@/lib/api/client-fetch'

import { useState, useEffect, useCallback } from 'react'
import {
  DollarSign, CreditCard, Receipt, TrendingUp, AlertTriangle, Plus,
  CheckCircle2, Clock, XCircle, Download, Loader2, Wallet, FileText
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import type { FeeStructureItem, FeeAssignmentItem, FeePaymentItem, FeesPageData } from '@/lib/services/school-admin-service'
import type { FeeStructureRow, FeeAssignmentRow, FeePaymentRow } from '@/lib/supabase/types'

// ============================================================================
// ExamForge AI — Fee Management Page (Client)
// ============================================================================

const FEE_TYPE_LABELS: Record<string, string> = {
  tuition: 'Tuition',
  exam_fee: 'Exam Fee',
  library: 'Library',
  transport: 'Transport',
  hostel: 'Hostel',
  development: 'Development',
  sports: 'Sports',
  technology: 'Technology',
  other: 'Other',
}

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  paid: { label: 'Paid', variant: 'default' },
  pending: { label: 'Pending', variant: 'secondary' },
  overdue: { label: 'Overdue', variant: 'destructive' },
  partial: { label: 'Partial', variant: 'outline' },
  waived: { label: 'Waived', variant: 'secondary' },
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
}

interface FeesPageClientProps {
  initialData: FeesPageData
  schoolId: string
  userId: string
}

export function FeesPageClient({ initialData, schoolId, userId }: FeesPageClientProps) {
  const { toast } = useToast()
  const [data, setData] = useState<FeesPageData>(initialData)
  const [loading, setLoading] = useState(false)
  const [createFeeOpen, setCreateFeeOpen] = useState(false)
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState<FeeAssignmentItem | null>(null)
  const [saving, setSaving] = useState(false)

  // Create fee form
  const [feeName, setFeeName] = useState('')
  const [feeType, setFeeType] = useState('tuition')
  const [feeAmount, setFeeAmount] = useState('')
  const [feeClass, setFeeClass] = useState('')
  const [feeDueDate, setFeeDueDate] = useState('')
  const [feeDescription, setFeeDescription] = useState('')
  const [feeMandatory, setFeeMandatory] = useState(false)

  // Payment form
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paymentRef, setPaymentRef] = useState('')

  const refreshData = useCallback(async () => {
    setLoading(true)
    try {
      const [structRes, assignRes, payRes] = await Promise.all([
        fetch('/api/school/fees?type=structures'),
        fetch('/api/school/fees?type=assignments'),
        fetch('/api/school/fees?type=payments'),
      ])

      if (structRes.ok && assignRes.ok && payRes.ok) {
        const [structResult, assignResult, payResult] = await Promise.all([
          structRes.json(), assignRes.json(), payRes.json(),
        ])

        const structures: FeeStructureItem[] = ((structResult.data ?? []) as unknown as FeeStructureRow[]).map((s) => ({
          id: s.id, name: s.name, fee_type: s.fee_type, amount: s.amount,
          class_id: s.class_id, class_name: null, due_date: s.due_date,
          description: s.description, is_mandatory: s.is_mandatory, is_active: s.is_active,
        }))

        const assignments: FeeAssignmentItem[] = ((assignResult.data ?? []) as unknown as ({ id: string; fee_structure_id: string; student_id: string; amount_due: number; amount_paid: number; status: string; due_date: string | null; paid_at: string | null; fee_structures: { name: string; fee_type: string } | null; profiles: { full_name: string } | null })[]).map((a) => ({
          id: a.id, fee_structure_id: a.fee_structure_id,
          fee_name: a.fee_structures?.name ?? 'Unknown', fee_type: a.fee_structures?.fee_type ?? 'other',
          student_id: a.student_id, student_name: a.profiles?.full_name ?? 'Unknown',
          amount_due: a.amount_due, amount_paid: a.amount_paid, status: a.status,
          due_date: a.due_date, paid_at: a.paid_at,
        }))

        const recentPayments: FeePaymentItem[] = ((payResult.data ?? []) as unknown as ({ id: string; fee_assignment_id: string; amount: number; payment_method: string; receipt_number: string | null; paid_at: string; profiles: { full_name: string } | null })[]).slice(0, 20).map((p) => ({
          id: p.id, fee_assignment_id: p.fee_assignment_id,
          student_name: p.profiles?.full_name ?? 'Unknown', amount: p.amount,
          payment_method: p.payment_method, receipt_number: p.receipt_number, paid_at: p.paid_at,
        }))

        const totalRevenue = assignments.filter((a) => a.status === 'paid').reduce((sum, a) => sum + a.amount_paid, 0)
        const totalPending = assignments.filter((a) => a.status === 'pending').reduce((sum, a) => sum + (a.amount_due - a.amount_paid), 0)
        const totalOverdue = assignments.filter((a) => a.status === 'overdue').reduce((sum, a) => sum + (a.amount_due - a.amount_paid), 0)
        const totalDue = assignments.reduce((sum, a) => sum + a.amount_due, 0)

        setData((prev) => ({
          ...prev, structures, assignments, recentPayments,
          totalRevenue, totalPending, totalOverdue,
          collectionRate: totalDue > 0 ? Math.round((totalRevenue / totalDue) * 100) : 0,
        }))
      }
    } catch {
      // keep existing
    }
    setLoading(false)
  }, [])

  const handleCreateFee = async () => {
    if (!feeName.trim() || !feeAmount) {
      toast({ title: 'Error', description: 'Name and amount are required', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const res = await apiFetch('/api/school/fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_structure',
          name: feeName,
          fee_type: feeType,
          amount: Number(feeAmount),
          class_id: feeClass || null,
          due_date: feeDueDate || null,
          description: feeDescription || null,
          is_mandatory: feeMandatory,
        }),
      })
      const result = await res.json()
      if (res.ok) {
        toast({ title: 'Success', description: 'Fee structure created' })
        setCreateFeeOpen(false)
        resetFeeForm()
        refreshData()
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' })
    }
    setSaving(false)
  }

  const handleRecordPayment = async () => {
    if (!selectedAssignment || !paymentAmount) {
      toast({ title: 'Error', description: 'Amount is required', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const res = await apiFetch('/api/school/fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'record_payment',
          fee_assignment_id: selectedAssignment.id,
          student_id: selectedAssignment.student_id,
          amount: Number(paymentAmount),
          payment_method: paymentMethod,
          transaction_ref: paymentRef || null,
        }),
      })
      const result = await res.json()
      if (res.ok) {
        toast({ title: 'Payment Recorded', description: `Receipt: ${result.data?.receipt_number ?? 'Generated'}` })
        setRecordPaymentOpen(false)
        setPaymentAmount('')
        setPaymentRef('')
        refreshData()
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' })
    }
    setSaving(false)
  }

  const handleExport = () => {
    const rows = ['Student,Fee Name,Amount Due,Amount Paid,Status,Due Date']
    data.assignments.forEach((a) => {
      rows.push(`${a.student_name},${a.fee_name},${a.amount_due},${a.amount_paid},${a.status},${a.due_date ?? ''}`)
    })
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'fee-report.csv'
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: 'Exported', description: 'Fee report exported' })
  }

  const resetFeeForm = () => {
    setFeeName('')
    setFeeType('tuition')
    setFeeAmount('')
    setFeeClass('')
    setFeeDueDate('')
    setFeeDescription('')
    setFeeMandatory(false)
  }

  const { structures, assignments, recentPayments, totalRevenue, totalPending, totalOverdue, collectionRate } = data

  return (
    <div className="space-y-6 animate-fade-in forge-ambient-bg">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fee Management</h1>
          <p className="text-sm text-muted-foreground">Manage fee structures, track payments, and monitor collection rates.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
          <Dialog open={createFeeOpen} onOpenChange={setCreateFeeOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={resetFeeForm}>
                <Plus className="h-4 w-4 mr-2" /> Create Fee
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create Fee Structure</DialogTitle>
                <DialogDescription>Define a new fee type for your school.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Fee Name *</Label>
                  <Input value={feeName} onChange={(e) => setFeeName(e.target.value)} placeholder="e.g., Term 1 Tuition" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Fee Type</Label>
                    <Select value={feeType} onValueChange={setFeeType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(FEE_TYPE_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Amount (₦) *</Label>
                    <Input type="number" value={feeAmount} onChange={(e) => setFeeAmount(e.target.value)} placeholder="e.g., 50000" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Class (optional)</Label>
                    <Select value={feeClass} onValueChange={setFeeClass}>
                      <SelectTrigger><SelectValue placeholder="All classes" /></SelectTrigger>
                      <SelectContent>
                        {data.classes.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Due Date</Label>
                    <Input type="date" value={feeDueDate} onChange={(e) => setFeeDueDate(e.target.value)} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Description</Label>
                  <Input value={feeDescription} onChange={(e) => setFeeDescription(e.target.value)} placeholder="Optional description" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateFeeOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateFee} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Revenue Dashboard */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-green-600 dark:text-green-400">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">Collected payments</p>
          </CardContent>
        </Card>
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-yellow-600 dark:text-yellow-400">{formatCurrency(totalPending)}</div>
            <p className="text-xs text-muted-foreground">Awaiting payment</p>
          </CardContent>
        </Card>
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-destructive">{formatCurrency(totalOverdue)}</div>
            <p className="text-xs text-muted-foreground">Past due date</p>
          </CardContent>
        </Card>
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{collectionRate}%</div>
            <Progress value={collectionRate} className="mt-2 h-1.5" />
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="structures" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="structures">Fee Structures</TabsTrigger>
          <TabsTrigger value="assignments">Student Fees</TabsTrigger>
          <TabsTrigger value="payments">Payment History</TabsTrigger>
        </TabsList>

        {/* Fee Structures Tab */}
        <TabsContent value="structures" className="space-y-4 pt-4">
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : structures.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Wallet className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No fee structures yet. Create one to get started.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {structures.map((fee) => (
                <Card key={fee.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{fee.name}</p>
                        <Badge variant="outline" className="mt-1 text-xs">
                          {FEE_TYPE_LABELS[fee.fee_type] ?? fee.fee_type}
                        </Badge>
                      </div>
                      {fee.is_mandatory && <Badge variant="destructive" className="text-xs">Mandatory</Badge>}
                    </div>
                    <div className="mt-3 text-3xl font-bold tracking-tight">{formatCurrency(fee.amount)}</div>
                    {fee.due_date && (
                      <p className="text-xs text-muted-foreground mt-1">Due: {new Date(fee.due_date).toLocaleDateString()}</p>
                    )}
                    {fee.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{fee.description}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Student Fees Tab */}
        <TabsContent value="assignments" className="space-y-4 pt-4">
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : assignments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No fee assignments yet.</p>
            </div>
          ) : (
            <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
              <CardContent className="p-0">
                <div className="divide-y">
                  {assignments.map((assignment) => {
                    const statusConfig = PAYMENT_STATUS_CONFIG[assignment.status] ?? PAYMENT_STATUS_CONFIG.pending
                    const isOverdue = assignment.status === 'overdue'
                    return (
                      <div key={assignment.id} className="flex items-center justify-between p-4 gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{assignment.student_name}</p>
                          <p className="text-xs text-muted-foreground">{assignment.fee_name} · {FEE_TYPE_LABELS[assignment.fee_type] ?? assignment.fee_type}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-medium">{formatCurrency(assignment.amount_due)}</p>
                          <p className="text-xs text-muted-foreground">Paid: {formatCurrency(assignment.amount_paid)}</p>
                        </div>
                        <Badge variant={statusConfig.variant} className="shrink-0">
                          {statusConfig.label}
                        </Badge>
                        {(assignment.status === 'pending' || assignment.status === 'overdue' || assignment.status === 'partial') && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="shrink-0 h-7 text-xs"
                            onClick={() => {
                              setSelectedAssignment(assignment)
                              setPaymentAmount(String(assignment.amount_due - assignment.amount_paid))
                              setRecordPaymentOpen(true)
                            }}
                          >
                            <CreditCard className="h-3 w-3 mr-1" /> Pay
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Payment History Tab */}
        <TabsContent value="payments" className="space-y-4 pt-4">
          {loading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : recentPayments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Receipt className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No payment records yet.</p>
            </div>
          ) : (
            <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
              <CardContent className="p-0">
                <div className="divide-y">
                  {recentPayments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50 dark:bg-green-950 dark:bg-emerald-900/20">
                          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{payment.student_name}</p>
                          <p className="text-xs text-muted-foreground">{payment.payment_method} · {new Date(payment.paid_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-green-600 dark:text-green-400">{formatCurrency(payment.amount)}</p>
                        {payment.receipt_number && (
                          <p className="text-xs text-muted-foreground">Receipt: {payment.receipt_number}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Record Payment Dialog */}
      <Dialog open={recordPaymentOpen} onOpenChange={setRecordPaymentOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              {selectedAssignment && (
                <>Record payment for <strong>{selectedAssignment.student_name}</strong> — {selectedAssignment.fee_name}</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {selectedAssignment && (
              <div className="bg-muted rounded-lg p-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount Due:</span>
                  <span className="font-medium">{formatCurrency(selectedAssignment.amount_due)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Already Paid:</span>
                  <span className="font-medium text-green-600 dark:text-green-400">{formatCurrency(selectedAssignment.amount_paid)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Balance:</span>
                  <span className="font-bold">{formatCurrency(selectedAssignment.amount_due - selectedAssignment.amount_paid)}</span>
                </div>
              </div>
            )}
            <div className="grid gap-2">
              <Label>Payment Amount (₦) *</Label>
              <Input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Transaction Ref</Label>
                <Input value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} placeholder="Optional" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecordPaymentOpen(false)}>Cancel</Button>
            <Button onClick={handleRecordPayment} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
