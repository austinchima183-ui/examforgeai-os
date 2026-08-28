import { requireAnyRole } from '@/lib/auth/require-auth'
import { getAttendanceData } from '@/lib/services/school-admin-service'
import { AttendancePageClient } from '@/components/school/attendance-page-client'

export const dynamic = 'force-dynamic'

// ============================================================================
// ExamForge AI — Attendance Tracking Page
// ============================================================================

export default async function AttendancePage() {
  const { user } = await requireAnyRole(['school_admin', 'super_admin'])

  const data = user.schoolId
    ? await getAttendanceData(user.schoolId)
    : {
        records: [],
        stats: { totalRecords: 0, presentCount: 0, absentCount: 0, lateCount: 0, excusedCount: 0, attendanceRate: 0 },
        classes: [],
        chronicAbsentees: [],
      }

  return <AttendancePageClient initialData={data} schoolId={user.schoolId ?? ''} userId={user.id} />
}
