import { Suspense } from 'react'
import { requireAuth } from '@/lib/auth/require-auth'
import { AddTeacherDialog } from '@/components/dialogs/add-teacher-dialog'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { TeachersTable } from '@/components/tables/teachers-table'
import { StatCard } from '@/components/dashboard/stat-card'
import { FilterSelect } from '@/components/filters/filter-select'
import { getTeachersData } from '@/lib/services/users-service'

export const dynamic = 'force-dynamic'

// ============================================================================
// ExamForge AI — Teachers Page
// ============================================================================
// Server Component. Displays teachers from Supabase with real data.
// ============================================================================



export default async function TeachersPage({ searchParams }: { searchParams: Promise<{ department?: string; status?: string }> }) {
  const { user } = await requireAuth()
  const schoolId = user.schoolId
  const _filters = await searchParams // Used by FilterSelect client components

  // Fetch real data from Supabase
  const data = await getTeachersData(schoolId)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teachers</h1>
          <p className="text-sm text-muted-foreground">
            Manage teacher profiles, assignments, and performance metrics.
          </p>
        </div>
        <AddTeacherDialog schoolId={schoolId} />
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Teachers"
          value={data.total}
          icon="users"
          description="Registered on platform"
        />
        <StatCard
          title="Active Teachers"
          value={data.activeTeachers}
          icon="book-open"
          description="Currently teaching"
        />
        <StatCard
          title="Exams Created"
          value={data.totalExams}
          icon="award"
          description="Total by all teachers"
        />
        <StatCard
          title="Avg Student Score"
          value={`${data.avgScore}%`}
          icon="graduation-cap"
          description="Across all classes"
        />
      </div>

      {/* Data Table */}
      <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow overflow-hidden">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>All Teachers</CardTitle>
              <CardDescription>Browse and manage teacher records.</CardDescription>
            </div>
            <Suspense fallback={<div className="h-9 w-[300px]" />}>
              <div className="flex items-center gap-2">
                <FilterSelect name="department" placeholder="All Departments" options={[{label:'Science',value:'Science'},{label:'Arts',value:'Arts'},{label:'Commercial',value:'Commercial'}]} className="h-9 w-[160px]" />
                <FilterSelect name="status" placeholder="All Status" options={[{label:'Active',value:'active'},{label:'Inactive',value:'inactive'}]} className="h-9 w-[140px]" />
              </div>
            </Suspense>
          </div>
        </CardHeader>
        <CardContent>
          <TeachersTable data={ data.teachers } />
        </CardContent>
      </Card>
    </div>
  )
}
