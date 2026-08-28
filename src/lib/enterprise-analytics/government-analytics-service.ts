// ============================================================================
// ExamForge AI — Government Analytics Service
// ============================================================================
// Provides government/district-level analytics for ministry officials and
// regional administrators, including school rankings, compliance, funding
// efficiency, and regional trends.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import {
  type GovernmentAnalytics,
  type DistrictPerformance,
  type SchoolRanking,
  type ComplianceOverview,
  type FundingEfficiency,
  type AnalyticsTimePeriod,
  type CustomTimePeriod,
  type TimeSeriesPoint,
  resolveTimePeriod,
} from './types'

// ──────────────────────────────────────────────────────────────
// Main Government Analytics
// ──────────────────────────────────────────────────────────────

export async function getGovernmentAnalytics(
  regionId: string,
  period: AnalyticsTimePeriod,
  custom?: CustomTimePeriod
): Promise<GovernmentAnalytics> {
  const supabase = await createClient()
  const { startDate, endDate } = resolveTimePeriod(period, custom)

  // Fetch schools in the region
  const { data: schools } = await supabase
    .from('schools')
    .select('id, name, district_id, created_at')
    .eq('region_id', regionId)

  const schoolRows = schools ?? []

  // Count students across all schools in region
  const schoolIds = schoolRows.map(s => s.id)
  const { data: students } = await supabase
    .from('users')
    .select('id, school_id, role')
    .eq('role', 'student')
    .in('school_id', schoolIds.length > 0 ? schoolIds : ['none'])

  const studentRows = students ?? []

  // Count teachers
  const { data: teachers } = await supabase
    .from('users')
    .select('id, school_id, role')
    .eq('role', 'teacher')
    .in('school_id', schoolIds.length > 0 ? schoolIds : ['none'])

  const teacherRows = teachers ?? []

  // Average performance
  const { data: results } = await supabase
    .from('exam_results')
    .select('score_percentage, total_marks, created_at')
    .gte('created_at', startDate)
    .lte('created_at', endDate)

  const resultRows = results ?? []
  const avgPerformance = calculateAvgPerformance(resultRows)

  // Compliance rate (estimated from school settings)
  const { data: schoolSettings } = await supabase
    .from('school_settings')
    .select('id, is_compliant')
    .in('school_id', schoolIds.length > 0 ? schoolIds : ['none'])

  const settingsRows = schoolSettings ?? []
  const compliantCount = settingsRows.filter(s => s.is_compliant === true).length
  const complianceRate = settingsRows.length > 0
    ? (compliantCount / settingsRows.length) * 100
    : 100

  // Districts performance
  const districtsPerformance = await getDistrictsPerformance(regionId)

  // Regional trends
  const regionalTrends = await getRegionalTrends(regionId, 12)

  // Funding efficiency
  const fundingEfficiency = await getFundingEfficiency(regionId)

  return {
    totalSchools: schoolRows.length,
    totalStudents: studentRows.length,
    totalTeachers: teacherRows.length,
    avgPerformance,
    complianceRate,
    districtsPerformance,
    regionalTrends,
    fundingEfficiency,
  }
}

// ──────────────────────────────────────────────────────────────
// Districts Performance
// ──────────────────────────────────────────────────────────────

export async function getDistrictsPerformance(
  regionId: string
): Promise<DistrictPerformance[]> {
  const supabase = await createClient()

  // Fetch districts in the region
  const { data: districts } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('parent_id', regionId)
    .eq('type', 'district')

  const districtRows = districts ?? []

  const performance: DistrictPerformance[] = []

  for (const district of districtRows) {
    // Get schools in this district
    const { data: schools } = await supabase
      .from('schools')
      .select('id')
      .eq('district_id', district.id)

    const districtSchools = schools ?? []
    const schoolIds = districtSchools.map(s => s.id)

    if (schoolIds.length === 0) {
      performance.push({
        districtId: district.id,
        districtName: district.name,
        totalSchools: 0,
        totalStudents: 0,
        avgPerformance: 0,
        complianceRate: 0,
        passRate: 0,
        teacherStudentRatio: 0,
      })
      continue
    }

    // Count students
    const { count: studentCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'student')
      .in('school_id', schoolIds)

    // Count teachers
    const { count: teacherCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'teacher')
      .in('school_id', schoolIds)

    // Average exam performance
    const { data: results } = await supabase
      .from('exam_results')
      .select('score_percentage, total_marks')
      .in('school_id', schoolIds)

    const resultRows = results ?? []
    const avgPerf = calculateAvgPerformance(resultRows)
    const passRate = calculatePassRate(resultRows)

    performance.push({
      districtId: district.id,
      districtName: district.name,
      totalSchools: districtSchools.length,
      totalStudents: studentCount ?? 0,
      avgPerformance: avgPerf,
      complianceRate: 85, // Default compliance estimate
      passRate,
      teacherStudentRatio: (teacherCount ?? 0) > 0 && (studentCount ?? 0) > 0
        ? (studentCount ?? 0) / (teacherCount ?? 1)
        : 0,
    })
  }

  return performance.sort((a, b) => b.avgPerformance - a.avgPerformance)
}

// ──────────────────────────────────────────────────────────────
// School Rankings
// ──────────────────────────────────────────────────────────────

export async function getSchoolRankings(
  districtId: string,
  metric: 'performance' | 'pass_rate' | 'enrollment' = 'performance'
): Promise<SchoolRanking[]> {
  const supabase = await createClient()

  const { data: schools } = await supabase
    .from('schools')
    .select('id, name, district_id')
    .eq('district_id', districtId)

  const schoolRows = schools ?? []
  const rankings: SchoolRanking[] = []

  for (const school of schoolRows) {
    // Student/teacher counts
    const { count: studentCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'student')
      .eq('school_id', school.id)

    const { count: teacherCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'teacher')
      .eq('school_id', school.id)

    // Performance
    const { data: results } = await supabase
      .from('exam_results')
      .select('score_percentage, total_marks')
      .eq('school_id', school.id)

    const resultRows = results ?? []
    const avgPerf = calculateAvgPerformance(resultRows)

    let score: number
    switch (metric) {
      case 'pass_rate':
        score = calculatePassRate(resultRows)
        break
      case 'enrollment':
        score = studentCount ?? 0
        break
      case 'performance':
      default:
        score = avgPerf
    }

    rankings.push({
      schoolId: school.id,
      schoolName: school.name,
      districtName: '',
      rank: 0,
      score,
      studentCount: studentCount ?? 0,
      teacherCount: teacherCount ?? 0,
      avgPerformance: avgPerf,
    })
  }

  return rankings
    .sort((a, b) => b.score - a.score)
    .map((r, i) => ({ ...r, rank: i + 1 }))
}

// ──────────────────────────────────────────────────────────────
// Compliance Overview
// ──────────────────────────────────────────────────────────────

export async function getComplianceOverview(
  regionId: string
): Promise<ComplianceOverview> {
  const supabase = await createClient()

  const { data: schools } = await supabase
    .from('schools')
    .select('id, name')
    .eq('region_id', regionId)

  const schoolRows = schools ?? []
  const schoolIds = schoolRows.map(s => s.id)

  const { data: settings } = await supabase
    .from('school_settings')
    .select('id, school_id, is_compliant, compliance_details')
    .in('school_id', schoolIds.length > 0 ? schoolIds : ['none'])

  const settingsRows = settings ?? []
  const compliantSchools = settingsRows.filter(s => s.is_compliant === true).length
  const nonCompliantSchools = settingsRows.length - compliantSchools
  const overallRate = settingsRows.length > 0
    ? (compliantSchools / settingsRows.length) * 100
    : 100

  // By category
  const categoryMap: Record<string, { compliant: number; nonCompliant: number }> = {
    curriculum: { compliant: 0, nonCompliant: 0 },
    assessment: { compliant: 0, nonCompliant: 0 },
    reporting: { compliant: 0, nonCompliant: 0 },
    data_privacy: { compliant: 0, nonCompliant: 0 },
    teacher_qualification: { compliant: 0, nonCompliant: 0 },
  }

  for (const s of settingsRows) {
    const details = s.compliance_details as Record<string, boolean> | null
    if (details) {
      for (const [key, value] of Object.entries(details)) {
        if (!categoryMap[key]) categoryMap[key] = { compliant: 0, nonCompliant: 0 }
        if (value) categoryMap[key].compliant++
        else categoryMap[key].nonCompliant++
      }
    } else {
      // If no details, categorize by overall compliance
      if (s.is_compliant) {
        for (const cat of Object.keys(categoryMap)) {
          categoryMap[cat].compliant++
        }
      } else {
        for (const cat of Object.keys(categoryMap)) {
          categoryMap[cat].nonCompliant++
        }
      }
    }
  }

  const byCategory = Object.entries(categoryMap).map(([category, data]) => ({
    category,
    compliant: data.compliant,
    nonCompliant: data.nonCompliant,
  }))

  // Critical violations
  const criticalViolations = settingsRows
    .filter(s => s.is_compliant === false)
    .map(s => {
      const school = schoolRows.find(sch => sch.id === s.school_id)
      return {
        schoolId: s.school_id,
        schoolName: school?.name ?? 'Unknown',
        violations: extractViolations(s.compliance_details),
      }
    })

  return {
    overallRate,
    totalSchools: settingsRows.length,
    compliantSchools,
    nonCompliantSchools,
    byCategory,
    criticalViolations,
  }
}

// ──────────────────────────────────────────────────────────────
// Funding Efficiency
// ──────────────────────────────────────────────────────────────

export async function getFundingEfficiency(
  regionId: string
): Promise<FundingEfficiency> {
  const supabase = await createClient()

  const { data: schools } = await supabase
    .from('schools')
    .select('id, name, district_id')
    .eq('region_id', regionId)

  const schoolRows = schools ?? []

  // Total funding from subscriptions/payments
  const schoolIds = schoolRows.map(s => s.id)
  const { data: payments } = await supabase
    .from('transactions')
    .select('amount, status, school_id')
    .eq('status', 'completed')
    .in('school_id', schoolIds.length > 0 ? schoolIds : ['none'])

  const paymentRows = payments ?? []
  const totalFunding = paymentRows.reduce((sum, p) => sum + (p.amount ?? 0), 0)

  // Student count
  const { count: studentCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'student')
    .in('school_id', schoolIds.length > 0 ? schoolIds : ['none'])

  const fundingPerStudent = (studentCount ?? 0) > 0
    ? totalFunding / (studentCount ?? 1)
    : 0

  // Performance per dollar
  const { data: results } = await supabase
    .from('exam_results')
    .select('score_percentage, total_marks')
    .in('school_id', schoolIds.length > 0 ? schoolIds : ['none'])

  const resultRows = results ?? []
  const avgPerformance = calculateAvgPerformance(resultRows)
  const performancePerDollar = totalFunding > 0 ? avgPerformance / totalFunding : 0

  // By district
  const districtFunding: Record<string, { funding: number; performance: number }> = {}
  for (const p of paymentRows) {
    const school = schoolRows.find(s => s.id === p.school_id)
    const district = school?.district_id ?? 'unknown'
    if (!districtFunding[district]) districtFunding[district] = { funding: 0, performance: 0 }
    districtFunding[district].funding += p.amount ?? 0
  }

  const byDistrict = Object.entries(districtFunding).map(([district, data]) => ({
    district,
    funding: data.funding,
    performance: avgPerformance,
    efficiency: data.funding > 0 ? avgPerformance / data.funding : 0,
  }))

  return {
    totalFunding,
    fundingPerStudent,
    performancePerDollar,
    byDistrict,
  }
}

// ──────────────────────────────────────────────────────────────
// Regional Trends
// ──────────────────────────────────────────────────────────────

export async function getRegionalTrends(
  regionId: string,
  months: number = 12
): Promise<TimeSeriesPoint[]> {
  const supabase = await createClient()

  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - months)

  const { data: schools } = await supabase
    .from('schools')
    .select('id')
    .eq('region_id', regionId)

  const schoolIds = (schools ?? []).map(s => s.id)

  if (schoolIds.length === 0) return []

  const { data: results } = await supabase
    .from('exam_results')
    .select('score_percentage, total_marks, created_at')
    .gte('created_at', startDate.toISOString())
    .in('school_id', schoolIds)

  const resultRows = results ?? []

  // Group by month
  const monthly: Record<string, { total: number; count: number }> = {}
  for (const r of resultRows) {
    if (!r.created_at) continue
    const monthKey = r.created_at.slice(0, 7)
    if (!monthly[monthKey]) monthly[monthKey] = { total: 0, count: 0 }

    const max = r.total_marks ?? 100
    monthly[monthKey].total += max > 0 ? ((r.score_percentage ?? 0) / max) * 100 : 0
    monthly[monthKey].count++
  }

  return Object.entries(monthly)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date,
      value: data.count > 0 ? data.total / data.count : 0,
    }))
}

// ──────────────────────────────────────────────────────────────
// Internal Helpers
// ──────────────────────────────────────────────────────────────

function calculateAvgPerformance(
  results: Array<{ score_percentage: number | null; total_marks: number | null }>
): number {
  if (results.length === 0) return 0
  const scores = results.map(r => {
    const total = r.total_marks ?? 100
    return total > 0 ? ((r.score_percentage ?? 0) / total) * 100 : 0
  })
  return scores.reduce((sum, s) => sum + s, 0) / scores.length
}

function calculatePassRate(
  results: Array<{ score_percentage: number | null; total_marks: number | null }>
): number {
  if (results.length === 0) return 0
  const passCount = results.filter(r => {
    const total = r.total_marks ?? 100
    const pct = total > 0 ? ((r.score_percentage ?? 0) / total) * 100 : 0
    return pct >= 50
  }).length
  return (passCount / results.length) * 100
}

function extractViolations(
  complianceDetails: unknown
): string[] {
  if (!complianceDetails || typeof complianceDetails !== 'object') return ['Non-compliant']
  const details = complianceDetails as Record<string, boolean>
  return Object.entries(details)
    .filter(([, value]) => !value)
    .map(([key]) => key.replace(/_/g, ' '))
}
