// ============ ExamForge AI — Import Column Definitions ============
// Defines the expected columns, types, and validations for each
// importable entity type. Used by the validator and auto-mapper.
// ============================================================================

import type { ColumnDefinition, ImportEntityType } from './types'

// ──────────────────────────────────────────────────────────────
// Student Columns
// ──────────────────────────────────────────────────────────────

const STUDENT_COLUMNS: ColumnDefinition[] = [
  {
    name: 'first_name',
    label: 'First Name',
    required: true,
    type: 'string',
    validations: [
      { rule: 'required', message: 'First name is required' },
      { rule: 'minLength', message: 'First name must be at least 1 character', value: 1 },
      { rule: 'maxLength', message: 'First name must be at most 100 characters', value: 100 },
    ],
  },
  {
    name: 'last_name',
    label: 'Last Name',
    required: true,
    type: 'string',
    validations: [
      { rule: 'required', message: 'Last name is required' },
      { rule: 'minLength', message: 'Last name must be at least 1 character', value: 1 },
      { rule: 'maxLength', message: 'Last name must be at most 100 characters', value: 100 },
    ],
  },
  {
    name: 'email',
    label: 'Email',
    required: true,
    type: 'email',
    validations: [
      { rule: 'required', message: 'Email is required' },
      { rule: 'email', message: 'Must be a valid email address' },
    ],
  },
  {
    name: 'phone',
    label: 'Phone',
    required: false,
    type: 'string',
    validations: [
      { rule: 'pattern', message: 'Invalid phone number format', value: /^[+]?[\d\s\-()]{7,20}$/ },
    ],
  },
  {
    name: 'date_of_birth',
    label: 'Date of Birth',
    required: false,
    type: 'date',
    validations: [
      { rule: 'date', message: 'Must be a valid date (YYYY-MM-DD)' },
    ],
  },
  {
    name: 'gender',
    label: 'Gender',
    required: false,
    type: 'enum',
    validations: [
      { rule: 'enum', message: 'Gender must be male, female, or other', value: ['male', 'female', 'other'] },
    ],
    defaultValue: 'other',
  },
  {
    name: 'class_name',
    label: 'Class Name',
    required: false,
    type: 'string',
    validations: [
      { rule: 'maxLength', message: 'Class name must be at most 100 characters', value: 100 },
    ],
  },
  {
    name: 'roll_number',
    label: 'Roll Number',
    required: false,
    type: 'string',
    validations: [
      { rule: 'maxLength', message: 'Roll number must be at most 50 characters', value: 50 },
    ],
  },
  {
    name: 'admission_number',
    label: 'Admission Number',
    required: false,
    type: 'string',
    validations: [
      { rule: 'maxLength', message: 'Admission number must be at most 50 characters', value: 50 },
    ],
  },
]

// ──────────────────────────────────────────────────────────────
// Teacher Columns
// ──────────────────────────────────────────────────────────────

const TEACHER_COLUMNS: ColumnDefinition[] = [
  {
    name: 'first_name',
    label: 'First Name',
    required: true,
    type: 'string',
    validations: [
      { rule: 'required', message: 'First name is required' },
      { rule: 'minLength', message: 'First name must be at least 1 character', value: 1 },
      { rule: 'maxLength', message: 'First name must be at most 100 characters', value: 100 },
    ],
  },
  {
    name: 'last_name',
    label: 'Last Name',
    required: true,
    type: 'string',
    validations: [
      { rule: 'required', message: 'Last name is required' },
      { rule: 'minLength', message: 'Last name must be at least 1 character', value: 1 },
      { rule: 'maxLength', message: 'Last name must be at most 100 characters', value: 100 },
    ],
  },
  {
    name: 'email',
    label: 'Email',
    required: true,
    type: 'email',
    validations: [
      { rule: 'required', message: 'Email is required' },
      { rule: 'email', message: 'Must be a valid email address' },
    ],
  },
  {
    name: 'phone',
    label: 'Phone',
    required: false,
    type: 'string',
    validations: [
      { rule: 'pattern', message: 'Invalid phone number format', value: /^[+]?[\d\s\-()]{7,20}$/ },
    ],
  },
  {
    name: 'subjects',
    label: 'Subjects',
    required: false,
    type: 'string',
    validations: [
      { rule: 'maxLength', message: 'Subjects must be at most 500 characters', value: 500 },
    ],
  },
  {
    name: 'classes',
    label: 'Classes',
    required: false,
    type: 'string',
    validations: [
      { rule: 'maxLength', message: 'Classes must be at most 500 characters', value: 500 },
    ],
  },
  {
    name: 'qualification',
    label: 'Qualification',
    required: false,
    type: 'string',
    validations: [
      { rule: 'maxLength', message: 'Qualification must be at most 200 characters', value: 200 },
    ],
  },
  {
    name: 'employee_id',
    label: 'Employee ID',
    required: false,
    type: 'string',
    validations: [
      { rule: 'maxLength', message: 'Employee ID must be at most 50 characters', value: 50 },
    ],
  },
]

// ──────────────────────────────────────────────────────────────
// Parent Columns
// ──────────────────────────────────────────────────────────────

const PARENT_COLUMNS: ColumnDefinition[] = [
  {
    name: 'first_name',
    label: 'First Name',
    required: true,
    type: 'string',
    validations: [
      { rule: 'required', message: 'First name is required' },
      { rule: 'minLength', message: 'First name must be at least 1 character', value: 1 },
      { rule: 'maxLength', message: 'First name must be at most 100 characters', value: 100 },
    ],
  },
  {
    name: 'last_name',
    label: 'Last Name',
    required: true,
    type: 'string',
    validations: [
      { rule: 'required', message: 'Last name is required' },
      { rule: 'minLength', message: 'Last name must be at least 1 character', value: 1 },
      { rule: 'maxLength', message: 'Last name must be at most 100 characters', value: 100 },
    ],
  },
  {
    name: 'email',
    label: 'Email',
    required: true,
    type: 'email',
    validations: [
      { rule: 'required', message: 'Email is required' },
      { rule: 'email', message: 'Must be a valid email address' },
    ],
  },
  {
    name: 'phone',
    label: 'Phone',
    required: false,
    type: 'string',
    validations: [
      { rule: 'pattern', message: 'Invalid phone number format', value: /^[+]?[\d\s\-()]{7,20}$/ },
    ],
  },
  {
    name: 'children_names_or_ids',
    label: 'Children Names or IDs',
    required: false,
    type: 'string',
    validations: [
      { rule: 'maxLength', message: 'Children field must be at most 500 characters', value: 500 },
    ],
  },
  {
    name: 'relationship',
    label: 'Relationship',
    required: false,
    type: 'enum',
    validations: [
      { rule: 'enum', message: 'Relationship must be father, mother, guardian, or other', value: ['father', 'mother', 'guardian', 'other'] },
    ],
    defaultValue: 'other',
  },
]

// ──────────────────────────────────────────────────────────────
// Subject Columns
// ──────────────────────────────────────────────────────────────

const SUBJECT_COLUMNS: ColumnDefinition[] = [
  {
    name: 'name',
    label: 'Subject Name',
    required: true,
    type: 'string',
    validations: [
      { rule: 'required', message: 'Subject name is required' },
      { rule: 'maxLength', message: 'Subject name must be at most 200 characters', value: 200 },
    ],
  },
  {
    name: 'code',
    label: 'Subject Code',
    required: false,
    type: 'string',
    validations: [
      { rule: 'maxLength', message: 'Subject code must be at most 20 characters', value: 20 },
    ],
  },
  {
    name: 'class_level',
    label: 'Class Level',
    required: false,
    type: 'string',
    validations: [
      { rule: 'maxLength', message: 'Class level must be at most 50 characters', value: 50 },
    ],
  },
  {
    name: 'teacher_email',
    label: 'Teacher Email',
    required: false,
    type: 'email',
    validations: [
      { rule: 'email', message: 'Must be a valid email address' },
    ],
  },
]

// ──────────────────────────────────────────────────────────────
// Class Columns
// ──────────────────────────────────────────────────────────────

const CLASS_COLUMNS: ColumnDefinition[] = [
  {
    name: 'name',
    label: 'Class Name',
    required: true,
    type: 'string',
    validations: [
      { rule: 'required', message: 'Class name is required' },
      { rule: 'maxLength', message: 'Class name must be at most 100 characters', value: 100 },
    ],
  },
  {
    name: 'arm',
    label: 'Arm / Section',
    required: false,
    type: 'string',
    validations: [
      { rule: 'maxLength', message: 'Arm must be at most 10 characters', value: 10 },
    ],
  },
  {
    name: 'level',
    label: 'Level / Grade',
    required: false,
    type: 'string',
    validations: [
      { rule: 'maxLength', message: 'Level must be at most 50 characters', value: 50 },
    ],
  },
  {
    name: 'capacity',
    label: 'Capacity',
    required: false,
    type: 'number',
    validations: [
      { rule: 'minLength', message: 'Capacity must be a positive number', value: 1 },
    ],
  },
  {
    name: 'class_teacher_email',
    label: 'Class Teacher Email',
    required: false,
    type: 'email',
    validations: [
      { rule: 'email', message: 'Must be a valid email address' },
    ],
  },
]

// ──────────────────────────────────────────────────────────────
// Result Columns
// ──────────────────────────────────────────────────────────────

const RESULT_COLUMNS: ColumnDefinition[] = [
  {
    name: 'student_email_or_id',
    label: 'Student Email or ID',
    required: true,
    type: 'string',
    validations: [
      { rule: 'required', message: 'Student email or ID is required' },
    ],
  },
  {
    name: 'exam_name',
    label: 'Exam Name',
    required: true,
    type: 'string',
    validations: [
      { rule: 'required', message: 'Exam name is required' },
      { rule: 'maxLength', message: 'Exam name must be at most 200 characters', value: 200 },
    ],
  },
  {
    name: 'subject_name',
    label: 'Subject Name',
    required: true,
    type: 'string',
    validations: [
      { rule: 'required', message: 'Subject name is required' },
      { rule: 'maxLength', message: 'Subject name must be at most 200 characters', value: 200 },
    ],
  },
  {
    name: 'score',
    label: 'Score',
    required: true,
    type: 'number',
    validations: [
      { rule: 'required', message: 'Score is required' },
    ],
  },
  {
    name: 'grade',
    label: 'Grade',
    required: false,
    type: 'string',
    validations: [
      { rule: 'maxLength', message: 'Grade must be at most 10 characters', value: 10 },
    ],
  },
  {
    name: 'term',
    label: 'Term',
    required: false,
    type: 'string',
    validations: [
      { rule: 'maxLength', message: 'Term must be at most 50 characters', value: 50 },
    ],
  },
]

// ──────────────────────────────────────────────────────────────
// Timetable Columns
// ──────────────────────────────────────────────────────────────

const TIMETABLE_COLUMNS: ColumnDefinition[] = [
  {
    name: 'class_name',
    label: 'Class Name',
    required: true,
    type: 'string',
    validations: [
      { rule: 'required', message: 'Class name is required' },
      { rule: 'maxLength', message: 'Class name must be at most 100 characters', value: 100 },
    ],
  },
  {
    name: 'day',
    label: 'Day',
    required: true,
    type: 'enum',
    validations: [
      { rule: 'required', message: 'Day is required' },
      { rule: 'enum', message: 'Day must be a valid weekday', value: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] },
    ],
  },
  {
    name: 'period',
    label: 'Period',
    required: true,
    type: 'number',
    validations: [
      { rule: 'required', message: 'Period is required' },
    ],
  },
  {
    name: 'subject_name',
    label: 'Subject Name',
    required: true,
    type: 'string',
    validations: [
      { rule: 'required', message: 'Subject name is required' },
      { rule: 'maxLength', message: 'Subject name must be at most 200 characters', value: 200 },
    ],
  },
  {
    name: 'teacher_email',
    label: 'Teacher Email',
    required: false,
    type: 'email',
    validations: [
      { rule: 'email', message: 'Must be a valid email address' },
    ],
  },
  {
    name: 'start_time',
    label: 'Start Time',
    required: false,
    type: 'string',
    validations: [
      { rule: 'pattern', message: 'Start time must be in HH:MM format', value: /^([01]\d|2[0-3]):([0-5]\d)$/ },
    ],
  },
  {
    name: 'end_time',
    label: 'End Time',
    required: false,
    type: 'string',
    validations: [
      { rule: 'pattern', message: 'End time must be in HH:MM format', value: /^([01]\d|2[0-3]):([0-5]\d)$/ },
    ],
  },
]

// ──────────────────────────────────────────────────────────────
// Column Definition Registry
// ──────────────────────────────────────────────────────────────

const COLUMN_REGISTRY: Record<ImportEntityType, ColumnDefinition[]> = {
  student: STUDENT_COLUMNS,
  teacher: TEACHER_COLUMNS,
  parent: PARENT_COLUMNS,
  subject: SUBJECT_COLUMNS,
  class: CLASS_COLUMNS,
  result: RESULT_COLUMNS,
  timetable: TIMETABLE_COLUMNS,
}

/**
 * Get column definitions for a given entity type.
 *
 * @param entityType - The entity type being imported
 * @returns Array of column definitions with validations
 *
 * @example
 * ```ts
 * const columns = getColumnDefinitions('student')
 * // Returns definitions for first_name, last_name, email, etc.
 * ```
 */
export function getColumnDefinitions(entityType: ImportEntityType): ColumnDefinition[] {
  return COLUMN_REGISTRY[entityType] ?? []
}

/**
 * Get a flat list of all target field names for an entity type.
 * Useful for auto-mapping validation.
 */
export function getTargetFields(entityType: ImportEntityType): string[] {
  return getColumnDefinitions(entityType).map(col => col.name)
}

/**
 * Get only the required column definitions for an entity type.
 */
export function getRequiredColumns(entityType: ImportEntityType): ColumnDefinition[] {
  return getColumnDefinitions(entityType).filter(col => col.required)
}
