// ============================================================================
// ExamForge AI — API Reference Content Data
// ============================================================================
// Comprehensive API documentation with endpoints, parameters, code examples,
// SDK information, and webhook event definitions.
// ============================================================================

export interface APIParam {
  name: string
  type: string
  required: boolean
  description: string
  example?: string
}

export interface APICodeExample {
  language: string
  code: string
  response: string
}

export interface APIEndpoint {
  method: string
  path: string
  summary: string
  description: string
  tag: string
  auth: boolean
  params?: APIParam[]
  requestBody?: { contentType: string; schema: string; example: string }
  responseBody?: { contentType: string; example: string }
  codeExamples?: APICodeExample[]
  rateLimit?: string
  deprecated?: boolean
}

export interface SDKPackage {
  name: string
  language: string
  version: string
  installCommand: string
  quickStart: string
  githubUrl: string
  npmUrl?: string
  status: 'stable' | 'beta' | 'planned'
}

export interface WebhookEvent {
  event: string
  description: string
  payloadExample: string
  triggerCondition: string
}

// ─── API Tags ───

export const apiTags = [
  { slug: 'auth', name: 'Authentication', description: 'API key management, OAuth 2.0 flows, and token lifecycle' },
  { slug: 'students', name: 'Students', description: 'Student CRUD operations, enrollment, and profile management' },
  { slug: 'exams', name: 'Exams', description: 'Exam creation, scheduling, delivery, and result processing' },
  { slug: 'questions', name: 'Questions', description: 'Question bank management, CRUD, and organization' },
  { slug: 'ai', name: 'AI', description: 'AI-powered question generation, auto-marking, and analytics' },
  { slug: 'analytics', name: 'Analytics', description: 'Dashboard data, reports, and performance insights' },
  { slug: 'webhooks', name: 'Webhooks', description: 'Webhook configuration, event subscriptions, and delivery' },
  { slug: 'billing', name: 'Billing', description: 'Subscription management, invoices, and payment processing' },
  { slug: 'schools', name: 'Schools', description: 'School configuration, settings, and multi-tenant management' },
  { slug: 'reports', name: 'Reports', description: 'Report generation, scheduling, and export' },
]

// ─── Endpoints ───

export const endpoints: APIEndpoint[] = [
  // Auth
  {
    method: 'POST',
    path: '/api/v1/auth/token',
    summary: 'Generate an access token',
    description: 'Authenticate with your API key to receive a short-lived JWT access token. Tokens expire after 1 hour and can be refreshed using the refresh endpoint.',
    tag: 'auth',
    auth: false,
    params: [],
    requestBody: {
      contentType: 'application/json',
      schema: '{ api_key: string, api_secret: string }',
      example: JSON.stringify({ api_key: 'ef_live_abc123...', api_secret: 'ef_secret_xyz789...' }, null, 2),
    },
    responseBody: {
      contentType: 'application/json',
      example: JSON.stringify({ access_token: 'eyJhbGciOiJIUzI1NiIs...', token_type: 'Bearer', expires_in: 3600, refresh_token: 'ef_refresh_abc123...' }, null, 2),
    },
    codeExamples: [
      {
        language: 'TypeScript',
        code: `const response = await fetch('https://api.examforge.ai/v1/auth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    api_key: process.env.EXAMFORGE_API_KEY,
    api_secret: process.env.EXAMFORGE_API_SECRET,
  }),
})
const { access_token } = await response.json()`,
        response: '{ "access_token": "eyJhbGciOi...", "token_type": "Bearer", "expires_in": 3600 }',
      },
      {
        language: 'Python',
        code: `import examforge

client = examforge.Client(
    api_key="ef_live_abc123...",
    api_secret="ef_secret_xyz789...",
)
# Authentication is handled automatically`,
        response: '# Client is authenticated and ready to use',
      },
    ],
    rateLimit: '10 req/min',
  },
  // Students
  {
    method: 'GET',
    path: '/api/v1/students',
    summary: 'List all students',
    description: 'Retrieve a paginated list of students with filtering, sorting, and search capabilities. Supports filtering by class, status, enrollment date, and custom fields.',
    tag: 'students',
    auth: true,
    params: [
      { name: 'page', type: 'integer', required: false, description: 'Page number (1-indexed)', example: '1' },
      { name: 'limit', type: 'integer', required: false, description: 'Results per page (max 100)', example: '25' },
      { name: 'class_id', type: 'string', required: false, description: 'Filter by class ID', example: 'cls_ss2a' },
      { name: 'status', type: 'string', required: false, description: 'Filter by enrollment status', example: 'active' },
      { name: 'search', type: 'string', required: false, description: 'Search by name or admission number', example: 'Ade' },
      { name: 'sort', type: 'string', required: false, description: 'Sort field and direction', example: 'name:asc' },
    ],
    rateLimit: '100 req/min',
    codeExamples: [
      {
        language: 'TypeScript',
        code: `const students = await client.students.list({
  class_id: 'cls_ss2a',
  status: 'active',
  limit: 50,
  sort: 'name:asc',
})`,
        response: '{ "data": [...], "meta": { "page": 1, "limit": 50, "total": 245 } }',
      },
    ],
  },
  {
    method: 'POST',
    path: '/api/v1/students',
    summary: 'Create a student',
    description: 'Register a new student with profile information, class assignment, and optional parent contact details. Supports single and bulk creation.',
    tag: 'students',
    auth: true,
    params: [],
    requestBody: {
      contentType: 'application/json',
      schema: '{ first_name: string, last_name: string, admission_number: string, class_id: string, date_of_birth?: string, gender?: string, parent_contact?: object }',
      example: JSON.stringify({ first_name: 'Chidinma', last_name: 'Okafor', admission_number: 'ADM/2026/001', class_id: 'cls_ss2a', date_of_birth: '2008-03-15', gender: 'female' }, null, 2),
    },
    rateLimit: '50 req/min',
  },
  {
    method: 'GET',
    path: '/api/v1/students/{id}',
    summary: 'Get a student by ID',
    description: 'Retrieve detailed profile information for a specific student, including enrollment history, current class, and parent contacts.',
    tag: 'students',
    auth: true,
    params: [
      { name: 'id', type: 'string', required: true, description: 'Student ID', example: 'stu_abc123' },
    ],
    rateLimit: '200 req/min',
  },
  // Exams
  {
    method: 'POST',
    path: '/api/v1/exams',
    summary: 'Create an exam',
    description: 'Create a new exam with questions, timing, delivery settings, and anti-cheating configuration. Supports importing questions from the question bank or AI-generated questions.',
    tag: 'exams',
    auth: true,
    requestBody: {
      contentType: 'application/json',
      schema: '{ title: string, subject_id: string, class_ids: string[], duration_minutes: number, questions: object[], settings: object }',
      example: JSON.stringify({ title: 'Mid-Term Mathematics', subject_id: 'sub_math', class_ids: ['cls_ss2a', 'cls_ss2b'], duration_minutes: 60, settings: { shuffle: true, auto_mark: true, anti_cheat: { tab_detect: true, copy_paste_block: true } } }, null, 2),
    },
    rateLimit: '30 req/min',
    codeExamples: [
      {
        language: 'TypeScript',
        code: `const exam = await client.exams.create({
  title: 'Mid-Term Mathematics',
  subject_id: 'sub_math',
  class_ids: ['cls_ss2a', 'cls_ss2b'],
  duration_minutes: 60,
  settings: {
    shuffle: true,
    auto_mark: true,
    anti_cheat: {
      tab_detect: true,
      copy_paste_block: true,
    },
  },
})`,
        response: '{ "id": "exam_abc123", "status": "draft", "created_at": "..." }',
      },
    ],
  },
  {
    method: 'GET',
    path: '/api/v1/exams/{id}',
    summary: 'Get exam details',
    description: 'Retrieve exam configuration, question list, delivery settings, and current status.',
    tag: 'exams',
    auth: true,
    params: [{ name: 'id', type: 'string', required: true, description: 'Exam ID' }],
    rateLimit: '200 req/min',
  },
  {
    method: 'POST',
    path: '/api/v1/exams/{id}/publish',
    summary: 'Publish an exam',
    description: 'Transition an exam from draft to published status, making it available to assigned students.',
    tag: 'exams',
    auth: true,
    params: [{ name: 'id', type: 'string', required: true, description: 'Exam ID' }],
    rateLimit: '30 req/min',
  },
  {
    method: 'GET',
    path: '/api/v1/exams/{id}/results',
    summary: 'Get exam results',
    description: 'Retrieve exam results with scores, analytics, item analysis, and student response data. Supports CSV and PDF export.',
    tag: 'exams',
    auth: true,
    params: [
      { name: 'id', type: 'string', required: true, description: 'Exam ID' },
      { name: 'format', type: 'string', required: false, description: 'Response format (json, csv, pdf)', example: 'json' },
    ],
    rateLimit: '50 req/min',
  },
  // Questions
  {
    method: 'GET',
    path: '/api/v1/questions',
    summary: 'List questions in the bank',
    description: 'Retrieve questions from the school\'s question bank with filtering by subject, topic, difficulty, and type.',
    tag: 'questions',
    auth: true,
    params: [
      { name: 'subject_id', type: 'string', required: false, description: 'Filter by subject' },
      { name: 'difficulty', type: 'string', required: false, description: 'Filter by difficulty (easy, medium, hard)' },
      { name: 'type', type: 'string', required: false, description: 'Filter by question type (mcq, short_answer, essay)' },
    ],
    rateLimit: '100 req/min',
  },
  {
    method: 'POST',
    path: '/api/v1/questions',
    summary: 'Create a question',
    description: 'Add a new question to the question bank with content, answer, difficulty rating, and metadata.',
    tag: 'questions',
    auth: true,
    rateLimit: '50 req/min',
  },
  // AI
  {
    method: 'POST',
    path: '/api/v1/ai/generate-questions',
    summary: 'Generate questions with AI',
    description: 'Use AI to generate exam questions based on subject, topic, curriculum standards, and difficulty parameters. Returns questions with answer keys and explanations.',
    tag: 'ai',
    auth: true,
    requestBody: {
      contentType: 'application/json',
      schema: '{ subject: string, topic: string, count: number, difficulty: string, question_type: string, curriculum: string, blooms_level?: string }',
      example: JSON.stringify({ subject: 'Mathematics', topic: 'Quadratic Equations', count: 20, difficulty: 'intermediate', question_type: 'mcq', curriculum: 'WAEC', blooms_level: 'Application' }, null, 2),
    },
    rateLimit: '20 req/min',
    codeExamples: [
      {
        language: 'TypeScript',
        code: `const questions = await client.ai.generateQuestions({
  subject: 'Mathematics',
  topic: 'Quadratic Equations',
  count: 20,
  difficulty: 'intermediate',
  question_type: 'mcq',
  curriculum: 'WAEC',
  blooms_level: 'Application',
})

console.log(\`Generated \${questions.data.length} questions\`)`,
        response: '{ "data": [{ "id": "q_abc", "content": "Solve x² + 5x + 6 = 0", "type": "mcq", ... }], "meta": { "generation_time_ms": 3200 } }',
      },
      {
        language: 'Python',
        code: `questions = client.ai.generate_questions(
    subject="Mathematics",
    topic="Quadratic Equations",
    count=20,
    difficulty="intermediate",
    question_type="mcq",
    curriculum="WAEC",
)

for q in questions.data:
    print(f"Q: {q.content}")`,
        response: '# 20 generated questions with answers and explanations',
      },
    ],
  },
  {
    method: 'POST',
    path: '/api/v1/ai/auto-mark',
    summary: 'Auto-mark student responses',
    description: 'Submit student responses for AI-powered marking. Handles objective, short-answer, and essay questions with confidence scoring.',
    tag: 'ai',
    auth: true,
    rateLimit: '30 req/min',
  },
  {
    method: 'POST',
    path: '/api/v1/ai/predict-risk',
    summary: 'Predict student risk scores',
    description: 'Get AI-predicted risk scores for students based on academic and behavioral signals. Requires Analytics add-on.',
    tag: 'ai',
    auth: true,
    rateLimit: '10 req/min',
  },
  // Analytics
  {
    method: 'GET',
    path: '/api/v1/analytics/dashboard',
    summary: 'Get dashboard data',
    description: 'Fetch aggregated analytics data for the school dashboard including student performance, exam statistics, and attendance summaries.',
    tag: 'analytics',
    auth: true,
    params: [
      { name: 'period', type: 'string', required: false, description: 'Time period (today, week, month, term, year)', example: 'term' },
      { name: 'class_id', type: 'string', required: false, description: 'Filter by class' },
    ],
    rateLimit: '60 req/min',
  },
  {
    method: 'GET',
    path: '/api/v1/analytics/performance',
    summary: 'Get performance analytics',
    description: 'Detailed student and class performance data with trend analysis, subject breakdowns, and comparison metrics.',
    tag: 'analytics',
    auth: true,
    rateLimit: '60 req/min',
  },
  // Webhooks
  {
    method: 'POST',
    path: '/api/v1/webhooks/configure',
    summary: 'Configure a webhook',
    description: 'Register a webhook endpoint to receive real-time event notifications for specified event types.',
    tag: 'webhooks',
    auth: true,
    requestBody: {
      contentType: 'application/json',
      schema: '{ url: string, events: string[], secret: string, active: boolean }',
      example: JSON.stringify({ url: 'https://your-app.com/webhooks/examforge', events: ['exam.completed', 'student.registered', 'payment.received'], secret: 'whsec_abc123...', active: true }, null, 2),
    },
    rateLimit: '30 req/min',
    codeExamples: [
      {
        language: 'TypeScript',
        code: `const webhook = await client.webhooks.configure({
  url: 'https://your-app.com/webhooks/examforge',
  events: ['exam.completed', 'student.registered'],
  secret: 'whsec_abc123...',
  active: true,
})`,
        response: '{ "id": "wh_abc123", "url": "https://your-app.com/...", "events": [...], "status": "active" }',
      },
    ],
  },
  {
    method: 'GET',
    path: '/api/v1/webhooks',
    summary: 'List configured webhooks',
    description: 'Retrieve all webhook configurations for the school, including delivery history and status.',
    tag: 'webhooks',
    auth: true,
    rateLimit: '100 req/min',
  },
  // Billing
  {
    method: 'GET',
    path: '/api/v1/billing/subscription',
    summary: 'Get subscription details',
    description: 'Retrieve current subscription plan, billing cycle, usage metrics, and renewal information.',
    tag: 'billing',
    auth: true,
    rateLimit: '30 req/min',
  },
  {
    method: 'GET',
    path: '/api/v1/billing/invoices',
    summary: 'List invoices',
    description: 'Retrieve invoice history with filtering by date range, status, and amount.',
    tag: 'billing',
    auth: true,
    rateLimit: '60 req/min',
  },
  // Schools
  {
    method: 'GET',
    path: '/api/v1/schools/{id}',
    summary: 'Get school details',
    description: 'Retrieve school profile, settings, configuration, and usage statistics.',
    tag: 'schools',
    auth: true,
    params: [{ name: 'id', type: 'string', required: true, description: 'School ID' }],
    rateLimit: '100 req/min',
  },
  {
    method: 'PATCH',
    path: '/api/v1/schools/{id}',
    summary: 'Update school settings',
    description: 'Update school configuration including branding, academic calendar, grading scales, and notification preferences.',
    tag: 'schools',
    auth: true,
    rateLimit: '30 req/min',
  },
  // Reports
  {
    method: 'POST',
    path: '/api/v1/reports/generate',
    summary: 'Generate a report',
    description: 'Create a custom report from templates or ad-hoc configurations. Supports student performance, attendance, financial, and exam analysis reports.',
    tag: 'reports',
    auth: true,
    requestBody: {
      contentType: 'application/json',
      schema: '{ template_id?: string, type: string, parameters: object, format: string }',
      example: JSON.stringify({ type: 'student_performance', parameters: { class_id: 'cls_ss2a', term: 'first', session: '2025/2026' }, format: 'pdf' }, null, 2),
    },
    rateLimit: '20 req/min',
  },
  {
    method: 'GET',
    path: '/api/v1/reports/{id}/download',
    summary: 'Download a generated report',
    description: 'Download a previously generated report in the requested format (PDF, CSV, Excel).',
    tag: 'reports',
    auth: true,
    params: [{ name: 'id', type: 'string', required: true, description: 'Report ID' }],
    rateLimit: '30 req/min',
  },
]

// ─── SDKs ───

export const sdks: SDKPackage[] = [
  {
    name: '@examforge/sdk',
    language: 'JavaScript / TypeScript',
    version: '3.2.0',
    installCommand: 'npm install @examforge/sdk',
    quickStart: `import { ExamForge } from '@examforge/sdk'

const client = new ExamForge({
  apiKey: process.env.EXAMFORGE_API_KEY,
})

// List students
const students = await client.students.list({ limit: 50 })

// Generate AI questions
const questions = await client.ai.generateQuestions({
  subject: 'Mathematics',
  topic: 'Quadratic Equations',
  count: 20,
  difficulty: 'intermediate',
})`,
    githubUrl: 'https://github.com/examforgeai/sdk-js',
    npmUrl: 'https://npmjs.com/package/@examforge/sdk',
    status: 'stable',
  },
  {
    name: 'examforge-python',
    language: 'Python',
    version: '3.1.0',
    installCommand: 'pip install examforge',
    quickStart: `import examforge

client = examforge.Client(
    api_key="ef_live_abc123...",
)

# List students
students = client.students.list(limit=50)

# Generate AI questions
questions = client.ai.generate_questions(
    subject="Mathematics",
    topic="Quadratic Equations",
    count=20,
    difficulty="intermediate",
)`,
    githubUrl: 'https://github.com/examforgeai/sdk-python',
    status: 'stable',
  },
  {
    name: 'examforge-php',
    language: 'PHP',
    version: '2.0.0',
    installCommand: 'composer require examforge/sdk',
    quickStart: `<?php
require_once 'vendor/autoload.php';

$client = new \\ExamForge\\Client([
    'api_key' => 'ef_live_abc123...',
]);

$students = $client->students->list(['limit' => 50]);`,
    githubUrl: 'https://github.com/examforgeai/sdk-php',
    status: 'beta',
  },
  {
    name: 'examforge-go',
    language: 'Go',
    version: '1.0.0',
    installCommand: 'go get github.com/examforgeai/sdk-go',
    quickStart: `package main

import (
    "context"
    "github.com/examforgeai/sdk-go/examforge"
)

func main() {
    client := examforge.NewClient("ef_live_abc123...")
    students, _ := client.Students.List(context.Background(), &examforge.StudentListParams{Limit: 50})
}`,
    githubUrl: 'https://github.com/examforgeai/sdk-go',
    status: 'beta',
  },
]

// ─── Webhook Events ───

export const webhookEvents: WebhookEvent[] = [
  {
    event: 'exam.completed',
    description: 'Fired when a student completes and submits an exam. Includes exam ID, student ID, score, and completion timestamp.',
    payloadExample: JSON.stringify({ event: 'exam.completed', data: { exam_id: 'exam_abc123', student_id: 'stu_xyz789', score: 78.5, max_score: 100, completed_at: '2026-03-15T10:30:00Z' }, timestamp: '2026-03-15T10:30:00Z' }, null, 2),
    triggerCondition: 'Student submits exam or auto-submit triggers at time expiry',
  },
  {
    event: 'exam.published',
    description: 'Fired when an exam is published and made available to students. Includes exam details and assigned class list.',
    payloadExample: JSON.stringify({ event: 'exam.published', data: { exam_id: 'exam_abc123', title: 'Mid-Term Mathematics', class_ids: ['cls_ss2a'], published_at: '2026-03-15T08:00:00Z' } }, null, 2),
    triggerCondition: 'Teacher or admin publishes a draft exam',
  },
  {
    event: 'student.registered',
    description: 'Fired when a new student is created or imported. Includes student profile data.',
    payloadExample: JSON.stringify({ event: 'student.registered', data: { student_id: 'stu_abc123', name: 'Chidinma Okafor', class_id: 'cls_ss2a', admission_number: 'ADM/2026/001' } }, null, 2),
    triggerCondition: 'Student created via API, manual entry, or CSV import',
  },
  {
    event: 'payment.received',
    description: 'Fired when a payment is successfully processed. Includes payment details, invoice reference, and amount.',
    payloadExample: JSON.stringify({ event: 'payment.received', data: { payment_id: 'pay_abc123', invoice_id: 'inv_xyz789', amount: 14900, currency: 'NGN', method: 'card' } }, null, 2),
    triggerCondition: 'Flutterwave or bank transfer payment confirmed',
  },
  {
    event: 'question.generated',
    description: 'Fired when AI question generation completes. Includes generated question IDs and generation metadata.',
    payloadExample: JSON.stringify({ event: 'question.generated', data: { request_id: 'req_abc123', question_count: 20, subject: 'Mathematics', topic: 'Quadratic Equations', generation_time_ms: 3200 } }, null, 2),
    triggerCondition: 'AI question generation request completes',
  },
  {
    event: 'student.risk.alert',
    description: 'Fired when the predictive analytics module detects a student crossing a risk threshold. Includes risk score and identified factors.',
    payloadExample: JSON.stringify({ event: 'student.risk.alert', data: { student_id: 'stu_abc123', risk_level: 'high', risk_score: 0.82, factors: ['declining_grades', 'attendance_change'], recommended_actions: ['tutoring_referral'] } }, null, 2),
    triggerCondition: 'Student risk score crosses configured alert threshold',
  },
]

// ─── Helper Functions ───

export function getEndpointsByTag(tag: string): APIEndpoint[] {
  if (tag === 'all') return endpoints
  return endpoints.filter(e => e.tag === tag)
}

export function getEndpointByPath(path: string): APIEndpoint | undefined {
  return endpoints.find(e => e.path === path)
}
