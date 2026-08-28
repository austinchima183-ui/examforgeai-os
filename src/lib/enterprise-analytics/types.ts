// ============================================================================
// ExamForge AI — Enterprise Analytics Type Definitions
// ============================================================================
// Comprehensive type system for executive dashboards covering:
// Financial, Academic, Government, Institution, AI, Risk, Enrollment,
// Teacher, Student analytics, plus Drilldowns, NLQ, and Scheduled Reports.
// ============================================================================

// ──────────────────────────────────────────────────────────────
// Time Period
// ──────────────────────────────────────────────────────────────

export type AnalyticsTimePeriod =
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_30_days'
  | 'last_90_days'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'this_year'
  | 'custom'

export interface CustomTimePeriod {
  startDate: string
  endDate: string
}

export interface TimePeriodRange {
  period: AnalyticsTimePeriod
  custom?: CustomTimePeriod
  startDate: string
  endDate: string
}

// ──────────────────────────────────────────────────────────────
// Shared / Common Types
// ──────────────────────────────────────────────────────────────

export interface TimeSeriesPoint {
  date: string
  value: number
}

export interface LabeledValue {
  label: string
  value: number
}

export interface LabeledSeries {
  label: string
  data: TimeSeriesPoint[]
}

export interface PercentageBreakdown {
  label: string
  value: number
  percentage: number
}

export interface RankedItem {
  id: string
  name: string
  rank: number
  score: number
  metadata?: Record<string, unknown>
}

export interface ScoreBucket {
  range: string
  min: number
  max: number
  count: number
}

// ──────────────────────────────────────────────────────────────
// Financial Analytics
// ──────────────────────────────────────────────────────────────

export interface FinancialAnalytics {
  revenue: number
  expenses: number
  profit: number
  mrr: number
  arr: number
  collectionRate: number
  outstandingRevenue: number
  revenueByMonth: TimeSeriesPoint[]
  revenueBySource: PercentageBreakdown[]
  topPayingOrgs: RankedItem[]
}

export interface RevenueTrend {
  months: TimeSeriesPoint[]
  growthRate: number
  projectedNextMonth: number
}

export interface CollectionEfficiency {
  totalInvoiced: number
  totalCollected: number
  collectionRate: number
  averageDaysToPayment: number
  overdueAmount: number
  overdueCount: number
  byMonth: TimeSeriesPoint[]
}

export interface ProfitAnalysis {
  totalRevenue: number
  totalExpenses: number
  grossProfit: number
  netProfit: number
  grossMargin: number
  netMargin: number
  expensesByCategory: PercentageBreakdown[]
  trend: TimeSeriesPoint[]
}

export interface CashFlowForecast {
  months: TimeSeriesPoint[]
  currentBalance: number
  projectedBalanceEnd: number
  burnRate: number
  runwayMonths: number
}

// ──────────────────────────────────────────────────────────────
// Academic Analytics
// ──────────────────────────────────────────────────────────────

export interface AcademicAnalytics {
  avgGPA: number
  passRate: number
  failRate: number
  examCompletionRate: number
  avgScore: number
  scoreDistribution: ScoreBucket[]
  topPerformingStudents: RankedItem[]
  subjectsPerformance: SubjectPerformance[]
  classComparison: ClassComparison[]
}

export interface SubjectPerformance {
  subjectId: string
  subjectName: string
  avgScore: number
  passRate: number
  failRate: number
  totalStudents: number
  trend: TimeSeriesPoint[]
}

export interface ClassComparison {
  classId: string
  className: string
  avgScore: number
  passRate: number
  studentCount: number
  topScore: number
  bottomScore: number
}

export interface PassFailAnalysis {
  totalExams: number
  totalStudents: number
  passCount: number
  failCount: number
  passRate: number
  failRate: number
  bySubject: { subject: string; passRate: number; failRate: number }[]
  byClass: { className: string; passRate: number; failRate: number }[]
}

// ──────────────────────────────────────────────────────────────
// Government Analytics
// ──────────────────────────────────────────────────────────────

export interface GovernmentAnalytics {
  totalSchools: number
  totalStudents: number
  totalTeachers: number
  avgPerformance: number
  complianceRate: number
  districtsPerformance: DistrictPerformance[]
  regionalTrends: TimeSeriesPoint[]
  fundingEfficiency: FundingEfficiency
}

export interface DistrictPerformance {
  districtId: string
  districtName: string
  totalSchools: number
  totalStudents: number
  avgPerformance: number
  complianceRate: number
  passRate: number
  teacherStudentRatio: number
}

export interface FundingEfficiency {
  totalFunding: number
  fundingPerStudent: number
  performancePerDollar: number
  byDistrict: { district: string; funding: number; performance: number; efficiency: number }[]
}

export interface SchoolRanking {
  schoolId: string
  schoolName: string
  districtName: string
  rank: number
  score: number
  studentCount: number
  teacherCount: number
  avgPerformance: number
}

export interface ComplianceOverview {
  overallRate: number
  totalSchools: number
  compliantSchools: number
  nonCompliantSchools: number
  byCategory: { category: string; compliant: number; nonCompliant: number }[]
  criticalViolations: { schoolId: string; schoolName: string; violations: string[] }[]
}

// ──────────────────────────────────────────────────────────────
// Institution Analytics
// ──────────────────────────────────────────────────────────────

export interface InstitutionAnalytics {
  enrollment: number
  retention: number
  attendance: number
  academicPerformance: number
  financialHealth: number
  teacherEffectiveness: number
  parentEngagement: number
  aiAdoption: number
}

// ──────────────────────────────────────────────────────────────
// AI Analytics
// ──────────────────────────────────────────────────────────────

export interface AIAnalytics {
  totalGenerations: number
  totalTokens: number
  totalCost: number
  byProvider: PercentageBreakdown[]
  byModel: PercentageBreakdown[]
  avgLatency: number
  errorRate: number
  topUseCases: LabeledValue[]
  creditUtilization: CreditUtilization
}

export interface CreditUtilization {
  totalCredits: number
  usedCredits: number
  remainingCredits: number
  utilizationPercent: number
  resetDate: string
}

export interface AIProviderUsage {
  provider: string
  generations: number
  tokens: number
  cost: number
  avgLatency: number
  errorRate: number
}

export interface AICostAnalysis {
  totalCost: number
  byProvider: AIProviderUsage[]
  byModel: { model: string; cost: number; generations: number }[]
  byUseCase: { useCase: string; cost: number; generations: number }[]
  trend: TimeSeriesPoint[]
}

export interface AIErrorRate {
  totalRequests: number
  totalErrors: number
  errorRate: number
  byProvider: { provider: string; errorRate: number; errorCount: number }[]
  byErrorType: { type: string; count: number; percentage: number }[]
  trend: TimeSeriesPoint[]
}

// ──────────────────────────────────────────────────────────────
// Risk Analytics
// ──────────────────────────────────────────────────────────────

export interface RiskAnalytics {
  atRiskStudents: AtRiskStudent[]
  dropoutPredictions: DropoutPrediction[]
  financialRisks: FinancialRisk[]
  complianceRisks: ComplianceRisk[]
  operationalRisks: OperationalRisk[]
  riskTrends: TimeSeriesPoint[]
  overallRiskScore: number
}

export interface AtRiskStudent {
  studentId: string
  studentName: string
  className: string
  riskScore: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  factors: string[]
  predictedOutcome: string
  recommendedInterventions: string[]
}

export interface DropoutPrediction {
  studentId: string
  studentName: string
  dropoutProbability: number
  confidence: number
  keyFactors: string[]
  timeHorizon: string
}

export interface FinancialRisk {
  id: string
  type: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  impact: number
  probability: number
  mitigationStrategy: string
}

export interface ComplianceRisk {
  id: string
  regulation: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  currentStatus: string
  deadline: string | null
  affectedEntities: string[]
}

export interface OperationalRisk {
  id: string
  category: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  impact: number
  likelihood: number
  mitigationPlan: string
}

// ──────────────────────────────────────────────────────────────
// Enrollment Analytics
// ──────────────────────────────────────────────────────────────

export interface EnrollmentAnalytics {
  currentEnrollment: number
  newEnrollments: number
  withdrawals: number
  retentionRate: number
  projectionsByGrade: EnrollmentProjection[]
  projectionsByDepartment: EnrollmentProjection[]
}

export interface EnrollmentProjection {
  label: string
  current: number
  projected: number
  change: number
  changePercent: number
}

export interface EnrollmentTrend {
  months: TimeSeriesPoint[]
  growthRate: number
  seasonalPatterns: { month: string; avgEnrollment: number }[]
}

export interface RetentionData {
  overallRate: number
  byGrade: { grade: string; retained: number; total: number; rate: number }[]
  byDepartment: { department: string; retained: number; total: number; rate: number }[]
  trend: TimeSeriesPoint[]
}

export interface DemographicBreakdown {
  byGender: PercentageBreakdown[]
  byAgeGroup: PercentageBreakdown[]
  byGrade: PercentageBreakdown[]
  byDepartment: PercentageBreakdown[]
  byLocation: PercentageBreakdown[]
}

export interface WithdrawalAnalysis {
  totalWithdrawals: number
  withdrawalRate: number
  byReason: PercentageBreakdown[]
  byGrade: PercentageBreakdown[]
  byMonth: TimeSeriesPoint[]
  avgTimeToWithdrawal: number
}

// ──────────────────────────────────────────────────────────────
// Teacher Analytics
// ──────────────────────────────────────────────────────────────

export interface TeacherAnalytics {
  teacherCount: number
  avgClassSize: number
  assessmentCreated: number
  avgStudentPerformance: number
  workload: TeacherWorkload[]
  professionalDevelopment: ProfessionalDevelopment
}

export interface TeacherWorkload {
  teacherId: string
  teacherName: string
  classCount: number
  studentCount: number
  assessmentsCreated: number
  avgGradingTime: number
  workloadScore: number
}

export interface ProfessionalDevelopment {
  totalHours: number
  avgHoursPerTeacher: number
  completionRate: number
  byCategory: PercentageBreakdown[]
  upcoming: { title: string; date: string; participants: number }[]
}

// ──────────────────────────────────────────────────────────────
// Student Analytics
// ──────────────────────────────────────────────────────────────

export interface StudentAnalytics {
  totalStudents: number
  avgPerformance: number
  attendanceRate: number
  engagementScore: number
  weakSubjects: WeakSubject[]
  improvementTrends: TimeSeriesPoint[]
}

export interface WeakSubject {
  subjectId: string
  subjectName: string
  avgScore: number
  studentsBelowThreshold: number
  totalStudents: number
  belowThresholdPercent: number
}

// ──────────────────────────────────────────────────────────────
// Drilldown
// ──────────────────────────────────────────────────────────────

export interface DrilldownResult {
  parentMetric: string
  childMetric: string
  data: DrilldownRow[]
  filters: Record<string, unknown>
  totalRecords: number
}

export interface DrilldownRow {
  dimension: string
  dimensionId: string
  value: number
  percentage: number
  metadata?: Record<string, unknown>
  children?: DrilldownRow[]
}

export interface DrilldownDimension {
  key: string
  label: string
  childDimensions?: DrilldownDimension[]
}

export interface PeriodComparison {
  metric: string
  period1: { label: string; value: number }
  period2: { label: string; value: number }
  change: number
  changePercent: number
  trend: 'up' | 'down' | 'flat'
}

// ──────────────────────────────────────────────────────────────
// Natural Language Query
// ──────────────────────────────────────────────────────────────

export interface NaturalLanguageQuery {
  query: string
  parsedFilters: ParsedQueryFilters
  result: QueryResult
}

export interface ParsedQueryFilters {
  metrics: string[]
  dimensions: string[]
  filters: QueryFilter[]
  timePeriod?: AnalyticsTimePeriod
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  limit?: number
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max'
}

export interface QueryFilter {
  field: string
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains'
  value: unknown
}

export interface QueryResult {
  columns: string[]
  rows: Record<string, unknown>[]
  totalRows: number
  summary?: Record<string, number>
}

export interface SuggestedQuery {
  query: string
  description: string
  category: string
}

// ──────────────────────────────────────────────────────────────
// Scheduled Reports
// ──────────────────────────────────────────────────────────────

export type ReportSchedule = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'custom'

export type ReportType =
  | 'financial'
  | 'academic'
  | 'enrollment'
  | 'risk'
  | 'ai_usage'
  | 'government'
  | 'teacher'
  | 'student'
  | 'institution'
  | 'custom'

export interface ScheduledReport {
  id: string
  orgId: string
  name: string
  type: ReportType
  schedule: ReportSchedule
  customCron?: string | null
  recipients: ReportRecipient[]
  filters: Record<string, unknown>
  format: 'pdf' | 'xlsx' | 'csv' | 'json'
  lastRunAt: string | null
  nextRunAt: string | null
  enabled: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface ReportRecipient {
  email: string
  name?: string | null
}

export interface CreateScheduledReportInput {
  orgId: string
  name: string
  type: ReportType
  schedule: ReportSchedule
  customCron?: string | null
  recipients: ReportRecipient[]
  filters: Record<string, unknown>
  format: 'pdf' | 'xlsx' | 'csv' | 'json'
  createdBy: string
}

export interface UpdateScheduledReportInput {
  name?: string
  type?: ReportType
  schedule?: ReportSchedule
  customCron?: string | null
  recipients?: ReportRecipient[]
  filters?: Record<string, unknown>
  format?: 'pdf' | 'xlsx' | 'csv' | 'json'
  enabled?: boolean
}

export interface ReportExecution {
  id: string
  reportId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  startedAt: string
  completedAt: string | null
  durationMs: number | null
  outputUrl: string | null
  error: string | null
  recipientCount: number
}

// ──────────────────────────────────────────────────────────────
// Analytics Dashboard
// ──────────────────────────────────────────────────────────────

export type DashboardType =
  | 'financial'
  | 'academic'
  | 'government'
  | 'institution'
  | 'ai'
  | 'risk'
  | 'enrollment'
  | 'teacher'
  | 'student'
  | 'predictive'
  | 'executive'
  | 'custom'

export interface AnalyticsDashboard {
  id: string
  orgId: string
  name: string
  type: DashboardType
  widgets: DashboardWidget[]
  filters: Record<string, unknown>
  layout: DashboardLayout
  isDefault: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface DashboardWidget {
  id: string
  type: 'kpi' | 'chart' | 'table' | 'gauge' | 'heatmap' | 'funnel' | 'text' | 'nlq'
  title: string
  metric: string
  dimensions?: string[]
  chartType?: 'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'radar' | 'treemap'
  position: { x: number; y: number; w: number; h: number }
  config?: Record<string, unknown>
}

export interface DashboardLayout {
  columns: number
  rowHeight: number
  gap: number
}

// ──────────────────────────────────────────────────────────────
// Predictive Analytics
// ──────────────────────────────────────────────────────────────

export interface PredictiveInsight {
  id: string
  type: 'enrollment' | 'performance' | 'revenue' | 'attrition' | 'risk'
  title: string
  description: string
  confidence: number
  prediction: unknown
  timeHorizon: string
  generatedAt: string
  factors: string[]
}

// ──────────────────────────────────────────────────────────────
// Helper: Resolve Time Period to Dates
// ──────────────────────────────────────────────────────────────

export function resolveTimePeriod(
  period: AnalyticsTimePeriod,
  custom?: CustomTimePeriod
): TimePeriodRange {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  let startDate: Date
  let endDate: Date = new Date(today.getTime() + 86400000 - 1)

  switch (period) {
    case 'today':
      startDate = today
      break
    case 'yesterday':
      startDate = new Date(today.getTime() - 86400000)
      endDate = new Date(today.getTime() - 1)
      break
    case 'last_7_days':
      startDate = new Date(today.getTime() - 7 * 86400000)
      break
    case 'last_30_days':
      startDate = new Date(today.getTime() - 30 * 86400000)
      break
    case 'last_90_days':
      startDate = new Date(today.getTime() - 90 * 86400000)
      break
    case 'this_month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case 'last_month':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
      break
    case 'this_quarter':
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3
      startDate = new Date(now.getFullYear(), quarterMonth, 1)
      break
    case 'this_year':
      startDate = new Date(now.getFullYear(), 0, 1)
      break
    case 'custom':
      if (custom) {
        startDate = new Date(custom.startDate)
        endDate = new Date(custom.endDate)
      } else {
        startDate = new Date(today.getTime() - 30 * 86400000)
      }
      break
    default:
      startDate = new Date(today.getTime() - 30 * 86400000)
  }

  return {
    period,
    custom,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  }
}
