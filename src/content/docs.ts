// =============================================================================
// ExamForge AI — Documentation Content Data Layer
// =============================================================================

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DocsDifficulty = "beginner" | "intermediate" | "advanced";

export interface DocsCodeExample {
  language: string;
  code: string;
}

export interface DocsArticle {
  slug: string;
  title: string;
  description: string;
  category: string;
  section: string;
  content: string;
  codeExamples: DocsCodeExample[];
  lastUpdated: string;
  readTime: number;
  difficulty: DocsDifficulty;
}

export interface DocsSection {
  slug: string;
  title: string;
  description: string;
  articles: DocsArticle[];
}

export interface DocsCategory {
  slug: string;
  title: string;
  description: string;
  icon: string;
  order: number;
  sections: DocsSection[];
}

// ---------------------------------------------------------------------------
// Articles (40+)
// ---------------------------------------------------------------------------

const articles: DocsArticle[] = [
  // ── Getting Started ──────────────────────────────────────────────────
  {
    slug: "quick-start-guide",
    title: "Quick Start Guide",
    description: "Get ExamForge up and running in under 10 minutes with this step-by-step walkthrough.",
    category: "getting-started",
    section: "setup",
    content: `Welcome to ExamForge AI — the platform that powers computer-based testing for over 400 Nigerian and African institutions. This guide will walk you through creating an account, setting up your first school, and scheduling a practice exam in under 10 minutes. You do not need any technical expertise; if you can use a web browser, you can use ExamForge.

First, visit app.examforge.ai and click "Create Account". Choose your role — School Administrator, Teacher, or Student — and enter your details. You will receive a verification email within 60 seconds. Click the link to activate your account and set your password.

Next, if you are an administrator, you will be prompted to create your school profile. Enter your institution name, address, and the examination bodies you are affiliated with (WAEC, NECO, JAMB, or custom). This information tailors the platform's syllabus alignment and reporting to your specific context.

Finally, navigate to Exams → Create Exam. Select a subject (e.g., WAEC Mathematics), choose a question source (AI-generated, manual, or from your item bank), set the duration and schedule, and click Publish. Your first exam is now live and ready for students.`,
    codeExamples: [
      {
        language: "bash",
        code: `# Install the ExamForge CLI (optional, for power users)
npm install -g @examforge/cli

# Authenticate
examforge login --email admin@myschool.edu.ng

# Create a school profile
examforge school:create --name "Grace International School" --city Abuja --exam-body WAEC`,
      },
    ],
    lastUpdated: "2025-02-15",
    readTime: 5,
    difficulty: "beginner",
  },
  {
    slug: "system-requirements",
    title: "System Requirements",
    description: "Hardware, browser, and network requirements for running ExamForge in your school.",
    category: "getting-started",
    section: "setup",
    content: `ExamForge is a web-based platform that runs entirely in the browser — no software installation is required. However, to ensure a smooth exam-day experience, your school's computers and network should meet the following minimum requirements.

For client devices, we recommend a modern browser (Chrome 90+, Firefox 88+, Edge 90+, or Safari 15+), at least 2 GB of RAM, and a screen resolution of 1024×768 or higher. For proctored exams, a webcam (640×480 minimum) and a stable internet connection of at least 1 Mbps are required. Offline exams can be taken without any internet connection after the exam package has been downloaded.

On the network side, ExamForge's exam client uses minimal bandwidth — approximately 50 KB per question load. A school with 100 concurrent exam sessions needs roughly 5 Mbps of dedicated bandwidth. We strongly recommend a wired Ethernet connection for exam-day computers; Wi-Fi is acceptable but should be on a dedicated SSID with QoS prioritisation.

For large-scale deployments (500+ concurrent sessions), we recommend our Edge Server appliance — a pre-configured Raspberry Pi 4 cluster that caches exam content locally, eliminating dependency on the external internet entirely during exam sessions.`,
    codeExamples: [],
    lastUpdated: "2025-01-20",
    readTime: 4,
    difficulty: "beginner",
  },
  {
    slug: "account-setup-roles",
    title: "Account Setup & Roles",
    description: "Understand the four user roles in ExamForge and configure permissions for your team.",
    category: "getting-started",
    section: "setup",
    content: `ExamForge uses role-based access control (RBAC) with four default roles: School Administrator, Teacher, Student, and Parent Observer. Each role has a distinct set of permissions designed to match real-world school responsibilities.

The School Administrator has full access: they can create and manage user accounts, configure school settings, schedule exams, view all analytics, and manage billing. Administrators can also create custom roles with granular permissions — for example, a "Department Head" role that can view analytics for their department only.

Teachers can create and author exams, manage question banks, view results for their assigned classes, and generate reports. They cannot modify school-wide settings or access billing information. Teachers can be assigned to one or more subjects and classes, which determines which student data they can view.

Students can take exams, view their own results and analytics, and access practice mode. They cannot see other students' data, question banks, or exam configurations before the exam starts. Student accounts can be created individually or bulk-imported via CSV.

Parent Observers can view their child's results and attendance but cannot take exams or modify any data. Parent accounts are linked to one or more student accounts and receive automatic email notifications when results are published.`,
    codeExamples: [],
    lastUpdated: "2025-02-01",
    readTime: 5,
    difficulty: "beginner",
  },
  {
    slug: "migrating-from-paper",
    title: "Migrating from Paper-Based Exams",
    description: "A practical guide for schools transitioning from paper exams to CBT with ExamForge.",
    category: "getting-started",
    section: "migration",
    content: `Transitioning from paper-based examinations to computer-based testing is a significant change for any institution. This guide distils lessons from over 200 successful migrations across Nigerian schools and universities to help you plan and execute your own transition with confidence.

Start with a readiness assessment. Audit your current exam process: how many exams per term, average student count per exam, question formats (objective, essay, practical), and result-processing time. This baseline lets you measure improvement post-migration and identify which exams to migrate first.

We recommend a phased approach: begin with high-enrolment objective-format courses (typically 100-level General Studies or core secondary-school subjects). These exams map naturally to CBT and deliver the fastest time savings. Once faculty and students are comfortable, expand to essay-format and practical exams.

Staff training is the most critical success factor. Schedule a 3-day workshop for exam officers and key faculty covering: question authoring in the platform, exam scheduling and invigilation, and result interpretation. ExamForge provides complimentary training for institutions on our Enterprise plan.

Finally, run parallel exams for at least one term — administering the same exam on paper and via CBT to different sections — to validate that CBT results are consistent with paper-based outcomes. Every institution we have worked with has found correlation coefficients above 0.95, but running your own validation builds stakeholder confidence.`,
    codeExamples: [],
    lastUpdated: "2025-01-10",
    readTime: 8,
    difficulty: "intermediate",
  },
  {
    slug: "importing-existing-question-banks",
    title: "Importing Existing Question Banks",
    description: "Bring your school's existing questions into ExamForge from Word, PDF, or Excel formats.",
    category: "getting-started",
    section: "migration",
    content: `Most schools have years of accumulated exam questions stored in Word documents, PDFs, or spreadsheets. ExamForge's import tools can parse these materials and convert them into structured, syllabus-tagged items in your question bank — preserving the investment you have already made in content.

The Word/PDF importer uses optical character recognition (OCR) enhanced for exam-format documents. It can identify question numbers, stem text, options (A–D), correct answers, and images or diagrams. The importer supports Nigerian English conventions and handles common formatting quirks (e.g., questions that span multiple pages). Upload your files, review the auto-parsed output in a side-by-side editor, correct any misrecognitions, and approve the batch.

The Excel/CSV importer is ideal for structured question banks. Prepare a spreadsheet with columns: Question, OptionA, OptionB, OptionC, OptionD, CorrectAnswer, Subject, Topic, Difficulty. ExamForge maps each row to an item and auto-generates syllabus tags. A validation pass checks for missing fields, duplicate questions, and invalid difficulty values before import.

After import, every item goes through the same quality pipeline as AI-generated questions: syllabus alignment check, bias screening, and psychometric pre-testing in low-stakes practice exams. Items that pass are certified for use in live exams; items that fail are flagged for editorial review.`,
    codeExamples: [
      {
        language: "typescript",
        code: `import { ExamForge } from '@examforge/sdk';

const client = new ExamForge({ apiKey: process.env.EXAMFORGE_API_KEY });

// Upload a Word document for import
const importJob = await client.imports.create({
  file: './questions/waec-math-2024.docx',
  subject: 'mathematics',
  examBody: 'WAEC',
  format: 'docx',
});

// Check import status
const status = await client.imports.getStatus(importJob.id);
console.log(\`Imported \${status.itemsImported} items, \${status.itemsFlagged} flagged for review\`);`,
      },
    ],
    lastUpdated: "2025-02-08",
    readTime: 6,
    difficulty: "intermediate",
  },

  // ── CBT Platform ─────────────────────────────────────────────────────
  {
    slug: "creating-and-scheduling-exams",
    title: "Creating & Scheduling Exams",
    description: "Step-by-step instructions for creating an exam, configuring settings, and scheduling sessions.",
    category: "cbt-platform",
    section: "exam-management",
    content: `Creating an exam in ExamForge is a three-step process: define the exam structure, populate it with questions, and schedule one or more sessions for students to take it.

Step 1 — Define the Exam Structure: Navigate to Exams → Create Exam. Enter the exam title, select the subject and class level, and choose the examination body (WAEC, NECO, JAMB, or Custom). Set the exam duration (in minutes), the passing score threshold, and the attempt policy (single attempt or multiple attempts with best-score retention). You can also configure exam-level settings: randomise question order, randomise option order, enable section timers, and allow question review before submission.

Step 2 — Populate Questions: Choose your question source. Options include: (a) AI-Generate — the platform creates a question set based on your syllabus and difficulty profile; (b) Manual Author — you write or select questions one by one; (c) Item Bank — you draw from your school's pre-certified question bank using filters for topic, difficulty, and cognitive level. You can mix sources — for example, AI-generate 70% of items and manually add 30% from your bank.

Step 3 — Schedule Sessions: Create one or more exam sessions, each with a specific date, time window, and assigned student group. You can schedule multiple sessions to accommodate different shifts or days. The platform supports staggered starts (students can begin within a configurable window rather than all at once) and make-up sessions for absent students.`,
    codeExamples: [
      {
        language: "typescript",
        code: `const exam = await client.exams.create({
  title: 'WAEC Mathematics Mock Exam — Term 2',
  subject: 'mathematics',
  examBody: 'WAEC',
  classLevel: 'SS3',
  duration: 120, // minutes
  passingScore: 50,
  settings: {
    randomizeQuestions: true,
    randomizeOptions: true,
    allowReview: true,
    attemptPolicy: 'single',
  },
});

// Schedule a session
await client.exams.schedule(exam.id, {
  date: '2025-03-15',
  startTime: '09:00',
  endTime: '12:00',
  studentGroup: 'SS3-A',
  staggerWindow: 30, // students can start within 30 mins of startTime
});`,
      },
    ],
    lastUpdated: "2025-02-12",
    readTime: 7,
    difficulty: "beginner",
  },
  {
    slug: "question-types-and-formats",
    title: "Question Types & Formats",
    description: "A complete reference for all question types supported by ExamForge, from multiple-choice to interactive diagrams.",
    category: "cbt-platform",
    section: "exam-management",
    content: `ExamForge supports 12 question types, covering every format used in Nigerian examinations from WAEC objective papers to university lab assessments.

Multiple Choice (Single Answer) — The most common format. Students select one option from A–E. Supports images in both the stem and options. Used for WAEC and NECO objective papers.

Multiple Choice (Multiple Answers) — Students select two or more correct options. Common in JAMB Use of English and university entrance exams. The scoring policy is configurable: exact match (all correct, no incorrect), partial credit (proportional to correct selections), or negative marking for incorrect selections.

Fill in the Blank — Students type a short answer. The marking engine supports exact match, case-insensitive match, numeric tolerance (for science calculations), and regex patterns for flexible matching.

Essay / Extended Response — Students write a free-text response in a rich-text editor. Essay questions are not auto-marked; they are assigned to a human grader via the marking workflow. AI-assisted scoring is available as a beta feature for English Language essays, providing a preliminary score that the grader can accept, adjust, or override.

Drag and Drop — Students drag labels onto a diagram or sort items into categories. Used for biology labelling (e.g., parts of the human heart) and chemistry (e.g., sorting elements by periodic-table groups).

Matching — Students match items in Column A with corresponding items in Column B. Each match is scored independently, allowing partial credit.

Numeric Entry — Students enter a number. Supports tolerance ranges (e.g., accept 3.14 ± 0.01 for π) and unit checking.

File Upload — Students upload a document (PDF, Word, image). Used for practical submissions, project reports, and artwork.

True/False — A simplified binary-choice format. Supports justification fields where students must explain their reasoning.

Hotspot / Image Click — Students click on a specific region of an image. Used for geography map questions and anatomy identification.

Composite — A single prompt with multiple sub-questions of different types. Common in WAEC Mathematics (Part A: objective, Part B: theory).

Audio Response — Students record an audio response via microphone. Used for oral French and Nigerian-language examinations.`,
    codeExamples: [],
    lastUpdated: "2025-02-05",
    readTime: 6,
    difficulty: "beginner",
  },
  {
    slug: "exam-day-operations",
    title: "Exam Day Operations",
    description: "Everything you need to know to run a smooth exam day — from pre-flight checks to post-exam procedures.",
    category: "cbt-platform",
    section: "exam-management",
    content: `A successful exam day is 90% preparation and 10% execution. This guide covers the operational checklist that our most experienced school administrators follow before, during, and after every exam session.

Pre-Exam (24 hours before): Run the ExamForge System Check on every device that will be used. This lightweight tool verifies browser compatibility, webcam access (for proctored exams), network latency to the nearest ExamForge edge server, and available disk space for offline caching. Flag any devices that fail and switch them to spares. Confirm that all student accounts are active and assigned to the correct exam session. Download the exam package to local cache (recommended even for online sessions, as a fallback).

Pre-Exam (30 minutes before): Open the Invigilator Dashboard and verify that the exam session status is "Ready". Check the live device-count indicator — it should match your expected student count. Conduct a 5-minute briefing for students: remind them of the exam rules, demonstrate the exam interface (timer, navigation, flag-for-review), and confirm that every student can log in.

During Exam: Monitor the Invigilator Dashboard for alerts. Common alerts include: student disconnected (usually a network blip — the exam continues on local cache and syncs on reconnection), proctoring flag (tab switch, multiple faces, off-screen gaze), and timer-warning (a student has less than 5 minutes remaining). For proctoring alerts, approach the student discreetly and verify the situation before taking action.

Post-Exam: Once all students have submitted (or the timer has expired), verify that the session status shows "Completed" and that the submission count matches your student count. If any submissions show "Pending Sync" (usually due to network issues), wait 15 minutes for automatic retry; if still pending, use the Manual Sync tool to pull the student's encrypted local data. Results are typically available within 5 minutes for objective exams and 48 hours for essay exams.`,
    codeExamples: [],
    lastUpdated: "2025-01-28",
    readTime: 8,
    difficulty: "intermediate",
  },
  {
    slug: "exam-integrity-proctoring",
    title: "Exam Integrity & Proctoring",
    description: "Configure AI proctoring, browser lockdown, and anti-cheating measures for high-stakes exams.",
    category: "cbt-platform",
    section: "proctoring",
    content: `ExamForge provides a layered integrity system that combines browser-level restrictions, AI-powered proctoring, and human invigilation to ensure that every exam result reflects genuine student ability.

Browser Lockdown: When the lockdown mode is enabled, the exam client runs in a restricted browser environment. Students cannot open new tabs, switch applications, copy or paste text, take screenshots, or access external websites. The lockdown is implemented via the ExamForge Secure Browser (a Chromium-based kiosk application) or via browser extensions for Chrome and Firefox. Secure Browser is recommended for high-stakes exams; the extension is suitable for school-level assessments.

AI Proctoring: The proctoring engine monitors three channels during the exam. First, webcam video is analysed at 30 fps for face detection (single face required), gaze estimation (on-screen vs. off-screen), and identity verification (matching the enrollment photo). Second, browser telemetry tracks tab switches, window focus changes, and copy/paste attempts. Third, keystroke dynamics are compared against the student's typing profile captured at login. Anomalies are flagged to the invigilator dashboard in real time with a confidence score and a thumbnail snapshot.

Randomisation: Even with perfect proctoring, students sitting side-by-side can copy from each other if they see the same questions. ExamForge addresses this with three randomisation strategies: question-order randomisation (each student sees questions in a different order), option-order randomisation (the position of correct and distractor options is shuffled), and parallel-forms (different students receive different but psychometrically equivalent questions drawn from the same item bank). For JAMB-level security, we recommend all three.

Human Invigilation: AI proctoring augments but does not replace human invigilators. The Invigilator Dashboard gives invigilators real-time visibility into every student's session — progress, alerts, and proctoring flags — enabling them to focus their attention where it is most needed rather than walking the aisles blindly.`,
    codeExamples: [],
    lastUpdated: "2025-02-10",
    readTime: 7,
    difficulty: "intermediate",
  },

  // ── AI Features ──────────────────────────────────────────────────────
  {
    slug: "ai-question-generation",
    title: "AI Question Generation",
    description: "Generate curriculum-aligned exam questions in seconds using ExamForge's AI engine.",
    category: "ai-features",
    section: "generation",
    content: `ExamForge's AI question-generation engine can produce hundreds of syllabus-aligned, psychometrically calibrated questions in minutes — a task that would take a human examiner days. This guide explains how to use the engine, configure generation parameters, and review the output.

To generate questions, navigate to Question Bank → AI Generate. Select the subject, class level, and syllabus topics you want to cover. Configure the generation parameters: number of items (10–200), difficulty distribution (easy/medium/hard ratio), cognitive level targets (Bloom's Taxonomy), and question types (multiple choice, fill-in-the-blank, essay prompt, etc.). Click Generate and the engine will produce a draft set within 2–5 minutes.

Every generated item passes through a five-stage quality pipeline before entering your item bank: syllabus alignment check, cognitive demand calibration, bias and sensitivity screening, psychometric pre-testing, and human expert review sampling. You can configure the pipeline strictness: "Standard" mode accepts items that pass all automated stages (suitable for school-level exams), while "WAEC Rigour" mode requires 100% human review before certification (recommended for external examination preparation).

You retain full editorial control over every generated item. The review interface shows the question, the AI's confidence scores for each quality gate, and any flags. You can edit the question text, adjust the correct answer, replace distractors, or reject the item entirely. Accepted items are tagged with their source ("AI-Generated") and quality scores, giving you full traceability.`,
    codeExamples: [
      {
        language: "typescript",
        code: `const generated = await client.ai.generateQuestions({
  subject: 'physics',
  classLevel: 'SS2',
  examBody: 'WAEC',
  topics: ['waves', 'sound', 'light'],
  count: 50,
  difficulty: { easy: 0.2, medium: 0.5, hard: 0.3 },
  cognitiveLevels: { remember: 0.1, understand: 0.2, apply: 0.3, analyse: 0.25, evaluate: 0.15 },
  questionType: 'multiple-choice',
});

console.log(\`Generated \${generated.items.length} items, \${generated.flagged} flagged for review\`);`,
      },
    ],
    lastUpdated: "2025-02-15",
    readTime: 7,
    difficulty: "intermediate",
  },
  {
    slug: "adaptive-testing-configuration",
    title: "Adaptive Testing Configuration",
    description: "Set up and configure adaptive (CAT) exams that adjust difficulty in real time based on student responses.",
    category: "ai-features",
    section: "adaptive",
    content: `Computerised Adaptive Testing (CAT) is the gold standard for precise ability measurement. Instead of every student answering the same fixed set of questions, a CAT exam selects each item based on the student's previous responses, converging on their true ability estimate with fewer items and greater precision.

To create an adaptive exam, navigate to Exams → Create Exam → Adaptive Mode. You will need to configure three components: the item bank, the selection algorithm, and the stopping rule.

Item Bank Requirements: Adaptive exams require large, well-calibrated item banks. Each item must have IRT parameters (difficulty, discrimination, guessing) estimated from real student response data. ExamForge requires a minimum of 200 items per adaptive exam, with at least 20 items at each difficulty decile. The platform's item analysis engine automatically estimates IRT parameters from practice-exam response data; items with insufficient data (<30 responses) are excluded from adaptive pools.

Selection Algorithm: We support two algorithms: Maximum Information (the classic approach that selects the item providing the most information at the current ability estimate) and Content-Balanced (which adds a constraint to maintain proportional coverage across content domains — essential for WAEC and NECO exams that must cover the full syllabus). For most Nigerian examinations, Content-Balanced is recommended.

Stopping Rule: Configure when the exam ends. Options include: fixed number of items (e.g., 30 items), minimum precision (stop when the standard error of measurement falls below a threshold, e.g., 0.3), or time limit. You can combine rules — for example, "stop after 30 items OR when SEM < 0.3, whichever comes first."`,
    codeExamples: [
      {
        language: "typescript",
        code: `const adaptiveExam = await client.exams.create({
  title: 'JAMB Mathematics — Adaptive',
  mode: 'adaptive',
  subject: 'mathematics',
  examBody: 'JAMB',
  adaptiveConfig: {
    itemBank: 'math-jamb-2025',
    selectionAlgorithm: 'content-balanced',
    contentConstraints: [
      { topic: 'algebra', proportion: 0.30 },
      { topic: 'geometry', proportion: 0.25 },
      { topic: 'trigonometry', proportion: 0.20 },
      { topic: 'statistics', proportion: 0.25 },
    ],
    stoppingRule: {
      maxItems: 30,
      minPrecision: 0.3, // SEM threshold
    },
    exposureControl: 'syed-geometric', // prevents item overexposure
  },
});`,
      },
    ],
    lastUpdated: "2025-01-30",
    readTime: 9,
    difficulty: "advanced",
  },
  {
    slug: "automated-essay-scoring",
    title: "Automated Essay Scoring",
    description: "Use AI to score extended-response and essay questions with human-level reliability.",
    category: "ai-features",
    section: "generation",
    content: `Essay marking is one of the most time-consuming tasks in education. A teacher marking 120 WAEC English Language essays spends approximately 30 hours — often under deadline pressure that sacrifices quality for speed. ExamForge's Automated Essay Scoring (AES) engine provides a preliminary score for each essay in under 2 seconds, giving teachers a consistent starting point that they can accept, adjust, or override.

The AES engine evaluates essays on five dimensions aligned with WAEC and NECO marking schemes: Content and Relevance (does the essay address the prompt?), Organisation and Coherence (logical structure, paragraph transitions), Expression and Fluency (vocabulary range, sentence variety, grammatical accuracy), Mechanical Accuracy (spelling, punctuation, capitalisation), and Overall Effectiveness (holistic impression).

Each dimension is scored on a scale matching the relevant marking scheme (e.g., WAEC English Language uses a 0–20 scale per dimension). The engine provides a score, a confidence interval, and a qualitative comment ("The essay demonstrates strong argumentation but would benefit from more varied transitional phrases between paragraphs").

Validation studies using 10,000 double-marked WAEC essays show that the AES engine agrees with human markers within one grade band 94% of the time — comparable to inter-rater agreement between two experienced human markers (92%). The engine is most reliable for English Language and least reliable for literature essays that require interpretation of specific texts; for the latter, we recommend using AES as a second-marker check rather than a primary scorer.`,
    codeExamples: [
      {
        language: "typescript",
        code: `const essayScore = await client.ai.scoreEssay({
  essayText: studentEssay,
  prompt: 'Write an essay on the topic: "The impact of technology on Nigerian youth culture."',
  markingScheme: 'WAEC-english-language',
  dimensions: ['content', 'organisation', 'expression', 'mechanical', 'overall'],
});

console.log(\`Score: \${essayScore.total}/100\`);
console.log(\`Confidence: ±\${essayScore.confidenceInterval}\`);
essayScore.dimensions.forEach(d => {
  console.log(\`  \${d.name}: \${d.score}/20 — \${d.comment}\`);
});`,
      },
    ],
    lastUpdated: "2025-02-05",
    readTime: 7,
    difficulty: "advanced",
  },

  // ── Student Management ───────────────────────────────────────────────
  {
    slug: "student-enrolment",
    title: "Student Enrolment & Profiles",
    description: "Create student accounts individually or in bulk, and manage student profiles and class assignments.",
    category: "student-management",
    section: "enrolment",
    content: `Adding students to ExamForge is straightforward whether you have 20 or 20,000. This guide covers individual creation, bulk import, and integration with your school's existing Student Information System (SIS).

For individual creation, navigate to Students → Add Student. Enter the student's name, email (or phone number for SMS-based accounts), class, and subject enrolments. The platform generates a unique student ID and sends login credentials via email or SMS. This method is ideal for small schools or mid-term admissions.

For bulk import, prepare a CSV or Excel file with columns: FirstName, LastName, Email, Phone, Class, Subjects (comma-separated). Navigate to Students → Import and upload the file. The import wizard validates each row — checking for duplicate emails, missing required fields, and invalid class names — and presents a preview before committing. A school with 2,000 students can complete a full import in under 5 minutes.

For schools with an existing SIS (such as SchoolMint, Gradelink, or a custom solution), ExamForge offers real-time sync via our REST API or pre-built integrations. When a new student is added to the SIS, their ExamForge account is automatically created; when class assignments change, ExamForge updates automatically. This eliminates the need for manual data entry and ensures that ExamForge always reflects the latest enrolment data.`,
    codeExamples: [
      {
        language: "typescript",
        code: `// Bulk import students from a CSV file
const importResult = await client.students.bulkImport({
  file: './enrolment/ss3-students-2025.csv',
  mapping: {
    firstName: 'FirstName',
    lastName: 'LastName',
    email: 'Email',
    class: 'Class',
    subjects: 'Subjects',
  },
  sendCredentials: true, // auto-send login details
  credentialMethod: 'email',
});

console.log(\`Created \${importResult.success} accounts, \${importResult.errors} errors\`);`,
      },
    ],
    lastUpdated: "2025-01-25",
    readTime: 6,
    difficulty: "beginner",
  },
  {
    slug: "class-and-group-management",
    title: "Class & Group Management",
    description: "Organise students into classes, streams, and custom groups for targeted exam assignment.",
    category: "student-management",
    section: "enrolment",
    content: `ExamForge mirrors the organisational structure of Nigerian schools with a flexible class and group system. Students belong to classes (e.g., SS3, Year 12, 100 Level) and optionally to streams (SS3A, SS3B) and custom groups (JAMB Candidates, Remedial Maths, Scholarship Track).

Classes are the primary organisational unit. When you create a class, you specify its level, the academic session it belongs to, and the subjects offered. Students assigned to a class automatically appear in the teacher's class list and can be enrolled in any exam targeting that class.

Streams (or arms) let you subdivide a class into parallel sections. This is standard practice in Nigerian secondary schools where SS3 might have 5 arms (A–E) of 40 students each. Exams can be scheduled per-stream, allowing different shifts or question sets.

Custom Groups are flexible collections of students that cut across class boundaries. Use them for: JAMB preparation groups (assembling students from different classes who are sitting the UTME), subject-remediation groups, or boarding-house cohorts. Any exam can be assigned to a custom group, and students can belong to multiple groups simultaneously.`,
    codeExamples: [],
    lastUpdated: "2025-01-15",
    readTime: 5,
    difficulty: "beginner",
  },
  {
    slug: "student-analytics-overview",
    title: "Student Analytics Overview",
    description: "Track individual student performance, identify at-risk students, and monitor learning progress over time.",
    category: "student-management",
    section: "analytics",
    content: `ExamForge's student analytics provide a 360-degree view of each learner's performance, combining exam results, practice activity, and engagement metrics into a single, actionable dashboard.

The Student Profile page shows: a performance timeline (scores across all exams, colour-coded by subject), a strengths-and-weaknesses map (topic-level proficiency based on item-level analysis), a practice activity log (number of practice sessions, time spent, adaptive-practice level), and an engagement score (based on login frequency, session duration, and resource utilisation).

The At-Risk Students report uses a predictive model trained on historical data from Nigerian schools to identify students who are likely to score below the passing threshold on an upcoming exam. The model considers: recent exam scores (weighted towards the most recent), practice activity (students who are not practising are flagged), and attendance patterns. At-risk students are highlighted on the dashboard with a risk score (0–100) and recommended interventions (e.g., "Assign adaptive practice in Mathematics — topic: simultaneous equations").

The Cohort Comparison view lets teachers compare a class's performance against school averages, state averages (where data is available), and historical norms for the same exam. This contextualisation helps answer the question: "Is my class underperforming, or is this exam just harder than usual?"`,
    codeExamples: [],
    lastUpdated: "2025-02-08",
    readTime: 6,
    difficulty: "intermediate",
  },

  // ── Analytics & Reports ──────────────────────────────────────────────
  {
    slug: "exam-analytics-dashboard",
    title: "Exam Analytics Dashboard",
    description: "Understand every metric on the exam analytics dashboard and how to use it to improve teaching.",
    category: "analytics-reports",
    section: "dashboards",
    content: `After every exam, ExamForge generates a comprehensive analytics dashboard that transforms raw scores into teaching insights. This guide explains every metric and how experienced educators use them to refine their instruction.

Overview Metrics: The top of the dashboard shows the class average, median, standard deviation, pass rate, and score distribution histogram. A bimodal distribution (two peaks) suggests that the class has split into two ability groups — a signal that differentiated instruction may be needed.

Item Analysis: For every question, the dashboard shows the difficulty index (proportion of students who answered correctly), the discrimination index (how well the item differentiates between high- and low-performing students), and the distractor analysis (the proportion selecting each option). Items with low discrimination (<0.20) or non-functional distractors (<5% selection rate) are flagged for revision. This is the same analysis WAEC conducts internally — now available to every teacher immediately after an exam.

Topic Heatmap: A colour-coded matrix showing average performance by topic and by class section. Topics where the average falls below 50% are highlighted in red. Clicking a topic drills down to the specific items and the most common errors, enabling targeted remediation.

Time Analysis: Average time spent per question, with outliers highlighted. Students who spend significantly more time than average on a question may not have mastered the underlying concept; students who answer very quickly may be guessing. This data is invaluable for coaching students on exam strategy.

Comparative Analysis: The class's performance compared against previous cohorts who took the same exam (if available) and against the school average. This longitudinal view helps teachers track whether their instructional improvements are yielding results.`,
    codeExamples: [],
    lastUpdated: "2025-02-12",
    readTime: 8,
    difficulty: "intermediate",
  },
  {
    slug: "generating-reports",
    title: "Generating Reports",
    description: "Create, customise, and export reports for school leadership, parents, and regulatory bodies.",
    category: "analytics-reports",
    section: "reporting",
    content: `ExamForge generates a range of reports out of the box, from individual student report cards to school-wide performance summaries suitable for board presentations and regulatory submissions.

Student Report Card: A per-student report showing scores for each exam, topic-level breakdowns, teacher comments, and a trend line comparing performance across the academic session. Available in PDF and HTML. Schools can customise the template to include their logo, motto, and grading scale.

Class Performance Summary: An aggregated report for a class across all exams in a term. Includes class averages, rank lists, subject-by-subject breakdowns, and a commentary section where the class teacher can add observations. This report replaces the manual compilation that typically takes teachers 2–3 days at the end of each term.

School Performance Report: A school-wide report suitable for principals, proprietors, and school boards. Covers pass rates by subject and class, comparison with previous sessions, at-risk student counts, and resource utilisation (how many exams were delivered, how many practice sessions were completed). This report is typically generated once per term.

WAEC/NECO Preparation Report: A specialised report that maps school-based exam performance to likely WAEC/NECO outcomes, using a calibration model trained on historical data from schools that use ExamForge for both internal and external exams. The report identifies subjects and topics where additional preparation is most likely to improve external exam results.

All reports can be exported as PDF, Excel, or CSV. The Excel export includes raw data for schools that want to do their own analysis. Reports can be scheduled for automatic generation at the end of each term and emailed to designated recipients.`,
    codeExamples: [
      {
        language: "typescript",
        code: `// Generate a class performance report
const report = await client.reports.generate({
  type: 'class-performance',
  classId: 'ss3a-2025',
  term: 'second',
  session: '2024-2025',
  format: 'pdf',
});

// Download the report
const buffer = await client.reports.download(report.id);
fs.writeFileSync('ss3a-term2-report.pdf', buffer);`,
      },
    ],
    lastUpdated: "2025-01-20",
    readTime: 6,
    difficulty: "intermediate",
  },

  // ── Administration ───────────────────────────────────────────────────
  {
    slug: "school-settings",
    title: "School Settings & Configuration",
    description: "Configure your school's profile, grading scales, academic sessions, and notification preferences.",
    category: "administration",
    section: "config",
    content: `The School Settings page is the control centre for your institution's ExamForge configuration. Changes here affect every exam, report, and user experience on the platform.

School Profile: Your institution name, address, logo, and motto appear on student report cards and the exam interface. Select your examination bodies (WAEC, NECO, JAMB, IGCSE, or Custom) to determine which syllabi and question formats are available. Set your timezone — critical for ensuring that exam timers and schedules display correctly for your students.

Academic Sessions: Define your academic calendar with session names (e.g., "2024/2025"), terms (First, Second, Third), and term dates. ExamForge uses these to organise exams, reports, and analytics by session and term. You can also define vacation periods during which exam access is restricted.

Grading Scales: Configure the grading scale used in reports. Nigerian schools commonly use: A (70–100), B (60–69), C (50–59), D (45–49), E (40–44), F (0–39). You can customise the boundaries and labels to match your school's specific scale. WAEC uses a different scale (A1, B2, B3, C4, C5, C6, D7, E8, F9); both can be configured simultaneously for internal and external reporting.

Notification Preferences: Configure which events trigger email or SMS notifications and to whom. Common notifications include: exam results published (to students and parents), exam scheduled (to students), at-risk student alert (to class teacher and parent), and system maintenance (to administrators).`,
    codeExamples: [],
    lastUpdated: "2025-02-01",
    readTime: 5,
    difficulty: "beginner",
  },
  {
    slug: "user-management",
    title: "User Management",
    description: "Create, edit, and manage user accounts, roles, and permissions across your school.",
    category: "administration",
    section: "config",
    content: `ExamForge's user management system supports the full lifecycle of accounts in a school: creation, role assignment, password resets, deactivation, and archival. As a School Administrator, you have full control over all user accounts in your institution.

Creating Users: You can create accounts individually via the UI or in bulk via CSV import (see Student Enrolment guide). For each user, you assign a role (Administrator, Teacher, Student, Parent Observer) and, for teachers, the subjects and classes they are responsible for. Users receive an automated welcome email with their login credentials and a link to set their password.

Custom Roles: If the four default roles do not match your school's structure, create custom roles with granular permissions. For example, a "Department Head" role might have permission to view analytics for their department's classes but not to modify school-wide settings. A "Exam Officer" role might have permission to schedule and manage exams but not to author questions.

Password Policies: Configure minimum password length, complexity requirements, and rotation frequency. We recommend enforcing MFA (multi-factor authentication) for all administrator and teacher accounts. Students can use simpler passwords but must verify their email or phone number on first login.

Account Lifecycle: At the end of an academic session, you can promote students to the next class (e.g., SS2 → SS3) with a single operation, or graduate/withdraw students. Graduated students' data is archived but remains accessible for transcript generation. Withdrawn students' data is anonymised after 90 days in compliance with the Nigeria Data Protection Regulation.`,
    codeExamples: [],
    lastUpdated: "2025-01-15",
    readTime: 6,
    difficulty: "intermediate",
  },

  // ── Security & Compliance ────────────────────────────────────────────
  {
    slug: "data-privacy-ndpr",
    title: "Data Privacy & NDPR Compliance",
    description: "How ExamForge complies with the Nigeria Data Protection Regulation and protects student data.",
    category: "security-compliance",
    section: "privacy",
    content: `The Nigeria Data Protection Regulation (NDPR), issued by the National Information Technology Development Agency (NITDA) in 2019, establishes requirements for the collection, processing, and storage of personal data. As a processor of student data for over 400 institutions, ExamForge takes compliance seriously.

Data Minimisation: We collect only the data necessary to deliver our services. Student profiles require name, class, and a contact method (email or phone). We do not collect biometric data (fingerprints, facial geometry) — our proctoring system uses webcam video for real-time analysis only; video frames are deleted within 24 hours of exam completion, and only alert metadata is retained.

Lawful Basis: Our lawful basis for processing student data is contractual necessity (the school has engaged ExamForge to deliver CBT services) and legitimate interest (analytics and reporting that benefit the student). Schools are the data controllers; ExamForge is the data processor. We provide a Data Processing Agreement (DPA) to every customer at onboarding.

Data Residency: All student data is stored in data centres located in Lagos, Nigeria. We do not transfer personal data outside Nigeria except where explicitly authorised by the school (e.g., a school with a parent portal hosted in Europe). In such cases, we rely on Standard Contractual Clauses approved by NITDA.

Data Subject Rights: Students and parents can exercise their rights under NDPR through the school administrator: right of access (view their data), right of rectification (correct inaccuracies), right of erasure (request deletion), and right of data portability (export their data in a machine-readable format). ExamForge provides tools for administrators to fulfil these requests within the 72-hour window specified by NDPR.

Audit and Breach Notification: We maintain a comprehensive audit log of all data access and modifications. In the event of a data breach, we notify the affected school within 24 hours and provide a detailed incident report, including the nature of the breach, the data affected, and the remedial actions taken.`,
    codeExamples: [],
    lastUpdated: "2025-02-10",
    readTime: 8,
    difficulty: "intermediate",
  },
  {
    slug: "exam-security-best-practices",
    title: "Exam Security Best Practices",
    description: "A comprehensive checklist for securing your exams against leakage, impersonation, and collusion.",
    category: "security-compliance",
    section: "privacy",
    content: `Exam security is a multi-layered discipline. No single measure is sufficient; security comes from combining technical controls, operational procedures, and institutional culture. This guide presents a checklist of best practices organised by threat model.

Threat: Question Leakage — Prevent unauthorised access to exam content before the exam starts. Mitigations: encrypt all exam content at rest with AES-256; decrypt only during the exam session; use ExamForge's Secure Browser to prevent screen capture; distribute content to edge servers only hours before the exam; never include the full question bank in the exam package — the server selects items at session start.

Threat: Impersonation — Prevent someone other than the enrolled student from taking the exam. Mitigations: require photo verification at login (the student's webcam photo is compared against their enrollment photo using a face-matching model); enable keystroke dynamics verification throughout the exam; require institutional ID verification for high-stakes exams; use ExamForge's device-binding feature to lock the exam to a specific device.

Threat: Collusion — Prevent students from copying from each other during the exam. Mitigations: enable question-order and option-order randomisation so adjacent students see different versions; activate AI proctoring to detect off-screen gaze and communication; configure the Invigilator Dashboard to highlight students whose answer patterns are suspiciously similar (the collusion-detection algorithm computes pairwise similarity scores and flags pairs above a threshold).

Threat: External Assistance — Prevent students from receiving answers from outside the exam room. Mitigations: enforce browser lockdown (no access to messaging apps, search engines, or external websites); monitor for USB device connections; require aeroplane mode on mobile phones (enforced via physical collection by invigilators, with ExamForge providing a phone-check checklist).

Threat: Post-Exam Data Mining — Prevent analysis of exam data to reverse-engineer the question bank. Mitigations: use exposure-control algorithms (e.g., Syed-Geometric) that limit how often any single item is administered; rotate items out of the active pool after a configurable number of exposures; publish only aggregate results, not item-level responses, to external stakeholders.`,
    codeExamples: [],
    lastUpdated: "2025-01-28",
    readTime: 9,
    difficulty: "advanced",
  },

  // ── API Reference ────────────────────────────────────────────────────
  {
    slug: "api-authentication",
    title: "API Authentication",
    description: "Authenticate API requests using API keys or OAuth 2.0 to access ExamForge's REST API.",
    category: "api-reference",
    section: "auth",
    content: `All requests to the ExamForge REST API must be authenticated. We support two methods: API Key authentication for server-to-server integrations, and OAuth 2.0 for user-facing applications that act on behalf of a specific user.

API Key Authentication: Generate an API key from the School Settings → API Keys page. Each key is scoped to a specific school and role. Include the key in the X-API-Key header of every request. API keys never expire but can be revoked instantly. We recommend creating separate keys for each integration (e.g., one for your SIS sync, one for your reporting dashboard) to limit blast radius if a key is compromised.

OAuth 2.0 Authentication: For applications that need to act on behalf of a user (e.g., a mobile app that lets a teacher view results), use OAuth 2.0 with the Authorization Code flow. Register your application in the Developer Portal to receive a client_id and client_secret. The user authenticates via the ExamForge login page, and your application receives an access token (valid for 1 hour) and a refresh token (valid for 30 days).

Rate Limits: API requests are rate-limited to protect platform stability. Default limits are: 100 requests per minute for API key auth, 300 requests per minute for OAuth auth. Enterprise customers can request custom limits. Rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset) are included in every response.`,
    codeExamples: [
      {
        language: "typescript",
        code: `import { ExamForge } from '@examforge/sdk';

// API Key auth
const client = new ExamForge({ apiKey: 'ef_live_sk_abc123...' });

// OAuth auth (after obtaining access token)
const client = new ExamForge({ accessToken: 'eyJhbGciOiJSUzI1NiIs...' });`,
      },
      {
        language: "python",
        code: `from examforge import ExamForgeClient

# API Key auth
client = ExamForgeClient(api_key="ef_live_sk_abc123...")

# List students
students = client.students.list(limit=50)`,
      },
    ],
    lastUpdated: "2025-02-15",
    readTime: 5,
    difficulty: "beginner",
  },
  {
    slug: "api-students-endpoints",
    title: "Students API Endpoints",
    description: "CRUD operations for student accounts via the REST API.",
    category: "api-reference",
    section: "resources",
    content: `The Students API provides full CRUD (Create, Read, Update, Delete) operations for student accounts. All endpoints require authentication and are scoped to the authenticated school.

List Students: GET /api/v1/students — Returns a paginated list of students. Supports filtering by class, subject, status, and search query. Pagination is cursor-based for consistent results at any scale.

Create Student: POST /api/v1/students — Creates a single student account. Requires firstName, lastName, and either email or phone. Optionally include class, subjects, and metadata fields. Returns the created student object with a generated studentId.

Bulk Create: POST /api/v1/students/bulk — Creates multiple students in a single request. Accepts an array of up to 500 student objects. Returns a summary of created, updated, and failed records.

Get Student: GET /api/v1/students/:id — Returns the full student profile, including class assignments, subject enrolments, and summary statistics (exams taken, average score, last login).

Update Student: PATCH /api/v1/students/:id — Updates specified fields. Supports partial updates — only include the fields you want to change.

Delete Student: DELETE /api/v1/students/:id — Soft-deletes the student account. Data is archived for 90 days before permanent deletion, in compliance with NDPR. A hard-delete option is available for GDPR/NDPR erasure requests.`,
    codeExamples: [
      {
        language: "typescript",
        code: `// List students in SS3
const students = await client.students.list({
  class: 'SS3',
  limit: 50,
  cursor: undefined,
});

// Create a student
const student = await client.students.create({
  firstName: 'Chidinma',
  lastName: 'Okafor',
  email: 'chidinma.okafor@school.edu.ng',
  class: 'SS3A',
  subjects: ['mathematics', 'physics', 'chemistry'],
});

// Bulk create
const result = await client.students.bulkCreate([
  { firstName: 'Emeka', lastName: 'Nwankwo', email: 'emeka@school.edu.ng', class: 'SS3A' },
  { firstName: 'Fatima', lastName: 'Abdullahi', email: 'fatima@school.edu.ng', class: 'SS3B' },
]);`,
      },
    ],
    lastUpdated: "2025-02-12",
    readTime: 6,
    difficulty: "intermediate",
  },
  {
    slug: "api-exams-endpoints",
    title: "Exams API Endpoints",
    description: "Create, schedule, and manage exams programmatically.",
    category: "api-reference",
    section: "resources",
    content: `The Exams API lets you create and manage exams programmatically — useful for automating exam scheduling at the start of each term or integrating ExamForge with your school's academic planning system.

Create Exam: POST /api/v1/exams — Creates an exam with the specified configuration. Returns the exam object with an id for subsequent operations.

Schedule Exam: POST /api/v1/exams/:id/schedule — Creates a session for the exam. Specify the date, time window, and student group. Multiple sessions can be created for a single exam.

Get Exam Results: GET /api/v1/exams/:id/results — Returns aggregated and individual results for a completed exam. Supports filtering by class and student.

Submit Answer (Student API): POST /api/v1/exams/:id/submit — Submits a student's answer for a specific question. Used by custom exam clients; the standard ExamForge web client handles submission internally.

End Exam Session: POST /api/v1/exams/:id/end — Force-ends an exam session. Used by invigilators to end a session for a student who has left or is unresponsive. The student's submitted answers are preserved and scored.`,
    codeExamples: [
      {
        language: "typescript",
        code: `// Create an exam
const exam = await client.exams.create({
  title: 'Mathematics Continuous Assessment — Test 2',
  subject: 'mathematics',
  examBody: 'custom',
  classLevel: 'SS2',
  duration: 90,
  passingScore: 50,
});

// Add questions from the item bank
await client.exams.addItems(exam.id, {
  source: 'item-bank',
  filters: { subject: 'mathematics', topics: ['quadratic-equations', 'inequalities'], difficulty: 'medium' },
  count: 40,
});

// Schedule a session
await client.exams.schedule(exam.id, {
  date: '2025-03-20',
  startTime: '08:00',
  endTime: '10:00',
  studentGroup: 'SS2-all',
});`,
      },
    ],
    lastUpdated: "2025-02-10",
    readTime: 6,
    difficulty: "intermediate",
  },
  {
    slug: "webhooks-reference",
    title: "Webhooks Reference",
    description: "Receive real-time notifications when exam events occur.",
    category: "api-reference",
    section: "webhooks",
    content: `Webhooks let you receive real-time HTTP callbacks when specific events occur in ExamForge, enabling you to integrate exam data into your school's SIS, notification system, or custom dashboards without polling.

Registering a Webhook: Navigate to School Settings → Webhooks or use the API. Provide a URL that can receive POST requests, the events you want to subscribe to, and an optional secret for HMAC signature verification. We support the following events: exam.created, exam.started, exam.completed, exam.cancelled, student.registered, student.result.published, payment.received, payment.failed, and proctoring.alert.

Payload Format: Every webhook delivery includes a JSON payload with: event (the event type), timestamp (ISO 8601), data (event-specific payload), and schoolId. The payload is signed with HMAC-SHA256 using your webhook secret; verify the signature before processing the payload.

Retry Logic: If your endpoint returns a non-2xx status, we retry delivery up to 5 times with exponential backoff (1 min, 5 min, 30 min, 2 hr, 12 hr). Failed deliveries are logged in the Webhook Events dashboard for debugging. You can also redeliver any event manually.

Security: Always use HTTPS endpoints. Verify the X-ExamForge-Signature header before processing payloads. Consider IP allowlisting — all webhook deliveries originate from our documented IP ranges.`,
    codeExamples: [
      {
        language: "typescript",
        code: `// Express.js webhook handler
import express from 'express';
import crypto from 'crypto';

const app = express();
app.use(express.json());

app.post('/webhooks/examforge', (req, res) => {
  // Verify signature
  const signature = req.headers['x-examforge-signature'];
  const payload = JSON.stringify(req.body);
  const expected = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  if (signature !== expected) {
    return res.status(401).send('Invalid signature');
  }

  // Process event
  const { event, data } = req.body;
  if (event === 'exam.completed') {
    console.log(\`Exam \${data.examId} completed by \${data.studentCount} students\`);
  }

  res.status(200).send('OK');
});`,
      },
    ],
    lastUpdated: "2025-01-25",
    readTime: 6,
    difficulty: "intermediate",
  },

  // ── Integrations ─────────────────────────────────────────────────────
  {
    slug: "sis-integration",
    title: "Student Information System Integration",
    description: "Sync student data between ExamForge and your SIS for automatic enrolment updates.",
    category: "integrations",
    section: "connectors",
    content: `Keeping student data synchronised between ExamForge and your Student Information System eliminates manual data entry and ensures that exam assignments always reflect the latest enrolment. ExamForge provides pre-built connectors for popular SIS platforms and a generic API-based sync framework for custom systems.

Google Workspace for Education: If your school uses Google Classroom, ExamForge can sync classes, student rosters, and teacher assignments automatically. Students log in with their Google account, and class membership in Google Classroom is mirrored in ExamForge. Changes in Google Classroom (new student, class reassignment) propagate to ExamForge within 5 minutes.

Microsoft 365 Education: Similar to Google Workspace, ExamForge integrates with Microsoft Teams and Intune for Education. Students authenticate via Azure AD, and class rosters sync from Microsoft School Data Sync.

PowerSchool: A direct integration with PowerSchool's API syncs student demographics, class schedules, and grades bidirectionally. ExamForge pushes exam results back to PowerSchool's Gradebook, eliminating manual grade entry.

Generic API Sync: For schools with custom SIS solutions, our REST API provides all the endpoints needed for a custom sync script. We provide reference implementations in Python and Node.js that you can adapt to your SIS's API format. The sync script typically runs as a cron job every 5–15 minutes.`,
    codeExamples: [
      {
        language: "python",
        code: `# Example: Sync students from a custom SIS to ExamForge
import requests
from examforge import ExamForgeClient

client = ExamForgeClient(api_key="ef_live_sk_abc123...")
sis_url = "https://sis.myschool.edu.ng/api"

# Fetch enrolled students from SIS
sis_students = requests.get(f"{sis_url}/students?term=current").json()

# Sync to ExamForge
for student in sis_students:
    client.students.upsert(
        student_id=student["matric_no"],
        first_name=student["first_name"],
        last_name=student["last_name"],
        email=student["email"],
        class_=student["class"],
    )`,
      },
    ],
    lastUpdated: "2025-01-20",
    readTime: 6,
    difficulty: "intermediate",
  },
  {
    slug: "microsoft-teams-integration",
    title: "Microsoft Teams Integration",
    description: "Deliver exams and share results directly within Microsoft Teams channels.",
    category: "integrations",
    section: "connectors",
    content: `For schools using Microsoft Teams as their primary collaboration platform, ExamForge's Teams integration brings exam management directly into the Teams interface — without requiring students or teachers to navigate to a separate web application.

The integration includes three components: an ExamForge Teams Tab that can be added to any class channel, providing one-click access to upcoming exams, practice sessions, and results; a Bot that sends notifications to class channels when exams are scheduled, results are published, or at-risk alerts are triggered; and an Assignment Integration that creates a Teams Assignment for every scheduled exam, making exams appear alongside regular coursework in the student's assignment list.

Installation is straightforward: a school administrator installs the ExamForge app from the Microsoft Teams App Store and grants the required permissions (read class roster, send notifications, create tabs). Once installed, the integration is available in every team. Teachers can add the ExamForge tab to their class channels; students see it automatically.

The Teams integration is available on all ExamForge plans at no additional cost. It requires Microsoft 365 Education A3 or A5 licensing on the school's Microsoft tenant.`,
    codeExamples: [],
    lastUpdated: "2025-02-05",
    readTime: 5,
    difficulty: "beginner",
  },

  // ── Deployment ───────────────────────────────────────────────────────
  {
    slug: "on-premises-deployment",
    title: "On-Premises Deployment",
    description: "Deploy ExamForge on your school's own infrastructure for maximum data control and offline capability.",
    category: "deployment",
    section: "install",
    content: `Some institutions require ExamForge to run on their own infrastructure — whether for data-residency compliance, network isolation, or the need to operate entirely offline. Our on-premises deployment option meets these requirements while providing the same features and updates as the cloud version.

System Requirements: The on-premises version runs on Docker and requires: a Linux server (Ubuntu 22.04+ or RHEL 9+) with 16 CPU cores, 64 GB RAM, and 500 GB SSD storage for a school with up to 5,000 students. For larger deployments, we recommend a three-node cluster with a load balancer. GPU acceleration (NVIDIA T4 or better) is required for AI features (question generation, proctoring, essay scoring).

Installation: We provide a Docker Compose configuration and a Helm chart for Kubernetes deployments. The installer includes: the ExamForge application server, PostgreSQL database, Redis cache, MinIO object storage (for exam media), and the AI inference service. A single command brings up the entire stack.

Offline Operation: The on-premises version operates entirely offline once installed. Exam content, student data, and AI models are stored locally. Updates are delivered as Docker images that can be transferred via USB or local network — no internet connection required on the production server. We provide quarterly update packages via secure download or physical media (encrypted USB drive).

Licensing: On-premises deployments are available on our Enterprise plan with an annual licence fee. The licence includes all platform updates, security patches, and priority support. Contact our sales team for a quote tailored to your institution's size and requirements.`,
    codeExamples: [
      {
        language: "bash",
        code: `# Clone the ExamForge on-prem installer
git clone https://github.com/examforge/on-prem.git
cd on-prem

# Configure environment
cp .env.example .env
# Edit .env with your school's settings

# Start the stack
docker compose up -d

# Verify all services are healthy
docker compose ps`,
      },
    ],
    lastUpdated: "2025-02-08",
    readTime: 7,
    difficulty: "advanced",
  },
  {
    slug: "edge-server-setup",
    title: "Edge Server Setup",
    description: "Configure ExamForge Edge Servers for low-latency exam delivery in your region.",
    category: "deployment",
    section: "install",
    content: `ExamForge Edge Servers cache exam content close to your students, eliminating latency caused by distance to our primary data centre. For schools in regions with limited internet connectivity (northern Nigeria, rural areas), an Edge Server can mean the difference between a smooth exam and a disrupted one.

What is an Edge Server? A lightweight appliance (pre-configured Raspberry Pi 4 cluster or a Docker container on your existing hardware) that sits on your school's local network. It caches exam packages, question images, and media files. When a student requests a question, the edge server responds from local cache in under 50ms, regardless of your external internet speed.

Setup: For the Raspberry Pi appliance, simply connect it to your school network via Ethernet, power it on, and register it in the ExamForge admin dashboard using the displayed pairing code. The appliance auto-configures: it pulls exam content from the ExamForge cloud during off-peak hours, serves cached content during exams, and syncs results back to the cloud when the exam is complete.

For the Docker container, install it on any Linux server on your school network. The container requires 4 CPU cores, 8 GB RAM, and 100 GB SSD. It communicates with the ExamForge cloud via HTTPS; no inbound ports need to be opened on your firewall.

Monitoring: The Edge Server dashboard shows cache hit rate, storage utilisation, and sync status. A healthy edge server should maintain a 95%+ cache hit rate during exams. If the hit rate drops, it usually means new content was added that has not yet been cached — run a manual sync from the dashboard.`,
    codeExamples: [],
    lastUpdated: "2025-01-15",
    readTime: 5,
    difficulty: "intermediate",
  },

  // ── Troubleshooting ──────────────────────────────────────────────────
  {
    slug: "common-exam-day-issues",
    title: "Common Exam Day Issues & Solutions",
    description: "Quick fixes for the most common problems encountered during exam sessions.",
    category: "troubleshooting",
    section: "exam-issues",
    content: `Even with thorough preparation, issues can arise on exam day. This guide covers the most common problems and their solutions, ordered by frequency of occurrence.

Problem: Student Cannot Log In. This is the most common issue and is usually caused by an incorrect password or an inactive account. Solution: Use the Invigilator Dashboard to verify the student's account status. If the account is active, reset the password from the dashboard and provide the temporary password to the student. If the account is inactive, activate it and assign the student to the exam session.

Problem: Exam Timer Shows Incorrect Time. This occurs when the student's device clock is out of sync with the server. Solution: ExamForge uses server-side time for all timer calculations; the displayed timer is authoritative regardless of the device clock. If the timer appears wrong, refresh the page (Ctrl+F5). The timer will resync from the server.

Problem: Questions Not Loading (Blank Screen). Usually caused by a network interruption or browser cache issue. Solution: First, wait 10 seconds — the offline cache will load the question from local storage. If still blank, press F5 to refresh. If the issue persists, switch to the offline mode by clicking the "Offline" indicator in the top-right corner. The exam will continue from local cache.

Problem: Exam Submitted Accidentally. A student clicks "Submit" before completing the exam. Solution: If the exam policy allows, the invigilator can reopen the session from the dashboard using the "Reopen Session" action. The student will resume from where they left off. If the exam policy is single-attempt, contact ExamForge support immediately — we can restore the session from the event log.

Problem: Proctoring Alert for Innocent Behaviour. A student is flagged for looking away from the screen, but they were reading a physical question paper or thinking. Solution: Review the alert on the invigilator dashboard. Each alert includes a snapshot and confidence score. If the behaviour is clearly innocent (e.g., the student looked at their scratch paper), dismiss the alert. Only confirmed malpractice should be escalated.`,
    codeExamples: [],
    lastUpdated: "2025-02-12",
    readTime: 6,
    difficulty: "beginner",
  },
  {
    slug: "network-connectivity-issues",
    title: "Network Connectivity Troubleshooting",
    description: "Diagnose and resolve network problems that can disrupt exam delivery.",
    category: "troubleshooting",
    section: "exam-issues",
    content: `Network issues are the most common infrastructure problem in Nigerian CBT centres. This guide helps you diagnose and resolve them quickly, minimising disruption to students.

Diagnose: Run the ExamForge Network Diagnostic tool (available in the admin dashboard) from a device on the exam network. The tool tests: DNS resolution, TCP connection to the ExamForge API, TLS handshake, and latency to the nearest edge server. It produces a colour-coded report (green/yellow/red) for each test, with specific remediation steps.

Common Issues and Solutions:

High Latency (>500ms): Usually caused by network congestion or a misconfigured proxy. Check that the exam VLAN has QoS prioritisation for HTTPS traffic. If using a proxy server, ensure it supports HTTP/2 and TLS pass-through. Deploy an Edge Server on the local network to eliminate external latency entirely.

Intermittent Disconnections: Common in schools using Wi-Fi for exams. Switch to wired Ethernet for exam devices. If Wi-Fi is unavoidable, use a dedicated SSID on the 5 GHz band with no other traffic. Increase the client roaming aggressiveness to reduce reconnection time when devices switch access points.

DNS Failures: If devices cannot resolve app.examforge.ai, configure the school's DNS server with a static entry pointing to our documented IP addresses. This eliminates dependency on the ISP's DNS, which is often unreliable.

Bandwidth Saturation: If 100+ students are loading exam content simultaneously and the internet link is saturated, pre-download the exam package to the Edge Server before the exam. During the exam, all content is served from the edge, consuming zero external bandwidth.

Emergency Procedure: If all network connectivity is lost during an exam, do not panic. ExamForge's offline-first client continues the exam from local cache. Student progress is saved to the device's encrypted storage. When connectivity resumes (even partially), the client syncs saved answers to the server in the background. No data is lost.`,
    codeExamples: [],
    lastUpdated: "2025-01-20",
    readTime: 7,
    difficulty: "intermediate",
  },
  {
    slug: "browser-compatibility-issues",
    title: "Browser Compatibility Issues",
    description: "Resolve problems caused by unsupported or misconfigured browsers.",
    category: "troubleshooting",
    section: "exam-issues",
    content: `ExamForge supports all modern browsers, but compatibility issues can still occur — particularly on school computers with outdated software or restrictive IT policies. This guide covers the most common browser-related problems.

Supported Browsers: Google Chrome 90+, Mozilla Firefox 88+, Microsoft Edge 90+, Apple Safari 15+. We recommend Chrome for the most consistent experience. Internet Explorer is not supported.

Problem: Exam Page Does Not Load. Check the browser version (Help → About). If below the minimum, update the browser. If updates are blocked by the school's IT policy, request an exception for examforge.ai or install the ExamForge Secure Browser (which includes its own Chromium runtime and bypasses system-level browser restrictions).

Problem: Webcam Not Detected (Proctored Exams). The browser must have permission to access the webcam. In Chrome, go to Settings → Privacy and Security → Site Settings → Camera and ensure examforge.ai is set to "Allow". If the webcam still does not work, check that no other application (Zoom, Teams) is using the camera — only one application can access the webcam at a time.

Problem: Copy/Paste Disabled During Exam. This is intentional — browser lockdown prevents copy/paste to protect exam integrity. If a student needs to copy a formula or passage for their working, they should use the on-screen notepad provided in the exam interface.

Problem: Exam Freezes or Becomes Unresponsive. This is typically caused by browser extensions interfering with the exam client. Disable all extensions (ad blockers, password managers, VPN extensions) before the exam. The ExamForge Secure Browser runs without any extensions and is immune to this issue.

Problem: Screen Scaling Issues (Text Too Small/Large). The exam interface is responsive and should adapt to any screen size. If text appears incorrectly scaled, check the browser's zoom level (Ctrl+0 to reset to 100%) and the system display scaling (recommended: 100% or 125% on Windows).`,
    codeExamples: [],
    lastUpdated: "2025-02-01",
    readTime: 5,
    difficulty: "beginner",
  },
  {
    slug: "question-bank-management",
    title: "Question Bank Management",
    description: "Organise, tag, and maintain your school's question bank for efficient exam authoring.",
    category: "cbt-platform",
    section: "questions",
    content: `A well-organised question bank is the foundation of efficient exam authoring. This guide covers best practices for structuring, tagging, and maintaining your item bank in ExamForge.

Organisation Structure: Items are organised by Subject → Topic → Sub-topic, mirroring the WAEC/NECO/JAMB syllabus hierarchy. For example, Mathematics → Algebra → Quadratic Equations. You can add custom topics for school-specific curricula that do not map to national syllabi.

Tagging: Every item can be tagged with metadata that enables precise filtering during exam authoring: difficulty level (easy/medium/hard, or numeric IRT difficulty parameter), cognitive level (Bloom's Taxonomy), exam body (WAEC, NECO, JAMB, custom), source (human-authored, AI-generated, imported), usage count (how many times the item has been administered), and custom tags (e.g., "diagram-required", "calculator-allowed").

Quality Status: Items progress through four status levels: Draft (newly created, not yet reviewed), Under Review (in the quality pipeline), Certified (passed all quality gates and approved for live exams), and Retired (no longer used in new exams but retained for historical record). Only Certified items appear in the item selector when authoring a live exam.

Maintenance: Regular maintenance ensures your item bank stays fresh and accurate. We recommend: quarterly review of items with low discrimination indices (these may be poorly written or outdated), annual refresh of items that have been over-exposed (used in more than 10 exams — students may have memorised them), and continuous replenishment via AI generation to replace retired items and expand coverage.`,
    codeExamples: [],
    lastUpdated: "2025-02-05",
    readTime: 6,
    difficulty: "intermediate",
  },
  {
    slug: "result-management-grading",
    title: "Result Management & Grading",
    description: "How ExamForge handles auto-marking, manual grading, and result publication.",
    category: "cbt-platform",
    section: "questions",
    content: `ExamForge's marking engine combines instant auto-marking for objective questions with a structured workflow for manual grading of essays and extended responses, delivering results faster than any paper-based process.

Auto-Marking: Multiple-choice, fill-in-the-blank, numeric entry, matching, and drag-and-drop questions are marked instantly upon exam submission. The engine scores each item according to the configured marking scheme (correct/incorrect, partial credit, negative marking). Auto-marked results are available within 5 minutes of exam completion — compared with 6–8 weeks for paper-based WAEC results.

Manual Grading: Essay and file-upload questions require human grading. When an exam contains manual-grade items, the system creates a grading task for each item and assigns it to the subject teacher (or a custom grader). The grading interface displays the student's response alongside the marking scheme, rubric, and (optionally) the AI-assisted preliminary score. Graders enter a score and optional feedback comment. Multiple graders can be assigned to the same item for double-marking, with the system flagging discrepancies exceeding a configurable threshold.

Result Publication: Results are not visible to students until they are explicitly published. This gives teachers time to review, adjust, and moderate before students see their scores. The publication workflow: teacher reviews auto-marked results and completes manual grading → teacher approves results → administrator publishes (or auto-publish after a deadline). Published results trigger notifications to students and parent observers.

Rescaling and Moderation: If an exam turns out to be unexpectedly difficult or easy, administrators can apply post-hoc rescaling (e.g., "add 5 marks to all students" or "rescale to a mean of 60"). Moderation actions are logged for auditability and cannot be applied after results have been published to external stakeholders.`,
    codeExamples: [],
    lastUpdated: "2025-01-28",
    readTime: 7,
    difficulty: "intermediate",
  },
  {
    slug: "developer-platform-launch",
    title: "Developer Platform & API Access",
    description: "Get started with the ExamForge developer platform, API keys, and SDK installation.",
    category: "api-reference",
    section: "auth",
    content: `The ExamForge Developer Platform provides everything you need to integrate ExamForge into your school's ecosystem: a REST API, SDKs for JavaScript/TypeScript and Python, a Postman collection, and comprehensive documentation with runnable examples.

Getting API Access: Navigate to School Settings → API Keys and click "Create Key". Choose a name (e.g., "SIS Integration"), select the permissions scope (read-only, read-write, or admin), and set an expiry (or leave it never-expiring). The key is displayed once — store it securely. If compromised, revoke it immediately and create a new one.

SDK Installation: The official SDK is available for JavaScript/TypeScript and Python. Install via npm or pip and initialise with your API key. The SDK handles authentication, rate limiting, and error retry automatically.

Sandbox Environment: Every API key can be used in sandbox mode by setting the environment to "sandbox". Sandbox requests use synthetic data and do not affect your production account. We strongly recommend developing and testing all integrations in sandbox before going live.

Developer Support: Join the ExamForge Developer Community on Discord for peer support, feature requests, and integration showcases. For critical issues, contact developer-support@examforge.ai with a 24-hour SLA on Enterprise plans.`,
    codeExamples: [
      {
        language: "bash",
        code: `# Install SDK
npm install @examforge/sdk

# Or for Python
pip install examforge-python`,
      },
    ],
    lastUpdated: "2025-02-15",
    readTime: 4,
    difficulty: "beginner",
  },
  {
    slug: "multi-school-management",
    title: "Multi-School Management",
    description: "Manage multiple schools or campuses from a single ExamForge account.",
    category: "administration",
    section: "config",
    content: `For school groups, multi-campus institutions, and state education boards, ExamForge's multi-school management feature provides a single pane of glass across all your institutions.

Organisation Hierarchy: Create an organisation (e.g., "Lagos State Education Board") and add schools as members. Each school retains its own user accounts, question banks, and exam schedules, but the organisation administrator can view aggregated analytics, run cross-school comparisons, and deploy configurations (grading scales, exam policies, integrations) to all schools simultaneously.

Cross-School Analytics: Compare performance across schools in your group. The analytics dashboard shows: school-level averages by subject, pass rate comparisons, teacher workload distribution, and resource utilisation (exams delivered, practice sessions completed). Identify top-performing schools and share their practices; identify underperforming schools and target support.

Centralised Question Banks: Share question banks across schools in your organisation. This is particularly valuable for state education boards that want to ensure consistent assessment standards across all schools. The central bank is curated by the organisation's subject leads; schools draw from it for their exams but can also maintain local banks for school-specific assessments.

Deployment Management: Push configuration updates (new grading scales, updated syllabus mappings, security policies) to all schools with a single operation. Monitor deployment status per school and roll back if needed. This eliminates the need to log into each school's admin panel individually.`,
    codeExamples: [],
    lastUpdated: "2025-02-08",
    readTime: 5,
    difficulty: "intermediate",
  },
];

// ---------------------------------------------------------------------------
// Sections & Categories
// ---------------------------------------------------------------------------

const sections: DocsSection[] = [
  // Getting Started
  { slug: "setup", title: "Setup", description: "Get ExamForge installed, configured, and running for your school.", articles: articles.filter((a) => a.section === "setup") },
  { slug: "migration", title: "Migration", description: "Transition from paper-based exams to CBT.", articles: articles.filter((a) => a.section === "migration") },

  // CBT Platform
  { slug: "exam-management", title: "Exam Management", description: "Create, schedule, and run exams.", articles: articles.filter((a) => a.section === "exam-management") },
  { slug: "proctoring", title: "Proctoring", description: "Configure exam integrity and proctoring.", articles: articles.filter((a) => a.section === "proctoring") },
  { slug: "questions", title: "Questions & Results", description: "Manage question banks and results.", articles: articles.filter((a) => a.section === "questions") },

  // AI Features
  { slug: "generation", title: "Generation & Scoring", description: "AI-powered question generation and essay scoring.", articles: articles.filter((a) => a.section === "generation") },
  { slug: "adaptive", title: "Adaptive Testing", description: "Configure and run adaptive (CAT) exams.", articles: articles.filter((a) => a.section === "adaptive") },

  // Student Management
  { slug: "enrolment", title: "Enrolment", description: "Student enrolment and class management.", articles: articles.filter((a) => a.section === "enrolment") },
  { slug: "analytics", title: "Student Analytics", description: "Individual and cohort-level student insights.", articles: articles.filter((a) => a.section === "analytics") },

  // Analytics & Reports
  { slug: "dashboards", title: "Dashboards", description: "Exam and school analytics dashboards.", articles: articles.filter((a) => a.section === "dashboards") },
  { slug: "reporting", title: "Reporting", description: "Generate and export reports.", articles: articles.filter((a) => a.section === "reporting") },

  // Administration
  { slug: "config", title: "Configuration", description: "School settings and user management.", articles: articles.filter((a) => a.section === "config") },

  // Security & Compliance
  { slug: "privacy", title: "Privacy & Security", description: "Data privacy, compliance, and exam security.", articles: articles.filter((a) => a.section === "privacy") },

  // API Reference
  { slug: "auth", title: "Authentication", description: "API authentication methods.", articles: articles.filter((a) => a.section === "auth") },
  { slug: "resources", title: "Resources", description: "API endpoint reference.", articles: articles.filter((a) => a.section === "resources") },
  { slug: "webhooks", title: "Webhooks", description: "Real-time event notifications.", articles: articles.filter((a) => a.section === "webhooks") },

  // Integrations
  { slug: "connectors", title: "Connectors", description: "Pre-built integrations with third-party platforms.", articles: articles.filter((a) => a.section === "connectors") },

  // Deployment
  { slug: "install", title: "Installation", description: "On-premises and edge server deployment.", articles: articles.filter((a) => a.section === "install") },

  // Troubleshooting
  { slug: "exam-issues", title: "Exam Issues", description: "Common problems and their solutions.", articles: articles.filter((a) => a.section === "exam-issues") },
];

export const docsCategories: DocsCategory[] = [
  { slug: "getting-started", title: "Getting Started", description: "Set up ExamForge for your school and take your first exam.", icon: "Rocket", order: 1, sections: sections.filter((s) => ["setup", "migration"].includes(s.slug)) },
  { slug: "cbt-platform", title: "CBT Platform", description: "Create, deliver, and manage computer-based exams with proctoring and integrity tools.", icon: "Monitor", order: 2, sections: sections.filter((s) => ["exam-management", "proctoring", "questions"].includes(s.slug)) },
  { slug: "ai-features", title: "AI Features", description: "AI-powered question generation, adaptive testing, and automated essay scoring.", icon: "Brain", order: 3, sections: sections.filter((s) => ["generation", "adaptive"].includes(s.slug)) },
  { slug: "student-management", title: "Student Management", description: "Enrol students, organise classes, and track individual performance.", icon: "Users", order: 4, sections: sections.filter((s) => ["enrolment", "analytics"].includes(s.slug)) },
  { slug: "analytics-reports", title: "Analytics & Reports", description: "Dashboards, analytics, and exportable reports for data-driven decision-making.", icon: "BarChart3", order: 5, sections: sections.filter((s) => ["dashboards", "reporting"].includes(s.slug)) },
  { slug: "administration", title: "Administration", description: "School settings, user management, and multi-school configuration.", icon: "Settings", order: 6, sections: sections.filter((s) => s.slug === "config") },
  { slug: "security-compliance", title: "Security & Compliance", description: "Data privacy, NDPR compliance, and exam security best practices.", icon: "Shield", order: 7, sections: sections.filter((s) => s.slug === "privacy") },
  { slug: "api-reference", title: "API Reference", description: "REST API endpoints, authentication, webhooks, and SDK documentation.", icon: "Code2", order: 8, sections: sections.filter((s) => ["auth", "resources", "webhooks"].includes(s.slug)) },
  { slug: "integrations", title: "Integrations", description: "Connect ExamForge with your SIS, LMS, and other platforms.", icon: "Puzzle", order: 9, sections: sections.filter((s) => s.slug === "connectors") },
  { slug: "deployment", title: "Deployment", description: "On-premises installation and edge server configuration.", icon: "Server", order: 10, sections: sections.filter((s) => s.slug === "install") },
  { slug: "troubleshooting", title: "Troubleshooting", description: "Solutions to common problems on exam day and beyond.", icon: "Wrench", order: 11, sections: sections.filter((s) => s.slug === "exam-issues") },
];

// ---------------------------------------------------------------------------
// Convenience lookups
// ---------------------------------------------------------------------------

export const allDocsArticles = articles;

export const articleBySlug = Object.fromEntries(
  articles.map((a) => [a.slug, a])
) as Record<string, DocsArticle>;

export const docsCategoryBySlug = Object.fromEntries(
  docsCategories.map((c) => [c.slug, c])
) as Record<string, DocsCategory>;

export const articlesByCategory = (categorySlug: string): DocsArticle[] =>
  articles.filter((a) => a.category === categorySlug);

export const articlesByDifficulty = (difficulty: DocsDifficulty): DocsArticle[] =>
  articles.filter((a) => a.difficulty === difficulty);
