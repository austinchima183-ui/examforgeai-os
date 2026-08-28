// ============ ExamForge AI — CSV Parser ============
// Robust CSV parsing with support for quoted fields, multi-line
// values, BOM markers, and automatic delimiter detection.
// ============================================================================

import type { ParseResult } from '../types'
import { createLogger } from '@/lib/observability/logger'

const log = createLogger('import:csv-parser')

// ──────────────────────────────────────────────────────────────
// Parser Options
// ──────────────────────────────────────────────────────────────

export interface CSVParserOptions {
  /** Field delimiter (auto-detected if not specified) */
  delimiter?: string
  /** Quote character (default: double-quote) */
  quoteChar?: string
  /** Escape character for quotes inside quoted fields (default: same as quoteChar) */
  escapeChar?: string
  /** Whether the first row is a header (default: true) */
  hasHeader?: boolean
  /** Maximum number of rows to parse (0 = unlimited) */
  maxRows?: number
  /** Character encoding (default: utf-8) */
  encoding?: string
}

// ──────────────────────────────────────────────────────────────
// BOM Detection & Stripping
// ──────────────────────────────────────────────────────────────

/**
 * Strip a UTF-8 BOM (Byte Order Mark) from the start of a buffer.
 * BOM is the 3-byte sequence 0xEF 0xBB 0xBF.
 */
function stripBOM(buffer: Buffer): Buffer {
  if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
    return buffer.subarray(3)
  }
  return buffer
}

/**
 * Validate that a buffer contains valid UTF-8 encoded text.
 * Checks for common encoding issues that would corrupt data.
 */
export function validateCSVEncoding(buffer: Buffer): boolean {
  try {
    // Attempt to decode the entire buffer as UTF-8
    const decoded = buffer.toString('utf-8')

    // Check for replacement characters which indicate invalid encoding
    if (decoded.includes('\uFFFD')) {
      log.warn('CSV contains replacement characters — possible encoding issue')
      return false
    }

    return true
  } catch {
    log.error('Failed to validate CSV encoding')
    return false
  }
}

// ──────────────────────────────────────────────────────────────
// Delimiter Auto-Detection
// ──────────────────────────────────────────────────────────────

/**
 * Auto-detect the field delimiter by analysing the first few lines.
 * Counts occurrences of common delimiters and picks the one that
 * produces the most consistent column count.
 *
 * @param content - First ~4 KiB of the file as a string
 * @returns The detected delimiter character
 */
export function detectDelimiter(content: string): string {
  const candidates = [',', ';', '\t', '|']
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0).slice(0, 10)

  if (lines.length === 0) return ','

  let bestDelimiter = ','
  let bestScore = -1

  for (const delimiter of candidates) {
    const counts = lines.map(line => {
      // Simple count ignoring quoted content
      let count = 1
      let inQuote = false
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') {
          inQuote = !inQuote
        } else if (line[i] === delimiter && !inQuote) {
          count++
        }
      }
      return count
    })

    // Score: consistency (all rows same count) × average count
    const avgCount = counts.reduce((a, b) => a + b, 0) / counts.length
    const isConsistent = counts.every(c => c === counts[0])
    const score = isConsistent ? avgCount * 2 : avgCount

    if (score > bestScore && avgCount > 1) {
      bestScore = score
      bestDelimiter = delimiter
    }
  }

  return bestDelimiter
}

// ──────────────────────────────────────────────────────────────
// Core CSV Line Parser
// ──────────────────────────────────────────────────────────────

/**
 * Parse a single line (or multi-line quoted block) of CSV.
 * Handles quoted fields, escaped quotes, and multi-line values.
 *
 * @returns An object with the parsed fields and whether the line
 *          ended inside a quoted field (for multi-line support)
 */
function parseCSVLine(
  line: string,
  delimiter: string,
  quoteChar: string,
  escapeChar: string,
  fields: string[] = [],
  currentField: string = '',
  inQuote: boolean = false,
): { fields: string[]; inQuote: boolean } {
  let i = 0

  if (fields.length === 0) {
    fields = []
    currentField = ''
  }

  while (i < line.length) {
    const ch = line[i]

    if (inQuote) {
      // Check for escape sequence (escaped quote)
      if (ch === escapeChar && i + 1 < line.length && line[i + 1] === quoteChar) {
        currentField += quoteChar
        i += 2
        continue
      }
      // Check for closing quote
      if (ch === quoteChar) {
        inQuote = false
        i++
        // If next char is delimiter, consume it
        if (i < line.length && line[i] === delimiter) {
          fields.push(currentField)
          currentField = ''
          i++
        }
        continue
      }
      currentField += ch
      i++
    } else {
      // Check for opening quote
      if (ch === quoteChar && currentField === '') {
        inQuote = true
        i++
        continue
      }
      // Check for delimiter
      if (ch === delimiter) {
        fields.push(currentField)
        currentField = ''
        i++
        continue
      }
      currentField += ch
      i++
    }
  }

  // End of line
  if (inQuote) {
    // Multi-line value: add newline and continue on next line
    currentField += '\n'
  } else {
    fields.push(currentField)
  }

  return { fields, inQuote }
}

// ──────────────────────────────────────────────────────────────
// Main Parse Function
// ──────────────────────────────────────────────────────────────

/**
 * Parse a CSV file from a Buffer.
 *
 * Handles:
 * - UTF-8 BOM stripping
 * - Auto-delimiter detection
 * - Quoted fields with embedded delimiters, newlines, and quotes
 * - Configurable quote and escape characters
 * - Row limits for safety
 *
 * @param buffer - Raw file bytes
 * @param options - Parser configuration
 * @returns Parsed headers, rows, and any warnings
 */
export function parseCSV(buffer: Buffer, options: CSVParserOptions = {}): ParseResult {
  const startTime = Date.now()
  const warnings: string[] = []

  // Strip BOM
  const cleanBuffer = stripBOM(buffer)

  // Validate encoding
  if (!validateCSVEncoding(cleanBuffer)) {
    warnings.push('File may have encoding issues — some characters could be corrupted')
  }

  // Decode to string
  const content = cleanBuffer.toString('utf-8')
  if (content.trim().length === 0) {
    return { headers: [], rows: [], totalRows: 0, warnings: ['File is empty'] }
  }

  // Detect or use provided delimiter
  const delimiter = options.delimiter ?? detectDelimiter(content.slice(0, 4096))
  const quoteChar = options.quoteChar ?? '"'
  const escapeChar = options.escapeChar ?? quoteChar
  const hasHeader = options.hasHeader !== false
  const maxRows = options.maxRows ?? 0

  log.info('Parsing CSV', { delimiter: JSON.stringify(delimiter), hasHeader, contentLength: content.length })

  // Split into raw lines (CRLF or LF)
  const rawLines = content.split(/\r?\n/)

  const allRows: unknown[][] = []
  let headers: string[] = []
  let currentFields: string[] = []
  let currentField = ''
  let inQuote = false
  let _lineIndex = 0
  let headerParsed = false

  for (const rawLine of rawLines) {
    _lineIndex++

    // Skip completely empty lines at the end
    if (rawLine.trim().length === 0 && !inQuote) continue

    // Parse line (continuing multi-line if needed)
    const result = parseCSVLine(rawLine, delimiter, quoteChar, escapeChar, currentFields, currentField, inQuote)
    currentFields = []
    currentField = ''
    inQuote = result.inQuote

    if (inQuote) {
      // Still in a quoted field — accumulate for next line
      currentField = result.fields[result.fields.length - 1] ?? ''
      currentFields = result.fields.slice(0, -1)
      continue
    }

    const fields = result.fields

    // First row is the header
    if (!headerParsed && hasHeader) {
      headers = fields.map(h => h.trim())
      headerParsed = true
      continue
    }

    // Add data row
    allRows.push(fields.map(f => f === '' ? null : f))

    // Enforce row limit
    if (maxRows > 0 && allRows.length >= maxRows) {
      warnings.push(`Row limit reached (${maxRows}) — remaining rows skipped`)
      break
    }
  }

  // If no header was found but we have data, generate numeric column names
  if (!headerParsed && allRows.length > 0) {
    const colCount = allRows[0].length
    headers = Array.from({ length: colCount }, (_, i) => `column_${i + 1}`)
    warnings.push('No header row detected — generated numeric column names')
  }

  const elapsed = Date.now() - startTime
  log.info('CSV parsing complete', { rows: allRows.length, headers: headers.length, elapsedMs: elapsed })

  return {
    headers,
    rows: allRows,
    totalRows: allRows.length,
    warnings,
  }
}
