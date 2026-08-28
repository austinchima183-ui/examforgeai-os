'use client'

// ============================================================================
// ExamForge AI — TeachersTable (client wrapper)
// RSC-safe: the server page passes only serializable DATA; column definitions
// (which contain render functions) live here in the client boundary.
// ============================================================================

import { type ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/tables/data-table'
import type { TeacherListItem } from '@/lib/services/users-service'
import { Badge } from '@/components/ui/badge'
import { ViewButton } from '@/components/buttons/view-button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const columns: ColumnDef<TeacherListItem, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Teacher',
    cell: ({ row }) => {
      const initials = row.original.name
        .split(' ')
        .filter((_, i, arr) => i === 0 || i === arr.length - 1)
        .map((n) => n[0])
        .join('')
      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            {row.original.avatar_url && <AvatarImage src={row.original.avatar_url} alt={row.original.name} />}
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
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
    accessorKey: 'department',
    header: 'Department',
    cell: ({ row }) => {
      const dept = row.getValue('department') as string | null
      return dept ? <Badge variant="outline">{dept}</Badge> : <span className="text-muted-foreground text-sm">—</span>
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
          {subjects.map((subject) => (
            <Badge key={subject} variant="secondary" className="text-[10px]">
              {subject}
            </Badge>
          ))}
        </div>
      )
    },
  },
  {
    accessorKey: 'classes',
    header: 'Classes',
    cell: ({ row }) => {
      const classes = row.original.classes
      return <span className="text-sm">{classes?.length ?? 0} classes</span>
    },
  },
  {
    accessorKey: 'exam_count',
    header: 'Exams Created',
    cell: ({ row }) => (
      <span className="text-sm">{row.getValue('exam_count')}</span>
    ),
  },
  {
    accessorKey: 'is_active',
    header: 'Status',
    cell: ({ row }) => {
      const isActive = row.getValue('is_active') as boolean
      return (
        <Badge variant={isActive ? 'default' : 'secondary'}>
          {isActive ? 'Active' : 'Inactive'}
        </Badge>
      )
    },
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <ViewButton href={`/teachers/${row.original.id}`} />
    ),
  },
]

export function TeachersTable({ data }: { data: TeacherListItem[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="name"
      searchPlaceholder="Search teachers..."
      emptyMessage="No teachers found"
      emptyDescription="No teachers match your search criteria. Try adjusting your filters."
    />
  )
}
