// ============ ExamForge AI — Import Type System ============
// Complete type definitions for the enterprise bulk import module.
// Covers all entity types, session management, validation, mapping,
// progress tracking, and import results.
// ============================================================================

// ──────────────────────────────────────────────────────────────
// Entity & Format Types
// ──────────────────────────────────────────────────────────────

/** Supported entity types for bulk import */
export type ImportEntityType =
  | 'student'
  | 'teacher'
  | 'parent'
  | 'subject'
  | 'class'
  | 'result'
  | 'timetable'

/** Supported import file formats */
export type ImportFormat = 'csv' | 'xlsx'

/** Import session lifecycle states */
export type ImportStatus =
  | 'pending'
  | 'validating'
  | 'previewing'
  | 'importing'
  | 'completed'
  | 'failed'
  | 'rolled_back'

/** Strategy for handling duplicate records */
export type DuplicateStrategy = 'skip' | 'update' | 'error'

/** Column value types for validation */
export type ColumnValueType = 'string' | 'number' | 'date' | 'email' | 'enum'

// ──────────────────────────────────────────────────────────────
// Column Definition
// ──────────────────────────────────────────────────────────────

/** Validation rule attached to a column definition */
export interface ColumnValidation {
  /** Rule identifier (e.g. 'required', 'email', 'minLength') */
  rule: string
  /** Human-readable error message when validation fails */
  message: string
  /** Rule-specific parameter (e.g. min length value, enum values) */
  value?: unknown
}

/** Schema definition for a single importable column */
export interface ColumnDefinition {
  /** Normalised field name matching the DB column */
  name: string
  /** Human-readable label for UI display */
  label: string
  /** Whether the column must have a value in every row */
  required: boolean
  /** Expected value type for validation and coercion */
  type: ColumnValueType
  /** Validation rules to apply beyond type checking */
  validations: ColumnValidation[]
  /** Default value when the column is missing or empty */
  defaultValue?: unknown
}

// ──────────────────────────────────────────────────────────────
// Import Session
// ──────────────────────────────────────────────────────────────

/** Represents a single import job from upload to completion */
export interface ImportSession {
  id: string
  entityType: ImportEntityType
  format: ImportFormat
  fileName: string
  fileSize: number
  schoolId: string
  createdBy: string
  status: ImportStatus
  totalRows: number
  validRows: number
  invalidRows: number
  importedRows: number
  failedRows: number
  createdAt: string
  completedAt: string | null
}

// ──────────────────────────────────────────────────────────────
// Import Row
// ──────────────────────────────────────────────────────────────

/** A single row within an import session */
export interface ImportRow {
  /** 1-based row number from the source file */
  rowNumber: number
  /** Raw key-value data from the parsed file */
  data: Record<string, unknown>
  /** Validation errors for this row (empty if valid) */
  validationErrors: ImportValidationError[]
  /** Whether the row passed all validations */
  isValid: boolean
  /** Whether the row was successfully written to the DB */
  wasImported: boolean
  /** The DB entity ID created/updated by this row (null if not imported) */
  entityId: string | null
}

// ──────────────────────────────────────────────────────────────
// Import Mapping
// ──────────────────────────────────────────────────────────────

/** Maps a source file column to a target DB field */
export interface ImportMapping {
  /** Header name from the source file */
  sourceColumn: string
  /** Target field name matching a ColumnDefinition */
  targetField: string
  /** Optional transform applied before validation (e.g. trimming) */
  transform?: (_value: unknown) => unknown
}

// ──────────────────────────────────────────────────────────────
// Validation Error
// ──────────────────────────────────────────────────────────────

/** A single validation error on a specific cell */
export interface ImportValidationError {
  /** 1-based row number */
  row: number
  /** Column / field name where the error occurred */
  column: string
  /** The offending value */
  value: unknown
  /** Rule that was violated */
  rule: string
  /** Human-readable error message */
  message: string
}

// ──────────────────────────────────────────────────────────────
// Import Progress
// ──────────────────────────────────────────────────────────────

/** Real-time progress information for a running import */
export interface ImportProgress {
  sessionId: string
  status: ImportStatus
  processedRows: number
  totalRows: number
  percentage: number
  currentBatch: number
  estimatedTimeRemaining: number | null
}

// ──────────────────────────────────────────────────────────────
// Import Result
// ──────────────────────────────────────────────────────────────

/** Final summary returned after an import completes */
export interface ImportResult {
  sessionId: string
  totalRows: number
  importedRows: number
  skippedRows: number
  failedRows: number
  errors: ImportValidationError[]
  duration: number
}

// ──────────────────────────────────────────────────────────────
// Parse Result
// ──────────────────────────────────────────────────────────────

/** Result returned by the CSV/XLSX parsers */
export interface ParseResult {
  /** Column headers from the first row */
  headers: string[]
  /** Parsed rows as arrays of raw values */
  rows: unknown[][]
  /** Total row count (excluding header) */
  totalRows: number
  /** Any warnings encountered during parsing */
  warnings: string[]
}

// ──────────────────────────────────────────────────────────────
// Duplicate Detection
// ──────────────────────────────────────────────────────────────

/** A detected duplicate record */
export interface DuplicateRecord {
  /** Row number in the import file */
  rowNumber: number
  /** The import row data that matches an existing record */
  data: Record<string, unknown>
  /** DB ID of the existing record */
  existingId: string
  /** The field(s) that matched (e.g. 'email') */
  matchKey: string
  /** The matching value */
  matchValue: string
}

/** Result of duplicate detection across all rows */
export interface DuplicateResult {
  duplicates: DuplicateRecord[]
  uniqueRows: number[]
}

/** Resolution action for a single duplicate */
export interface ResolutionAction {
  /** What to do: skip, update the existing record, or raise an error */
  action: 'skip' | 'update' | 'error'
  /** The duplicate record being resolved */
  duplicate: DuplicateRecord
}

// ──────────────────────────────────────────────────────────────
// Batch Result (used by entity-specific importers)
// ──────────────────────────────────────────────────────────────

/** Result of importing a single batch of rows */
export interface BatchResult {
  /** Number of rows successfully inserted/updated */
  imported: number
  /** Number of rows skipped (duplicates with 'skip' strategy) */
  skipped: number
  /** Number of rows that failed */
  failed: number
  /** Entity IDs created/updated by this batch */
  entityIds: string[]
  /** Per-row errors for rows that failed in this batch */
  errors: ImportValidationError[]
}

// ──────────────────────────────────────────────────────────────
// Validation & Preview
// ──────────────────────────────────────────────────────────────

/** Full validation result for an import session */
export interface ImportValidationResult {
  sessionId: string
  totalRows: number
  validRows: number
  invalidRows: number
  errors: ImportValidationError[]
  duplicates: DuplicateRecord[]
}

/** Preview of an import before execution */
export interface ImportPreview {
  sessionId: string
  entityType: ImportEntityType
  totalRows: number
  validRows: number
  invalidRows: number
  duplicates: DuplicateRecord[]
  sampleRows: ImportRow[]
  columnMapping: ImportMapping[]
}

// ──────────────────────────────────────────────────────────────
// Import Execution Options
// ──────────────────────────────────────────────────────────────

/** Options controlling import execution behaviour */
export interface ImportExecuteOptions {
  /** How to handle duplicates */
  duplicateStrategy: DuplicateStrategy
  /** Whether to skip rows with validation errors */
  skipInvalidRows: boolean
  /** Number of rows per transaction batch (default: 50) */
  batchSize?: number
}

// ──────────────────────────────────────────────────────────────
// In-Memory Session Store
// ──────────────────────────────────────────────────────────────

/** Internal store entry combining session metadata and parsed data */
export interface ImportSessionStore extends ImportSession {
  /** Parsed rows for this session */
  rows: ImportRow[]
  /** Column mapping applied to this session */
  mapping: ImportMapping[]
  /** Current batch index (0-based) for progress tracking */
  currentBatch: number
  /** Timestamp when import started (for duration calc) */
  startedAt: string | null
  /** Entity IDs created so far (for rollback) */
  createdEntityIds: string[]
  /** Options used for execution */
  options: ImportExecuteOptions | null
}
