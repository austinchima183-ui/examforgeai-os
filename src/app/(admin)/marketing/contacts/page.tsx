'use client'

// ============================================================================
// ExamForge AI — Contact Submissions Page (Admin)
// ============================================================================
// Data table of contact submissions with status, priority, subject, assigned_to.
// ============================================================================

import { useState, useEffect } from 'react'
import { MessageSquare, Inbox } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
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
import type { ContactSubmission } from '@/lib/supabase/marketing-types'

// ── Status Badge ──

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { className: string }> = {
    new: { className: 'bg-sky-500/10 text-sky-600 border-sky-500/20' },
    in_progress: { className: 'bg-yellow-50 dark:bg-yellow-9500/10 text-yellow-600 dark:text-yellow-400 border-amber-500/20' },
    resolved: { className: 'bg-green-50 dark:bg-green-9500/10 text-green-600 dark:text-green-400 border-emerald-500/20' },
    closed: { className: 'bg-gray-500/10 text-gray-600 border-gray-500/20' },
  }

  const c = config[status] || { className: '' }
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border ${c.className}`}>
      {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
    </span>
  )
}

// ── Priority Badge ──

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    low: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
    medium: 'bg-yellow-50 dark:bg-yellow-9500/10 text-yellow-600 dark:text-yellow-400 border-amber-500/20',
    high: 'bg-destructive/100/10 text-destructive border-destructive/20',
  }

  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border ${colors[priority] || ''}`}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  )
}

// ── Main Component ──

export default function ContactSubmissionsPage() {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/marketing/contacts')
        if (res.ok) {
          const data = await res.json()
          setSubmissions(data.contacts || [])
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight tracking-tight">Contact Submissions</h1>
        <p className="text-muted-foreground mt-1">
          View and manage all contact form submissions.
        </p>
      </div>

      <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : submissions.length === 0 ? (
            <div className="p-12 text-center">
              <Inbox className="h-12 w-12 text-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground">No contact submissions found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-[#111111]/80 backdrop-blur-sm">
                <TableRow className="hover:bg-white/[0.02] transition-colors">
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium text-sm">
                      {sub.first_name} {sub.last_name}
                    </TableCell>
                    <TableCell className="text-sm">{sub.email}</TableCell>
                    <TableCell className="text-sm capitalize">
                      {sub.subject.replace(/_/g, ' ')}
                    </TableCell>
                    <TableCell>
                      <PriorityBadge priority={sub.priority} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={sub.status} />
                    </TableCell>
                    <TableCell className="text-sm">
                      {sub.assigned_to || '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(sub.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {!loading && submissions.length > 0 && (
        <p className="text-sm text-muted-foreground mt-4">
          Showing {submissions.length} submission{submissions.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
