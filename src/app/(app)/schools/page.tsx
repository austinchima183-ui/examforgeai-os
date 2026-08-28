import { Suspense } from 'react'
import { requireAuth } from '@/lib/auth/require-auth'
import { AddSchoolDialog } from '@/components/dialogs/add-school-dialog'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { SchoolsTable } from '@/components/tables/schools-table'
import { StatCard } from '@/components/dashboard/stat-card'
import { FilterSelect } from '@/components/filters/filter-select'
import { getSchoolsData } from '@/lib/services/schools-service'

export const dynamic = 'force-dynamic'

// ============================================================================
// ExamForge AI — Schools Management Page
// ============================================================================
// Server Component. Requires authentication. Data scoped by role.
// ============================================================================





export default async function SchoolsPage({ searchParams }: { searchParams: Promise<{ type?: string; status?: string }> }) {
  const { user } = await requireAuth()
  const _filters = await searchParams // Used by FilterSelect client components

  // Fetch data scoped by role — school_admin sees only their school
  const data = await getSchoolsData(user.role, user.schoolId)

  return (
    <div className="space-y-6 animate-fade-in forge-ambient-bg">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Schools</h1>
          <p className="text-sm text-muted-foreground">Manage and monitor all registered schools on the platform.</p>
        </div>
        {(user.role === 'super_admin' || user.role === 'school_admin') && (
          <AddSchoolDialog />
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Schools" value={data.total} icon="school" description="Registered on platform" />
        <StatCard title="Active Schools" value={data.activeSchools} icon="school" description="Currently active" />
        <StatCard title="Total Students" value={data.totalStudents.toLocaleString()} icon="users" description="Across all schools" />
        <StatCard title="Total Teachers" value={data.totalTeachers.toLocaleString()} icon="users" description="Across all schools" />
      </div>

      <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>All Schools</CardTitle>
              <CardDescription>A list of all registered schools and their details.</CardDescription>
            </div>
            <Suspense fallback={<div className="h-9 w-[280px]" />}>
              <div className="flex items-center gap-2">
                <FilterSelect name="type" placeholder="All Types" options={[{label:'Primary',value:'primary'},{label:'Secondary',value:'secondary'},{label:'Tertiary',value:'tertiary'},{label:'Mixed',value:'mixed'}]} className="h-9 w-[140px]" />
                <FilterSelect name="status" placeholder="All Status" options={[{label:'Active',value:'active'},{label:'Inactive',value:'inactive'}]} className="h-9 w-[140px]" />
              </div>
            </Suspense>
          </div>
        </CardHeader>
        <CardContent>
          <SchoolsTable data={ data.schools } />
        </CardContent>
      </Card>
    </div>
  )
}
