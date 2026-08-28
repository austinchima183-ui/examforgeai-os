'use client'

// ============================================================================
// ExamForge AI — Newsletter Management Page (Admin)
// ============================================================================
// Shows subscriber count, recent subscriptions, status distribution.
// ============================================================================

import { useState, useEffect } from 'react'
import { Mail, Users, UserCheck, UserX, Inbox } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import type { NewsletterSubscriber } from '@/lib/supabase/marketing-types'

// ── Status Badge ──

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, string> = {
    pending: 'bg-yellow-50 dark:bg-yellow-9500/10 text-yellow-600 dark:text-yellow-400 border-amber-500/20',
    active: 'bg-green-50 dark:bg-green-9500/10 text-green-600 dark:text-green-400 border-emerald-500/20',
    unsubscribed: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
  }

  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border ${config[status] || ''}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

// ── Main Component ──

export default function NewsletterManagementPage() {
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/marketing/newsletter')
        if (res.ok) {
          const data = await res.json()
          setSubscribers(data.subscribers || [])
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Compute stats
  const total = subscribers.length
  const active = subscribers.filter(s => s.status === 'active').length
  const pending = subscribers.filter(s => s.status === 'pending').length
  const unsubscribed = subscribers.filter(s => s.status === 'unsubscribed').length

  // Recent 10
  const recent = subscribers.slice(0, 10)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight tracking-tight">Newsletter Management</h1>
        <p className="text-muted-foreground mt-1">
          View subscriber stats and manage newsletter audience.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
            <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tracking-tight">{total}</div>
              </CardContent>
            </Card>
            <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
                <UserCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tracking-tight text-green-600 dark:text-green-400">{active}</div>
              </CardContent>
            </Card>
            <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
                <Mail className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tracking-tight text-yellow-600 dark:text-yellow-400">{pending}</div>
              </CardContent>
            </Card>
            <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Unsubscribed</CardTitle>
                <UserX className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tracking-tight text-gray-500">{unsubscribed}</div>
              </CardContent>
            </Card>
          </div>

          {/* Status Distribution Bar */}
          <Card className="mb-6 forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <CardHeader>
              <CardTitle className="text-sm">Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex h-6 rounded-md overflow-hidden">
                {total > 0 && (
                  <>
                    {active > 0 && (
                      <div
                        className="bg-green-50 dark:bg-green-9500 transition-all"
                        style={{ width: `${(active / total) * 100}%` }}
                        title={`Active: ${active}`}
                      />
                    )}
                    {pending > 0 && (
                      <div
                        className="bg-yellow-50 dark:bg-yellow-9500 transition-all"
                        style={{ width: `${(pending / total) * 100}%` }}
                        title={`Pending: ${pending}`}
                      />
                    )}
                    {unsubscribed > 0 && (
                      <div
                        className="bg-gray-400 transition-all"
                        style={{ width: `${(unsubscribed / total) * 100}%` }}
                        title={`Unsubscribed: ${unsubscribed}`}
                      />
                    )}
                  </>
                )}
              </div>
              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-50 dark:bg-green-9500" /> Active ({active})</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-yellow-50 dark:bg-yellow-9500" /> Pending ({pending})</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-gray-400" /> Unsubscribed ({unsubscribed})</span>
              </div>
            </CardContent>
          </Card>

          {/* Recent Subscriptions */}
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <CardHeader>
              <CardTitle>Recent Subscriptions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {recent.length === 0 ? (
                <div className="p-12 text-center">
                  <Inbox className="h-12 w-12 text-foreground/20 mx-auto mb-3" />
                  <p className="text-muted-foreground">No subscribers yet.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-[#111111]/80 backdrop-blur-sm">
                    <TableRow className="hover:bg-white/[0.02] transition-colors">
                      <TableHead>Email</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Subscribed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recent.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell className="font-medium text-sm">{sub.email}</TableCell>
                        <TableCell className="text-sm capitalize">{sub.source}</TableCell>
                        <TableCell>
                          <StatusBadge status={sub.status} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(sub.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
