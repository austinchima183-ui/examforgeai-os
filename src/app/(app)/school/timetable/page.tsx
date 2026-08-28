import { requireAnyRole } from '@/lib/auth/require-auth'
import { getTimetableData } from '@/lib/services/school-admin-service'
import { TimetablePageClient } from '@/components/school/timetable-page-client'

export const dynamic = 'force-dynamic'

// ============================================================================
// ExamForge AI — Timetable Page
// ============================================================================

export default async function TimetablePage() {
  const { user } = await requireAnyRole(['school_admin', 'super_admin'])

  const data = user.schoolId
    ? await getTimetableData(user.schoolId)
    : { slots: [], classes: [], subjects: [], teachers: [] }

  return <TimetablePageClient initialData={data} schoolId={user.schoolId ?? ''} />
}
