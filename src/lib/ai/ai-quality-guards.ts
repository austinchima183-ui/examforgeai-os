// ─── Types ───────────────────────────────────────────────────────────────────

export interface ValidationSchema {
  /** Required top-level fields */
  required?: string[];
  /** Field type expectations */
  types?: Record<string, 'string' | 'number' | 'boolean' | 'object' | 'array'>;
  /** Field value constraints */
  constraints?: Record<string, {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    enum?: unknown[];
  }>;
  /** Nested schema for object fields */
  nested?: Record<string, ValidationSchema>;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface ValidationWarning {
  field: string;
  message: string;
  value?: unknown;
}

export interface HallucinationCheck {
  isHallucination: boolean;
  confidence: number; // 0-1, higher = more likely hallucination
  indicators: string[];
}

export interface ConfidenceScore {
  overall: number; // 0-1
  breakdown: Record<string, number>;
  reasoning: string;
}

export interface Citation {
  source: string;
  text: string;
  isValid: boolean;
  type: 'curriculum' | 'research' | 'best-practice' | 'unverified' | 'other';
}

export interface FormattedAIResponse {
  content: string;
  citations: Citation[];
  confidence: number;
  warnings: string[];
  sanitized: boolean;
}

export interface FormatOptions {
  /** Show confidence indicator */
  showConfidence?: boolean;
  /** Show citations */
  showCitations?: boolean;
  /** Show warnings */
  showWarnings?: boolean;
  /** Highlight uncertain claims */
  highlightUncertainty?: boolean;
  /** Maximum content length */
  maxLength?: number;
}

// ─── validateStructuredOutput ────────────────────────────────────────────────

/**
 * Validate that AI output matches the expected schema.
 * Returns detailed validation results with errors and warnings.
 */
export function validateStructuredOutput(
  output: unknown,
  schema: ValidationSchema
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (output === null || output === undefined) {
    errors.push({ field: 'root', message: 'Output is null or undefined' });
    return { valid: false, errors, warnings };
  }

  const obj = output as Record<string, unknown>;

  // Check required fields
  if (schema.required) {
    for (const field of schema.required) {
      if (obj[field] === undefined || obj[field] === null) {
        errors.push({
          field,
          message: `Required field "${field}" is missing`,
          value: obj[field],
        });
      }
    }
  }

  // Check field types
  if (schema.types) {
    for (const [field, expectedType] of Object.entries(schema.types)) {
      const value = obj[field];
      if (value === undefined || value === null) continue; // Skip if not present

      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== expectedType) {
        errors.push({
          field,
          message: `Expected type "${expectedType}" but got "${actualType}"`,
          value,
        });
      }
    }
  }

  // Check field constraints
  if (schema.constraints) {
    for (const [field, constraint] of Object.entries(schema.constraints)) {
      const value = obj[field];
      if (value === undefined || value === null) continue;

      if (typeof value === 'number') {
        if (constraint.min !== undefined && value < constraint.min) {
          errors.push({
            field,
            message: `Value ${value} is below minimum ${constraint.min}`,
            value,
          });
        }
        if (constraint.max !== undefined && value > constraint.max) {
          errors.push({
            field,
            message: `Value ${value} exceeds maximum ${constraint.max}`,
            value,
          });
        }
      }

      if (typeof value === 'string') {
        if (constraint.minLength !== undefined && value.length < constraint.minLength) {
          warnings.push({
            field,
            message: `String length ${value.length} is below minimum ${constraint.minLength}`,
            value,
          });
        }
        if (constraint.maxLength !== undefined && value.length > constraint.maxLength) {
          errors.push({
            field,
            message: `String length ${value.length} exceeds maximum ${constraint.maxLength}`,
            value,
          });
        }
        if (constraint.pattern) {
          const regex = new RegExp(constraint.pattern);
          if (!regex.test(value)) {
            errors.push({
              field,
              message: `Value does not match required pattern: ${constraint.pattern}`,
              value,
            });
          }
        }
      }

      if (constraint.enum && !constraint.enum.includes(value)) {
        errors.push({
          field,
          message: `Value "${value}" is not one of allowed values: ${constraint.enum.join(', ')}`,
          value,
        });
      }
    }
  }

  // Check nested schemas
  if (schema.nested) {
    for (const [field, nestedSchema] of Object.entries(schema.nested)) {
      const nestedValue = obj[field];
      if (nestedValue && typeof nestedValue === 'object') {
        const nestedResult = validateStructuredOutput(nestedValue, nestedSchema);
        // Prefix field names
        for (const err of nestedResult.errors) {
          errors.push({
            ...err,
            field: `${field}.${err.field}`,
          });
        }
        for (const warn of nestedResult.warnings) {
          warnings.push({
            ...warn,
            field: `${field}.${warn.field}`,
          });
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ─── detectHallucination ─────────────────────────────────────────────────────

/**
 * Detect common hallucination patterns in AI output.
 * Looks for statistical fabrication, fake citations, vague authority claims, etc.
 */
export function detectHallucination(
  output: string,
  context?: { subject?: string; expectedFacts?: string[] }
): HallucinationCheck {
  const indicators: string[] = [];
  let score = 0;

  // Pattern 1: Overly specific statistics without citation
  const specificStatsPattern = /(\d+\.?\d*)%\s*(of|increase|decrease|improvement|students|schools)/gi;
  const statMatches = output.match(specificStatsPattern);
  if (statMatches && statMatches.length > 0) {
    // Check if stats are followed by citations
    for (const match of statMatches) {
      const index = output.indexOf(match);
      const afterMatch = output.substring(index, index + 200);
      if (!afterMatch.includes('[Source:') && !afterMatch.includes('[1]') && !afterMatch.includes('(Source:')) {
        indicators.push(`Uncited specific statistic: "${match}"`);
        score += 0.2;
      }
    }
  }

  // Pattern 2: Vague authority claims ("studies show", "research indicates")
  const vagueAuthorityPattern = /\b(studies show|research indicates|it has been proven|experts agree|it is well known)\b/gi;
  const vagueMatches = output.match(vagueAuthorityPattern);
  if (vagueMatches) {
    for (const match of vagueMatches) {
      indicators.push(`Vague authority claim: "${match}"`);
      score += 0.15;
    }
  }

  // Pattern 3: Fabricated-looking citations (e.g., "Smith et al., 2023")
  const fakeCitationPattern = /\b([A-Z][a-z]+)\s+et\s+al\.\s*,\s*\d{4}\b/g;
  const fakeCiteMatches = output.match(fakeCitationPattern);
  if (fakeCiteMatches) {
    indicators.push(`Potentially fabricated academic citation(s): ${fakeCiteMatches.join(', ')}`);
    score += 0.3;
  }

  // Pattern 4: Hedging language overuse (suggests uncertainty)
  const hedgingPattern = /\b(might|could|possibly|perhaps|maybe|likely|approximately|roughly|around|about)\b/gi;
  const hedgingMatches = output.match(hedgingPattern);
  if (hedgingMatches && hedgingMatches.length > 3) {
    indicators.push(`Excessive hedging language (${hedgingMatches.length} instances) — may indicate uncertainty`);
    score += 0.1;
  }

  // Pattern 5: Claims about the subject that seem too precise to be general knowledge
  if (context?.subject) {
    const exactClaimPattern = /exactly|precisely|always|never|all\s+students|every\s+school/gi;
    const exactMatches = output.match(exactClaimPattern);
    if (exactMatches && exactMatches.length > 1) {
      indicators.push(`Overly absolute claims in ${context.subject}: ${exactMatches.join(', ')}`);
      score += 0.2;
    }
  }

  // Pattern 6: Contradictory statements
  const contradictionPatterns = [
    { a: /increases?\s+(by|from)/i, b: /decreases?\s+(by|from)/i },
    { a: /improves?\s+/i, b: /worsens?\s+/i },
    { a: /higher\s+/i, b: /lower\s+/i },
  ];

  for (const { a, b } of contradictionPatterns) {
    if (a.test(output) && b.test(output)) {
      indicators.push('Potential contradictory statements detected (increase/decrease or similar)');
      score += 0.15;
      break;
    }
  }

  const confidence = Math.min(1, score);

  return {
    isHallucination: confidence > 0.4,
    confidence,
    indicators,
  };
}

// ─── scoreConfidence ─────────────────────────────────────────────────────────

/**
 * Score the confidence of an AI output on a 0-1 scale.
 * Based on structural quality, specificity, and absence of hedging.
 */
export function scoreConfidence(output: string): ConfidenceScore {
  const breakdown: Record<string, number> = {};

  // Factor 1: Structural completeness (has sections, clear formatting)
  const hasHeaders = /^#{1,3}\s+/m.test(output);
  const hasLists = /^\s*[-*]\s+/m.test(output) || /^\s*\d+\.\s+/m.test(output);
  const structuralScore = (hasHeaders ? 0.4 : 0) + (hasLists ? 0.3 : 0) + (output.length > 100 ? 0.3 : 0);
  breakdown.structure = structuralScore;

  // Factor 2: Specificity (specific details vs vague claims)
  const specificDetails = (output.match(/\d+\.?\d*/g) ?? []).length;
  const specificityScore = Math.min(1, specificDetails / 5) * 0.6 +
    (output.includes('[Source:') ? 0.4 : 0);
  breakdown.specificity = specificityScore;

  // Factor 3: Certainty (less hedging = more confident)
  const hedgingWords = (output.match(/\b(might|could|possibly|perhaps|maybe|approximately|roughly)\b/gi) ?? []).length;
  const totalWords = output.split(/\s+/).length;
  const hedgingRatio = totalWords > 0 ? hedgingWords / totalWords : 0;
  const certaintyScore = Math.max(0, 1 - hedgingRatio * 10);
  breakdown.certainty = certaintyScore;

  // Factor 4: Internal consistency
  const hallCheck = detectHallucination(output);
  const consistencyScore = 1 - hallCheck.confidence;
  breakdown.consistency = consistencyScore;

  // Weighted overall score
  const overall =
    structuralScore * 0.2 +
    specificityScore * 0.3 +
    certaintyScore * 0.25 +
    consistencyScore * 0.25;

  const reasoning = [
    `Structure: ${structuralScore.toFixed(2)} (${hasHeaders ? 'has headers' : 'no headers'}, ${hasLists ? 'has lists' : 'no lists'})`,
    `Specificity: ${specificityScore.toFixed(2)} (${specificDetails} numeric details)`,
    `Certainty: ${certaintyScore.toFixed(2)} (${hedgingWords} hedging words in ${totalWords} total)`,
    `Consistency: ${consistencyScore.toFixed(2)} (${hallCheck.indicators.length} hallucination indicators)`,
  ].join('; ');

  return {
    overall: Math.round(overall * 100) / 100,
    breakdown,
    reasoning,
  };
}

// ─── extractCitations ────────────────────────────────────────────────────────

/**
 * Extract and validate source citations from AI output.
 * Supports [Source: ...] and [1], [2] numbered formats.
 */
export function extractCitations(output: string): Citation[] {
  const citations: Citation[] = [];

  // Pattern 1: [Source: description]
  const inlineSourcePattern = /\[Source:\s*([^\]]+)\]/g;
  let match: RegExpExecArray | null;

  while ((match = inlineSourcePattern.exec(output)) !== null) {
    const sourceText = match[1].trim();
    citations.push({
      source: sourceText,
      text: match[0],
      isValid: validateCitationSource(sourceText),
      type: classifyCitationType(sourceText),
    });
  }

  // Pattern 2: [Unverified claim ...]
  const unverifiedPattern = /\[Unverified claim[:\s]*([^\]]+)\]/g;
  while ((match = unverifiedPattern.exec(output)) !== null) {
    citations.push({
      source: match[1].trim(),
      text: match[0],
      isValid: false,
      type: 'unverified',
    });
  }

  // Pattern 3: Numbered references [1], [2], etc. with references section
  const numberedPattern = /\[(\d+)\]/g;
  const numberedRefs: Set<string> = new Set();
  while ((match = numberedPattern.exec(output)) !== null) {
    numberedRefs.add(match[1]);
  }

  // Check for references section
  const refsSectionPattern = /##?\s*References\s*\n([\s\S]*?)(?=\n##|$)/i;
  const refsMatch = refsSectionPattern.exec(output);
  if (refsMatch && numberedRefs.size > 0) {
    const refLines = refsMatch[1].split('\n').filter((l) => l.trim());
    for (const refLine of refLines) {
      const refMatch = refLine.match(/\[(\d+)\]\s*(.+)/);
      if (refMatch) {
        citations.push({
          source: refMatch[2].trim(),
          text: refLine.trim(),
          isValid: validateCitationSource(refMatch[2]),
          type: classifyCitationType(refMatch[2]),
        });
      }
    }
  }

  return citations;
}

function validateCitationSource(source: string): boolean {
  // Known valid sources
  const validPatterns = [
    /CBSE/i, /ICSE/i, /NCERT/i, /Common Core/i,
    /best practice/i, /educational standard/i,
    /curriculum/i, /syllabus/i,
  ];

  return validPatterns.some((pattern) => pattern.test(source));
}

function classifyCitationType(source: string): Citation['type'] {
  if (/CBSE|ICSE|NCERT|curriculum|syllabus/i.test(source)) return 'curriculum';
  if (/research|study|paper|journal|et al\./i.test(source)) return 'research';
  if (/best practice|pedagogical|standard/i.test(source)) return 'best-practice';
  if (/unverified|uncertain/i.test(source)) return 'unverified';
  return 'other';
}

// ─── sanitizeAIOutput ────────────────────────────────────────────────────────

/**
 * Remove potentially harmful content from AI output.
 * Strips scripts, dangerous HTML, and PII patterns.
 */
export function sanitizeAIOutput(output: string): string {
  let sanitized = output;

  // Remove script tags
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove event handlers
  sanitized = sanitized.replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '');

  // Remove javascript: URLs
  sanitized = sanitized.replace(/javascript\s*:/gi, 'removed:');

  // Remove data: URLs (potential XSS)
  sanitized = sanitized.replace(/data\s*:[^"'\s)]+/gi, '[data-removed]');

  // Redact potential PII — email addresses
  sanitized = sanitized.replace(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    '[email-redacted]'
  );

  // Redact potential PII — phone numbers (Indian and international)
  sanitized = sanitized.replace(
    /(?:\+?91[-.\s]?)?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    '[phone-redacted]'
  );

  // Redact potential PII — Aadhaar-like numbers
  sanitized = sanitized.replace(
    /\b\d{4}\s?\d{4}\s?\d{4}\b/g,
    '[id-redacted]'
  );

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Trim excessive whitespace
  sanitized = sanitized.replace(/\n{4,}/g, '\n\n\n');

  return sanitized.trim();
}

// ─── formatAIResponse ────────────────────────────────────────────────────────

/**
 * Format an AI response for display with citations, confidence, etc.
 * Produces a structured object ready for UI rendering.
 */
export function formatAIResponse(
  output: string,
  options: FormatOptions = {}
): FormattedAIResponse {
  const {
    showConfidence = true,
    showCitations = true,
    showWarnings = true,
    highlightUncertainty = true,
    maxLength,
  } = options;

  const warnings: string[] = [];

  // Sanitize first
  let content = sanitizeAIOutput(output);
  const sanitized = content !== output;

  if (sanitized) {
    warnings.push('Content was sanitized to remove potentially harmful elements');
  }

  // Extract citations
  const citations = showCitations ? extractCitations(content) : [];

  // Score confidence
  const confidenceResult = showConfidence ? scoreConfidence(content) : null;
  const confidence = confidenceResult?.overall ?? 1;

  // Detect hallucination
  const hallCheck = detectHallucination(content);
  if (hallCheck.isHallucination) {
    warnings.push(`Potential hallucination detected (confidence: ${(hallCheck.confidence * 100).toFixed(0)}%)`);
    if (hallCheck.indicators.length > 0) {
      warnings.push(...hallCheck.indicators.slice(0, 3));
    }
  }

  // Highlight uncertainty
  if (highlightUncertainty) {
    content = content.replace(
      /\b(I'm not certain|This may not be|approximately|roughly|possibly|perhaps)\b/gi,
      '**$1**'
    );
  }

  // Truncate if needed
  if (maxLength && content.length > maxLength) {
    content = content.substring(0, maxLength) + '...';
    warnings.push(`Content truncated to ${maxLength} characters`);
  }

  // Validate citations
  const invalidCitations = citations.filter((c) => !c.isValid);
  if (invalidCitations.length > 0) {
    warnings.push(`${invalidCitations.length} citation(s) could not be verified`);
  }

  return {
    content,
    citations,
    confidence,
    warnings: showWarnings ? warnings : [],
    sanitized,
  };
}
