// ============================================================================
// ExamForge AI — Drilldown Service
// ============================================================================
// Provides multi-level drilldown support for analytics dashboards.
// Supports hierarchical drilldowns: region → district → school → class → student.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import {
  type DrilldownResult,
  type DrilldownRow,
  type DrilldownDimension,
  type PeriodComparison,
  type AnalyticsTimePeriod,
  type CustomTimePeriod,
  resolveTimePeriod,
} from './types'

// ──────────────────────────────────────────────────────────────
// Drilldown Hierarchy Definitions
// ──────────────────────────────────────────────────────────────

const DRILLDOWN_HIERARCHIES: Record<string, DrilldownDimension> = {
  geographic: {
    key: 'region',
    label: 'Region',
    childDimensions: [
      {
        key: 'district',
        label: 'District',
        childDimensions: [
          {
            key: 'school',
            label: 'School',
            childDimensions: [
              {
                key: 'class',
                label: 'Class',
                childDimensions: [
                  {
                    key: 'student',
                    label: 'Student',
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  academic: {
    key: 'subject',
    label: 'Subject',
    childDimensions: [
      {
        key: 'topic',
        label: 'Topic',
        childDimensions: [
          {
            key: 'subtopic',
            label: 'Subtopic',
          },
        ],
      },
    ],
  },
  organizational: {
    key: 'department',
    label: 'Department',
    childDimensions: [
      {
        key: 'grade',
        label: 'Grade',
        childDimensions: [
          {
            key: 'class',
            label: 'Class',
          },
        ],
      },
    ],
  },
  financial: {
    key: 'revenue_source',
    label: 'Revenue Source',
    childDimensions: [
      {
        key: 'subscription',
        label: 'Subscription',
        childDimensions: [
          {
            key: 'invoice',
            label: 'Invoice',
          },
        ],
      },
    ],
  },
}

// ──────────────────────────────────────────────────────────────
// Drilldown
// ──────────────────────────────────────────────────────────────

export async function drilldown(
  metric: string,
  dimension: string,
  filters: Record<string, unknown> = {},
  orgId?: string
): Promise<DrilldownResult> {
  const supabase = await createClient()

  const data: DrilldownRow[] = []
  let totalRecords = 0

  // Determine which table to query based on metric
  const { table, valueField } = resolveMetricSource(metric)

  switch (dimension) {
    case 'region': {
      const { data: regions } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('type', 'region')

      for (const region of (regions ?? [])) {
        const result = await calculateMetricForEntity(supabase, metric, table, valueField, 'region_id', region.id, filters)
        data.push({
          dimension: region.name,
          dimensionId: region.id,
          value: result.value,
          percentage: 0,
          metadata: { type: 'region' },
          children: undefined,
        })
        totalRecords += result.count
      }
      break
    }

    case 'district': {
      const regionId = filters.regionId as string | undefined
      let query = supabase.from('organizations').select('id, name').eq('type', 'district')
      if (regionId) query = query.eq('parent_id', regionId)

      const { data: districts } = await query

      for (const district of (districts ?? [])) {
        const result = await calculateMetricForEntity(supabase, metric, table, valueField, 'district_id', district.id, filters)
        data.push({
          dimension: district.name,
          dimensionId: district.id,
          value: result.value,
          percentage: 0,
          metadata: { type: 'district', parentId: district.id },
        })
        totalRecords += result.count
      }
      break
    }

    case 'school': {
      const districtId = filters.districtId as string | undefined
      let query = supabase.from('schools').select('id, name')
      if (districtId) query = query.eq('district_id', districtId)
      if (orgId) query = query.eq('id', orgId)

      const { data: schools } = await query

      for (const school of (schools ?? [])) {
        const result = await calculateMetricForEntity(supabase, metric, table, valueField, 'school_id', school.id, filters)
        data.push({
          dimension: school.name,
          dimensionId: school.id,
          value: result.value,
          percentage: 0,
          metadata: { type: 'school' },
        })
        totalRecords += result.count
      }
      break
    }

    case 'class': {
      const schoolId = filters.schoolId as string | undefined
      let query = supabase.from('classes').select('id, name')
      if (schoolId) query = query.eq('school_id', schoolId)

      const { data: classes } = await query

      for (const cls of (classes ?? [])) {
        const result = await calculateMetricForEntity(supabase, metric, table, valueField, 'class_id', cls.id, filters)
        data.push({
          dimension: cls.name,
          dimensionId: cls.id,
          value: result.value,
          percentage: 0,
          metadata: { type: 'class' },
        })
        totalRecords += result.count
      }
      break
    }

    case 'student': {
      const classId = filters.classId as string | undefined
      let query = supabase.from('users').select('id, full_name').eq('role', 'student')
      if (classId) query = query.eq('class_id', classId)

      const { data: students } = await query

      for (const student of (students ?? [])) {
        const result = await calculateMetricForEntity(supabase, metric, table, valueField, 'student_id', student.id, filters)
        data.push({
          dimension: student.full_name ?? 'Unknown',
          dimensionId: student.id,
          value: result.value,
          percentage: 0,
          metadata: { type: 'student' },
        })
        totalRecords += result.count
      }
      break
    }

    case 'subject': {
      const { data: subjects } = await supabase
        .from('subjects')
        .select('id, name')

      for (const subject of (subjects ?? [])) {
        const result = await calculateMetricForEntity(supabase, metric, table, valueField, 'subject_id', subject.id, filters)
        data.push({
          dimension: subject.name,
          dimensionId: subject.id,
          value: result.value,
          percentage: 0,
          metadata: { type: 'subject' },
        })
        totalRecords += result.count
      }
      break
    }

    case 'grade': {
      const { data: students } = await supabase
        .from('users')
        .select('grade')

      const gradeMap: Record<string, number> = {}
      for (const s of (students ?? [])) {
        const g = (s as { grade?: string | null }).grade ?? 'Unassigned'
        gradeMap[g] = (gradeMap[g] ?? 0) + 1
      }

      const total = Object.values(gradeMap).reduce((s, v) => s + v, 0)

      for (const [grade, count] of Object.entries(gradeMap).sort((a, b) => a[0].localeCompare(b[0]))) {
        data.push({
          dimension: grade,
          dimensionId: grade,
          value: count,
          percentage: total > 0 ? (count / total) * 100 : 0,
          metadata: { type: 'grade' },
        })
      }
      totalRecords = total
      break
    }

    case 'department': {
      const { data: students } = await supabase
        .from('users')
        .select('department')

      const deptMap: Record<string, number> = {}
      for (const s of (students ?? [])) {
        const d = (s as { department?: string | null }).department ?? 'Unassigned'
        deptMap[d] = (deptMap[d] ?? 0) + 1
      }

      const total = Object.values(deptMap).reduce((s, v) => s + v, 0)

      for (const [dept, count] of Object.entries(deptMap).sort((a, b) => b[1] - a[1])) {
        data.push({
          dimension: dept,
          dimensionId: dept,
          value: count,
          percentage: total > 0 ? (count / total) * 100 : 0,
          metadata: { type: 'department' },
        })
      }
      totalRecords = total
      break
    }

    default: {
      // Generic dimension drilldown
      const { data: rows } = await supabase
        .from(table)
        .select(`${dimension}, ${valueField}`)
        .limit(100)

      const grouped: Record<string, number> = {}
      for (const r of (rows ?? [])) {
        const key = String((r as unknown as Record<string, unknown>)[dimension] ?? 'Unknown')
        const val = Number((r as unknown as Record<string, unknown>)[valueField] ?? 0)
        grouped[key] = (grouped[key] ?? 0) + val
      }

      const total = Object.values(grouped).reduce((s, v) => s + v, 0)

      for (const [label, value] of Object.entries(grouped).sort((a, b) => b[1] - a[1])) {
        data.push({
          dimension: label,
          dimensionId: label,
          value,
          percentage: total > 0 ? (value / total) * 100 : 0,
        })
      }
      totalRecords = (rows ?? []).length
    }
  }

  // Calculate percentages if not already set
  const totalValue = data.reduce((sum, d) => sum + d.value, 0)
  for (const d of data) {
    if (d.percentage === 0 && totalValue > 0) {
      d.percentage = (d.value / totalValue) * 100
    }
  }

  return {
    parentMetric: metric,
    childMetric: dimension,
    data,
    filters,
    totalRecords,
  }
}

// ──────────────────────────────────────────────────────────────
// Available Drilldowns
// ──────────────────────────────────────────────────────────────

export function getAvailableDrilldowns(metric: string): DrilldownDimension[] {
  // Determine which hierarchy applies based on metric
  const academicMetrics = ['avg_score', 'pass_rate', 'fail_rate', 'avg_gpa', 'exam_completion_rate', 'risk_score', 'dropout_probability']
  const financialMetrics = ['revenue', 'expenses', 'profit', 'mrr', 'arr', 'collection_rate', 'outstanding_revenue']
  const enrollmentMetrics = ['enrollment', 'retention_rate', 'attendance_rate', 'total_students', 'total_teachers', 'total_schools']

  if (academicMetrics.includes(metric)) {
    return [
      DRILLDOWN_HIERARCHIES.geographic,
      DRILLDOWN_HIERARCHIES.academic,
      DRILLDOWN_HIERARCHIES.organizational,
    ]
  }

  if (financialMetrics.includes(metric)) {
    return [
      DRILLDOWN_HIERARCHIES.geographic,
      DRILLDOWN_HIERARCHIES.financial,
    ]
  }

  if (enrollmentMetrics.includes(metric)) {
    return [
      DRILLDOWN_HIERARCHIES.geographic,
      DRILLDOWN_HIERARCHIES.organizational,
    ]
  }

  // Default: all hierarchies
  return [
    DRILLDOWN_HIERARCHIES.geographic,
    DRILLDOWN_HIERARCHIES.academic,
    DRILLDOWN_HIERARCHIES.organizational,
    DRILLDOWN_HIERARCHIES.financial,
  ]
}

// ──────────────────────────────────────────────────────────────
// Aggregate by Dimension
// ──────────────────────────────────────────────────────────────

export async function aggregateByDimension(
  data: Array<Record<string, unknown>>,
  dimension: string
): Promise<DrilldownRow[]> {
  const grouped: Record<string, { value: number; count: number }> = {}

  for (const row of data) {
    const key = String(row[dimension] ?? 'Unknown')
    const value = typeof row.value === 'number' ? row.value : 1

    if (!grouped[key]) grouped[key] = { value: 0, count: 0 }
    grouped[key].value += value
    grouped[key].count++
  }

  const total = Object.values(grouped).reduce((s, v) => s + v.value, 0)

  return Object.entries(grouped)
    .sort((a, b) => b[1].value - a[1].value)
    .map(([label, data]) => ({
      dimension: label,
      dimensionId: label,
      value: data.value,
      percentage: total > 0 ? (data.value / total) * 100 : 0,
      metadata: { count: data.count },
    }))
}

// ──────────────────────────────────────────────────────────────
// Compare Periods
// ──────────────────────────────────────────────────────────────

export async function comparePeriods(
  metric: string,
  period1: AnalyticsTimePeriod,
  period2: AnalyticsTimePeriod,
  orgId?: string,
  custom1?: CustomTimePeriod,
  custom2?: CustomTimePeriod
): Promise<PeriodComparison> {
  const supabase = await createClient()
  const { table, valueField } = resolveMetricSource(metric)

  const range1 = resolveTimePeriod(period1, custom1)
  const range2 = resolveTimePeriod(period2, custom2)

  // Query period 1
  let query1 = supabase.from(table).select(valueField).gte('created_at', range1.startDate).lte('created_at', range1.endDate)
  if (orgId) query1 = query1.eq('school_id', orgId)
  const { data: data1 } = await query1

  // Query period 2
  let query2 = supabase.from(table).select(valueField).gte('created_at', range2.startDate).lte('created_at', range2.endDate)
  if (orgId) query2 = query2.eq('school_id', orgId)
  const { data: data2 } = await query2

  // Calculate metric values
  const value1 = calculateMetricValue((data1 ?? []) as unknown as Record<string, unknown>[], valueField, metric)
  const value2 = calculateMetricValue((data2 ?? []) as unknown as Record<string, unknown>[], valueField, metric)

  const change = value2 - value1
  const changePercent = value1 !== 0 ? (change / Math.abs(value1)) * 100 : (value2 !== 0 ? 100 : 0)
  const trend: PeriodComparison['trend'] = change > 0 ? 'up' : change < 0 ? 'down' : 'flat'

  return {
    metric,
    period1: { label: formatPeriodLabel(period1), value: value1 },
    period2: { label: formatPeriodLabel(period2), value: value2 },
    change,
    changePercent,
    trend,
  }
}

// ──────────────────────────────────────────────────────────────
// Internal Helpers
// ──────────────────────────────────────────────────────────────

function resolveMetricSource(metric: string): { table: string; valueField: string } {
  switch (metric) {
    case 'revenue':
    case 'collection_rate':
    case 'outstanding_revenue':
      return { table: 'payments', valueField: 'amount' }
    case 'avg_score':
    case 'pass_rate':
    case 'fail_rate':
    case 'avg_gpa':
    case 'exam_completion_rate':
    case 'risk_score':
    case 'dropout_probability':
      return { table: 'exam_results', valueField: 'score' }
    case 'enrollment':
    case 'retention_rate':
    case 'attendance_rate':
    case 'total_students':
      return { table: 'profiles', valueField: 'id' }
    case 'total_teachers':
      return { table: 'profiles', valueField: 'id' }
    case 'total_schools':
      return { table: 'schools', valueField: 'id' }
    case 'ai_generations':
    case 'ai_cost':
    case 'ai_tokens':
    case 'error_rate':
      return { table: 'ai_generations', valueField: 'cost_usd' }
    default:
      return { table: 'exam_results', valueField: 'score' }
  }
}

async function calculateMetricForEntity(
  supabase: Awaited<ReturnType<typeof createClient>>,
  metric: string,
  table: string,
  valueField: string,
  entityField: string,
  entityId: string,
  filters: Record<string, unknown>
): Promise<{ value: number; count: number }> {
  let query = supabase.from(table).select(`*`).eq(entityField, entityId).limit(1000)

  // Apply additional filters
  if (filters.startDate) query = query.gte('created_at', filters.startDate as string)
  if (filters.endDate) query = query.lte('created_at', filters.endDate as string)

  const { data } = await query
  const rows = data ?? []

  if (rows.length === 0) return { value: 0, count: 0 }

  switch (metric) {
    case 'avg_score': {
      const scores = rows.map(r => {
        const score = (r as Record<string, unknown>).score as number ?? 0
        const total = (r as Record<string, unknown>).total_marks as number ?? 100
        return total > 0 ? (score / total) * 100 : 0
      })
      return { value: scores.reduce((s, v) => s + v, 0) / scores.length, count: rows.length }
    }
    case 'pass_rate': {
      const passCount = rows.filter(r => {
        const score = (r as Record<string, unknown>).score as number ?? 0
        const total = (r as Record<string, unknown>).total_marks as number ?? 100
        return total > 0 && (score / total) * 100 >= 50
      }).length
      return { value: (passCount / rows.length) * 100, count: rows.length }
    }
    case 'fail_rate': {
      const failCount = rows.filter(r => {
        const score = (r as Record<string, unknown>).score as number ?? 0
        const total = (r as Record<string, unknown>).total_marks as number ?? 100
        return total > 0 && (score / total) * 100 < 50
      }).length
      return { value: (failCount / rows.length) * 100, count: rows.length }
    }
    case 'revenue':
    case 'enrollment':
      return { value: rows.length, count: rows.length }
    default:
      return { value: rows.length, count: rows.length }
  }
}

function calculateMetricValue(
  data: Record<string, unknown>[],
  valueField: string,
  metric: string
): number {
  if (data.length === 0) return 0

  switch (metric) {
    case 'avg_score': {
      const scores = data.map(r => {
        const score = r.score as number ?? 0
        const total = r.total_marks as number ?? 100
        return total > 0 ? (score / total) * 100 : 0
      })
      return scores.reduce((s, v) => s + v, 0) / scores.length
    }
    case 'pass_rate': {
      const passCount = data.filter(r => {
        const score = r.score as number ?? 0
        const total = r.total_marks as number ?? 100
        return total > 0 && (score / total) * 100 >= 50
      }).length
      return (passCount / data.length) * 100
    }
    case 'revenue':
      return data.reduce((sum, r) => sum + (r.amount as number ?? 0), 0)
    case 'enrollment':
      return data.length
    default:
      return data.reduce((sum, r) => sum + ((r[valueField] as number) ?? 0), 0)
  }
}

function formatPeriodLabel(period: AnalyticsTimePeriod): string {
  switch (period) {
    case 'today': return 'Today'
    case 'yesterday': return 'Yesterday'
    case 'last_7_days': return 'Last 7 Days'
    case 'last_30_days': return 'Last 30 Days'
    case 'last_90_days': return 'Last 90 Days'
    case 'this_month': return 'This Month'
    case 'last_month': return 'Last Month'
    case 'this_quarter': return 'This Quarter'
    case 'this_year': return 'This Year'
    case 'custom': return 'Custom Period'
  }
}
