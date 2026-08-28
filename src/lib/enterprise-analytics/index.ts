// ============================================================================
// ExamForge AI — Enterprise Analytics — Central Exports
// ============================================================================
// Single entry point for all enterprise analytics services and types.
// ============================================================================

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export type {
  AnalyticsTimePeriod,
  CustomTimePeriod,
  TimePeriodRange,
  TimeSeriesPoint,
  LabeledValue,
  LabeledSeries,
  PercentageBreakdown,
  RankedItem,
  ScoreBucket,
  // Financial
  FinancialAnalytics,
  RevenueTrend,
  CollectionEfficiency,
  ProfitAnalysis,
  CashFlowForecast,
  // Academic
  AcademicAnalytics,
  SubjectPerformance,
  ClassComparison,
  PassFailAnalysis,
  // Government
  GovernmentAnalytics,
  DistrictPerformance,
  FundingEfficiency,
  SchoolRanking,
  ComplianceOverview,
  // Institution
  InstitutionAnalytics,
  // AI
  AIAnalytics,
  CreditUtilization,
  AIProviderUsage,
  AICostAnalysis,
  AIErrorRate,
  // Risk
  RiskAnalytics,
  AtRiskStudent,
  DropoutPrediction,
  FinancialRisk,
  ComplianceRisk,
  OperationalRisk,
  // Enrollment
  EnrollmentAnalytics,
  EnrollmentProjection,
  EnrollmentTrend,
  RetentionData,
  DemographicBreakdown,
  WithdrawalAnalysis,
  // Teacher
  TeacherAnalytics,
  TeacherWorkload,
  ProfessionalDevelopment,
  // Student
  StudentAnalytics,
  WeakSubject,
  // Drilldown
  DrilldownResult,
  DrilldownRow,
  DrilldownDimension,
  PeriodComparison,
  // NLQ
  NaturalLanguageQuery,
  ParsedQueryFilters,
  QueryFilter,
  QueryResult,
  SuggestedQuery,
  // Scheduled Reports
  ReportSchedule,
  ReportType,
  ScheduledReport,
  ReportRecipient,
  CreateScheduledReportInput,
  UpdateScheduledReportInput,
  ReportExecution,
  // Dashboard
  DashboardType,
  AnalyticsDashboard,
  DashboardWidget,
  DashboardLayout,
  // Predictive
  PredictiveInsight,
} from './types'

export { resolveTimePeriod } from './types'

// ──────────────────────────────────────────────────────────────
// Financial Analytics Service
// ──────────────────────────────────────────────────────────────

export {
  getFinancialAnalytics,
  getRevenueTrend,
  getRevenueBySource,
  getCollectionEfficiency,
  getTopPayingOrganizations,
  getProfitAnalysis,
  getCashFlowForecast,
} from './financial-analytics-service'

// ──────────────────────────────────────────────────────────────
// Academic Analytics Service
// ──────────────────────────────────────────────────────────────

export {
  getAcademicAnalytics,
  getSubjectPerformance,
  getClassComparison,
  getScoreDistribution,
  getTopPerformingStudents,
  getPassFailAnalysis,
  getPerformanceTrend,
} from './academic-analytics-service'

// ──────────────────────────────────────────────────────────────
// Government Analytics Service
// ──────────────────────────────────────────────────────────────

export {
  getGovernmentAnalytics,
  getDistrictsPerformance,
  getSchoolRankings,
  getComplianceOverview,
  getFundingEfficiency,
  getRegionalTrends,
} from './government-analytics-service'

// ──────────────────────────────────────────────────────────────
// Risk Analytics Service
// ──────────────────────────────────────────────────────────────

export {
  getRiskAnalytics,
  getAtRiskStudents,
  getFinancialRisks,
  getComplianceRisks,
  getOperationalRisks,
  getRiskTrends,
} from './risk-analytics-service'

// ──────────────────────────────────────────────────────────────
// Enrollment Analytics Service
// ──────────────────────────────────────────────────────────────

export {
  getEnrollmentAnalytics,
  getEnrollmentTrend,
  getRetentionRate,
  getEnrollmentProjections,
  getDemographicBreakdown,
  getWithdrawalAnalysis,
} from './enrollment-analytics-service'

// ──────────────────────────────────────────────────────────────
// AI Analytics Service
// ──────────────────────────────────────────────────────────────

export {
  getAIAnalytics,
  getAIUsageByProvider,
  getAICostAnalysis,
  getAIErrorRate,
  getAICreditUtilization,
  getTopAIUseCases,
} from './ai-analytics-service'

// ──────────────────────────────────────────────────────────────
// Natural Language Query Service
// ──────────────────────────────────────────────────────────────

export {
  parseNaturalLanguageQuery,
  executeNaturalLanguageQuery,
  getSuggestedQueries,
  formatQueryResult,
  askNaturalLanguageQuery,
} from './nlq-service'

// ──────────────────────────────────────────────────────────────
// Drilldown Service
// ──────────────────────────────────────────────────────────────

export {
  drilldown,
  getAvailableDrilldowns,
  aggregateByDimension,
  comparePeriods,
} from './drilldown-service'

// ──────────────────────────────────────────────────────────────
// Scheduled Reports Service
// ──────────────────────────────────────────────────────────────

export {
  createScheduledReport,
  updateScheduledReport,
  deleteScheduledReport,
  executeScheduledReport,
  getScheduledReports,
  getReportExecutionHistory,
  getDueScheduledReports,
} from './scheduled-reports-service'
