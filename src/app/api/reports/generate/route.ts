import { NextResponse, type NextRequest } from 'next/server'
import { getAuthUser } from '@/lib/auth/require-auth'
import {
  generateStudentReport,
  generateClassReport,
  generateSchoolReport,
  generateExamReport,
} from '@/lib/services/report-generator'
import { validateInput, parseJsonBody } from '@/lib/api/validate'
import { reportGenerateSchema } from '@/lib/validators/api-schemas'
import { enforceCsrf } from '@/lib/api/csrf-guard'

// ============================================================================
// ExamForge AI — Report Generation API
// ============================================================================
// POST: Generate and return report data in the specified format.
// Auth required, role-scoped.
// ============================================================================

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const authResult = await getAuthUser()

  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ─── CSRF guard (auto-added: MISSION 11) ───
  const csrfResult = enforceCsrf(request, authResult)
  if (csrfResult) return csrfResult

  const { user } = authResult

  try {
    const bodyJson = await parseJsonBody(request)
    if ('error' in bodyJson) return bodyJson.error
    const rawBody = bodyJson.data
    const input = validateInput(reportGenerateSchema, rawBody)
    if ('error' in input) return input.error
    const { type, format } = input.data
    const id = ((rawBody as Record<string, unknown>).id ?? input.data.schoolId ?? input.data.examId ?? input.data.classId) as string | undefined

    // Role-based access control
    if (type === 'student') {
      if (user.role !== 'super_admin' && user.role !== 'school_admin' && user.role !== 'teacher' && user.id !== id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    if (type === 'class' || type === 'exam') {
      if (user.role !== 'super_admin' && user.role !== 'school_admin' && user.role !== 'teacher') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    if (type === 'school') {
      if (user.role !== 'super_admin' && user.role !== 'school_admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Generate report data
    let reportData: unknown = null

    switch (type) {
      case 'student':
        reportData = await generateStudentReport(id ?? '')
        break
      case 'class':
        reportData = await generateClassReport(id ?? '')
        break
      case 'school':
        reportData = await generateSchoolReport(id ?? '')
        break
      case 'exam':
        reportData = await generateExamReport(id ?? '')
        break
      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
    }

    if (!reportData) {
      return NextResponse.json({ error: 'Report data not found' }, { status: 404 })
    }

    // Return based on format
    const requestedFormat = format ?? 'pdf'

    if (requestedFormat === 'pdf') {
      return NextResponse.json({
        success: true,
        type,
        data: reportData,
        generatedAt: new Date().toISOString(),
      })
    }

    if (requestedFormat === 'csv') {
      const csv = generateCSV(reportData as Record<string, unknown>, type)
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${type}-report-${id}.csv"`,
        },
      })
    }

    // For PDF and Excel, return the JSON data with format instruction
    // The client-side ReportExportToolbar handles actual file generation
    return NextResponse.json({
      success: true,
      type,
      data: reportData,
      format: requestedFormat,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Report generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}

// ──────────────────────────────────────────────────────────────
// CSV Generation Helper
// ──────────────────────────────────────────────────────────────

function generateCSV(data: Record<string, unknown>, type: string): string {
  const rows: string[][] = []

  if (type === 'student') {
    const d = data as {
      studentName?: string
      email?: string
      schoolName?: string
      className?: string
      transcript?: { examTitle: string; subjectName: string; score: number; totalMarks: number; percentage: number; grade: string }[]
      overallStats?: { totalExams: number; avgScore: number; highestScore: number; passRate: number }
    }

    rows.push(['Student Report'])
    rows.push(['Name', d.studentName ?? ''])
    rows.push(['Email', d.email ?? ''])
    rows.push(['School', d.schoolName ?? ''])
    rows.push(['Class', d.className ?? ''])
    rows.push([])
    rows.push(['Exam', 'Subject', 'Score', 'Total', 'Percentage', 'Grade'])

    for (const t of d.transcript ?? []) {
      rows.push([t.examTitle, t.subjectName, String(t.score), String(t.totalMarks), String(t.percentage), t.grade])
    }

    rows.push([])
    rows.push(['Summary'])
    rows.push(['Total Exams', String(d.overallStats?.totalExams ?? 0)])
    rows.push(['Average Score', String(d.overallStats?.avgScore ?? 0)])
    rows.push(['Highest Score', String(d.overallStats?.highestScore ?? 0)])
    rows.push(['Pass Rate', `${d.overallStats?.passRate ?? 0}%`])
  } else if (type === 'class') {
    const d = data as {
      className?: string
      schoolName?: string
      totalStudents?: number
      studentRanking?: { studentName: string; avgScore: number; rank: number }[]
    }

    rows.push(['Class Report'])
    rows.push(['Class', d.className ?? ''])
    rows.push(['School', d.schoolName ?? ''])
    rows.push(['Students', String(d.totalStudents ?? 0)])
    rows.push([])
    rows.push(['Rank', 'Student', 'Average Score'])

    for (const s of d.studentRanking ?? []) {
      rows.push([String(s.rank), s.studentName, String(s.avgScore)])
    }
  } else if (type === 'school') {
    const d = data as {
      schoolName?: string
      totalStudents?: number
      totalTeachers?: number
      subjectAnalysis?: { subject: string; avgScore: number; passRate: number }[]
    }

    rows.push(['School Report'])
    rows.push(['School', d.schoolName ?? ''])
    rows.push(['Students', String(d.totalStudents ?? 0)])
    rows.push(['Teachers', String(d.totalTeachers ?? 0)])
    rows.push([])
    rows.push(['Subject', 'Average Score', 'Pass Rate'])

    for (const s of d.subjectAnalysis ?? []) {
      rows.push([s.subject, String(s.avgScore), `${s.passRate}%`])
    }
  } else if (type === 'exam') {
    const d = data as {
      examTitle?: string
      subjectName?: string
      totalSubmissions?: number
      summaryStats?: { avgScore: number; passRate: number; highestScore: number; lowestScore: number }
    }

    rows.push(['Exam Report'])
    rows.push(['Exam', d.examTitle ?? ''])
    rows.push(['Subject', d.subjectName ?? ''])
    rows.push(['Submissions', String(d.totalSubmissions ?? 0)])
    rows.push([])
    rows.push(['Average Score', String(d.summaryStats?.avgScore ?? 0)])
    rows.push(['Pass Rate', `${d.summaryStats?.passRate ?? 0}%`])
    rows.push(['Highest', String(d.summaryStats?.highestScore ?? 0)])
    rows.push(['Lowest', String(d.summaryStats?.lowestScore ?? 0)])
  }

  return rows.map(row => row.map(cell => {
    const str = String(cell)
    return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str
  }).join(',')).join('\n')
}
