// ============================================================================
// ExamForge AI Government — District & National Intelligence
// ============================================================================
// Production-ready AI-powered workflows for government/ministry:
// - District intelligence
// - School comparison
// - Curriculum compliance monitoring
// - National trend analysis
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { executeStructuredAI, getSystemPrompt } from './ai-engine'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export interface DistrictIntelligenceRequest {
  region?: string
  state?: string
  schoolIds?: string[]
}

export interface DistrictIntelligenceResponse {
  totalSchools: number
  totalStudents: number
  totalTeachers: number
  averagePerformance: number
  schoolPerformanceDistribution: {
    excellent: number // >80%
    good: number // 60-80%
    satisfactory: number // 40-60%
    belowStandard: number // <40%
  }
  attendanceRate: number
  enrollmentTrend: 'growing' | 'stable' | 'declining'
  keyInsights: string[]
  recommendations: string[]
  alerts: Array<{ type: 'critical' | 'warning' | 'info'; message: string }>
}

export interface SchoolComparisonRequest {
  schoolIds: string[]
  metrics?: ('performance' | 'attendance' | 'enrollment' | 'teacher_ratio' | 'fees')[]
}

export interface SchoolComparisonResponse {
  schools: Array<{
    id: string
    name: string
    metrics: {
      averagePerformance: number
      attendanceRate: number
      enrollment: number
      teacherStudentRatio: number
      feeCollectionRate: number
    }
    rank: number
    strengths: string[]
    weaknesses: string[]
  }>
  rankingCriteria: string
  insights: string[]
  outliers: Array<{ schoolName: string; metric: string; value: number; expected: string }>
}

export interface CurriculumComplianceRequest {
  region?: string
  curriculumStandard: string // e.g., "NERDC", "WAEC"
  schoolIds?: string[]
}

export interface CurriculumComplianceResponse {
  overallComplianceRate: number
  schools: Array<{
    id: string
    name: string
    complianceScore: number
    gaps: string[]
    recommendations: string[]
  }>
  commonGaps: string[]
  policyRecommendations: string[]
  trainingNeeds: string[]
}

export interface NationalTrendRequest {
  metric: 'performance' | 'enrollment' | 'attendance' | 'teacher_quality'
  timeframe: 'last_year' | 'last_3_years' | 'last_5_years'
  groupBy?: 'region' | 'state' | 'school_type'
}

export interface NationalTrendResponse {
  metric: string
  timeframe: string
  data: Array<{
    group: string
    values: Array<{ period: string; value: number }>
    trend: 'improving' | 'stable' | 'declining'
    changePercent: number
  }>
  insights: string[]
  predictions: Array<{ period: string; predictedValue: number; confidence: number }>
  policyImplications: string[]
}

// ──────────────────────────────────────────────────────────────
// District Intelligence
// ──────────────────────────────────────────────────────────────

export async function getDistrictIntelligence(
  request: DistrictIntelligenceRequest,
  userId: string,
  schoolId?: string | null
): Promise<DistrictIntelligenceResponse> {
  const supabase = await createClient()

  // Fetch all schools with their data
  let schoolQuery = supabase.from('schools').select('id, name, metadata, state, city').eq('is_active', true)
  if (request.state) schoolQuery = schoolQuery.eq('state', request.state)
  if (request.schoolIds?.length) schoolQuery = schoolQuery.in('id', request.schoolIds)
  const { data: schools } = await schoolQuery

  const schoolIds = schools?.map((s) => s.id) ?? []

  // Fetch aggregated data
  const [studentsResult, teachersResult, sessionsResult, attendanceResult] = await Promise.all([
    supabase.from('users').select('id, school_id').eq('role', 'student').eq('is_active', true).in('school_id', schoolIds),
    supabase.from('users').select('id, school_id').eq('role', 'teacher').eq('is_active', true).in('school_id', schoolIds),
    supabase.from('exam_sessions').select('percentage, student_id, profiles(school_id)').order('created_at', { ascending: false }).limit(5000),
    supabase.from('attendance').select('status, school_id').in('school_id', schoolIds).order('date', { ascending: false }).limit(5000),
  ])

  const totalStudents = studentsResult.data?.length ?? 0
  const totalTeachers = teachersResult.data?.length ?? 0
  const allSessions = sessionsResult.data ?? []
  const allAttendance = attendanceResult.data ?? []

  const avgPerformance = allSessions.length > 0
    ? allSessions.reduce((sum, s) => sum + (s.percentage ?? 0), 0) / allSessions.length
    : 0

  const attendanceRate = allAttendance.length > 0
    ? allAttendance.filter((a) => a.status === 'present').length / allAttendance.length
    : 0

  const distribution = {
    excellent: allSessions.filter((s) => (s.percentage ?? 0) >= 80).length,
    good: allSessions.filter((s) => (s.percentage ?? 0) >= 60 && (s.percentage ?? 0) < 80).length,
    satisfactory: allSessions.filter((s) => (s.percentage ?? 0) >= 40 && (s.percentage ?? 0) < 60).length,
    belowStandard: allSessions.filter((s) => (s.percentage ?? 0) < 40).length,
  }

  const prompt = `Analyze district-level intelligence for education planning:

Region: ${request.region ?? 'All regions'}${request.state ? `, State: ${request.state}` : ''}
Total Schools: ${schools?.length ?? 0}
Total Students: ${totalStudents}
Total Teachers: ${totalTeachers}
Average Performance: ${avgPerformance.toFixed(1)}%
Attendance Rate: ${(attendanceRate * 100).toFixed(1)}%

Performance Distribution:
- Excellent (>80%): ${distribution.excellent} students
- Good (60-80%): ${distribution.good} students
- Satisfactory (40-60%): ${distribution.satisfactory} students
- Below Standard (<40%): ${distribution.belowStandard} students

Schools List:
${schools?.map((s) => `- ${s.name} (${s.city ?? 'Unknown'}, ${s.state ?? 'Unknown'})`).join('\n') ?? 'No schools'}

Provide:
1. Key insights about district performance
2. Strategic recommendations for improvement
3. Alerts for critical issues requiring immediate attention
4. Enrollment trend analysis

Respond as JSON matching the DistrictIntelligenceResponse structure.`

  const response = await executeStructuredAI<DistrictIntelligenceResponse>(
    {
      prompt,
      systemPrompt: getSystemPrompt('super_admin', 'District Intelligence'),
      userId,
      schoolId,
      metadata: { type: 'district_intelligence', region: request.region },
    },
    (raw) => {
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw
      return {
        totalSchools: schools?.length ?? 0,
        totalStudents,
        totalTeachers,
        averagePerformance: avgPerformance,
        schoolPerformanceDistribution: data.schoolPerformanceDistribution ?? distribution,
        attendanceRate,
        enrollmentTrend: data.enrollmentTrend ?? 'stable',
        keyInsights: data.keyInsights ?? [],
        recommendations: data.recommendations ?? [],
        alerts: data.alerts ?? [],
      }
    }
  )

  return response.parsed
}

// ──────────────────────────────────────────────────────────────
// School Comparison
// ──────────────────────────────────────────────────────────────

export async function compareSchools(
  request: SchoolComparisonRequest,
  userId: string,
  schoolId?: string | null
): Promise<SchoolComparisonResponse> {
  const supabase = await createClient()

  // Fetch data for each school
  const schoolData = await Promise.all(
    request.schoolIds.map(async (id) => {
      const [schoolResult, studentsResult, teachersResult, sessionsResult, attendanceResult] = await Promise.all([
        supabase.from('schools').select('id, name').eq('id', id).single(),
        supabase.from('users').select('id').eq('school_id', id).eq('role', 'student').eq('is_active', true),
        supabase.from('users').select('id').eq('school_id', id).eq('role', 'teacher').eq('is_active', true),
        supabase.from('exam_sessions').select('percentage').eq('student_id', id).order('created_at', { ascending: false }).limit(100),
        supabase.from('attendance').select('status').eq('school_id', id).order('date', { ascending: false }).limit(500),
      ])

      const students = studentsResult.data ?? []
      const teachers = teachersResult.data ?? []
      const sessions = sessionsResult.data ?? []
      const attendance = attendanceResult.data ?? []

      const avgPerf = sessions.length > 0
        ? sessions.reduce((sum, s) => sum + (s.percentage ?? 0), 0) / sessions.length
        : 0
      const attRate = attendance.length > 0
        ? attendance.filter((a) => a.status === 'present').length / attendance.length
        : 0

      return {
        id,
        name: schoolResult.data?.name ?? 'Unknown',
        averagePerformance: avgPerf,
        attendanceRate: attRate,
        enrollment: students.length,
        teacherStudentRatio: teachers.length > 0 ? students.length / teachers.length : 0,
        feeCollectionRate: 0, // Would need fee data
      }
    })
  )

  const prompt = `Compare these schools and rank them:

${schoolData.map((s, i) => `
School ${i + 1}: ${s.name}
- Average Performance: ${s.averagePerformance.toFixed(1)}%
- Attendance Rate: ${(s.attendanceRate * 100).toFixed(1)}%
- Enrollment: ${s.enrollment}
- Teacher:Student Ratio: 1:${s.teacherStudentRatio.toFixed(0)}
`).join('')}

Provide:
1. Rankings based on composite performance
2. Strengths and weaknesses of each school
3. Insights about performance patterns
4. Statistical outliers

Respond as JSON matching the SchoolComparisonResponse structure.`

  const response = await executeStructuredAI<SchoolComparisonResponse>(
    {
      prompt,
      systemPrompt: getSystemPrompt('super_admin', 'School Comparison'),
      userId,
      schoolId,
      metadata: { type: 'school_comparison', schoolCount: request.schoolIds.length },
    },
    (raw) => {
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw
      return {
        schools: data.schools ?? schoolData.map((s, i) => ({
          id: s.id, name: s.name, rank: i + 1,
          metrics: { averagePerformance: s.averagePerformance, attendanceRate: s.attendanceRate, enrollment: s.enrollment, teacherStudentRatio: s.teacherStudentRatio, feeCollectionRate: s.feeCollectionRate },
          strengths: [], weaknesses: [],
        })),
        rankingCriteria: data.rankingCriteria ?? 'Composite performance score',
        insights: data.insights ?? [],
        outliers: data.outliers ?? [],
      }
    }
  )

  return response.parsed
}

// ──────────────────────────────────────────────────────────────
// Curriculum Compliance
// ──────────────────────────────────────────────────────────────

export async function checkCurriculumCompliance(
  request: CurriculumComplianceRequest,
  userId: string,
  schoolId?: string | null
): Promise<CurriculumComplianceResponse> {
  const supabase = await createClient()

  // Fetch schools and their subject coverage
  let schoolQuery = supabase.from('schools').select('id, name, state').eq('is_active', true)
  if (request.schoolIds?.length) schoolQuery = schoolQuery.in('id', request.schoolIds)
  const { data: schools } = await schoolQuery

  const schoolSubjects = await Promise.all(
    (schools ?? []).map(async (school) => {
      const { data: subjects } = await supabase
        .from('subjects')
        .select('name')
        .eq('school_id', school.id)
        .eq('is_active', true)
      return { schoolId: school.id, schoolName: school.name, subjects: subjects?.map((s) => s.name) ?? [] }
    })
  )

  const prompt = `Check curriculum compliance for the ${request.curriculumStandard} standard:

Schools and their subject offerings:
${schoolSubjects.map((s) => `- ${s.schoolName}: ${s.subjects.join(', ') || 'No subjects listed'}`).join('\n')}

Expected subjects for ${request.curriculumStandard} curriculum:
- English Language
- Mathematics
- Basic Science / General Science
- Social Studies / Civic Education
- Christian Religious Studies / Islamic Religious Studies
- Nigerian Languages (Yoruba/Igbo/Hausa)
- Agricultural Science
- Business Studies
- Creative Arts / Fine Arts
- Physical and Health Education
- Computer Studies / ICT

For each school, identify:
1. Compliance score (0-100)
2. Missing subjects (curriculum gaps)
3. Specific recommendations

Also provide:
- Common gaps across all schools
- Policy recommendations for the ministry
- Teacher training needs to address gaps

Respond as JSON matching the CurriculumComplianceResponse structure.`

  const response = await executeStructuredAI<CurriculumComplianceResponse>(
    {
      prompt,
      systemPrompt: getSystemPrompt('super_admin', 'Curriculum Compliance'),
      userId,
      schoolId,
      metadata: { type: 'curriculum_compliance', standard: request.curriculumStandard },
    },
    (raw) => {
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw
      return {
        overallComplianceRate: data.overallComplianceRate ?? 0,
        schools: data.schools ?? [],
        commonGaps: data.commonGaps ?? [],
        policyRecommendations: data.policyRecommendations ?? [],
        trainingNeeds: data.trainingNeeds ?? [],
      }
    }
  )

  return response.parsed
}

// ──────────────────────────────────────────────────────────────
// National Trend Analysis
// ──────────────────────────────────────────────────────────────

export async function analyzeNationalTrends(
  request: NationalTrendRequest,
  userId: string,
  schoolId?: string | null
): Promise<NationalTrendResponse> {
  const supabase = await createClient()

  // Fetch aggregated data grouped by the requested dimension
  const { data: schools } = await supabase
    .from('schools')
    .select('id, name, state, city, school_type, educational_level')
    .eq('is_active', true)

  // Group schools
  const groupBy = request.groupBy ?? 'state'
  const groupedSchools = new Map<string, string[]>()
  for (const school of schools ?? []) {
    const key = school[groupBy as keyof typeof school] as string ?? 'Unknown'
    const existing = groupedSchools.get(key) ?? []
    existing.push(school.id)
    groupedSchools.set(key, existing)
  }

  // Fetch exam sessions for trend analysis
  const { data: sessions } = await supabase
    .from('exam_sessions')
    .select('percentage, created_at, student_id, profiles(school_id)')
    .order('created_at', { ascending: false })
    .limit(10000)

  const prompt = `Analyze national education trends:

Metric: ${request.metric}
Timeframe: ${request.timeframe}
Grouped by: ${groupBy}

Groups:
${Array.from(groupedSchools.entries()).map(([group, ids]) => `- ${group}: ${ids.length} schools`).join('\n')}

Recent Performance Data Points: ${sessions?.length ?? 0}
${sessions && sessions.length > 0 ? `Average: ${(sessions.reduce((sum, s) => sum + (s.percentage ?? 0), 0) / sessions.length).toFixed(1)}%` : ''}

Provide:
1. Trend data for each group over time
2. Whether each group is improving, stable, or declining
3. Percentage change
4. Key insights
5. Predictions for next periods
6. Policy implications for the ministry

Respond as JSON matching the NationalTrendResponse structure.`

  const response = await executeStructuredAI<NationalTrendResponse>(
    {
      prompt,
      systemPrompt: getSystemPrompt('super_admin', 'National Trends'),
      userId,
      schoolId,
      metadata: { type: 'national_trends', metric: request.metric },
    },
    (raw) => {
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw
      return {
        metric: request.metric,
        timeframe: request.timeframe,
        data: data.data ?? [],
        insights: data.insights ?? [],
        predictions: data.predictions ?? [],
        policyImplications: data.policyImplications ?? [],
      }
    }
  )

  return response.parsed
}
