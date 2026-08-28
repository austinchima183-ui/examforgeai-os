import { requireAnyRole } from '@/lib/auth/require-auth'
import { getClassesData } from '@/lib/services/school-admin-service'
import { ClassesPageClient } from '@/components/school/classes-page-client'

export const dynamic = 'force-dynamic'

// ============================================================================
// ExamForge AI — Class Management Page
// ============================================================================

export default async function ClassesPage() {
  const { user } = await requireAnyRole(['school_admin', 'super_admin'])

  const data = user.schoolId
    ? await getClassesData(user.schoolId)
    : {
        classes: [],
        totalClasses: 0,
        activeClasses: 0,
        totalStudents: 0,
        teachers: [],
        subjects: [],
      }

  return <ClassesPageClient initialData={data} schoolId={user.schoolId ?? ''} userId={user.id} />
}
