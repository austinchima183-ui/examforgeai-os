'use client'
import { apiFetch } from '@/lib/api/client-fetch'

import { useState, useEffect, useCallback } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import {
  BookOpen, Users, GraduationCap, Plus, Pencil, Trash2, Eye,
  Search, MapPin, MoreHorizontal, Loader2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DataTable } from '@/components/tables/data-table'
import { StatCard } from '@/components/dashboard/stat-card'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useToast } from '@/hooks/use-toast'
import type { ClassListItem, ClassesPageData, StudentOption } from '@/lib/services/school-admin-service'

// ============================================================================
// ExamForge AI — Classes Management Page (Client)
// ============================================================================

interface ClassesPageClientProps {
  initialData: ClassesPageData
  schoolId: string
  userId: string
}

export function ClassesPageClient({ initialData, schoolId, userId }: ClassesPageClientProps) {
  const { toast } = useToast()
  const [data, setData] = useState<ClassesPageData>(initialData)
  const [isLoading, setIsLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedClass, setSelectedClass] = useState<ClassListItem | null>(null)
  const [classStudents, setClassStudents] = useState<StudentOption[]>([])

  // Form state
  const [formName, setFormName] = useState('')
  const [formSection, setFormSection] = useState('')
  const [formTeacher, setFormTeacher] = useState('')
  const [formRoom, setFormRoom] = useState('')
  const [formCapacity, setFormCapacity] = useState('')
  const [formSubjects, setFormSubjects] = useState<string[]>([])
  const [formSaving, setFormSaving] = useState(false)

  const refreshData = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/school/classes')
      if (res.ok) {
        const result = await res.json()
        // Rebuild with current teachers/subjects references
        setData((prev) => ({
          ...prev,
          classes: ((result.data ?? []) as unknown as ClassListItem[]).map((c) => {
            const teacher = prev.teachers.find((t) => t.id === c.teacher_id)
            return {
              id: c.id,
              name: c.name,
              section: c.section,
              teacher_name: teacher?.full_name ?? null,
              teacher_id: c.teacher_id,
              student_count: prev.classes.find((pc) => pc.id === c.id)?.student_count ?? 0,
              subject_names: prev.classes.find((pc) => pc.id === c.id)?.subject_names ?? [],
              room_number: c.room_number,
              capacity: c.capacity,
              is_active: c.is_active,
              created_at: c.created_at,
            }
          }),
        }))
      }
    } catch {
      // keep existing data
    }
    setIsLoading(false)
  }, [])

  const handleCreate = async () => {
    if (!formName.trim()) {
      toast({ title: 'Error', description: 'Class name is required', variant: 'destructive' })
      return
    }
    setFormSaving(true)
    try {
      const res = await apiFetch('/api/school/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          section: formSection || null,
          teacher_id: formTeacher || null,
          room_number: formRoom || null,
          capacity: formCapacity ? Number(formCapacity) : null,
          subject_ids: formSubjects,
        }),
      })
      const result = await res.json()
      if (res.ok) {
        toast({ title: 'Success', description: 'Class created successfully' })
        setCreateOpen(false)
        resetForm()
        refreshData()
      } else {
        toast({ title: 'Error', description: result.error || 'Failed to create class', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' })
    }
    setFormSaving(false)
  }

  const handleEdit = async () => {
    if (!selectedClass) return
    setFormSaving(true)
    try {
      const res = await apiFetch('/api/school/classes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedClass.id,
          name: formName,
          section: formSection || null,
          teacher_id: formTeacher || null,
          room_number: formRoom || null,
          capacity: formCapacity ? Number(formCapacity) : null,
        }),
      })
      const result = await res.json()
      if (res.ok) {
        toast({ title: 'Success', description: 'Class updated successfully' })
        setEditOpen(false)
        resetForm()
        refreshData()
      } else {
        toast({ title: 'Error', description: result.error || 'Failed to update class', variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' })
    }
    setFormSaving(false)
  }

  const handleDelete = async (classId: string) => {
    try {
      const res = await apiFetch(`/api/school/classes?id=${classId}`, { method: 'DELETE' })
      if (res.ok) {
        toast({ title: 'Success', description: 'Class deactivated' })
        refreshData()
      } else {
        const result = await res.json()
        toast({ title: 'Error', description: result.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' })
    }
  }

  const openEdit = (cls: ClassListItem) => {
    setSelectedClass(cls)
    setFormName(cls.name)
    setFormSection(cls.section ?? '')
    setFormTeacher(cls.teacher_id ?? '')
    setFormRoom(cls.room_number ?? '')
    setFormCapacity(cls.capacity?.toString() ?? '')
    setEditOpen(true)
  }

  const openDetail = async (cls: ClassListItem) => {
    setSelectedClass(cls)
    setDetailOpen(true)
    // Fetch class students
    try {
      const res = await fetch(`/api/school/classes?class_id=${cls.id}`)
      if (res.ok) {
        // In a full implementation, we'd fetch enrollments here
        setClassStudents([])
      }
    } catch {
      setClassStudents([])
    }
  }

  const resetForm = () => {
    setFormName('')
    setFormSection('')
    setFormTeacher('')
    setFormRoom('')
    setFormCapacity('')
    setFormSubjects([])
  }

  const toggleSubject = (subjectId: string) => {
    setFormSubjects((prev) =>
      prev.includes(subjectId) ? prev.filter((id) => id !== subjectId) : [...prev, subjectId]
    )
  }

  const columns: ColumnDef<ClassListItem, unknown>[] = [
    {
      accessorKey: 'name',
      header: 'Class Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <BookOpen className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium">{row.getValue('name')}</p>
            <p className="text-xs text-muted-foreground">
              {row.original.section ? `Section: ${row.original.section}` : 'No section'}
            </p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'teacher_name',
      header: 'Class Teacher',
      cell: ({ row }) => {
        const teacher = row.getValue('teacher_name') as string | null
        return teacher ? (
          <div className="flex items-center gap-1.5 text-sm">
            <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
            {teacher}
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">Not assigned</span>
        )
      },
    },
    {
      accessorKey: 'student_count',
      header: 'Students',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5 text-sm">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          {row.getValue('student_count')}
          {row.original.capacity ? ` / ${row.original.capacity}` : ''}
        </div>
      ),
    },
    {
      id: 'subjects',
      header: 'Subjects',
      cell: ({ row }) => {
        const subjects = row.original.subject_names
        if (!subjects || subjects.length === 0)
          return <span className="text-muted-foreground text-sm">—</span>
        return (
          <div className="flex flex-wrap gap-1">
            {subjects.slice(0, 2).map((s) => (
              <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
            ))}
            {subjects.length > 2 && (
              <Badge variant="secondary" className="text-[10px]">+{subjects.length - 2}</Badge>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'room_number',
      header: 'Room',
      cell: ({ row }) => {
        const room = row.getValue('room_number') as string | null
        return room ? (
          <div className="flex items-center gap-1.5 text-sm">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
            {room}
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openDetail(row.original)}>
              <Eye className="h-4 w-4 mr-2" /> View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openEdit(row.original)}>
              <Pencil className="h-4 w-4 mr-2" /> Edit Class
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => handleDelete(row.original.id)}
            >
              <Trash2 className="h-4 w-4 mr-2" /> Deactivate
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  if (isLoading && data.classes.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in forge-ambient-bg">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in forge-ambient-bg">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Class Management</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Manage classes, assign teachers, and track student enrollment.</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" /> Create Class
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[525px]">
            <DialogHeader>
              <DialogTitle>Create New Class</DialogTitle>
              <DialogDescription>Add a new class to your school. Assign a teacher and subjects.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Class Name *</Label>
                <Input id="name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g., SS1, JSS2" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="section">Section</Label>
                  <Input id="section" value={formSection} onChange={(e) => setFormSection(e.target.value)} placeholder="e.g., A, B, Science" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="room">Room Number</Label>
                  <Input id="room" value={formRoom} onChange={(e) => setFormRoom(e.target.value)} placeholder="e.g., Room 101" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Class Teacher</Label>
                  <Select value={formTeacher} onValueChange={setFormTeacher}>
                    <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                    <SelectContent>
                      {data.teachers.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="capacity">Capacity</Label>
                  <Input id="capacity" type="number" value={formCapacity} onChange={(e) => setFormCapacity(e.target.value)} placeholder="e.g., 40" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Subjects</Label>
                <div className="flex flex-wrap gap-2">
                  {data.subjects.map((s) => (
                    <Badge
                      key={s.id}
                      variant={formSubjects.includes(s.id) ? 'default' : 'outline'}
                      className="cursor-pointer select-none"
                      onClick={() => toggleSubject(s.id)}
                    >
                      {s.name}
                    </Badge>
                  ))}
                  {data.subjects.length === 0 && (
                    <span className="text-sm text-muted-foreground">No subjects available</span>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={formSaving}>
                {formSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Class
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Classes" value={data.totalClasses} icon={BookOpen} description="All classes" />
        <StatCard title="Active Classes" value={data.activeClasses} icon={BookOpen} description="Currently active" />
        <StatCard title="Total Students" value={data.totalStudents} icon={Users} description="Across all classes" />
        <StatCard title="Teachers" value={data.teachers.length} icon={GraduationCap} description="Available teachers" />
      </div>

      {/* Table */}
      <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
        <CardHeader>
          <CardTitle>All Classes</CardTitle>
          <CardDescription>View, edit, and manage all classes in your school.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={data.classes}
            searchKey="name"
            searchPlaceholder="Search classes..."
            isLoading={isLoading}
            emptyMessage="No classes found"
            emptyDescription="Create your first class to get started."
          />
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Edit Class</DialogTitle>
            <DialogDescription>Update class details, teacher assignment, and room information.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Class Name *</Label>
              <Input id="edit-name" value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-section">Section</Label>
                <Input id="edit-section" value={formSection} onChange={(e) => setFormSection(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-room">Room Number</Label>
                <Input id="edit-room" value={formRoom} onChange={(e) => setFormRoom(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Class Teacher</Label>
                <Select value={formTeacher} onValueChange={setFormTeacher}>
                  <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                  <SelectContent>
                    {data.teachers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-capacity">Capacity</Label>
                <Input id="edit-capacity" type="number" value={formCapacity} onChange={(e) => setFormCapacity(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={formSaving}>
              {formSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{selectedClass?.name} {selectedClass?.section ? `- ${selectedClass.section}` : ''}</DialogTitle>
            <DialogDescription>Class details, student list, and assigned subjects.</DialogDescription>
          </DialogHeader>
          {selectedClass && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="students">Students</TabsTrigger>
                <TabsTrigger value="subjects">Subjects</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Teacher</p>
                    <p className="text-sm">{selectedClass.teacher_name ?? 'Not assigned'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Room</p>
                    <p className="text-sm">{selectedClass.room_number ?? 'Not assigned'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Students</p>
                    <p className="text-sm">{selectedClass.student_count} {selectedClass.capacity ? `/ ${selectedClass.capacity}` : ''}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <Badge variant={selectedClass.is_active ? 'default' : 'secondary'}>
                      {selectedClass.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="students" className="pt-4">
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {classStudents.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No students enrolled yet. Add students to this class from the student management page.
                    </div>
                  ) : (
                    classStudents.map((student) => (
                      <div key={student.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                        <Avatar className="h-8 w-8">
                          {student.avatar_url && <AvatarImage src={student.avatar_url} alt={student.full_name} />}
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {student.full_name.split(' ').map((n) => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{student.full_name}</p>
                          <p className="text-xs text-muted-foreground">{student.email}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
              <TabsContent value="subjects" className="pt-4">
                <div className="flex flex-wrap gap-2">
                  {selectedClass.subject_names.length === 0 ? (
                    <span className="text-sm text-muted-foreground">No subjects assigned</span>
                  ) : (
                    selectedClass.subject_names.map((name) => (
                      <Badge key={name} variant="secondary">{name}</Badge>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
