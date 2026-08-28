'use client'

// ============================================================================
// ExamForge AI — ParentsTable (client wrapper)
// RSC-safe: the server page passes only serializable DATA; column definitions
// (which contain render functions) live here in the client boundary.
// ============================================================================

import { type ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/tables/data-table'
import type { ParentListItem } from '@/lib/services/users-service'
import { Users, Phone, Mail, GraduationCap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ViewButton } from '@/components/buttons/view-button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const columns: ColumnDef<ParentListItem, unknown>[] = [
  {
    accessorKey: 'name',
    header: 'Parent',
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
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Mail className="h-3 w-3" />
              {row.original.email}
            </div>
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: 'phone',
    header: 'Phone',
    cell: ({ row }) => {
      const phone = row.getValue('phone') as string | null
      return phone ? (
        <div className="flex items-center gap-1.5 text-sm">
          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
          {phone}
        </div>
      ) : <span className="text-muted-foreground text-sm">—</span>
    },
  },
  {
    accessorKey: 'children',
    header: 'Children',
    cell: ({ row }) => {
      const children = row.original.children
      if (!children || children.length === 0) return <span className="text-muted-foreground text-sm">No children linked</span>
      return (
        <div className="space-y-1 animate-fade-in">
          {children.map((child) => (
            <div key={child.id} className="flex items-center gap-1.5 text-sm">
              <GraduationCap className="h-3 w-3 text-muted-foreground" />
              <span>{child.name}</span>
              {child.class_name && (
                <Badge variant="outline" className="text-[10px] h-4 ml-1">
                  {child.class_name}
                </Badge>
              )}
            </div>
          ))}
        </div>
      )
    },
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
      <ViewButton href={`/parents/${row.original.id}`} />
    ),
  },
]

export function ParentsTable({ data }: { data: ParentListItem[] }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchKey="name"
      searchPlaceholder="Search parents..."
      emptyMessage="No parents found"
      emptyDescription="No parents match your search criteria. Try adjusting your filters."
    />
  )
}
