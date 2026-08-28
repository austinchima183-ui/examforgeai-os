import { requireAuth } from '@/lib/auth/require-auth'
import { AddParentDialog } from '@/components/dialogs/add-parent-dialog'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ParentsTable } from '@/components/tables/parents-table'
import { StatCard } from '@/components/dashboard/stat-card'
import { getParentsData } from '@/lib/services/users-service'

export const dynamic = 'force-dynamic'

// ============================================================================
// ExamForge AI — Parents Page
// ============================================================================
// Server Component. Displays parents from Supabase with real data.
// ============================================================================



export default async function ParentsPage() {
  const { user } = await requireAuth()
  const schoolId = user.schoolId

  // Fetch real data from Supabase
  const data = await getParentsData(schoolId)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Parents</h1>
          <p className="text-sm text-muted-foreground">
            View and manage parent records and their associated students.
          </p>
        </div>
        <AddParentDialog schoolId={schoolId} />
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Parents"
          value={data.total}
          icon="users"
          description="Registered on platform"
        />
        <StatCard
          title="Active Parents"
          value={data.activeParents}
          icon="users"
          description="Recently active"
        />
        <StatCard
          title="Linked Students"
          value={data.totalChildren}
          icon="graduation-cap"
          description="Across all parents"
        />
        <StatCard
          title="Avg Children"
          value={data.avgChildrenPerParent}
          icon="users"
          description="Per parent"
        />
      </div>

      {/* Data Table */}
      <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow overflow-hidden">
        <CardHeader>
          <div>
            <CardTitle>All Parents</CardTitle>
            <CardDescription>Browse and manage parent records and student associations.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <ParentsTable data={ data.parents } />
        </CardContent>
      </Card>
    </div>
  )
}
