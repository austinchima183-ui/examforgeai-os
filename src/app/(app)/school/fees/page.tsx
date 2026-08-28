import { requireAnyRole } from '@/lib/auth/require-auth'
import { getFeesData } from '@/lib/services/school-admin-service'

import { FeesPageClient } from '@/components/school/fees-page-client'

export const dynamic = 'force-dynamic'

// ============================================================================
// ExamForge AI — Fee Management Page
// ============================================================================

export default async function FeesPage() {
  const { user } = await requireAnyRole(['school_admin', 'super_admin'])

  const data = user.schoolId
    ? await getFeesData(user.schoolId)
    : {
        structures: [],
        assignments: [],
        recentPayments: [],
        totalRevenue: 0,
        totalPending: 0,
        totalOverdue: 0,
        collectionRate: 0,
        classes: [],
      }

  return <FeesPageClient initialData={data} schoolId={user.schoolId ?? ''} userId={user.id} />
}
