import { Suspense } from 'react'
import { requireAuth } from '@/lib/auth/require-auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { StudentsTable } from '@/components/tables/students-table'
import { StatCard } from '@/components/dashboard/stat-card'
import { FilterSelect } from '@/components/filters/filter-select'
import { getStudentsData } from '@/lib/services/users-service'
import { AddStudentDialog } from '@/components/dialogs/add-student-dialog'

export const dynamic = 'force-dynamic'

// ============================================================================
// ExamForge AI — Students Page
// ============================================================================
// Server Component. Requires authentication. Data scoped by role.
// ============================================================================



export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ class?: string; subject?: string }> }) {
  const { user } = await requireAuth()
  const _filters = await searchParams // Used by FilterSelect client components

  // Fetch data scoped by role — school_admin/teacher see only their school
  const data = await getStudentsData(user.schoolId, user.role)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Students</h1>
          <p className="text-sm text-muted-foreground">View and manage student records, performance, and enrollment.</p>
        </div>
        <AddStudentDialog schoolId={user.schoolId} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Students" value={data.total} icon="graduation-cap" description="Enrolled students" />
        <StatCard title="Active Students" value={data.activeStudents} icon="users" description="Currently active" />
        <StatCard title="Average Score" value={`${data.avgScore}%`} icon="trophy" description="Across all exams" />
        <StatCard title="Exams Completed" value={data.totalExams} icon="book-open" description="Total submissions" />
      </div>

      <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow overflow-hidden">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>All Students</CardTitle>
              <CardDescription>Browse and manage student records.</CardDescription>
            </div>
            <Suspense fallback={<div className="h-9 w-[300px]" />}>
              <div className="flex items-center gap-2">
                <FilterSelect name="class" placeholder="All Classes" options={[{label:'SS1',value:'SS1'},{label:'SS2',value:'SS2'},{label:'SS3',value:'SS3'}]} className="h-9 w-[140px]" />
                <FilterSelect name="subject" placeholder="All Subjects" options={[{label:'Mathematics',value:'Mathematics'},{label:'English',value:'English'},{label:'Physics',value:'Physics'},{label:'Chemistry',value:'Chemistry'},{label:'Biology',value:'Biology'}]} className="h-9 w-[160px]" />
              </div>
            </Suspense>
          </div>
        </CardHeader>
        <CardContent>
          <StudentsTable data={ data.students } />
        </CardContent>
      </Card>
    </div>
  )
}
