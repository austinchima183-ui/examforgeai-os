// ============================================================================
// ExamForge AI — CBT Integrity Module
// ============================================================================
// Barrel export for all CBT integrity submodules.
// ============================================================================

export {
  getServerTime,
  createExamSession,
  validateExamAccess,
  startExam,
  saveAnswer,
  submitExam,
  forceSubmitOnExpiry,
  handleReconnect,
  detectTamper,
  getServerExamTime,
} from './server-authority'

export type {
  ExamTimeState,
  CreateSessionResult,
  ExamQuestionForClient,
  SaveAnswerResult,
  SubmitExamResult,
  ValidationResult,
  ReconnectState,
  TamperCheckResult,
} from './server-authority'

export {
  checkTimeDrift,
  checkDuplicateSubmission,
  checkMultipleTabs,
  checkModifiedExamId,
  checkModifiedStudentId,
  recordTamperEvent,
  getTamperEvents,
  getSessionTamperScore,
} from './tamper-detection'

export type {
  TimeDriftResult,
  DuplicateCheckResult,
  MultipleTabsCheckResult,
  IdModificationCheckResult,
} from './tamper-detection'

export {
  queueAnswerForSync,
  syncQueuedAnswers,
  handleOfflineReconnect,
  getPendingSyncCount,
  queueSessionSubmission,
  cleanupSyncQueue,
} from './offline-sync'

export type {
  QueueResult,
  SyncResult,
  OfflineReconnectResult,
  ConflictResolution,
} from './offline-sync'
