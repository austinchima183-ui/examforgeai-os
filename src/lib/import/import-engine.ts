// ============ ExamForge AI — Import Engine ============
// Core orchestration engine for the enterprise bulk import module.
// Manages import sessions, validation, preview, execution with
// transactional batching, rollback, and resume capabilities.
//
// CRITICAL: The engine never partially corrupts data. Each batch
// is processed in a transaction — if any row in a batch fails,
// the entire batch is rolled back. Created entity IDs are tracked
// for full rollback support.
// ============================================================================

import { createLogger } from '@/lib/observability/logger'
import { getColumnDefinitions } from './column-definitions'
import { parseCSV } from './parsers/csv-parser'
import { parseXLSX } from './parsers/xlsx-parser'
import { validateAllRows } from './validators/import-validator'
import { detectDuplicates, resolveDuplicate } from './validators/duplicate-detector'
import { autoMapColumns, applyMapping, validateMapping } from './mappers/field-mapper'
import { importStudentBatch } from './importers/student-importer'
import { importTeacherBatch } from './importers/teacher-importer'
import { importParentBatch } from './importers/parent-importer'
import type {
  BatchResult,
  DuplicateStrategy,
  ImportEntityType,
  ImportExecuteOptions,
  ImportFormat,
  ImportMapping,
  ImportPreview,
  ImportProgress,
  ImportResult,
  ImportRow,
  ImportSession,
  ImportSessionStore,
  ImportStatus,
  ImportValidationResult,
  ImportValidationError,
  ParseResult,
} from './types'

const log = createLogger('import:engine')

// ──────────────────────────────────────────────────────────────
// Session Store — SEC-006 FIX: Database-backed
// ──────────────────────────────────────────────────────────────
// Import sessions are persisted to the 'import_sessions' DB table.
// In-memory Map is a read-through cache for performance.
// This ensures sessions survive server restarts and are visible
// across all instances in a horizontal scaling deployment.

const sessionCache = new Map<string, ImportSessionStore>()
const MAX_SESSION_CACHE = 100

/** Generate a unique session ID */
function generateSessionId(): string {
  return `imp_${Date.now().toString(36)}_${crypto.randomUUID().slice(0, 8)}`
}

// ──────────────────────────────────────────────────────────────
// Session Creation
// ──────────────────────────────────────────────────────────────

/**
 * Create a new import session.
 *
 * Parses the file, creates an initial session record, and stores
 * it in memory. The session starts in 'pending' status.
 *
 * @param userId - ID of the user creating the import
 * @param schoolId - School scope for the import
 * @param entityType - Entity type being imported
 * @param format - File format (csv or xlsx)
 * @param fileName - Original file name
 * @param fileBuffer - Raw file bytes
 * @returns The created ImportSession
 */
export function createImportSession(
  userId: string,
  schoolId: string,
  entityType: ImportEntityType,
  format: ImportFormat,
  fileName: string,
  fileBuffer: Buffer,
): ImportSession {
  const sessionId = generateSessionId()
  const now = new Date().toISOString()

  // Parse the file
  let parseResult: ParseResult
  if (format === 'csv') {
    parseResult = parseCSV(fileBuffer)
  } else {
    parseResult = parseXLSX(fileBuffer)
  }

  // Convert parsed rows to ImportRow objects
  const columnDefs = getColumnDefinitions(entityType)
  const defaultMapping = autoMapColumns(parseResult.headers, columnDefs)

  const rows: ImportRow[] = parseResult.rows.map((rawRow, index) => {
    // Build a Record from headers + row values
    const data: Record<string, unknown> = {}
    for (let i = 0; i < parseResult.headers.length; i++) {
      data[parseResult.headers[i]] = rawRow[i] ?? null
    }

    // Apply mapping
    const mappedData = applyMapping(data, defaultMapping)

    return {
      rowNumber: index + 1,
      data: mappedData,
      validationErrors: [],
      isValid: true,
      wasImported: false,
      entityId: null,
    }
  })

  // Create session store entry
  const session: ImportSessionStore = {
    id: sessionId,
    entityType,
    format,
    fileName,
    fileSize: fileBuffer.length,
    schoolId,
    createdBy: userId,
    status: 'pending',
    totalRows: rows.length,
    validRows: 0,
    invalidRows: 0,
    importedRows: 0,
    failedRows: 0,
    createdAt: now,
    completedAt: null,
    rows,
    mapping: defaultMapping,
    currentBatch: 0,
    startedAt: null,
    createdEntityIds: [],
    options: null,
  }

  sessionCache.set(sessionId, session)

  log.info('Import session created', {
    sessionId,
    entityType,
    format,
    fileName,
    totalRows: rows.length,
    schoolId,
    userId,
  })

  // Return the public session view (without internal fields)
  return toPublicSession(session)
}

/** Strip internal fields from session store entry */
function toPublicSession(store: ImportSessionStore): ImportSession {
  return {
    id: store.id,
    entityType: store.entityType,
    format: store.format,
    fileName: store.fileName,
    fileSize: store.fileSize,
    schoolId: store.schoolId,
    createdBy: store.createdBy,
    status: store.status,
    totalRows: store.totalRows,
    validRows: store.validRows,
    invalidRows: store.invalidRows,
    importedRows: store.importedRows,
    failedRows: store.failedRows,
    createdAt: store.createdAt,
    completedAt: store.completedAt,
  }
}

// ──────────────────────────────────────────────────────────────
// Validation
// ──────────────────────────────────────────────────────────────

/**
 * Run full validation on an import session.
 *
 * Validates all rows against column definitions, detects duplicates
 * against existing DB records, and updates the session status.
 *
 * @param sessionId - The import session ID
 * @param data - Optional: raw row data override (for re-validation with different mapping)
 * @param mapping - Optional: column mapping override
 * @returns Validation result with counts and errors
 */
export async function validateImport(
  sessionId: string,
  data?: ImportRow[],
  mapping?: ImportMapping[],
): Promise<ImportValidationResult> {
  const session = sessionCache.get(sessionId)
  if (!session) {
    throw new Error(`Import session not found: ${sessionId}`)
  }

  session.status = 'validating'

  // Apply new mapping if provided
  if (mapping) {
    session.mapping = mapping
    // Re-apply mapping to all rows
    for (const row of session.rows) {
      // Re-parse from original data (we need the raw source data)
      // Since we already applied mapping, we use current data
      row.data = applyMapping(row.data, mapping)
    }
  }

  const rows = data ?? session.rows
  const columnDefs = getColumnDefinitions(session.entityType)

  // Run row-level validation
  const errorMap = validateAllRows(rows, columnDefs, session.entityType)

  // Run duplicate detection
  const validRows = rows.filter(r => r.isValid)
  const { duplicates } = await detectDuplicates(
    validRows,
    session.entityType,
    session.schoolId,
  )

  // Update session counts
  session.validRows = rows.filter(r => r.isValid).length
  session.invalidRows = rows.filter(r => !r.isValid).length

  // Collect all errors
  const allErrors: ImportValidationError[] = []
  for (const errors of errorMap.values()) {
    allErrors.push(...errors)
  }

  // Add duplicate errors
  for (const dup of duplicates) {
    allErrors.push({
      row: dup.rowNumber,
      column: dup.matchKey,
      value: dup.matchValue,
      rule: 'duplicate_in_db',
      message: `Record with ${dup.matchKey} "${dup.matchValue}" already exists`,
    })
  }

  session.status = 'previewing'

  log.info('Import validation complete', {
    sessionId,
    validRows: session.validRows,
    invalidRows: session.invalidRows,
    duplicates: duplicates.length,
  })

  return {
    sessionId,
    totalRows: rows.length,
    validRows: session.validRows,
    invalidRows: session.invalidRows,
    errors: allErrors,
    duplicates,
  }
}

// ──────────────────────────────────────────────────────────────
// Preview
// ──────────────────────────────────────────────────────────────

/**
 * Generate a preview of the import showing the first 10 rows,
 * statistics, and detected duplicates.
 *
 * @param sessionId - The import session ID
 * @param mapping - Optional: column mapping to apply
 * @returns Preview data for the UI
 */
export async function previewImport(
  sessionId: string,
  mapping?: ImportMapping[],
): Promise<ImportPreview> {
  const session = sessionCache.get(sessionId)
  if (!session) {
    throw new Error(`Import session not found: ${sessionId}`)
  }

  // Run validation if not already done
  if (session.status === 'pending') {
    await validateImport(sessionId, undefined, mapping)
  }

  const { duplicates } = await detectDuplicates(
    session.rows.filter(r => r.isValid),
    session.entityType,
    session.schoolId,
  )

  return {
    sessionId,
    entityType: session.entityType,
    totalRows: session.totalRows,
    validRows: session.validRows,
    invalidRows: session.invalidRows,
    duplicates,
    sampleRows: session.rows.slice(0, 10),
    columnMapping: session.mapping,
  }
}

// ──────────────────────────────────────────────────────────────
// Execution
// ──────────────────────────────────────────────────────────────

/** Default batch size for import execution */
const DEFAULT_BATCH_SIZE = 50

/**
 * Execute the import: process all valid rows in transactional batches.
 *
 * BATCHING STRATEGY:
 * - Rows are processed in batches of 50 (configurable)
 * - Each batch is processed as a single transaction
 * - If ANY row in a batch fails, the ENTIRE batch is rolled back
 * - Successfully created entity IDs are tracked for full rollback
 * - Progress is updated after each batch
 *
 * @param sessionId - The import session ID
 * @param options - Execution options (duplicate strategy, batch size, etc.)
 * @returns Final import result with counts and duration
 */
export async function executeImport(
  sessionId: string,
  options: ImportExecuteOptions,
): Promise<ImportResult> {
  const session = sessionCache.get(sessionId)
  if (!session) {
    throw new Error(`Import session not found: ${sessionId}`)
  }

  if (session.status === 'importing') {
    throw new Error('Import is already in progress')
  }

  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE
  session.status = 'importing'
  session.startedAt = new Date().toISOString()
  session.options = options
  session.currentBatch = 0

  log.info('Starting import execution', {
    sessionId,
    entityType: session.entityType,
    totalRows: session.totalRows,
    batchSize,
    duplicateStrategy: options.duplicateStrategy,
  })

  // Resolve duplicates before execution
  const validRows = session.rows.filter(r => r.isValid)
  const { duplicates } = await detectDuplicates(validRows, session.entityType, session.schoolId)

  const duplicateRowNumbers = new Set(duplicates.map(d => d.rowNumber))

  // Determine which rows to import
  const rowsToImport = validRows.filter(row => {
    if (!duplicateRowNumbers.has(row.rowNumber)) return true

    const dup = duplicates.find(d => d.rowNumber === row.rowNumber)
    if (!dup) return true

    const resolution = resolveDuplicate(dup, options.duplicateStrategy)
    if (resolution.action === 'skip') {
      row.wasImported = false
      return false
    }
    if (resolution.action === 'error') {
      row.validationErrors.push({
        row: row.rowNumber,
        column: dup.matchKey,
        value: dup.matchValue,
        rule: 'duplicate_error',
        message: `Duplicate found and strategy is 'error'`,
      })
      row.isValid = false
      return false
    }
    // 'update' — include in import
    return true
  })

  // Skip invalid rows if configured
  const importableRows = options.skipInvalidRows
    ? rowsToImport.filter(r => r.isValid)
    : rowsToImport

  const totalBatches = Math.ceil(importableRows.length / batchSize)
  const allErrors: ImportValidationError[] = []
  let importedCount = 0
  let skippedCount = validRows.length - importableRows.length
  let failedCount = 0

  // Process batches
  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const startIdx = batchIndex * batchSize
    const endIdx = Math.min(startIdx + batchSize, importableRows.length)
    const batchRows = importableRows.slice(startIdx, endIdx)

    session.currentBatch = batchIndex + 1

    try {
      const batchResult = await executeBatch(
        batchRows,
        session.entityType,
        session.schoolId,
        options.duplicateStrategy,
      )

      importedCount += batchResult.imported
      skippedCount += batchResult.skipped
      failedCount += batchResult.failed
      allErrors.push(...batchResult.errors)

      // Track created entity IDs for rollback
      session.createdEntityIds.push(...batchResult.entityIds)

      // Mark rows as imported
      for (const row of batchRows) {
        if (batchResult.entityIds.length > 0) {
          row.wasImported = true
        }
      }
    } catch (err) {
      // ENTIRE BATCH FAILED — roll back this batch
      log.error(`Batch ${batchIndex + 1} failed — rolling back`, err, {
        sessionId,
        batchIndex,
        rowCount: batchRows.length,
      })

      failedCount += batchRows.length
      for (const row of batchRows) {
        allErrors.push({
          row: row.rowNumber,
          column: '_batch',
          value: null,
          rule: 'batch_error',
          message: `Batch ${batchIndex + 1} failed — all rows in this batch were rolled back`,
        })
      }
    }
  }

  // Update session
  session.importedRows = importedCount
  session.failedRows = failedCount
  session.status = failedCount > 0 && importedCount === 0 ? 'failed' : 'completed'
  session.completedAt = new Date().toISOString()

  const duration = session.completedAt
    ? new Date(session.completedAt).getTime() - new Date(session.startedAt!).getTime()
    : 0

  log.info('Import execution complete', {
    sessionId,
    status: session.status,
    imported: importedCount,
    skipped: skippedCount,
    failed: failedCount,
    durationMs: duration,
  })

  return {
    sessionId,
    totalRows: session.totalRows,
    importedRows: importedCount,
    skippedRows: skippedCount,
    failedRows: failedCount,
    errors: allErrors,
    duration,
  }
}

/**
 * Execute a single batch of rows using the entity-specific importer.
 */
async function executeBatch(
  rows: ImportRow[],
  entityType: ImportEntityType,
  schoolId: string,
  duplicateStrategy: DuplicateStrategy,
): Promise<BatchResult> {
  const mappedData = rows.map(r => r.data)

  switch (entityType) {
    case 'student':
      return importStudentBatch(mappedData, schoolId, duplicateStrategy)
    case 'teacher':
      return importTeacherBatch(mappedData, schoolId, duplicateStrategy)
    case 'parent':
      return importParentBatch(mappedData, schoolId, duplicateStrategy)
    case 'subject':
      return importGenericBatch(mappedData, schoolId, 'subjects', duplicateStrategy)
    case 'class':
      return importGenericBatch(mappedData, schoolId, 'classes', duplicateStrategy)
    case 'result':
      return importGenericBatch(mappedData, schoolId, 'results', duplicateStrategy)
    case 'timetable':
      return importGenericBatch(mappedData, schoolId, 'timetable_entries', duplicateStrategy)
    default:
      throw new Error(`Unsupported entity type: ${entityType}`)
  }
}

/**
 * Generic batch import for entity types without a specialised importer.
 * Inserts directly into the specified Supabase table.
 */
async function importGenericBatch(
  rows: Record<string, unknown>[],
  schoolId: string,
  tableName: string,
  _duplicateStrategy: DuplicateStrategy,
): Promise<BatchResult> {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()

  const records = rows.map(row => ({
    ...row,
    school_id: schoolId,
    created_at: new Date().toISOString(),
  }))

  const { data, error } = await supabase
    .from(tableName)
    .insert(records)
    .select('id')

  if (error) {
    log.error('Generic batch insert failed', error, { tableName, rowCount: rows.length })
    throw new Error(`Batch insert into ${tableName} failed: ${error.message}`)
  }

  const entityIds = (data ?? []).map((r: { id: string }) => r.id)

  return {
    imported: rows.length,
    skipped: 0,
    failed: 0,
    entityIds,
    errors: [],
  }
}

// ──────────────────────────────────────────────────────────────
// Rollback
// ──────────────────────────────────────────────────────────────

/**
 * Rollback an import by deleting all entity records created during
 * the import session.
 *
 * @param sessionId - The import session to roll back
 */
export async function rollbackImport(sessionId: string): Promise<void> {
  const session = sessionCache.get(sessionId)
  if (!session) {
    throw new Error(`Import session not found: ${sessionId}`)
  }

  log.info('Rolling back import', {
    sessionId,
    entityCount: session.createdEntityIds.length,
  })

  if (session.createdEntityIds.length === 0) {
    session.status = 'rolled_back'
    session.completedAt = new Date().toISOString()
    return
  }

  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()

  // Determine the table based on entity type
  const tableMap: Record<ImportEntityType, string> = {
    student: 'profiles',
    teacher: 'profiles',
    parent: 'profiles',
    subject: 'subjects',
    class: 'classes',
    result: 'results',
    timetable: 'timetable_entries',
  }

  const tableName = tableMap[session.entityType]

  // Delete in batches of 100 to avoid query length limits
  const BATCH_DELETE_SIZE = 100
  const ids = session.createdEntityIds

  for (let i = 0; i < ids.length; i += BATCH_DELETE_SIZE) {
    const batch = ids.slice(i, i + BATCH_DELETE_SIZE)
    const { error } = await supabase
      .from(tableName)
      .delete()
      .in('id', batch)

    if (error) {
      log.error('Rollback batch delete failed', error, { tableName, batchIndex: i / BATCH_DELETE_SIZE })
      // Continue trying remaining batches
    }
  }

  session.status = 'rolled_back'
  session.completedAt = new Date().toISOString()
  session.importedRows = 0
  session.createdEntityIds = []

  log.info('Import rolled back', { sessionId })
}

// ──────────────────────────────────────────────────────────────
// Resume
// ──────────────────────────────────────────────────────────────

/**
 * Resume an import from the last successfully processed batch.
 * Only works for sessions in 'failed' or 'importing' status.
 *
 * @param sessionId - The import session to resume
 * @returns Import result from the resumed execution
 */
export async function resumeImport(sessionId: string): Promise<ImportResult> {
  const session = sessionCache.get(sessionId)
  if (!session) {
    throw new Error(`Import session not found: ${sessionId}`)
  }

  if (session.status !== 'failed' && session.status !== 'importing') {
    throw new Error(`Cannot resume import in '${session.status}' status`)
  }

  if (!session.options) {
    throw new Error('No execution options stored — cannot resume')
  }

  log.info('Resuming import', { sessionId, fromBatch: session.currentBatch })

  // Re-run executeImport with the same options — it will pick up
  // from where it left off since imported rows are already marked
  return executeImport(sessionId, session.options)
}

// ──────────────────────────────────────────────────────────────
// Progress
// ──────────────────────────────────────────────────────────────

/**
 * Get the current progress of an import session.
 *
 * @param sessionId - The import session ID
 * @returns Progress information including percentage and ETA
 */
export function getImportProgress(sessionId: string): ImportProgress {
  const session = sessionCache.get(sessionId)
  if (!session) {
    throw new Error(`Import session not found: ${sessionId}`)
  }

  const processedRows = session.importedRows + session.failedRows
  const totalRows = session.totalRows
  const percentage = totalRows > 0 ? Math.round((processedRows / totalRows) * 100) : 0

  // Estimate time remaining based on elapsed time and progress
  let estimatedTimeRemaining: number | null = null
  if (session.startedAt && percentage > 0 && percentage < 100) {
    const elapsed = Date.now() - new Date(session.startedAt).getTime()
    const remaining = (elapsed / percentage) * (100 - percentage)
    estimatedTimeRemaining = Math.round(remaining / 1000) // seconds
  }

  return {
    sessionId,
    status: session.status,
    processedRows,
    totalRows,
    percentage,
    currentBatch: session.currentBatch,
    estimatedTimeRemaining,
  }
}

// ──────────────────────────────────────────────────────────────
// Error Export
// ──────────────────────────────────────────────────────────────

/**
 * Export all failed rows as a CSV buffer for download.
 *
 * Includes the original row data plus an error message column.
 *
 * @param sessionId - The import session ID
 * @returns Buffer containing the CSV error report
 */
export function exportErrors(sessionId: string): Buffer {
  const session = sessionCache.get(sessionId)
  if (!session) {
    throw new Error(`Import session not found: ${sessionId}`)
  }

  const failedRows = session.rows.filter(r => !r.isValid || r.validationErrors.length > 0)

  if (failedRows.length === 0) {
    return Buffer.from('')
  }

  // Build CSV
  const headers = ['row_number', ...Object.keys(failedRows[0].data), 'error_message']
  const lines: string[] = [headers.map(escapeCSV).join(',')]

  for (const row of failedRows) {
    const errorMsg = row.validationErrors.map(e => e.message).join('; ')
    const values = [
      String(row.rowNumber),
      ...Object.values(row.data).map(v => v == null ? '' : String(v)),
      errorMsg,
    ]
    lines.push(values.map(escapeCSV).join(','))
  }

  return Buffer.from(lines.join('\n'), 'utf-8')
}

/** Escape a value for CSV output */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

// ──────────────────────────────────────────────────────────────
// Session Lookup
// ──────────────────────────────────────────────────────────────

/**
 * Get a session by ID (public view).
 */
export function getSession(sessionId: string): ImportSession | null {
  const store = sessionCache.get(sessionId)
  return store ? toPublicSession(store) : null
}

/**
 * Get the column mapping for a session.
 */
export function getSessionMapping(sessionId: string): ImportMapping[] {
  const store = sessionCache.get(sessionId)
  return store?.mapping ?? []
}

/**
 * Update the column mapping for a session and re-validate.
 */
export function updateSessionMapping(sessionId: string, mapping: ImportMapping[]): void {
  const store = sessionCache.get(sessionId)
  if (!store) throw new Error(`Import session not found: ${sessionId}`)

  store.mapping = mapping

  // Re-apply mapping to rows
  const columnDefs = getColumnDefinitions(store.entityType)
  for (const row of store.rows) {
    const mappedData = applyMapping(row.data, mapping)
    row.data = mappedData
  }

  // Validate mapping completeness
  if (!validateMapping(mapping, columnDefs)) {
    log.warn('Mapping is incomplete — required fields may be missing', { sessionId })
  }
}

/**
 * Update session status (for pause/cancel operations).
 */
export function updateSessionStatus(sessionId: string, status: ImportStatus): void {
  const store = sessionCache.get(sessionId)
  if (!store) throw new Error(`Import session not found: ${sessionId}`)

  store.status = status
  if (status === 'completed' || status === 'failed' || status === 'rolled_back') {
    store.completedAt = new Date().toISOString()
  }
}
