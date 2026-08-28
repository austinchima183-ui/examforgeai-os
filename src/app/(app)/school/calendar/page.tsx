import { requireAnyRole } from '@/lib/auth/require-auth'
import { getCalendarData } from '@/lib/services/school-admin-service'
import { CalendarPageClient } from '@/components/school/calendar-page-client'

export const dynamic = 'force-dynamic'

// ============================================================================
// ExamForge AI — School Calendar Page
// ============================================================================

export default async function CalendarPage() {
  const { user } = await requireAnyRole(['school_admin', 'super_admin'])

  const data = user.schoolId
    ? await getCalendarData(user.schoolId)
    : { events: [], eventTypes: [] }

  return <CalendarPageClient initialData={data} schoolId={user.schoolId ?? ''} userId={user.id} />
}
