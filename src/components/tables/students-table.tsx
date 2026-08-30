'use client'

// ============================================================================
// ExamForge AI — StudentsTable (client wrapper)
// RSC-safe: the server page passes only serializable DATA; column definitions
// (which contain render functions) live here in the client boundary.
// Ω-3 upgrade: row selection + BATCH EDIT (status) + details DOCK PANEL.
// ============================================================================

import { useCallback, useMemo, useState } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { DataTable } from '@/components/tables/data-table'
import { DockPanel, DockTrigger } from '@/components/system/dock-panel'
import type { StudentListItem } from '@/lib/services/users-service'
import { batchUpdateStudents } from '@/features/users/actions/batch-update-students.action'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ViewButton } from '@/components/buttons/view-button'
import { GraduationCap, Mail, CalendarDays, Trophy, Activity, PanelRightOpen } from 'lucide-react'

/** Details dock content — real row data, read-only + deep-link. */
function StudentDetails({ student }: { student: StudentListItem | null }) {
  if (!student) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Select a student in the table to see details here.
      </div>
    )
  }
  const initials = student.name.split(' ').map((n) => n[0]).join('')
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Avatar className="h-12 w-12">
          {student.avatar_url && <AvatarImage src={student.avatar_url} alt={student.name} />}
          <AvatarFallback className="bg-primary/10 text-primary">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground/90">{student.name}</p>
          <div className="mt-0.5 flex items-center gap-1.5">
            <Badge variant={student.is_active ? 'default' : 'secondary'}>
              {student.is_active ? 'Active' : 'Inactive'}
            </Badge>
            <span className="text-xs text-muted-foreground">
              joined {new Date(student.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      <dl className="space-y-3">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border/20 bg-secondary/30 px-3 py-2">
          <dt className="flex items-center gap-2 text-xs text-muted-foreground">
            <Mail className="h-3.5 w-3.5" aria-hidden="true" /> Email
          </dt>
          <dd className="truncate text-xs text-foreground/85">{student.email}</dd>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border/20 bg-secondary/30 px-3 py-2">
          <dt className="flex items-center gap-2 text-xs text-muted-foreground">
            <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" /> Class
          </dt>
          <dd className="text-xs text-foreground/85">{student.class_name ?? '—'}</dd>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border/20 bg-secondary/30 px-3 py-2">
          <dt className="flex items-center gap-2 text-xs text-muted-foreground">
            <Trophy className="h-3.5 w-3.5" aria-hidden="true" /> Average score
          </dt>
          <dd className="text-xs font-medium text-foreground/85">{student.avg_score > 0 ? `${student.avg_score}%` : '—'}</dd>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border/20 bg-secondary/30 px-3 py-2">
          <dt className="flex items-center gap-2 text-xs text-muted-foreground">
            <Activity className="h-3.5 w-3.5" aria-hidden="true" /> Exams taken
          </dt>
          <dd className="text-xs text-foreground/85">{student.exams_completed}</dd>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border/20 bg-secondary/30 px-3 py-2">
          <dt className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" /> Subjects
          </dt>
          <dd className="truncate text-xs text-foreground/85">
            {student.subjects.length > 0 ? student.subjects.join(', ') : '—'}
          </dd>
        </div>
      </dl>

      <Button asChild variant="outline" size="sm" className="w-full border-border/40 bg-secondary/50 text-xs">
        <a href={`/students/${student.id}`}>Open full profile</a>
      </Button>
    </div>
  )
}

export function StudentsTable({ data }: { data: StudentListItem[] }) {
  const [selectedStudent, setSelectedStudent] = useState<StudentListItem | null>(null)
  const [dockOpen, setDockOpen] = useState(false)

  const openDetails = useCallback((s: StudentListItem) => {
    setSelectedStudent(s)
    setDockOpen(true)
  }, [])

  const columns = useMemo<ColumnDef<StudentListItem, unknown>[]>(() => [
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
      cell: ({ row }) => <span className="text-sm">{row.original.class_name ?? '—'}</span>,
    },
    {
      accessorKey: 'avg_score',
      header: 'Avg Score',
      cell: ({ row }) => {
        const score = row.getValue('avg_score') as number
        if (score === 0) return <span className="text-muted-foreground text-sm">—</span>
        const color =
          score >= 80
            ? 'text-green-600 dark:text-green-400'
            : score >= 60
              ? 'text-yellow-600 dark:text-yellow-400'
              : 'text-destructive'
        return <span className={`font-medium ${color}`}>{score}%</span>
      },
    },
    {
      accessorKey: 'exams_completed',
      header: 'Exams Taken',
      cell: ({ row }) => <span className="text-sm">{row.getValue('exams_completed')}</span>,
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => {
        const isActive = row.getValue('is_active') as boolean
        return <Badge variant={isActive ? 'default' : 'secondary'}>{isActive ? 'Active' : 'Inactive'}</Badge>
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => openDetails(row.original)}
            aria-label={`Open details dock for ${row.original.name}`}
          >
            <PanelRightOpen className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
          <ViewButton href={`/students/${row.original.id}`} />
        </div>
      ),
    },
  ], [openDetails])

  const applyStatus = useCallback(
    async (rows: StudentListItem[], isActive: boolean, clear: () => void) => {
      const result = await batchUpdateStudents(
        rows.map((r) => r.id),
        { is_active: isActive ? 'true' : 'false' }
      )
      if (result.success) {
        clear()
      } else {
        import('sonner').then(({ toast }) =>
          toast.error('Batch update failed', { description: result.error })
        )
      }
    },
    []
  )

  return (
    <>
      <DataTable
        columns={columns}
        data={data}
        searchKey="name"
        searchPlaceholder="Search students..."
        enableSelection
        batchEdit={{
          fields: [
            {
              key: 'is_active',
              label: 'Account status',
              type: 'select',
              placeholder: 'Keep unchanged',
              options: [
                { label: 'Active', value: 'true' },
                { label: 'Inactive', value: 'false' },
              ],
            },
          ],
          onApply: async (values, rows) => {
            const result = await batchUpdateStudents(
              rows.map((r) => r.id),
              values
            )
            if (!result.success) {
              throw new Error(result.error ?? 'Batch update failed')
            }
          },
        }}
        bulkActions={(rows, clear) => (
          <>
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-border/40 bg-secondary/50 text-xs"
              onClick={() => applyStatus(rows, true, clear)}
            >
              Activate
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-border/40 bg-secondary/50 text-xs"
              onClick={() => applyStatus(rows, false, clear)}
            >
              Deactivate
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => openDetails(rows[0])}
            >
              Details
            </Button>
          </>
        )}
        emptyMessage="No students found"
        emptyDescription="No students match your search criteria. Try adjusting your filters."
      />

      {/* Details dock panel — docked right, collapsible, resizable, persisted */}
      <DockPanel
        id="student-details"
        title="Student Details"
        icon={GraduationCap}
        side="right"
        scope="students-table"
        open={dockOpen}
        onOpenChange={setDockOpen}
        defaultWidth={340}
        minSize={280}
        maxSize={520}
      >
        <StudentDetails student={selectedStudent} />
      </DockPanel>

      {/* Floating trigger when the dock is closed but a student is selected */}
      {!dockOpen && selectedStudent && (
        <div className="fixed bottom-20 right-5 z-20">
          <DockTrigger
            onClick={() => setDockOpen(true)}
            title="Student Details"
            icon={GraduationCap}
            active
          />
        </div>
      )}
    </>
  )
}
