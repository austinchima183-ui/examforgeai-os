// ============================================================================
// ExamForge AI — Module Exports
// ============================================================================
// Central export point for all AI modules.
// Import from '@/lib/ai' to access any AI functionality.
// ============================================================================

export { executeAI, executeStructuredAI, streamAI, getSystemPrompt, getGenerationHistory, getGenerationStats, SYSTEM_PROMPTS } from './ai-engine'
export type { AIRequest, AIResponse, AIStreamChunk, StructuredAIResponse, GenerationHistoryFilters } from './ai-engine'

export {
  generateLessonPlan,
  generateQuestions,
  saveGeneratedQuestions,
  generateRubric,
  markAnswer,
  suggestInterventions,
  predictStrugglingStudents,
  generateWorksheet,
} from './ai-teacher'
export type {
  LessonPlanRequest, LessonPlanResponse,
  QuestionGenerationRequest, GeneratedQuestion,
  RubricRequest, RubricResponse,
  MarkingRequest, MarkingResponse,
  InterventionRequest, InterventionResponse,
  StudentRiskPrediction,
  WorksheetRequest,
} from './ai-teacher'

export {
  aiTutorChat,
  generateStudyPlan,
  revisionCoachPlan,
  generatePracticeQuestions,
  detectWeaknesses,
  explainConcept,
} from './ai-student'
export type {
  TutorSessionRequest, TutorSessionResponse,
  StudyPlanRequest, StudyPlanResponse,
  RevisionCoachRequest, RevisionCoachResponse,
  PracticeRequest,
  WeaknessDetectionRequest, WeaknessReport,
  ExplainRequest, ExplainResponse,
} from './ai-student'

export {
  getChildProgressAnalysis,
  generateWeeklySummary,
  getHomeLearningRecommendations,
} from './ai-parent'
export type {
  ChildProgressRequest, ChildProgressResponse,
  WeeklySummaryRequest, WeeklySummaryResponse,
  HomeLearningRequest, HomeLearningResponse,
} from './ai-parent'

export {
  getStaffingRecommendations,
  forecastEnrollment,
  forecastRevenue,
  detectSchoolRisks,
  predictAttendance as predictSchoolAttendance,
} from './ai-school-admin'
export type {
  StaffingRequest, StaffingResponse,
  EnrollmentForecastRequest, EnrollmentForecastResponse,
  RevenueForecastRequest, RevenueForecastResponse,
  RiskDetectionRequest, RiskDetectionResponse,
  AttendancePredictionRequest, AttendancePredictionResponse,
} from './ai-school-admin'

export {
  getDistrictIntelligence,
  compareSchools,
  checkCurriculumCompliance,
  analyzeNationalTrends,
} from './ai-government'
export type {
  DistrictIntelligenceRequest, DistrictIntelligenceResponse,
  SchoolComparisonRequest, SchoolComparisonResponse,
  CurriculumComplianceRequest, CurriculumComplianceResponse,
  NationalTrendRequest, NationalTrendResponse,
} from './ai-government'

export {
  runAgent,
  runDailyReportAgent,
  runWeeklyReportAgent,
  runReminderAgent,
  runInterventionAgent,
  getDefaultAgentConfigs,
} from './ai-agents'
export type { AgentConfig, AgentResult } from './ai-agents'

export {
  predictDropout,
  predictFailure,
  predictAttendance as predictStudentAttendance,
  predictRevenue,
} from './ai-predictive'
export type {
  DropoutPrediction,
  FailurePrediction,
  AttendancePrediction,
  RevenuePrediction,
} from './ai-predictive'
