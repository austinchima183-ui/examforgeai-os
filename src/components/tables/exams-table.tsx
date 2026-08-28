'use client'

// ============================================================================
// ExamForge AI — Exams Table (client wrapper)
// RSC-safe: server page passes only serializable DATA; column definitions
// with render functions live here in the client boundary.
// ============================================================================

import { type ColumnDef } from '@tanstack/react-table'
import { FileText, Users, Clock, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/tables/data-table'
import { ViewButton } from '@/components/buttons/view-button'
import type { ExamListItem } from '@/lib/services/cbt-service'

const statusVariantMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  draft: 'secondary',
  published: 'outline',
  active: 'default',
  completed: 'secondary',
  archived: 'secondary',
  cancelled: 'destructive',
}

const statusLabelMap: Record<string, string> = {
  draft: 'Draft',
  published: 'Upcoming',
  active: 'Active',
  completed: 'Completed',
  archived: 'Archived',
  cancelled: 'Cancelled',
}

const statusColorMap: Record<string, string> = {
  draft: 'bg-muted-foreground/20 text-muted-foreground',
  published: 'bg-primary/15 text-primary',
  active: 'bg-emerald-500/15 text-emerald-400',
  completed: 'bg-ember/15 text-ember',
  archived: 'bg-muted/50 text-muted-foreground',
  cancelled: 'bg-destructive/15 text-destructive',
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const columns: ColumnDef<ExamListItem, unknown>[] = [
  {
    accessorKey: 'title',
    header: 'Exam',
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-white/[0.04]">
          <FileText className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="font-medium">{row.getValue('title')}</p>
          <p className="text-xs text-muted-foreground">
            {row.original.subject ?? 'No subject'}
            {row.original.className ? ` · ${row.original.className}` : ''}
          </p>
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'duration',
    header: 'Duration',
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        {formatDuration(row.getValue('duration'))}
      </div>
    ),
  },
  {
    accessorKey: 'totalQuestions',
    header: 'Questions',
    cell: ({ row }) => (
      <span className="text-sm tabular-nums">{row.getValue('totalQuestions')}</span>
    ),
  },
  {
    accessorKey: 'participants',
    header: 'Participants',
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Users className="h-3.5 w-3.5" />
        <span className="tabular-nums">{row.getValue('participants')}</span>
      </div>
    ),
  },
  {
    accessorKey: 'scheduledAt',
    header: 'Scheduled',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{formatDate(row.getValue('scheduledAt'))}</span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as string
      return (
        <Badge
          variant={statusVariantMap[status] ?? 'outline'}
          className={statusColorMap[status] ?? ''}
        >
          {status === 'active' && <Zap className="h-3 w-3 mr-1 animate-pulse" />}
          {statusLabelMap[status] ?? status}
        </Badge>
      )
    },
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <div className="flex items-center gap-1">
        <ViewButton href={`/exams/${row.original.id}/take`} label="Take" />
        {row.original.status === 'active' && (
          <ViewButton href={`/exams/${row.original.id}/monitor`} label="Monitor" />
        )}
      </div>
    ),
  },
]

export function ExamsTable({
  data,
  searchKey = 'title',
  searchPlaceholder = 'Search exams...',
  emptyMessage = 'No exams found',
  emptyDescription,
}: {
  data: ExamListItem[]
  searchKey?: string
  searchPlaceholder?: string
  emptyMessage?: string
  emptyDescription?: string
}) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey={searchKey}
      searchPlaceholder={searchPlaceholder}
      emptyMessage={emptyMessage}
      emptyDescription={emptyDescription}
    />
  )
}
