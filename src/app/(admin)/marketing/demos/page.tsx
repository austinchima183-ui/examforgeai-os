'use client'

// ============================================================================
// ExamForge AI — Demo Bookings Page (Admin)
// ============================================================================
// Shows upcoming demos, past demos, status distribution.
// ============================================================================

import { useState, useEffect } from 'react'
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  CalendarClock,
  Inbox,
} from 'lucide-react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import type { DemoBooking } from '@/lib/supabase/marketing-types'

// ── Status Badge ──

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { className: string; icon: React.ElementType }> = {
    scheduled: { className: 'bg-sky-500/10 text-sky-600 border-sky-500/20', icon: CalendarClock },
    confirmed: { className: 'bg-green-50 dark:bg-green-9500/10 text-green-600 dark:text-green-400 border-emerald-500/20', icon: CheckCircle2 },
    completed: { className: 'bg-green-50 dark:bg-green-9500/10 text-green-600 dark:text-green-400 border-emerald-500/20', icon: CheckCircle2 },
    cancelled: { className: 'bg-destructive/100/10 text-destructive border-destructive/20', icon: XCircle },
    rescheduled: { className: 'bg-yellow-50 dark:bg-yellow-9500/10 text-yellow-600 dark:text-yellow-400 border-amber-500/20', icon: RotateCcw },
  }

  const c = config[status] || { className: '', icon: Clock }
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium border ${c.className}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

// ── Main Component ──

export default function DemoBookingsPage() {
  const [bookings, setBookings] = useState<DemoBooking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/marketing/demos')
        if (res.ok) {
          const data = await res.json()
          setBookings(data.demos || [])
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
  const now = new Date()
  const upcoming = bookings.filter(b =>
    (b.status === 'scheduled' || b.status === 'confirmed') && new Date(b.preferred_date) >= now
  )
  const past = bookings.filter(b =>
    b.status === 'completed' || (new Date(b.preferred_date) < now && b.status !== 'cancelled')
  )

  const statusCounts = bookings.reduce<Record<string, number>>((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1
    return acc
  }, {})

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight tracking-tight">Demo Bookings</h1>
        <p className="text-muted-foreground mt-1">
          Manage demo scheduling and track booking status.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Bookings</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tracking-tight">{bookings.length}</div>
              </CardContent>
            </Card>
            <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming</CardTitle>
                <CalendarClock className="h-4 w-4 text-sky-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tracking-tight text-sky-600">{upcoming.length}</div>
              </CardContent>
            </Card>
            <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tracking-tight text-green-600 dark:text-green-400">{past.length}</div>
              </CardContent>
            </Card>
            <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Cancelled</CardTitle>
                <XCircle className="h-4 w-4 text-red-400" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tracking-tight text-destructive">{statusCounts.cancelled || 0}</div>
              </CardContent>
            </Card>
          </div>

          {/* Status Distribution */}
          <Card className="mb-6 forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <CardHeader>
              <CardTitle className="text-sm">Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 flex-wrap">
                {Object.entries(statusCounts).map(([status, count]) => (
                  <div key={status} className="flex items-center gap-2">
                    <StatusBadge status={status} />
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tabs: Upcoming / All */}
          <Tabs defaultValue="upcoming">
            <TabsList>
              <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
              <TabsTrigger value="all">All ({bookings.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming">
              <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
                <CardContent className="p-0">
                  {upcoming.length === 0 ? (
                    <div className="p-12 text-center">
                      <Inbox className="h-12 w-12 text-foreground/20 mx-auto mb-3" />
                      <p className="text-muted-foreground">No upcoming demos.</p>
                    </div>
                  ) : (
                    <DemoTable bookings={upcoming} />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="all">
              <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
                <CardContent className="p-0">
                  {bookings.length === 0 ? (
                    <div className="p-12 text-center">
                      <Inbox className="h-12 w-12 text-foreground/20 mx-auto mb-3" />
                      <p className="text-muted-foreground">No demo bookings yet.</p>
                    </div>
                  ) : (
                    <DemoTable bookings={bookings} />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}

// ── Demo Table ──

function DemoTable({ bookings }: { bookings: DemoBooking[] }) {
  return (
    <Table>
      <TableHeader className="sticky top-0 z-10 bg-[#111111]/80 backdrop-blur-sm">
        <TableRow className="hover:bg-white/[0.02] transition-colors">
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Company</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Time</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Team Size</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {bookings.map((b) => (
          <TableRow key={b.id}>
            <TableCell className="font-medium text-sm">{b.name}</TableCell>
            <TableCell className="text-sm">{b.email}</TableCell>
            <TableCell className="text-sm">{b.company}</TableCell>
            <TableCell className="text-sm">
              {new Date(b.preferred_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </TableCell>
            <TableCell className="text-sm">{b.preferred_time}</TableCell>
            <TableCell>
              <StatusBadge status={b.status} />
            </TableCell>
            <TableCell className="text-sm">{b.team_size}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
