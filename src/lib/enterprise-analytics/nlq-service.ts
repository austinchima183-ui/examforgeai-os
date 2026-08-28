// ============================================================================
// ExamForge AI — Natural Language Query (NLQ) Service
// ============================================================================
// Provides AI-powered natural language query parsing and execution.
// Users can ask questions in plain English and get structured analytics results.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { executeStructuredAI } from '@/lib/ai/ai-engine'
import {
  type NaturalLanguageQuery,
  type ParsedQueryFilters,
  type QueryFilter,
  type QueryResult,
  type SuggestedQuery,
  type AnalyticsTimePeriod,
} from './types'

// ──────────────────────────────────────────────────────────────
// Parse Natural Language Query (AI-Powered)
// ──────────────────────────────────────────────────────────────

export async function parseNaturalLanguageQuery(
  query: string,
  orgId?: string
): Promise<ParsedQueryFilters> {
  const prompt = `You are an analytics query parser for ExamForge AI, an education assessment platform. Parse the following natural language query into structured filters.

Available metrics: revenue, expenses, profit, mrr, arr, enrollment, retention_rate, attendance_rate, avg_score, pass_rate, fail_rate, avg_gpa, exam_completion_rate, total_students, total_teachers, total_schools, ai_generations, ai_cost, ai_tokens, error_rate, risk_score, dropout_probability, collection_rate, outstanding_revenue

Available dimensions: subject, class, grade, department, teacher, student, school, district, region, provider, model, use_case, gender, age_group, time, payment_method

Available time periods: today, yesterday, last_7_days, last_30_days, last_90_days, this_month, last_month, this_quarter, this_year

Available aggregations: sum, avg, count, min, max

Query: "${query}"

Return a JSON object with:
{
  "metrics": ["list of relevant metrics"],
  "dimensions": ["list of group-by dimensions"],
  "filters": [{"field": "field_name", "operator": "eq|neq|gt|gte|lt|lte|in|contains", "value": "filter_value"}],
  "timePeriod": "the_time_period",
  "sortBy": "field_to_sort_by",
  "sortOrder": "asc|desc",
  "limit": 100,
  "aggregation": "sum|avg|count|min|max"
}

Only include fields that are relevant to the query. If uncertain, make reasonable defaults.`

  try {
    const response = await executeStructuredAI<ParsedQueryFilters>(
      {
        prompt,
        systemPrompt: 'You are a precise query parser. Parse natural language into structured analytics queries. Return valid JSON only. No explanations.',
        userId: 'system',
        schoolId: orgId ?? undefined,
        temperature: 0.1,
      },
      (raw) => {
        if (typeof raw === 'object' && raw !== null) {
          return validateParsedFilters(raw as Partial<ParsedQueryFilters>)
        }
        if (typeof raw === 'string') {
          try {
            return validateParsedFilters(JSON.parse(raw) as Partial<ParsedQueryFilters>)
          } catch {
            return getDefaultParsedFilters()
          }
        }
        return getDefaultParsedFilters()
      }
    )

    return response.parsed
  } catch {
    // Fallback: simple keyword-based parsing
    return fallbackParse(query)
  }
}

// ──────────────────────────────────────────────────────────────
// Execute Natural Language Query
// ──────────────────────────────────────────────────────────────

export async function executeNaturalLanguageQuery(
  parsedQuery: ParsedQueryFilters,
  orgId: string
): Promise<QueryResult> {
  const supabase = await createClient()

  // Determine which table(s) to query based on metrics
  const tables = determineTables(parsedQuery.metrics)

  if (tables.length === 0) {
    return { columns: ['message'], rows: [{ message: 'No relevant data sources found for the specified metrics' }], totalRows: 1 }
  }

  // Execute queries and merge results
  const allRows: Record<string, unknown>[] = []
  const columnSet = new Set<string>()

  for (const table of tables) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = supabase.from(table).select('*')

    // Apply time period filter
    if (parsedQuery.timePeriod) {
      const now = new Date()
      let startDate: Date

      switch (parsedQuery.timePeriod) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case 'last_7_days':
          startDate = new Date(now.getTime() - 7 * 86400000)
          break
        case 'last_30_days':
          startDate = new Date(now.getTime() - 30 * 86400000)
          break
        case 'last_90_days':
          startDate = new Date(now.getTime() - 90 * 86400000)
          break
        case 'this_month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        case 'last_month':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
          break
        case 'this_quarter':
          startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
          break
        case 'this_year':
          startDate = new Date(now.getFullYear(), 0, 1)
          break
        default:
          startDate = new Date(now.getTime() - 30 * 86400000)
      }

      query = query.gte('created_at', startDate.toISOString())
    }

    // Apply filters
    for (const filter of parsedQuery.filters) {
      query = applyFilter(query, filter)
    }

    // Apply org scoping
    if (orgId) {
      query = query.eq('school_id', orgId)
    }

    // Apply limit
    const limit = parsedQuery.limit ?? 100
    query = query.limit(limit)

    const { data, error } = await query

    if (error || !data) continue

    for (const row of data) {
      const filteredRow: Record<string, unknown> = {}

      // Include requested metrics and dimensions
      for (const key of Object.keys(row)) {
        if (
          parsedQuery.metrics.includes(key) ||
          parsedQuery.dimensions.includes(key) ||
          key === 'id' ||
          key === 'created_at' ||
          key === 'school_id'
        ) {
          filteredRow[key] = row[key]
          columnSet.add(key)
        }
      }

      // If no specific columns selected, include all
      if (parsedQuery.metrics.length === 0 && parsedQuery.dimensions.length === 0) {
        Object.assign(filteredRow, row)
        for (const key of Object.keys(row)) columnSet.add(key)
      }

      allRows.push(filteredRow)
    }
  }

  // Sort results
  if (parsedQuery.sortBy) {
    const sortKey = parsedQuery.sortBy
    const sortOrder = parsedQuery.sortOrder ?? 'desc'
    allRows.sort((a, b) => {
      const aVal = a[sortKey] as number | string | null
      const bVal = b[sortKey] as number | string | null
      if (aVal === null && bVal === null) return 0
      if (aVal === null) return 1
      if (bVal === null) return -1
      const cmp = typeof aVal === 'number' && typeof bVal === 'number'
        ? aVal - bVal
        : String(aVal).localeCompare(String(bVal))
      return sortOrder === 'asc' ? cmp : -cmp
    })
  }

  // Calculate summary for numeric metrics
  const summary: Record<string, number> = {}
  const columns = Array.from(columnSet)

  for (const metric of parsedQuery.metrics) {
    const values = allRows
      .map(r => r[metric])
      .filter((v): v is number => typeof v === 'number')

    if (values.length === 0) continue

    switch (parsedQuery.aggregation ?? 'sum') {
      case 'sum':
        summary[metric] = values.reduce((s, v) => s + v, 0)
        break
      case 'avg':
        summary[metric] = values.reduce((s, v) => s + v, 0) / values.length
        break
      case 'count':
        summary[metric] = values.length
        break
      case 'min':
        summary[metric] = Math.min(...values)
        break
      case 'max':
        summary[metric] = Math.max(...values)
        break
    }
  }

  return {
    columns,
    rows: allRows.slice(0, parsedQuery.limit ?? 100),
    totalRows: allRows.length,
    summary: Object.keys(summary).length > 0 ? summary : undefined,
  }
}

// ──────────────────────────────────────────────────────────────
// Get Suggested Queries
// ──────────────────────────────────────────────────────────────

export async function getSuggestedQueries(
  role: string,
  page: string
): Promise<SuggestedQuery[]> {
  const baseQueries: Record<string, SuggestedQuery[]> = {
    teacher: [
      { query: 'How did my students perform this month?', description: 'View student performance for the current month', category: 'academic' },
      { query: 'Which students are at risk of failing?', description: 'Identify at-risk students', category: 'risk' },
      { query: 'What are the weakest subjects in my class?', description: 'Find subjects with lowest average scores', category: 'academic' },
      { query: 'How many exams have I created this term?', description: 'Count of exams created', category: 'assessment' },
      { query: 'Compare performance across my classes', description: 'Class comparison analysis', category: 'academic' },
    ],
    student: [
      { query: 'What is my average score this term?', description: 'Personal performance summary', category: 'academic' },
      { query: 'Which subjects am I struggling in?', description: 'Identify weak subjects', category: 'academic' },
      { query: 'How has my performance changed over time?', description: 'Performance trend', category: 'academic' },
      { query: 'What is my class ranking?', description: 'Ranking within class', category: 'academic' },
    ],
    school_admin: [
      { query: 'What is the total revenue this month?', description: 'Monthly revenue overview', category: 'financial' },
      { query: 'How many students are enrolled?', description: 'Current enrollment count', category: 'enrollment' },
      { query: 'What is the attendance rate this week?', description: 'Weekly attendance rate', category: 'attendance' },
      { query: 'Which teachers have the highest workload?', description: 'Teacher workload analysis', category: 'teacher' },
      { query: 'How much are we spending on AI?', description: 'AI cost analysis', category: 'ai' },
      { query: 'What are the compliance risks?', description: 'Compliance risk overview', category: 'risk' },
    ],
    super_admin: [
      { query: 'How many schools are in each district?', description: 'District enrollment overview', category: 'government' },
      { query: 'What is the average performance across regions?', description: 'Regional performance comparison', category: 'government' },
      { query: 'Which schools have the lowest compliance?', description: 'Compliance risk schools', category: 'compliance' },
      { query: 'What is the total AI cost across all schools?', description: 'Platform AI cost', category: 'ai' },
      { query: 'Show funding efficiency by district', description: 'Funding vs outcomes analysis', category: 'financial' },
    ],
    parent: [
      { query: 'How is my child performing?', description: 'Child performance summary', category: 'academic' },
      { query: 'What subjects does my child need help with?', description: 'Identify areas for improvement', category: 'academic' },
      { query: 'What is my child\'s attendance rate?', description: 'Attendance tracking', category: 'attendance' },
    ],
  }

  // Page-specific suggestions
  const pageQueries: Record<string, SuggestedQuery[]> = {
    dashboard: [
      { query: 'Give me a summary of all key metrics', description: 'Executive summary', category: 'overview' },
      { query: 'What needs my attention right now?', description: 'Priority alerts and risks', category: 'risk' },
    ],
    analytics: [
      { query: 'Compare this month vs last month', description: 'Period comparison', category: 'comparison' },
      { query: 'Show me trends over the last year', description: 'Annual trend analysis', category: 'trends' },
    ],
    students: [
      { query: 'Which students have the lowest attendance?', description: 'Attendance risk students', category: 'risk' },
      { query: 'How many new students enrolled this term?', description: 'New enrollment count', category: 'enrollment' },
    ],
  }

  const roleQueries = baseQueries[role] ?? baseQueries.school_admin
  const pageSpecific = pageQueries[page] ?? []

  return [...pageSpecific, ...roleQueries].slice(0, 8)
}

// ──────────────────────────────────────────────────────────────
// Format Query Result
// ──────────────────────────────────────────────────────────────

export function formatQueryResult(result: QueryResult): string {
  if (result.rows.length === 0) {
    return 'No data found matching your query criteria.'
  }

  const lines: string[] = []

  // Summary
  if (result.summary) {
    lines.push('**Summary:**')
    for (const [key, value] of Object.entries(result.summary)) {
      lines.push(`  ${key}: ${formatNumber(value)}`)
    }
    lines.push('')
  }

  // Table header
  if (result.columns.length > 0 && result.rows.length > 0) {
    const headers = result.columns.map(c => c.padEnd(20)).join(' | ')
    lines.push(headers)
    lines.push('-'.repeat(headers.length))

    // Table rows (max 20)
    const displayRows = result.rows.slice(0, 20)
    for (const row of displayRows) {
      const values = result.columns.map(col => {
        const val = row[col]
        const str = val === null || val === undefined ? '—' : String(val)
        return str.padEnd(20)
      })
      lines.push(values.join(' | '))
    }

    if (result.rows.length > 20) {
      lines.push(`... and ${result.rows.length - 20} more rows`)
    }
  }

  lines.push(`\nTotal: ${result.totalRows} records`)

  return lines.join('\n')
}

// ──────────────────────────────────────────────────────────────
// Convenience: Full NLQ Flow
// ──────────────────────────────────────────────────────────────

export async function askNaturalLanguageQuery(
  query: string,
  orgId: string
): Promise<NaturalLanguageQuery> {
  const parsedFilters = await parseNaturalLanguageQuery(query, orgId)
  const result = await executeNaturalLanguageQuery(parsedFilters, orgId)

  return {
    query,
    parsedFilters,
    result,
  }
}

// ──────────────────────────────────────────────────────────────
// Internal Helpers
// ──────────────────────────────────────────────────────────────

function validateParsedFilters(partial: Partial<ParsedQueryFilters>): ParsedQueryFilters {
  return {
    metrics: Array.isArray(partial.metrics) ? partial.metrics : [],
    dimensions: Array.isArray(partial.dimensions) ? partial.dimensions : [],
    filters: Array.isArray(partial.filters) ? partial.filters.map(validateFilter) : [],
    timePeriod: partial.timePeriod ?? 'last_30_days',
    sortBy: partial.sortBy,
    sortOrder: partial.sortOrder === 'asc' ? 'asc' : 'desc',
    limit: typeof partial.limit === 'number' ? Math.min(partial.limit, 1000) : 100,
    aggregation: partial.aggregation ?? 'sum',
  }
}

function validateFilter(f: Partial<QueryFilter>): QueryFilter {
  return {
    field: f.field ?? 'id',
    operator: f.operator ?? 'eq',
    value: f.value ?? null,
  }
}

function getDefaultParsedFilters(): ParsedQueryFilters {
  return {
    metrics: [],
    dimensions: [],
    filters: [],
    timePeriod: 'last_30_days',
    sortBy: undefined,
    sortOrder: 'desc',
    limit: 100,
    aggregation: 'sum',
  }
}

function fallbackParse(query: string): ParsedQueryFilters {
  const q = query.toLowerCase()
  const metrics: string[] = []
  const dimensions: string[] = []
  const filters: QueryFilter[] = []

  // Keyword-based metric detection
  if (q.includes('revenue') || q.includes('income')) metrics.push('revenue')
  if (q.includes('expense') || q.includes('cost')) metrics.push('expenses')
  if (q.includes('profit')) metrics.push('profit')
  if (q.includes('enroll')) metrics.push('enrollment')
  if (q.includes('attendance')) metrics.push('attendance_rate')
  if (q.includes('score') || q.includes('performance')) metrics.push('avg_score')
  if (q.includes('pass')) metrics.push('pass_rate')
  if (q.includes('fail')) metrics.push('fail_rate')
  if (q.includes('ai') && (q.includes('cost') || q.includes('spend'))) metrics.push('ai_cost')
  if (q.includes('ai') && q.includes('usage')) metrics.push('ai_generations')
  if (q.includes('risk')) metrics.push('risk_score')
  if (q.includes('dropout')) metrics.push('dropout_probability')

  // Dimension detection
  if (q.includes('by subject') || q.includes('per subject')) dimensions.push('subject')
  if (q.includes('by class') || q.includes('per class')) dimensions.push('class')
  if (q.includes('by grade') || q.includes('per grade')) dimensions.push('grade')
  if (q.includes('by teacher') || q.includes('per teacher')) dimensions.push('teacher')
  if (q.includes('by school') || q.includes('per school')) dimensions.push('school')
  if (q.includes('by district') || q.includes('per district')) dimensions.push('district')

  // Time period detection
  let timePeriod: AnalyticsTimePeriod = 'last_30_days'
  if (q.includes('today')) timePeriod = 'today'
  else if (q.includes('yesterday')) timePeriod = 'yesterday'
  else if (q.includes('this week') || q.includes('last 7 days')) timePeriod = 'last_7_days'
  else if (q.includes('this month')) timePeriod = 'this_month'
  else if (q.includes('last month')) timePeriod = 'last_month'
  else if (q.includes('this quarter')) timePeriod = 'this_quarter'
  else if (q.includes('this year') || q.includes('annual')) timePeriod = 'this_year'

  // Aggregation detection
  let aggregation: ParsedQueryFilters['aggregation'] = 'sum'
  if (q.includes('average') || q.includes('avg') || q.includes('mean')) aggregation = 'avg'
  else if (q.includes('count') || q.includes('how many') || q.includes('number of')) aggregation = 'count'
  else if (q.includes('maximum') || q.includes('highest') || q.includes('top')) aggregation = 'max'
  else if (q.includes('minimum') || q.includes('lowest') || q.includes('worst')) aggregation = 'min'

  return {
    metrics: metrics.length > 0 ? metrics : ['avg_score'],
    dimensions,
    filters,
    timePeriod,
    aggregation,
    limit: 100,
    sortOrder: 'desc',
  }
}

function determineTables(metrics: string[]): string[] {
  const tables = new Set<string>()

  const financialMetrics = ['revenue', 'expenses', 'profit', 'mrr', 'arr', 'collection_rate', 'outstanding_revenue']
  const academicMetrics = ['avg_score', 'pass_rate', 'fail_rate', 'avg_gpa', 'exam_completion_rate']
  const enrollmentMetrics = ['enrollment', 'retention_rate', 'attendance_rate']
  const aiMetrics = ['ai_generations', 'ai_cost', 'ai_tokens', 'error_rate']
  const riskMetrics = ['risk_score', 'dropout_probability']
  const studentMetrics = ['total_students']
  const teacherMetrics = ['total_teachers']
  const schoolMetrics = ['total_schools']

  if (metrics.some(m => financialMetrics.includes(m))) tables.add('payments')
  if (metrics.some(m => academicMetrics.includes(m))) tables.add('exam_results')
  if (metrics.some(m => enrollmentMetrics.includes(m))) tables.add('profiles')
  if (metrics.some(m => aiMetrics.includes(m))) tables.add('ai_generations')
  if (metrics.some(m => riskMetrics.includes(m))) tables.add('exam_results')
  if (metrics.some(m => studentMetrics.includes(m))) tables.add('profiles')
  if (metrics.some(m => teacherMetrics.includes(m))) tables.add('profiles')
  if (metrics.some(m => schoolMetrics.includes(m))) tables.add('schools')

  if (tables.size === 0) tables.add('exam_results')

  return Array.from(tables)
}

function applyFilter(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  filter: QueryFilter
): typeof query {
  // Supabase query builder - apply filter based on operator
  const { field, operator, value } = filter

  switch (operator) {
    case 'eq':
      return (query as unknown as { eq: (f: string, v: unknown) => typeof query }).eq(field, value)
    case 'neq':
      return (query as unknown as { neq: (f: string, v: unknown) => typeof query }).neq(field, value)
    case 'gt':
      return (query as unknown as { gt: (f: string, v: unknown) => typeof query }).gt(field, value)
    case 'gte':
      return (query as unknown as { gte: (f: string, v: unknown) => typeof query }).gte(field, value)
    case 'lt':
      return (query as unknown as { lt: (f: string, v: unknown) => typeof query }).lt(field, value)
    case 'lte':
      return (query as unknown as { lte: (f: string, v: unknown) => typeof query }).lte(field, value)
    case 'in':
      if (Array.isArray(value)) {
        return (query as unknown as { in: (f: string, v: unknown[]) => typeof query }).in(field, value)
      }
      return query
    case 'contains':
      return (query as unknown as { like: (f: string, v: string) => typeof query }).like(field, `%${value}%`)
    default:
      return query
  }
}

function formatNumber(value: number): string {
  if (Number.isInteger(value)) return value.toLocaleString()
  if (Math.abs(value) >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 2 })
  if (Math.abs(value) >= 1) return value.toFixed(2)
  return value.toFixed(4)
}
