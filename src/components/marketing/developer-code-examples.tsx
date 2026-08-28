'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CodeBlock } from '@/components/docs/code-block'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

// ============================================================================
// ExamForge AI — Developer Code Examples (Client Component)
// ============================================================================

type Category = 'authentication' | 'students' | 'exams' | 'ai' | 'webhooks' | 'analytics'

interface CodeExample {
  category: Category
  title: string
  description: string
  tsCode: string
  pyCode: string
}

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'authentication', label: 'Authentication' },
  { value: 'students', label: 'Student CRUD' },
  { value: 'exams', label: 'Exam Creation' },
  { value: 'ai', label: 'AI Question Gen' },
  { value: 'webhooks', label: 'Webhook Handling' },
  { value: 'analytics', label: 'Analytics' },
]

const examples: CodeExample[] = [
  {
    category: 'authentication',
    title: 'API Key Authentication',
    description: 'Initialize the client with your API key for server-to-server communication.',
    tsCode: `import { ExamForge } from '@examforge/sdk'

const client = new ExamForge({
  apiKey: process.env.EXAMFORGE_API_KEY!,
})

// Verify your API key is working
const me = await client.auth.verify()
console.log(\`Authenticated as \${me.school_name}\`)`,
    pyCode: `import examforge

client = examforge.Client(
    api_key="ef_live_abc123...",
)

# Verify your API key is working
me = client.auth.verify()
print(f"Authenticated as {me.school_name}")`,
  },
  {
    category: 'authentication',
    title: 'OAuth 2.0 Flow',
    description: 'Implement OAuth 2.0 for third-party applications that need delegated access.',
    tsCode: `import { ExamForge } from '@examforge/sdk'

// Generate authorization URL
const authUrl = client.auth.getAuthorizationUrl({
  scope: ['students:read', 'exams:read', 'exams:write'],
  redirect_uri: 'https://your-app.com/callback',
})

// After user grants access, exchange code for tokens
const tokens = await client.auth.exchangeCode(authCode)
console.log(\`Access token: \${tokens.access_token}\`)`,
    pyCode: `import examforge

# Generate authorization URL
auth_url = client.auth.get_authorization_url(
    scope=["students:read", "exams:read", "exams:write"],
    redirect_uri="https://your-app.com/callback",
)

# After user grants access, exchange code for tokens
tokens = client.auth.exchange_code(auth_code)
print(f"Access token: {tokens.access_token}")`,
  },
  {
    category: 'students',
    title: 'List Students with Filters',
    description: 'Retrieve a paginated list of students with filtering and sorting.',
    tsCode: `const students = await client.students.list({
  class_id: 'cls_ss2a',
  status: 'active',
  limit: 50,
  sort: 'name:asc',
})

for (const student of students.data) {
  console.log(\`\${student.first_name} \${student.last_name}\`)
}
console.log(\`Total: \${students.meta.total} students\`)`,
    pyCode: `students = client.students.list(
    class_id="cls_ss2a",
    status="active",
    limit=50,
    sort="name:asc",
)

for student in students.data:
    print(f"{student.first_name} {student.last_name}")
print(f"Total: {students.meta.total} students")`,
  },
  {
    category: 'students',
    title: 'Create a Student',
    description: 'Register a new student with profile information and class assignment.',
    tsCode: `const student = await client.students.create({
  first_name: 'Chidinma',
  last_name: 'Okafor',
  admission_number: 'ADM/2026/001',
  class_id: 'cls_ss2a',
  date_of_birth: '2008-03-15',
  gender: 'female',
  parent_contact: {
    name: 'Mr. Okafor',
    email: 'okafor@example.com',
    phone: '+2348012345678',
  },
})

console.log(\`Created student: \${student.id}\`)`,
    pyCode: `student = client.students.create(
    first_name="Chidinma",
    last_name="Okafor",
    admission_number="ADM/2026/001",
    class_id="cls_ss2a",
    date_of_birth="2008-03-15",
    gender="female",
    parent_contact={
        "name": "Mr. Okafor",
        "email": "okafor@example.com",
        "phone": "+2348012345678",
    },
)

print(f"Created student: {student.id}")`,
  },
  {
    category: 'exams',
    title: 'Create and Publish an Exam',
    description: 'Create an exam with questions, configure settings, and publish to students.',
    tsCode: `const exam = await client.exams.create({
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
})

// Add questions from the question bank
await client.exams.addQuestions(exam.id, {
  question_ids: ['q_001', 'q_002', 'q_003'],
})

// Publish the exam
await client.exams.publish(exam.id)
console.log(\`Exam \${exam.id} is now live\`)`,
    pyCode: `exam = client.exams.create(
    title="Mid-Term Mathematics",
    subject_id="sub_math",
    class_ids=["cls_ss2a", "cls_ss2b"],
    duration_minutes=60,
    settings={
        "shuffle": True,
        "auto_mark": True,
        "anti_cheat": {
            "tab_detect": True,
            "copy_paste_block": True,
        },
    },
)

# Add questions from the question bank
client.exams.add_questions(exam.id, question_ids=["q_001", "q_002", "q_003"])

# Publish the exam
client.exams.publish(exam.id)
print(f"Exam {exam.id} is now live")`,
  },
  {
    category: 'exams',
    title: 'Get Exam Results',
    description: 'Retrieve exam results with scores and analytics for a completed exam.',
    tsCode: `const results = await client.exams.getResults('exam_abc123', {
  format: 'json',
})

console.log(\`Average score: \${results.summary.average}%\`)
console.log(\`Pass rate: \${results.summary.pass_rate}%\`)
console.log(\`Students: \${results.data.length}\`)

// Get individual student result
const studentResult = results.data.find(r => r.student_id === 'stu_xyz')
console.log(\`Score: \${studentResult.score}%\`)`,
    pyCode: `results = client.exams.get_results(
    "exam_abc123",
    format="json",
)

print(f"Average score: {results.summary.average}%")
print(f"Pass rate: {results.summary.pass_rate}%")
print(f"Students: {len(results.data)}")

# Get individual student result
student_result = next(
    r for r in results.data if r.student_id == "stu_xyz"
)
print(f"Score: {student_result.score}%")`,
  },
  {
    category: 'ai',
    title: 'Generate Questions with AI',
    description: 'Use AI to generate exam questions based on subject, topic, and curriculum standards.',
    tsCode: `const questions = await client.ai.generateQuestions({
  subject: 'Mathematics',
  topic: 'Quadratic Equations',
  count: 20,
  difficulty: 'intermediate',
  question_type: 'mcq',
  curriculum: 'WAEC',
  blooms_level: 'Application',
})

console.log(\`Generated \${questions.data.length} questions\`)

// Review and add to question bank
for (const q of questions.data) {
  console.log(\`Q: \${q.content}\`)
  console.log(\`Difficulty: \${q.difficulty}, Bloom's: \${q.blooms_level}\`)
}`,
    pyCode: `questions = client.ai.generate_questions(
    subject="Mathematics",
    topic="Quadratic Equations",
    count=20,
    difficulty="intermediate",
    question_type="mcq",
    curriculum="WAEC",
    blooms_level="Application",
)

print(f"Generated {len(questions.data)} questions")

# Review and add to question bank
for q in questions.data:
    print(f"Q: {q.content}")
    print(f"Difficulty: {q.difficulty}, Bloom's: {q.blooms_level}")`,
  },
  {
    category: 'ai',
    title: 'Auto-Mark Student Responses',
    description: 'Submit student responses for AI-powered marking with confidence scoring.',
    tsCode: `const result = await client.ai.autoMark({
  exam_id: 'exam_abc123',
  student_id: 'stu_xyz789',
  responses: [
    { question_id: 'q_001', answer: 'x = -2 or x = -3' },
    { question_id: 'q_002', answer: 'The vertex is at (-2.5, -0.25)' },
  ],
})

console.log(\`Score: \${result.total_score}/\${result.max_score}\`)
for (const mark of result.marks) {
  console.log(\`Q\${mark.question_id}: \${mark.score} (\${mark.confidence}% confidence)\`)
}`,
    pyCode: `result = client.ai.auto_mark(
    exam_id="exam_abc123",
    student_id="stu_xyz789",
    responses=[
        {"question_id": "q_001", "answer": "x = -2 or x = -3"},
        {"question_id": "q_002", "answer": "The vertex is at (-2.5, -0.25)"},
    ],
)

print(f"Score: {result.total_score}/{result.max_score}")
for mark in result.marks:
    print(f"Q{mark.question_id}: {mark.score} ({mark.confidence}% confidence)")`,
  },
  {
    category: 'webhooks',
    title: 'Configure Webhooks',
    description: 'Set up webhook endpoints to receive real-time event notifications.',
    tsCode: `const webhook = await client.webhooks.configure({
  url: 'https://your-app.com/webhooks/examforge',
  events: ['exam.completed', 'student.registered', 'payment.received'],
  secret: 'whsec_abc123...',
  active: true,
})

console.log(\`Webhook \${webhook.id} configured\`)`,
    pyCode: `webhook = client.webhooks.configure(
    url="https://your-app.com/webhooks/examforge",
    events=["exam.completed", "student.registered", "payment.received"],
    secret="whsec_abc123...",
    active=True,
)

print(f"Webhook {webhook.id} configured")`,
  },
  {
    category: 'webhooks',
    title: 'Verify Webhook Signatures',
    description: 'Verify incoming webhook payloads to ensure they are from ExamForge AI.',
    tsCode: `import { verifyWebhookSignature } from '@examforge/sdk'

// In your webhook handler (e.g., Express.js)
app.post('/webhooks/examforge', (req, res) => {
  const signature = req.headers['x-examforge-signature']
  const payload = JSON.stringify(req.body)

  const isValid = verifyWebhookSignature({
    payload,
    signature,
    secret: process.env.WEBHOOK_SECRET!,
  })

  if (!isValid) {
    return res.status(401).send('Invalid signature')
  }

  // Process the verified event
  const event = req.body
  console.log(\`Received: \${event.event}\`)
  res.json({ received: true })
})`,
    pyCode: `from examforge import verify_webhook_signature
from flask import Flask, request

app = Flask(__name__)

@app.route("/webhooks/examforge", methods=["POST"])
def handle_webhook():
    signature = request.headers.get("x-examforge-signature")
    payload = request.get_data(as_text=True)

    is_valid = verify_webhook_signature(
        payload=payload,
        signature=signature,
        secret=os.environ["WEBHOOK_SECRET"],
    )

    if not is_valid:
        return "Invalid signature", 401

    # Process the verified event
    event = request.get_json()
    print(f"Received: {event['event']}")
    return {"received": True}`,
  },
  {
    category: 'analytics',
    title: 'Get Dashboard Data',
    description: 'Fetch aggregated analytics data for the school dashboard.',
    tsCode: `const dashboard = await client.analytics.dashboard({
  period: 'term',
  class_id: 'cls_ss2a',
})

console.log(\`Average GPA: \${dashboard.performance.average_gpa}\`)
console.log(\`Exam completion rate: \${dashboard.exams.completion_rate}%\`)
console.log(\`At-risk students: \${dashboard.students.at_risk_count}\`)`,
    pyCode: `dashboard = client.analytics.dashboard(
    period="term",
    class_id="cls_ss2a",
)

print(f"Average GPA: {dashboard.performance.average_gpa}")
print(f"Exam completion rate: {dashboard.exams.completion_rate}%")
print(f"At-risk students: {dashboard.students.at_risk_count}")`,
  },
  {
    category: 'analytics',
    title: 'Predict Student Risk Scores',
    description: 'Get AI-predicted risk scores for students based on academic and behavioral signals.',
    tsCode: `const riskScores = await client.ai.predictRisk({
  class_id: 'cls_ss2a',
  threshold: 0.7,
})

for (const student of riskScores.data) {
  console.log(\`\${student.name}: risk=\${student.risk_score}, level=\${student.risk_level}\`)
  if (student.risk_level === 'high') {
    console.log(\`  Recommended: \${student.recommended_actions.join(', ')}\`)
  }
}`,
    pyCode: `risk_scores = client.ai.predict_risk(
    class_id="cls_ss2a",
    threshold=0.7,
)

for student in risk_scores.data:
    print(f"{student.name}: risk={student.risk_score}, level={student.risk_level}")
    if student.risk_level == "high":
        print(f"  Recommended: {', '.join(student.recommended_actions)}")`,
  },
]

export function DeveloperCodeExamples() {
  const [activeCategory, setActiveCategory] = useState<Category>('authentication')

  const filteredExamples = examples.filter((ex) => ex.category === activeCategory)

  return (
    <div className="max-w-4xl mx-auto">
      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 justify-center mb-8" role="tablist" aria-label="Filter code examples by category">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            role="tab"
            aria-selected={activeCategory === cat.value}
            onClick={() => setActiveCategory(cat.value)}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
              activeCategory === cat.value
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Code Examples with Language Tabs */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeCategory}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="space-y-8"
        >
          {filteredExamples.map((example) => (
            <div key={example.title}>
              <h3 className="text-base font-semibold mb-1">{example.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">{example.description}</p>
              <Tabs defaultValue="ts" className="w-full">
                <TabsList className="mb-0">
                  <TabsTrigger value="ts">TypeScript</TabsTrigger>
                  <TabsTrigger value="py">Python</TabsTrigger>
                </TabsList>
                <TabsContent value="ts">
                  <CodeBlock
                    code={example.tsCode}
                    language="ts"
                    filename={`${example.title.replace(/\s+/g, '-').toLowerCase()}.ts`}
                    showLineNumbers
                  />
                </TabsContent>
                <TabsContent value="py">
                  <CodeBlock
                    code={example.pyCode}
                    language="py"
                    filename={`${example.title.replace(/\s+/g, '_').toLowerCase()}.py`}
                    showLineNumbers
                  />
                </TabsContent>
              </Tabs>
            </div>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
