'use client'

// ============================================================================
// ExamForge AI — StudentsTable (client wrapper)
// RSC-safe: the server page passes only serializable DATA; column definitions
// (which contain render functions) live here in the client boundary.
// ============================================================================

import { type ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/tables/data-table'
import type { StudentListItem } from '@/lib/services/users-service'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ViewButton } from '@/components/buttons/view-button'

const columns: ColumnDef<StudentListItem, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Student',
    cell: ({ row }) => {
      const initials = row.original.name.split(' ').map((n) => n[0]).join('')
      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            {row.original.avatar_url && <AvatarImage src={row.original.avatar_url} alt={row.original.name} />}
            <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{row.getValue('name')}</p>
            <p className="text-xs text-muted-foreground">{row.original.email}</p>
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: 'class_name',
    header: 'Class',
    cell: ({ row }) => {
      const className = row.getValue('class_name') as string | null
      return className ? <Badge variant="outline">{className}</Badge> : <span className="text-muted-foreground text-sm">—</span>
    },
  },
  {
    accessorKey: 'subjects',
    header: 'Subjects',
    cell: ({ row }) => {
      const subjects = row.original.subjects
      if (!subjects || subjects.length === 0) return <span className="text-muted-foreground text-sm">—</span>
      return (
        <div className="flex flex-wrap gap-1">
          {subjects.slice(0, 2).map((subject) => (<Badge key={subject} variant="secondary" className="text-[10px]">{subject}</Badge>))}
          {subjects.length > 2 && (<Badge variant="secondary" className="text-[10px]">+{subjects.length - 2}</Badge>)}
        </div>
      )
    },
  },
  {
    accessorKey: 'avg_score',
    header: 'Avg Score',
    cell: ({ row }) => {
      const score = row.getValue('avg_score') as number
      if (score === 0) return <span className="text-muted-foreground text-sm">—</span>
      const color = score >= 80 ? 'text-green-600 dark:text-green-400' : score >= 60 ? 'text-yellow-600 dark:text-yellow-400' : 'text-destructive'
      return <span className={`font-medium ${color}`}>{score}%</span>
    },
  },
  {
    accessorKey: 'exams_completed',
    header: 'Exams Taken',
    cell: ({ row }) => (<span className="text-sm">{row.getValue('exams_completed')}</span>),
  },
  {
    accessorKey: 'is_active',
    header: 'Status',
    cell: ({ row }) => {
      const isActive = row.getValue('is_active') as boolean
      return (<Badge variant={isActive ? 'default' : 'secondary'}>{isActive ? 'Active' : 'Inactive'}</Badge>)
    },
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (<ViewButton href={`/students/${row.original.id}`} />),
  },
]

export function StudentsTable({ data }: { data: StudentListItem[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="name"
      searchPlaceholder="Search students..."
      emptyMessage="No students found"
      emptyDescription="No students match your search criteria. Try adjusting your filters."
    />
  )
}
