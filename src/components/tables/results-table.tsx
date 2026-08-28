'use client'

// ============================================================================
// ExamForge AI — Results Table (client wrapper)
// RSC-safe: the server page passes only serializable DATA; column definitions
// (which contain render functions) live here in the client boundary.
// ============================================================================

import { type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/tables/data-table'
import { ViewButton } from '@/components/buttons/view-button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { resolveIcon } from '@/lib/design/icon-registry'
import type { ResultListItem } from '@/lib/services/results-service'

function getScoreColor(percentage: number): string {
  if (percentage >= 70) return 'text-emerald-400'
  if (percentage >= 50) return 'text-amber-400'
  return 'text-red-400'
}

function getProgressColor(percentage: number): string {
  if (percentage >= 70) return '[&>div]:bg-emerald-400'
  if (percentage >= 50) return '[&>div]:bg-amber-400'
  return '[&>div]:bg-red-400'
}

const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive'; icon: string }> = {
  passed: { variant: 'default', icon: 'check-circle-2' },
  failed: { variant: 'destructive', icon: 'x-circle' },
  absent: { variant: 'secondary', icon: 'users' },
}

function getDurationLabel(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

const columns: ColumnDef<ResultListItem, unknown>[] = [
  {
    accessorKey: 'studentName',
    header: 'Student',
    cell: ({ row }) => {
      const initials = row.original.studentName.split(' ').map((n) => n[0]).join('').slice(0, 2)
      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 border border-white/[0.04]">
            {row.original.studentAvatarUrl && <AvatarImage src={row.original.studentAvatarUrl} alt={row.original.studentName} />}
            <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{row.getValue('studentName')}</p>
            <p className="text-xs text-muted-foreground">{row.original.className ?? row.original.studentEmail}</p>
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: 'examTitle',
    header: 'Exam',
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.getValue('examTitle')}</p>
        <p className="text-xs text-muted-foreground">{row.original.subject ?? 'No subject'}</p>
      </div>
    ),
  },
  {
    accessorKey: 'percentage',
    header: 'Score',
    cell: ({ row }) => {
      const pct = row.getValue('percentage') as number
      return (
        <div className="space-y-1">
          <span className={`font-semibold tabular-nums ${getScoreColor(pct)}`}>{pct}%</span>
          <p className="text-xs text-muted-foreground tabular-nums">{row.original.score}/{row.original.totalMarks}</p>
        </div>
      )
    },
  },
  {
    accessorKey: 'percentage',
    id: 'performance',
    header: 'Performance',
    cell: ({ row }) => {
      const pct = row.getValue('percentage') as number
      return (
        <div className="w-24">
          <Progress value={pct} className={`h-1.5 ${getProgressColor(pct)}`} />
        </div>
      )
    },
  },
  {
    accessorKey: 'durationMinutes',
    header: 'Duration',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground tabular-nums">
        {getDurationLabel(row.getValue('durationMinutes') as number)}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as string
      const config = statusConfig[status] ?? statusConfig.failed
      const Icon = resolveIcon(config.icon)
      return (
        <Badge variant={config.variant} className="gap-1">
          {Icon && <Icon className="h-3 w-3" />}
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
      )
    },
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (<ViewButton href={`/results/${row.original.id}`} label="View Details" />),
  },
]

export function ResultsTable({ data }: { data: ResultListItem[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="studentName"
      searchPlaceholder="Search by student name..."
      emptyMessage="No results found"
      emptyDescription="No exam results are available yet. Results will appear once students complete exams."
    />
  )
}
