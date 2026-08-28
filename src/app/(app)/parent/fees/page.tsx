'use client'

import * as React from 'react'
import {
  CreditCard, Wallet, Clock, CheckCircle, AlertTriangle,
  Receipt, ArrowRight, Download, CalendarDays, GraduationCap,
  ChevronDown, Banknote
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useApi, apiPost } from '@/lib/hooks/use-api'
import { useAuthStore } from '@/lib/stores/auth-store'
import { toast } from 'sonner'

const STATUS_CONFIG = {
  paid: { label: 'Paid', icon: <CheckCircle className="h-4 w-4" />, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/5 border-green-500/10' },
  pending: { label: 'Pending', icon: <Clock className="h-4 w-4" />, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-amber-500/5 border-amber-500/10' },
  overdue: { label: 'Overdue', icon: <AlertTriangle className="h-4 w-4" />, color: 'text-destructive', bg: 'bg-red-500/5 border-red-500/10' },
  partial: { label: 'Partial', icon: <Wallet className="h-4 w-4" />, color: 'text-sky-400', bg: 'bg-sky-500/5 border-sky-500/10' },
}

interface FeeChildData {
  child: { id: string; fullName: string }
  payments: { id: string; amount: number; status: string; paymentMethod: string | null; reference: string | null; paidAt: string | null; dueDate: string | null; receiptUrl: string | null; fee: { id: string; name: string; feeType: string; term: string | null } }[]
  outstanding: { id: string; amount: number; status: string; dueDate: string | null; fee: { name: string } }[]
  paid: { id: string; amount: number; paidAt: string | null; fee: { name: string } }[]
  totalOutstanding: number
  totalPaid: number
  upcomingFees: { id: string; name: string; amount: number; dueDate: string | null; feeType: string }[]
}

export default function FeesPage() {
  const { user } = useAuthStore()
  const { data, loading, error, refetch } = useApi<FeeChildData[]>(`/api/parent/fees?userId=${user?.id || ''}`)
  const [selectedChild, setSelectedChild] = React.useState<string>('all')
  const [payDialog, setPayDialog] = React.useState<{ paymentId: string; amount: number; feeName: string } | null>(null)

  const filteredData = selectedChild === 'all'
    ? (data || [])
    : (data || []).filter(d => d.child.id === selectedChild)

  const totalOutstanding = filteredData.reduce((s, d) => s + d.totalOutstanding, 0)
  const totalPaid = filteredData.reduce((s, d) => s + d.totalPaid, 0)

  const handlePayment = async (paymentId: string) => {
    try {
      const result = await apiPost('/api/parent/fees', { paymentId, paymentMethod: 'card' })
      toast.success(result.message || 'Payment processed')
      setPayDialog(null)
      refetch()
    } catch {
      toast.error('Payment failed. Please try again.')
    }
  }

  const handleExportReceipt = (payment: FeeChildData['payments'][0]) => {
    const receipt = `
FEE PAYMENT RECEIPT
====================
School: Greenfield International School
Student: ${filteredData[0]?.child.fullName || 'N/A'}
Fee: ${payment.fee.name}
Amount: ₦${payment.amount.toLocaleString()}
Status: ${payment.status.toUpperCase()}
${payment.reference ? `Reference: ${payment.reference}` : ''}
${payment.paidAt ? `Date: ${new Date(payment.paidAt).toLocaleDateString()}` : ''}
====================
    `.trim()
    const blob = new Blob([receipt], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `receipt-${payment.id.slice(0, 8)}.txt`; a.click()
    URL.revokeObjectURL(url)
    toast.success('Receipt downloaded')
  }

  return (
    <div className="space-y-6 animate-fade-in forge-ambient-bg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fee & Payment Tracking</h1>
          <p className="text-sm text-muted-foreground mt-1.5">View outstanding fees, payment history, and make payments</p>
        </div>
        <Select value={selectedChild} onValueChange={setSelectedChild}>
          <SelectTrigger className="w-[200px] forge-input-glow"><GraduationCap className="h-4 w-4 mr-2" /><SelectValue placeholder="All children" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Children</SelectItem>
            {data?.map(d => <SelectItem key={d.child.id} value={d.child.id}>{d.child.fullName}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {error && <div className="p-6 text-center text-destructive">{error}</div>}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : (
          <>
            <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all duration-200">
              <CardContent className="p-4 text-center">
                <Wallet className="h-6 w-6 text-green-600 dark:text-green-400 mx-auto mb-2" />
                <div className="text-2xl font-bold">₦{totalPaid.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Total Paid</p>
              </CardContent>
            </Card>
            <Card className="forge-glass-surface border-red-500/20 rounded-xl forge-card-shadow hover:-translate-y-0.5 transition-all duration-200">
              <CardContent className="p-4 text-center">
                <AlertTriangle className="h-6 w-6 text-destructive mx-auto mb-2" />
                <div className="text-2xl font-bold text-destructive">₦{totalOutstanding.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Outstanding</p>
              </CardContent>
            </Card>
            <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all duration-200">
              <CardContent className="p-4 text-center">
                <Receipt className="h-6 w-6 text-sky-400 mx-auto mb-2" />
                <div className="text-2xl font-bold">{filteredData.reduce((s, d) => s + d.paid.length, 0)}</div>
                <p className="text-xs text-muted-foreground">Payments Made</p>
              </CardContent>
            </Card>
            <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all duration-200">
              <CardContent className="p-4 text-center">
                <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400 mx-auto mb-2" />
                <div className="text-2xl font-bold">{filteredData.reduce((s, d) => s + d.outstanding.length, 0)}</div>
                <p className="text-xs text-muted-foreground">Pending Fees</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Tabs defaultValue="outstanding" className="space-y-4">
        <TabsList>
          <TabsTrigger value="outstanding"><AlertTriangle className="h-4 w-4 mr-1" /> Outstanding</TabsTrigger>
          <TabsTrigger value="history"><CheckCircle className="h-4 w-4 mr-1" /> Payment History</TabsTrigger>
          <TabsTrigger value="schedule"><CalendarDays className="h-4 w-4 mr-1" /> Fee Schedule</TabsTrigger>
        </TabsList>

        {/* Outstanding Fees */}
        <TabsContent value="outstanding">
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
            <CardContent className="p-0">
              {loading && <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>}
              {!loading && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-white/[0.02]">
                        <TableHead>Child</TableHead>
                        <TableHead>Fee</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-24" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredData.flatMap(d =>
                        d.outstanding.map(p => (
                          <TableRow key={p.id} className="hover:bg-white/[0.02]">
                            <TableCell className="font-medium">{d.child.fullName}</TableCell>
                            <TableCell>{p.fee.name}</TableCell>
                            <TableCell className="font-semibold">₦{p.amount.toLocaleString()}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {p.dueDate ? new Date(p.dueDate).toLocaleDateString() : '—'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={p.status === 'overdue' ? 'destructive' : 'secondary'} className={`text-xs ${(STATUS_CONFIG as Record<string, { bg: string }>)[p.status]?.bg || ''}`}>
                                {p.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button size="sm" onClick={() => setPayDialog({ paymentId: p.id, amount: p.amount, feeName: p.fee.name })}>
                                <Banknote className="h-4 w-4 mr-1" /> Pay
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                      {filteredData.every(d => d.outstanding.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                            <div className="relative inline-block mb-3">
                              <div className="absolute inset-0 blur-lg bg-green-500/10 rounded-full" />
                              <CheckCircle className="h-8 w-8 mx-auto text-green-600 dark:text-green-400 relative" />
                            </div>
                            <p>All fees are paid!</p>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment History */}
        <TabsContent value="history">
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
            <CardContent className="p-0">
              {loading && <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>}
              {!loading && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-white/[0.02]">
                        <TableHead>Child</TableHead>
                        <TableHead>Fee</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Paid On</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead className="w-20" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredData.flatMap(d =>
                        d.payments.filter(p => p.status === 'paid').map(p => (
                          <TableRow key={p.id} className="hover:bg-white/[0.02]">
                            <TableCell className="font-medium">{d.child.fullName}</TableCell>
                            <TableCell>{p.fee.name}</TableCell>
                            <TableCell className="font-semibold">₦{p.amount.toLocaleString()}</TableCell>
                            <TableCell className="text-sm">{p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '—'}</TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{p.paymentMethod || '—'}</Badge></TableCell>
                            <TableCell className="text-xs font-mono text-muted-foreground">{p.reference ? p.reference.slice(0, 16) + '...' : '—'}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={() => handleExportReceipt(p)}>
                                <Download className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fee Schedule */}
        <TabsContent value="schedule">
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
            <CardHeader><CardTitle className="text-base">Upcoming Fee Schedule</CardTitle><CardDescription>Fees due in the future</CardDescription></CardHeader>
            <CardContent>
              {loading && <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>}
              <div className="space-y-3">
                {filteredData.flatMap(d =>
                  d.upcomingFees.map(fee => (
                    <div key={fee.id} className="flex items-center justify-between p-3 rounded-lg border border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 border border-white/[0.04]">
                          <CalendarDays className="h-4 w-4 text-amber-400" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{fee.name}</p>
                          <p className="text-xs text-muted-foreground">{fee.feeType} • Due: {fee.dueDate ? new Date(fee.dueDate).toLocaleDateString() : 'TBD'}</p>
                        </div>
                      </div>
                      <span className="font-semibold">₦{fee.amount.toLocaleString()}</span>
                    </div>
                  ))
                )}
                {filteredData.every(d => d.upcomingFees.length === 0) && (
                  <p className="text-center text-muted-foreground py-6">No upcoming fees scheduled</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Dialog */}
      <Dialog open={!!payDialog} onOpenChange={() => setPayDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> Make Payment</DialogTitle>
          </DialogHeader>
          {payDialog && (
            <div className="space-y-4 py-2">
              <div className="text-center p-4 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <p className="text-sm text-muted-foreground">{payDialog.feeName}</p>
                <p className="text-2xl font-bold mt-1">₦{payDialog.amount.toLocaleString()}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Payment Method</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" className="w-full">💳 Card</Button>
                  <Button variant="outline" size="sm" className="w-full">🏦 Transfer</Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">You will be redirected to the payment gateway to complete this transaction.</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialog(null)}>Cancel</Button>
            <Button onClick={() => payDialog && handlePayment(payDialog.paymentId)}>
              Pay Now <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
