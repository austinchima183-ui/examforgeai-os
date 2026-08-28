'use client'

// ============================================================================
// ExamForge AI — SchoolsTable (client wrapper)
// RSC-safe: the server page passes only serializable DATA; column definitions
// (which contain render functions) live here in the client boundary.
// ============================================================================

import { type ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/tables/data-table'
import type { SchoolListItem } from '@/lib/services/schools-service'
import { School, MapPin, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ViewButton } from '@/components/buttons/view-button'

const statusVariantMap: Record<string, 'default' | 'secondary' | 'destructive'> = {
  active: 'default',
  inactive: 'secondary',
  suspended: 'destructive',
}

const typeLabelMap: Record<string, string> = {
  primary: 'Primary',
  secondary: 'Secondary',
  tertiary: 'Tertiary',
  mixed: 'Mixed',
}

const columns: ColumnDef<SchoolListItem, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'School Name',
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <School className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="font-medium">{row.getValue('name')}</p>
          <p className="text-xs text-muted-foreground">{row.original.admin_email ?? row.original.code}</p>
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'location',
    header: 'Location',
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5 text-sm">
        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
        {row.getValue('location') || 'Not specified'}
      </div>
    ),
  },
  {
    accessorKey: 'school_type',
    header: 'Type',
    cell: ({ row }) => {
      const type = row.getValue('school_type') as string | null
      return type ? <Badge variant="outline">{typeLabelMap[type] ?? type}</Badge> : <span className="text-muted-foreground text-sm">—</span>
    },
  },
  {
    accessorKey: 'student_count',
    header: 'Students',
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5 text-sm">
        <Users className="h-3.5 w-3.5 text-muted-foreground" />
        {Number(row.getValue('student_count')).toLocaleString()}
      </div>
    ),
  },
  {
    accessorKey: 'teacher_count',
    header: 'Teachers',
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5 text-sm">
        <Users className="h-3.5 w-3.5 text-muted-foreground" />
        {Number(row.getValue('teacher_count')).toLocaleString()}
      </div>
    ),
  },
  {
    accessorKey: 'is_active',
    header: 'Status',
    cell: ({ row }) => {
      const isActive = row.getValue('is_active') as boolean
      const status = isActive ? 'active' : 'inactive'
      return (
        <Badge variant={statusVariantMap[status]}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
      )
    },
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <ViewButton href={`/schools/${row.original.id}`} />
    ),
  },
]

export function SchoolsTable({ data }: { data: SchoolListItem[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="name"
      searchPlaceholder="Search schools..."
      emptyMessage="No schools found"
      emptyDescription="No schools match your search criteria. Try adjusting your filters."
    />
  )
}
