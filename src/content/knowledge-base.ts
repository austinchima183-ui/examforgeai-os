// =============================================================================
// ExamForge AI — Knowledge Base Content Data Layer
// =============================================================================

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type KBRole = "admin" | "teacher" | "student" | "parent" | "all";

export interface KBArticle {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  role: KBRole;
  helpful: { yes: number; no: number };
  lastUpdated: string;
  tags: string[];
  relatedArticles: string[];
}

export interface KBCategory {
  slug: string;
  title: string;
  description: string;
  icon: string;
  articles: KBArticle[];
  role: KBRole;
}

export interface TutorialStep {
  title: string;
  description: string;
  action: string;
  screenshot?: string;
}

export interface Tutorial {
  slug: string;
  title: string;
  description: string;
  steps: TutorialStep[];
  duration: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  role: KBRole;
  videoUrl: string;
  category: string;
}

// ---------------------------------------------------------------------------
// Articles (30+)
// ---------------------------------------------------------------------------

const kbArticles: KBArticle[] = [
  // ── Administrator Guides ─────────────────────────────────────────────
  {
    slug: "kb-admin-onboarding",
    title: "Getting Started as a School Administrator",
    excerpt: "Everything you need to set up ExamForge for your school in your first week.",
    content: `Welcome to ExamForge! As a School Administrator, you are the linchpin of your institution's CBT experience. This guide walks you through the essential setup tasks for your first week. Start by completing your school profile — enter your institution name, address, logo, and select your examination bodies (WAEC, NECO, JAMB, or custom). This determines which syllabi and question formats are available on your platform.

Next, configure your academic calendar. Create an academic session (e.g., "2024/2025"), define the three terms with their start and end dates, and set vacation periods. ExamForge uses these dates to organise exams, reports, and analytics. Then set up your grading scale — Nigerian schools commonly use A (70–100), B (60–69), C (50–59), D (45–49), E (40–44), F (0–39), but you can customise this to match your school's specific policy.

Now import your teachers and students. Navigate to Users → Import and upload a CSV file with your staff list. Assign each teacher to their subjects and classes. Then import students — a bulk CSV import can process 2,000 students in under 5 minutes. Students will receive automated welcome emails with their login credentials.

Finally, run the ExamForge System Check on the devices your school will use for exams. This verifies browser compatibility, network connectivity, and (for proctored exams) webcam access. Address any issues before scheduling your first exam.`,
    category: "admin-guides",
    role: "admin",
    helpful: { yes: 342, no: 8 },
    lastUpdated: "2025-02-15",
    tags: ["onboarding", "setup", "admin", "getting started"],
    relatedArticles: ["kb-school-configuration", "kb-user-management"],
  },
  {
    slug: "kb-school-configuration",
    title: "Configuring School Settings",
    excerpt: "How to set up grading scales, academic sessions, notification preferences, and branding.",
    content: `The School Settings page is your control centre for the ExamForge platform. Every change you make here affects the experience of teachers, students, and parents across your school.

Under the Profile tab, enter your school's name, address, and upload your logo and motto. These appear on student report cards, the exam interface, and parent-facing pages. Select your examination bodies (WAEC, NECO, JAMB, IGCSE, or Custom) — this controls which syllabi are available when teachers author exams.

Under Academic Calendar, define your sessions and terms. Each session has a name (e.g., "2024/2025") and contains one or more terms with specific date ranges. ExamForge uses these boundaries to organise exams and reports. You can also define holiday periods during which exam access is restricted.

The Grading tab lets you configure the grading scales used in reports. You can set up multiple scales: one for internal reporting (e.g., A–F) and one for external examination mapping (e.g., WAEC A1–F9). Each scale defines the score boundaries and grade labels.

Under Notifications, choose which events trigger email or SMS alerts. Common notifications include: exam results published (to students and parents), exam scheduled (to students), at-risk student alert (to teacher and parent), and system maintenance (to administrators). Configure the sender name and email address for school-branded notifications.`,
    category: "admin-guides",
    role: "admin",
    helpful: { yes: 198, no: 5 },
    lastUpdated: "2025-01-20",
    tags: ["configuration", "settings", "grading", "notifications"],
    relatedArticles: ["kb-admin-onboarding", "kb-user-management"],
  },
  {
    slug: "kb-user-management",
    title: "Managing Users, Roles & Permissions",
    excerpt: "Create accounts, assign roles, and configure permissions for your school's team.",
    content: `ExamForge uses role-based access control with four built-in roles: School Administrator, Teacher, Student, and Parent Observer. Understanding each role's capabilities is essential for maintaining security and appropriate access.

School Administrators have full platform access: they can manage all user accounts, configure school settings, create and schedule exams, view all analytics and reports, and manage billing. There is no limit on the number of administrator accounts, but we recommend keeping the admin team small (2–3 people) for security.

Teachers can author exams, manage question banks in their assigned subjects, view results for their classes, and generate reports. They cannot modify school-wide settings, access billing, or view data for classes they are not assigned to. Assign teachers to subjects and classes during account creation or via the Users page.

Students can take exams, view their own results and analytics, and access practice mode. They cannot see other students' data or access question banks. Student accounts can be created individually or via bulk CSV import.

Parent Observers have read-only access to their linked child's results and attendance. They cannot take exams or modify any data. Link parent accounts to one or more student accounts; parents receive automatic notifications when results are published.

For institutions with more complex organisational structures, you can create custom roles with granular permissions — for example, a "Department Head" role that can view analytics across their department's classes but not modify school-wide settings.`,
    category: "admin-guides",
    role: "admin",
    helpful: { yes: 267, no: 12 },
    lastUpdated: "2025-02-01",
    tags: ["users", "roles", "permissions", "RBAC"],
    relatedArticles: ["kb-admin-onboarding", "kb-school-configuration"],
  },
  {
    slug: "kb-billing-subscription",
    title: "Billing & Subscription Management",
    excerpt: "Understand your plan, manage payment methods, and view usage-based billing details.",
    content: `ExamForge offers three pricing tiers designed for Nigerian and African schools of all sizes. The Starter plan (free) supports up to 200 students and 5 teachers — ideal for small private schools or pilot programmes. The Professional plan (₦150,000/term) supports unlimited students and teachers, AI question generation, and advanced analytics. The Enterprise plan (custom pricing) adds on-premises deployment, custom integrations, dedicated support, and SLA guarantees.

Your current plan and usage are displayed on the Billing page. For metered features (AI question generation beyond your plan's monthly quota, SMS notifications beyond the included allowance), the billing page shows your current usage and projected charges. There are no surprise bills — you set spending caps for metered features.

Payment Methods: We accept bank transfers (GT Bank, Access Bank, First Bank), card payments (Visa, Mastercard), and mobile money (OPay, PalmPay). For government institutions, we also support purchase-order-based invoicing with NET 30 payment terms.

Upgrading: You can upgrade your plan at any time; the new plan takes effect immediately and you are charged a prorated amount for the remainder of the billing period. Downgrades take effect at the start of the next billing period to ensure uninterrupted access to current-plan features.`,
    category: "admin-guides",
    role: "admin",
    helpful: { yes: 156, no: 3 },
    lastUpdated: "2025-01-15",
    tags: ["billing", "subscription", "pricing", "payment"],
    relatedArticles: ["kb-admin-onboarding"],
  },
  {
    slug: "kb-data-export-backup",
    title: "Data Export & Backup",
    excerpt: "Export your school's data for backup, compliance, or migration purposes.",
    content: `As a School Administrator, you can export all of your school's data from ExamForge at any time. This is important for backup purposes, regulatory compliance (NDPR right to data portability), and for institutions that want to maintain a local copy of their assessment data.

Available exports include: Student Roster (CSV/Excel — all student profiles and class assignments), Exam Results (CSV/Excel — all exam scores with item-level detail), Question Bank (JSON — all items with metadata, tags, and quality scores), Reports (PDF — all generated reports), and Analytics Data (CSV/JSON — aggregate statistics for external analysis).

To export, navigate to School Settings → Data Export, select the data type and date range, and click Export. Small exports are generated instantly; large exports (e.g., a full year of exam results) are processed asynchronously and you receive an email with a secure download link when the export is ready.

All exports are encrypted with AES-256 and the download link expires after 72 hours. We recommend downloading exports promptly and storing them securely. For schools on the Enterprise plan, we offer scheduled automatic exports (e.g., weekly backup to your AWS S3 bucket or Azure Blob Storage).`,
    category: "admin-guides",
    role: "admin",
    helpful: { yes: 89, no: 2 },
    lastUpdated: "2025-01-28",
    tags: ["export", "backup", "data", "compliance"],
    relatedArticles: ["kb-data-privacy-ndpr"],
  },

  // ── Teacher Guides ────────────────────────────────────────────────────
  {
    slug: "kb-teacher-onboarding",
    title: "Getting Started as a Teacher",
    excerpt: "Your first steps on ExamForge — from logging in to creating your first exam.",
    content: `As a teacher on ExamForge, your primary activities are authoring exams, managing your question bank, and reviewing student results. This guide covers everything you need to get started in your first session.

Log in using the credentials sent to your email by your school administrator. On first login, you will be prompted to set your password and verify your email address. You will also be asked to complete a brief profile — your name, subjects, and a profile photo (which students see on the exam interface).

Your dashboard shows: upcoming exams (scheduled exams in the next 7 days), recent results (exams that have been completed and are ready for review), and quick actions (Create Exam, Create Question, View Question Bank). Click "Create Exam" to author your first exam.

When creating an exam, you will select a subject and class, choose a question source (AI-generate, manual author, or item bank), set the exam duration and schedule, and publish. For your first exam, we recommend using AI question generation with a small set (20 items) to see how the engine works. Review the generated questions, make any edits, and publish the exam to your class.

After students take the exam, you will see results on your dashboard within minutes for objective exams. Click into the results to see the exam analytics dashboard — item analysis, topic heatmap, and student performance distribution. Use these insights to identify topics that need reteaching and adjust your lesson plans accordingly.`,
    category: "teacher-guides",
    role: "teacher",
    helpful: { yes: 423, no: 7 },
    lastUpdated: "2025-02-10",
    tags: ["teacher", "onboarding", "getting started"],
    relatedArticles: ["kb-creating-exams", "kb-question-authoring"],
  },
  {
    slug: "kb-creating-exams",
    title: "Creating & Scheduling Exams",
    excerpt: "A step-by-step guide to creating an exam, populating it with questions, and scheduling it for your class.",
    content: `Creating an exam in ExamForge is a three-step process: define the exam structure, add questions, and schedule sessions. Let us walk through each step.

Step 1: Click Exams → Create Exam. Enter the exam title (e.g., "Mathematics Continuous Assessment — Test 2"), select the subject and class, choose the examination body (WAEC, NECO, or Custom), and set the exam duration in minutes. Configure additional settings: randomise question order (recommended to prevent copying), randomise option order (additional security), allow question review before submission, and set the passing score.

Step 2: Add questions. You have three options: AI-Generate lets the platform create questions based on your syllabus and difficulty profile — ideal for saving time. Manual Author lets you write questions one by one in the question editor. Item Bank lets you select pre-certified questions from your school's question bank, filtering by topic, difficulty, and cognitive level. You can mix sources — for example, AI-generate 30 items and manually add 10 from your bank.

Step 3: Schedule the exam. Create a session with a date and time window, and assign it to a class or custom group. You can create multiple sessions (e.g., morning and afternoon shifts) for the same exam. Students in the assigned group will see the exam on their dashboard at the scheduled time.

Pro tip: Before a high-stakes exam, always run a dry-run session with a small test group (3–5 students) to verify that questions render correctly, the timer works, and results are generated as expected.`,
    category: "teacher-guides",
    role: "teacher",
    helpful: { yes: 389, no: 11 },
    lastUpdated: "2025-02-12",
    tags: ["exams", "scheduling", "creating"],
    relatedArticles: ["kb-teacher-onboarding", "kb-question-authoring", "kb-exam-day-tips"],
  },
  {
    slug: "kb-question-authoring",
    title: "Authoring Questions",
    excerpt: "How to write effective exam questions using ExamForge's question editor, with tips for each question type.",
    content: `ExamForge supports 12 question types, and the question editor adapts its interface based on the type you select. Here are tips for authoring effective questions in the most common formats.

Multiple Choice: Write a clear, unambiguous stem — the question should be understandable without reading the options. Avoid negative phrasing ("Which of the following is NOT...") unless the skill being tested specifically requires it. Make all distractors (wrong options) plausible — a distractor that no student would select provides no measurement information. Use the "Distractor Analysis" tool after your first administration to identify non-functional distractors.

Fill in the Blank: Be specific about the expected answer format. If the answer is a number, specify the number of decimal places or significant figures. If the answer is a word or phrase, indicate whether spelling matters. Use the "Acceptable Answers" field to list alternative correct forms (e.g., "3/4" and "0.75" for a fraction question).

Essay: Provide a clear prompt with explicit instructions on length, structure, and content expectations. Attach a marking rubric — this ensures consistency if multiple graders are involved and enables AI-assisted scoring. The rubric should specify criteria (e.g., Content, Organisation, Expression) with point ranges for each level.

Drag and Drop: Ensure that labels and target zones are clearly distinguishable. Avoid overlapping target zones, which can cause ambiguity. Test the interaction on both desktop (mouse) and mobile (touch) to ensure usability.

For all question types, tag every item with the syllabus topic and cognitive level (Bloom's Taxonomy). This metadata powers the analytics dashboard and enables the AI engine to generate balanced question sets in the future.`,
    category: "teacher-guides",
    role: "teacher",
    helpful: { yes: 312, no: 14 },
    lastUpdated: "2025-01-25",
    tags: ["questions", "authoring", "multiple choice", "essay"],
    relatedArticles: ["kb-creating-exams", "kb-ai-question-gen-guide"],
  },
  {
    slug: "kb-reviewing-results",
    title: "Reviewing & Interpreting Exam Results",
    excerpt: "Make the most of ExamForge's analytics dashboard to understand student performance and inform your teaching.",
    content: `After an exam is completed and results are generated, the analytics dashboard provides a wealth of information to guide your teaching. This guide helps you interpret each section of the dashboard.

The Score Distribution shows a histogram of student scores. A normal (bell-curve) distribution suggests the exam was well-calibrated for the class's ability range. A bimodal distribution (two peaks) indicates that the class has split into two ability groups — consider differentiated instruction. A left-skewed distribution (most scores are high) means the exam was easy; right-skewed means it was hard.

The Item Analysis table is your most powerful tool. For each question, you see: Difficulty Index (proportion of students who answered correctly — aim for 0.3–0.7 for discriminating items), Discrimination Index (how well the item separates high and low performers — aim for >0.25), and Distractor Analysis (the proportion selecting each wrong option — functional distractors should attract at least 5% of students). Items with low discrimination or non-functional distractors should be revised before reuse.

The Topic Heatmap shows average performance by syllabus topic. Red topics (average <50%) need reteaching. Yellow topics (50–70%) need reinforcement. Green topics (>70%) are well-mastered. Use this to prioritise your upcoming lessons.

The Time Analysis shows how long students spent on each question. Students who spend much longer than average on a topic may have conceptual gaps; students who answer very quickly may be guessing. Share this data with students to help them improve their time management.`,
    category: "teacher-guides",
    role: "teacher",
    helpful: { yes: 278, no: 6 },
    lastUpdated: "2025-02-08",
    tags: ["results", "analytics", "item analysis", "teaching insights"],
    relatedArticles: ["kb-creating-exams", "kb-at-risk-students"],
  },
  {
    slug: "kb-ai-question-gen-guide",
    title: "Using AI Question Generation",
    excerpt: "A practical guide to generating exam questions with AI while maintaining quality and control.",
    content: `AI question generation is one of ExamForge's most powerful features — it can produce a complete exam's worth of questions in minutes rather than days. But it works best when you understand how to guide the engine and review its output effectively.

Start by selecting the subject, class level, and specific syllabus topics you want to cover. The more specific you are, the better the output. For example, instead of selecting "Mathematics", select "Algebra → Simultaneous Equations" for more targeted items.

Configure the generation parameters. The count determines how many items to generate (10–200). The difficulty distribution sets the ratio of easy/medium/hard items — match this to your exam blueprint. The cognitive levels target sets the Bloom's Taxonomy mix — for a WAEC-style exam, you might aim for 20% Remember, 30% Apply, 30% Analyse, 20% Evaluate. The question type determines the format.

Review the generated questions carefully. The review interface shows each question alongside the AI's confidence scores for syllabus alignment, difficulty calibration, and bias screening. Questions with low confidence scores (<0.80) are highlighted for extra scrutiny. On average, teachers modify about 15% of AI-generated items — accepting 85% unchanged.

Best practices: generate more items than you need (e.g., generate 60 for a 40-item exam) so you can cherry-pick the best. Use the "Regenerate" button for specific items that do not meet your standards rather than discarding the entire batch. Always review a sample of items in a dry-run exam before using AI-generated items in a high-stakes assessment for the first time.`,
    category: "teacher-guides",
    role: "teacher",
    helpful: { yes: 356, no: 9 },
    lastUpdated: "2025-02-15",
    tags: ["AI", "question generation", "quality", "review"],
    relatedArticles: ["kb-question-authoring", "kb-creating-exams"],
  },
  {
    slug: "kb-at-risk-students",
    title: "Identifying & Supporting At-Risk Students",
    excerpt: "Use ExamForge's predictive analytics to find students who need help before they fail.",
    content: `ExamForge's At-Risk Students report uses a machine-learning model to identify students who are likely to score below the passing threshold on their next exam. Early identification enables early intervention — the most effective strategy for improving outcomes.

The model considers three signals: recent exam performance (weighted towards the most recent results, with declining weight for older exams), practice engagement (students who are not using practice mode are at higher risk), and attendance patterns (students with inconsistent exam attendance are flagged). Each at-risk student is assigned a risk score from 0–100 and a recommended intervention.

Common interventions include: assign adaptive practice in the student's weakest subject and topic, schedule a one-on-one session with the class teacher, provide additional learning resources (video lessons, worksheets), and notify the student's parent via the Parent Observer portal. ExamForge can automate some of these — for example, automatically assigning a practice set when a student's risk score exceeds 70.

Review the At-Risk report weekly, not just before exams. Trends over time are more informative than snapshots. A student whose risk score is improving (even if still elevated) is responding to intervention; a student whose score is worsening needs a different approach.

Important: The at-risk model is a guide, not a verdict. Use it to direct your attention, but apply your professional judgement. Some students perform well in practice but underperform in exams (test anxiety); others have situational factors (family issues, health) that the model cannot capture.`,
    category: "teacher-guides",
    role: "teacher",
    helpful: { yes: 201, no: 4 },
    lastUpdated: "2025-01-30",
    tags: ["at-risk", "analytics", "intervention", "student support"],
    relatedArticles: ["kb-reviewing-results", "kb-student-practice-mode"],
  },
  {
    slug: "kb-exam-day-tips",
    title: "Exam Day Tips for Teachers",
    excerpt: "Practical tips for running a smooth exam day — before, during, and after the exam.",
    content: `A smooth exam day requires preparation and vigilance. These tips are distilled from the experiences of thousands of exam sessions run on ExamForge across Nigerian schools.

Before the exam (day before): Verify that all student accounts are active and assigned to the correct session. Run the System Check on exam devices. Pre-download the exam package to the Edge Server or local cache. Send a reminder to students with the exam time, duration, and any materials they need.

Before the exam (30 minutes before): Open the Invigilator Dashboard and confirm the session status is "Ready". Check the device count against your expected student count. Brief students on the exam interface: show them the timer, question navigator, flag-for-review feature, and the submit button. Emphasise that they should flag uncertain questions and return to them later.

During the exam: Monitor the Invigilator Dashboard for alerts. The dashboard shows real-time progress for every student, proctoring flags, and any technical issues. For proctoring alerts (tab switch, off-screen gaze), approach the student discreetly — most alerts are innocent (adjusting position, reading from scratch paper). Only escalate confirmed malpractice.

After the exam: Verify the submission count matches your student count. If any submissions show "Pending Sync", wait 15 minutes for automatic retry. Review the proctoring summary for any escalated incidents that require follow-up. Objective exam results will be available within 5 minutes; take a quick look to confirm scoring worked correctly before publishing to students.`,
    category: "teacher-guides",
    role: "teacher",
    helpful: { yes: 445, no: 3 },
    lastUpdated: "2025-02-12",
    tags: ["exam day", "invigilation", "tips", "operations"],
    relatedArticles: ["kb-creating-exams", "kb-proctoring-setup"],
  },
  {
    slug: "kb-proctoring-setup",
    title: "Setting Up AI Proctoring",
    excerpt: "Configure AI proctoring for your exams — webcam monitoring, browser lockdown, and alert thresholds.",
    content: `AI proctoring adds a layer of integrity monitoring to your exams. Here is how to configure it for different exam types.

For school-level continuous assessment exams (medium stakes): Enable basic browser monitoring (tab switch and copy/paste detection) and question randomisation. You do not need webcam proctoring for these exams, and the reduced privacy impact is appreciated by students and parents.

For mid-term and end-of-term exams (high stakes): Enable full AI proctoring: webcam monitoring (face detection, gaze tracking), browser lockdown (via the ExamForge extension), keystroke dynamics, and all three randomisation strategies (question order, option order, and parallel forms). Set alert thresholds to "Standard" — this balances sensitivity with false-positive rate.

For external exam preparation mocks (highest stakes — JAMB, WAEC level): Enable full proctoring with "Strict" alert thresholds. Use the ExamForge Secure Browser (kiosk mode) for maximum lockdown. Enable the collusion detection algorithm, which flags pairs of students with suspiciously similar answer patterns. Require photo verification at login.

Configuring proctoring: Navigate to Exam Settings → Proctoring when creating or editing an exam. Toggle each monitoring channel on/off and set the alert threshold (Standard or Strict). Standard mode sends alerts to the invigilator dashboard only; Strict mode also pauses the exam for the student and requires invigilator intervention to resume.

Important: Always inform students that proctoring is active before the exam begins. This is both a legal requirement (NDPR) and a practical one — awareness deters most cheating attempts. Display the proctoring notice on the exam start screen (ExamForge does this automatically when proctoring is enabled).`,
    category: "teacher-guides",
    role: "teacher",
    helpful: { yes: 178, no: 22 },
    lastUpdated: "2025-02-05",
    tags: ["proctoring", "AI", "integrity", "browser lockdown"],
    relatedArticles: ["kb-exam-day-tips", "kb-exam-security-checklist"],
  },

  // ── Student Guides ────────────────────────────────────────────────────
  {
    slug: "kb-student-onboarding",
    title: "Getting Started as a Student",
    excerpt: "How to log in, navigate your dashboard, and take your first exam on ExamForge.",
    content: `Welcome to ExamForge! As a student, your dashboard is your home base for everything exam-related: upcoming exams, practice sessions, and your results history.

Log in using the credentials provided by your school — typically your email address and a temporary password. On first login, you will set your own password. If your school uses Google or Microsoft accounts, you can log in with a single click via the "Sign in with Google" or "Sign in with Microsoft" button.

Your dashboard shows three sections. Upcoming Exams displays exams that have been scheduled for you, with the date, time, subject, and duration. Click "Enter Exam" when the exam window opens — the button is only active during the scheduled time. Practice Mode lets you take practice exams at any time, with instant feedback on each answer. Results shows your completed exams with scores and detailed analytics.

Before your first real exam, we strongly recommend taking at least one practice exam. Practice mode uses the same interface as live exams, so you will be comfortable with the timer, navigation, and submission process when it counts. You can take unlimited practice exams at no extra cost.

If your exam requires proctoring (webcam monitoring), you will be asked to grant camera access when the exam starts. Make sure your webcam is working and you are in a quiet, well-lit environment. Position yourself so your face is clearly visible on camera — this ensures the proctoring system works correctly and avoids false alerts.`,
    category: "student-guides",
    role: "student",
    helpful: { yes: 567, no: 5 },
    lastUpdated: "2025-02-10",
    tags: ["student", "onboarding", "getting started"],
    relatedArticles: ["kb-taking-exam", "kb-student-practice-mode"],
  },
  {
    slug: "kb-taking-exam",
    title: "Taking an Exam on ExamForge",
    excerpt: "Everything you need to know about the exam interface — navigation, timer, flagging, and submission.",
    content: `When you enter an exam, the interface has four main components: the question area (centre), the timer (top-right), the question navigator (left sidebar), and the action bar (bottom).

The Question Area displays the current question, its options (for multiple-choice), and any associated images or media. Select your answer by clicking the option or typing the letter (A, B, C, D, E) on your keyboard. For fill-in-the-blank and numeric questions, type your answer in the input field. For essay questions, use the rich-text editor to write your response.

The Timer counts down from the exam duration. The timer turns yellow when you have 10 minutes remaining and red when you have 5 minutes remaining. When the timer reaches zero, your exam is automatically submitted — you will receive a warning at the 5-minute mark. Manage your time carefully; use the question navigator to identify unanswered questions and prioritise them.

The Question Navigator shows all questions in the exam, colour-coded: grey (not yet visited), white (visited but not answered), green (answered), and orange (flagged for review). Click any question number to jump to it. Use the "Flag for Review" button on questions you are unsure about — you can return to them later via the navigator.

The Action Bar has three buttons: Previous (go to the previous question), Next (go to the next question), and Submit Exam (finish the exam). When you click Submit, a confirmation dialog appears showing the number of answered, unanswered, and flagged questions. Review this carefully before confirming — once submitted, you cannot change your answers (unless your teacher allows resumption).`,
    category: "student-guides",
    role: "student",
    helpful: { yes: 678, no: 3 },
    lastUpdated: "2025-02-12",
    tags: ["exam", "interface", "navigation", "timer"],
    relatedArticles: ["kb-student-onboarding", "kb-exam-tips-students"],
  },
  {
    slug: "kb-student-practice-mode",
    title: "Using Practice Mode",
    excerpt: "How to access practice exams, use adaptive practice, and review your performance.",
    content: `Practice Mode is your secret weapon for exam success. Students who complete 5+ practice exams before their real exam score an average of 14% higher — that is the difference between a C and an A in many subjects.

Access practice mode from your dashboard. Click "Practice" and select a subject. You can choose between: Standard Practice (a fixed set of questions similar to a real exam), Adaptive Practice (questions that adjust to your ability level — recommended for efficient studying), and Topic-Specific Practice (focus on a particular topic you want to improve).

In Standard Practice, you take a timed exam just like the real thing. After submission, you see your score, a question-by-question breakdown (showing which you got right and wrong), and explanations for each correct answer. Wrong answers are learning opportunities — read the explanation carefully.

In Adaptive Practice, the engine starts with medium-difficulty questions and adjusts based on your responses. If you answer correctly, the next question is harder; if you answer incorrectly, it is easier. This zeroes in on your frontier of knowledge — the boundary between what you know and what you do not — so you spend your study time where it matters most.

After each practice session, review your Personalised Study Plan. This shows: topics where you are below the exam-readiness threshold (prioritise these in your studying), specific misconceptions detected (e.g., "you confuse mean and median"), and recommended next steps (specific practice sets, video lessons, or textbook chapters).`,
    category: "student-guides",
    role: "student",
    helpful: { yes: 534, no: 8 },
    lastUpdated: "2025-02-05",
    tags: ["practice", "adaptive", "study plan", "student"],
    relatedArticles: ["kb-student-onboarding", "kb-exam-tips-students"],
  },
  {
    slug: "kb-exam-tips-students",
    title: "Exam Tips & Strategies",
    excerpt: "Proven strategies for managing your time, avoiding common mistakes, and maximising your score on CBT exams.",
    content: `Computer-based exams require different strategies than paper-based ones. These tips will help you make the most of your CBT experience.

Time Management: Do not spend too long on any single question. As a rule of thumb, allocate the total exam time equally across questions (e.g., 120 minutes ÷ 60 questions = 2 minutes per question). If a question is taking much longer, flag it for review and move on — you can return later. Answer the easy questions first to secure those marks, then tackle the harder ones with your remaining time.

The Flag-for-Review Feature: Use it liberally. Flag any question you are unsure about, even if you have selected an answer. It is easier to review flagged questions at the end than to scroll through the entire exam looking for the ones you doubted. Most students flag 10–20% of questions — this is normal.

Guessing Strategy: In multiple-choice exams with no negative marking, never leave a question unanswered — an educated guess has a 20–25% chance of being correct, versus 0% for a blank. Eliminate obviously wrong options first to improve your odds. If you truly cannot eliminate any options, guess "C" — statistically, examiners tend to place correct answers in the middle positions.

Reading Questions Carefully: The most common mistake in CBT exams is misreading the question. Read every word — especially words like "NOT", "EXCEPT", "ALWAYS", and "NEVER" that change the meaning. On a screen, it is easy to skim; slow down and read deliberately.

Technical Tips: Do not refresh the page during an exam — this can cause your timer to reset. Do not use keyboard shortcuts (Ctrl+C, Ctrl+V) — they are blocked by browser lockdown. If the exam freezes, wait 10 seconds (the offline cache will recover); if it persists, raise your hand for the invigilator.`,
    category: "student-guides",
    role: "student",
    helpful: { yes: 712, no: 2 },
    lastUpdated: "2025-02-08",
    tags: ["tips", "strategies", "time management", "CBT"],
    relatedArticles: ["kb-taking-exam", "kb-student-practice-mode"],
  },
  {
    slug: "kb-viewing-results",
    title: "Viewing Your Results & Analytics",
    excerpt: "Understand your exam results, performance trends, and personalised study recommendations.",
    content: `After your teacher publishes exam results, they appear on your dashboard. Click on any completed exam to see your detailed results.

The Results Overview shows your total score, the class average (so you can see how you compare), and your position in the class (if your school enables ranking). A score interpretation explains what your score means in the context of the grading scale — for example, "You scored 72%, which is a B (Good). This is above the class average of 65%."

The Topic Breakdown shows your performance by syllabus topic, colour-coded like a traffic light: green (topics you mastered), yellow (topics with room for improvement), and red (topics you need to focus on). This is the most actionable section — it tells you exactly what to study next.

The Question Review shows every question with your answer, the correct answer, and an explanation. For questions you answered incorrectly, the explanation is especially valuable — it addresses the specific misconception that led you to the wrong answer. Some teachers also provide feedback comments on essay questions.

Your Performance Trend tracks your scores across all exams in a subject over time. An upward trend shows improvement; a flat or downward trend suggests you need to change your study approach. Use this data to have informed conversations with your teacher about where you need support.

Privacy note: You can only see your own results. You cannot see other students' scores or positions unless your school explicitly enables class-wide ranking (which is rare and typically only for end-of-term results).`,
    category: "student-guides",
    role: "student",
    helpful: { yes: 445, no: 6 },
    lastUpdated: "2025-01-28",
    tags: ["results", "analytics", "performance", "student"],
    relatedArticles: ["kb-taking-exam", "kb-student-practice-mode"],
  },

  // ── Parent Guides ─────────────────────────────────────────────────────
  {
    slug: "kb-parent-onboarding",
    title: "Getting Started as a Parent Observer",
    excerpt: "How to access your child's exam results, set up notifications, and support their learning.",
    content: `As a Parent Observer on ExamForge, you have read-only access to your child's exam results and analytics. This keeps you informed about their academic progress so you can support them effectively at home.

Your school administrator will create your account and link it to your child's student account. You will receive a welcome email with login instructions. On first login, set your password and verify your email address.

Your dashboard shows: Recent Results (your child's latest exam scores, published by their teachers), Upcoming Exams (exams scheduled in the next 7 days, so you can help your child prepare), and Attendance Summary (your child's exam attendance rate — missing exams is a strong predictor of poor outcomes).

When you click into a result, you see: the total score and grade, the class average (for context), and a topic breakdown showing where your child is strong and where they need support. You do not see specific questions or answers — only aggregate topic-level performance.

Set up notifications to stay informed without logging in. We recommend enabling: Result Published (receive an email or SMS whenever new results are available), At-Risk Alert (notified if your child is flagged as at-risk in any subject), and Exam Reminder (reminded 24 hours before a scheduled exam so you can ensure your child is prepared). Configure these under Settings → Notifications.`,
    category: "parent-guides",
    role: "parent",
    helpful: { yes: 234, no: 4 },
    lastUpdated: "2025-01-20",
    tags: ["parent", "onboarding", "getting started"],
    relatedArticles: ["kb-parent-results", "kb-parent-support"],
  },
  {
    slug: "kb-parent-results",
    title: "Understanding Your Child's Results",
    excerpt: "A guide to interpreting exam results, topic breakdowns, and what they mean for your child's learning.",
    content: `When your child's teacher publishes exam results, you will see them on your Parent Observer dashboard. Here is how to interpret what you see.

The Total Score is the percentage of marks your child achieved. This is compared against the class average so you can see whether your child is above, at, or below average. A score that is below average is not necessarily cause for concern — the exam may have been difficult for the entire class. Look at the class average: if the average is 45% and your child scored 42%, they are close to the norm; if the average is 75% and your child scored 42%, there is a larger gap.

The Topic Breakdown is the most useful section. It shows your child's performance in each syllabus topic, with a traffic-light indicator. Green topics are mastered — your child is performing well. Yellow topics need reinforcement — some extra practice at home would help. Red topics are weak — your child needs significant support, possibly including a tutor or teacher intervention.

If your child's school has enabled the At-Risk feature, you may receive an at-risk notification. This means the platform's predictive model has identified that your child is at risk of scoring below the passing threshold in an upcoming exam. Do not panic — this is an early warning designed to give you time to act. Talk to your child's teacher about the specific areas of concern and what support is available. Encourage your child to use ExamForge's Practice Mode — students who practise regularly show significant improvement.

If you have multiple children at the same school, you can link all of their accounts to your parent profile and switch between them on your dashboard.`,
    category: "parent-guides",
    role: "parent",
    helpful: { yes: 189, no: 3 },
    lastUpdated: "2025-02-01",
    tags: ["parent", "results", "interpretation", "support"],
    relatedArticles: ["kb-parent-onboarding", "kb-parent-support"],
  },
  {
    slug: "kb-parent-support",
    title: "Supporting Your Child's Exam Preparation",
    excerpt: "Practical ways parents can help their children prepare for CBT exams using ExamForge.",
    content: `As a parent, your support is crucial to your child's exam success. Here are practical ways to help, informed by data from thousands of ExamForge students.

Ensure Device Access: Your child needs access to a computer, tablet, or smartphone for both practice and real exams. If your household has limited devices, establish a schedule that gives your child dedicated exam-preparation time. ExamForge's mobile app works offline, so even a basic Android phone is sufficient for practice.

Encourage Regular Practice: Data shows that students who complete 5+ practice exams score 14% higher on average. Encourage your child to use Practice Mode for 20–30 minutes daily, especially in the weeks leading up to an exam. The Adaptive Practice feature is particularly effective — it focuses on the topics your child needs most, making study time efficient.

Review Results Together: When results are published, sit with your child and review the Topic Breakdown. Celebrate the green topics (mastery) and discuss the red ones (weaknesses) without judgement. Frame it as "these are the areas where extra practice will make the biggest difference" rather than "you are bad at this."

Provide a Good Exam-Day Environment: On exam day, ensure your child has a quiet space, a reliable device, and a stable internet connection. If the exam requires proctoring, set up the webcam at eye level in a well-lit room. Remove distractions (other devices, music, conversations). Remind your child to use the restroom and have water before the exam starts — they cannot pause once it begins.

Manage Exam Anxiety: Some students perform well in practice but underperform in real exams due to anxiety. If you notice this pattern, help your child develop relaxation techniques (deep breathing, positive self-talk). Reassure them that the CBT interface is the same one they use in practice — there are no surprises on exam day.`,
    category: "parent-guides",
    role: "parent",
    helpful: { yes: 267, no: 2 },
    lastUpdated: "2025-02-08",
    tags: ["parent", "support", "preparation", "exam day"],
    relatedArticles: ["kb-parent-onboarding", "kb-parent-results"],
  },

  // ── General / Cross-Role ──────────────────────────────────────────────
  {
    slug: "kb-data-privacy-ndpr",
    title: "Data Privacy & Your Rights",
    excerpt: "How ExamForge protects your data and what rights you have under Nigeria's Data Protection Regulation.",
    content: `ExamForge is committed to protecting the personal data of every student, teacher, and parent on our platform. This article explains what data we collect, how we use it, and what rights you have under the Nigeria Data Protection Regulation (NDPR).

What data we collect: For students, we collect name, class, email/phone, and exam responses. For teachers, we collect name, subjects, and email. For parents, we collect name, email, and the link to their child's account. We also collect usage data (login times, session duration) for platform improvement.

How we use it: Student data is used to deliver exams, generate results and analytics, and provide practice features. Teacher data is used to manage exam authoring and class assignments. Parent data is used to send result notifications. We never sell personal data to third parties. We never use student data for advertising.

How we protect it: All data is encrypted at rest (AES-256) and in transit (TLS 1.3). Data is stored in data centres in Lagos, Nigeria. Access is restricted to authorised personnel on a need-to-know basis, audited continuously. We undergo annual SOC 2 Type II audits and quarterly penetration tests.

Your rights under NDPR: You have the right to access your data (request a copy), rectify inaccuracies, request deletion (subject to legitimate retention requirements — e.g., exam records must be retained for 5 years per WAEC policy), and data portability (receive your data in a machine-readable format). To exercise any of these rights, contact your school administrator or email privacy@examforge.ai.`,
    category: "general",
    role: "all",
    helpful: { yes: 123, no: 1 },
    lastUpdated: "2025-01-15",
    tags: ["privacy", "NDPR", "data protection", "rights"],
    relatedArticles: ["kb-data-export-backup", "kb-exam-security-checklist"],
  },
  {
    slug: "kb-exam-security-checklist",
    title: "Exam Security Checklist",
    excerpt: "A comprehensive security checklist for institutions running high-stakes CBT exams.",
    content: `This checklist is designed for school administrators and exam officers preparing for high-stakes CBT exams (e.g., JAMB mocks, WAEC preparation exams, end-of-year exams). Check each item before exam day.

Infrastructure: All exam devices have passed the ExamForge System Check. Edge Server is online and has pre-downloaded the exam package. Backup power (generator or UPS) is available and tested. Network is stable — wired Ethernet preferred over Wi-Fi. Sufficient spare devices are available (10% of total).

Exam Configuration: Question randomisation is enabled (question order, option order, or both). Proctoring is configured at the appropriate level for the exam's stakes. Browser lockdown is enabled (Secure Browser for highest stakes, extension for medium). Exam duration and passing score are verified. Student group assignment is verified (no students missing, no extra students).

Pre-Exam Communication: Students have been informed that proctoring will be active (NDPR requirement). Students have practised with the exam interface in at least one practice session. Exam date, time, and venue have been communicated to all students. Invigilators have been briefed on the Invigilator Dashboard and alert procedures.

Day-of Procedures: System Check is re-run on all devices. Exam session status is confirmed "Ready" on the Invigilator Dashboard. Student count matches expected attendance. Invigilators are positioned with clear sightlines and access to the dashboard. Phone collection (or aeroplane-mode enforcement) is in place. After the exam: submission count is verified, proctoring incidents are reviewed, and results are spot-checked before publication.`,
    category: "general",
    role: "all",
    helpful: { yes: 312, no: 5 },
    lastUpdated: "2025-02-10",
    tags: ["security", "checklist", "exam day", "integrity"],
    relatedArticles: ["kb-proctoring-setup", "kb-exam-day-tips"],
  },
  {
    slug: "kb-mobile-app-guide",
    title: "Using the ExamForge Mobile App",
    excerpt: "Download, set up, and use the ExamForge mobile app for offline exam practice on any device.",
    content: `The ExamForge Mobile App lets you take practice exams on your Android or iOS device — even without an internet connection. This is especially valuable for students in areas with limited connectivity or schools without computer labs.

Download the app from Google Play (Android 8.0+) or the Apple App Store (iOS 15.0+). Log in with your ExamForge student credentials. The first time you log in, the app will sync your profile and download any pending exam packages over your current connection.

To download an exam package for offline use, tap the download icon next to the exam in your Upcoming Exams list. The package includes all questions, images, and audio files — typically 1–3 MB for an objective exam. Once downloaded, you can take the exam anywhere, anytime, without an internet connection.

Offline exam sessions work exactly like online sessions: the timer counts down, you navigate between questions, and you submit when finished. The key difference is that your answers are stored securely on your device rather than sent to the server immediately. When you reconnect to the internet (even briefly), the app syncs your results automatically. You will see a sync confirmation on your dashboard.

Security features: Exam content is encrypted on your device and cannot be accessed outside the app. Screen capture is detected and reported. The app binds the exam package to your device — you cannot transfer it to another phone or share it with a friend. These protections ensure that offline access does not compromise exam integrity.`,
    category: "student-guides",
    role: "student",
    helpful: { yes: 389, no: 7 },
    lastUpdated: "2025-02-12",
    tags: ["mobile", "offline", "Android", "iOS"],
    relatedArticles: ["kb-student-onboarding", "kb-taking-exam"],
  },
  {
    slug: "kb-accessibility-features",
    title: "Accessibility Features",
    excerpt: "How ExamForge supports students with disabilities — screen readers, magnification, and more.",
    content: `ExamForge is committed to making CBT accessible to every student, including those with visual, auditory, motor, or cognitive disabilities. This article describes the accessibility features available on the platform.

Screen Reader Support: The exam interface is fully compatible with NVDA (Windows), VoiceOver (macOS/iOS), and TalkBack (Android). Every question, option, and control has appropriate ARIA labels. Students using screen readers can navigate the entire exam with keyboard commands — no mouse required.

Keyboard Navigation: All exam interactions can be performed using the keyboard alone. Tab moves between interactive elements; Enter selects an option; Arrow keys navigate between questions. Keyboard shortcuts are documented in the exam's help panel.

Visual Adjustments: Students can increase font size (up to 200%) and choose a high-contrast colour scheme. The exam interface respects the browser's or operating system's accessibility settings — if a student has enabled high-contrast mode in Windows, ExamForge will adopt it automatically.

Extended Time: For students who qualify for accommodations (e.g., 1.5× time for dyslexia), the school administrator can configure extended-time rules on a per-student basis. When the student enters the exam, their timer automatically reflects the accommodation.

Read-Aloud: For students who struggle with reading, ExamForge can read question text aloud using text-to-speech. This feature is available in English and is being expanded to Yoruba, Hausa, and Igbo. Read-aloud is configured by the school administrator on a per-student basis and is automatically activated when the student enters the exam.

If a student requires an accommodation that is not listed here, contact accessibility@examforge.ai. We work with schools to implement custom accommodations where technically feasible.`,
    category: "general",
    role: "all",
    helpful: { yes: 98, no: 1 },
    lastUpdated: "2025-01-20",
    tags: ["accessibility", "screen reader", "accommodation", "disability"],
    relatedArticles: ["kb-taking-exam", "kb-student-onboarding"],
  },
  {
    slug: "kb-two-factor-authentication",
    title: "Setting Up Two-Factor Authentication",
    excerpt: "Protect your account with 2FA — how it works and how to set it up.",
    content: `Two-factor authentication (2FA) adds an extra layer of security to your ExamForge account. Even if someone learns your password, they cannot log in without the second factor — a time-based code from your authenticator app.

ExamForge supports TOTP-based 2FA (compatible with Google Authenticator, Microsoft Authenticator, Authy, and 1Password). We strongly recommend enabling 2FA for all administrator and teacher accounts, given the sensitive data these roles can access.

To set up 2FA: Log in to your account, navigate to Profile → Security, and click "Enable Two-Factor Authentication". A QR code will appear — scan it with your authenticator app. Enter the 6-digit code from the app to confirm setup. You will also receive a set of backup codes — store these securely (e.g., in a password manager or a locked drawer). If you lose access to your authenticator app, a backup code can be used once to log in.

After enabling 2FA, you will be prompted for a code every time you log in from a new device or browser. Trusted devices are remembered for 30 days — you can manage your trusted devices on the Security page.

If you are a school administrator and you want to enforce 2FA for all staff accounts, enable the "Require 2FA for all admin and teacher accounts" setting on the School Settings → Security page. Teachers who have not set up 2FA will be required to do so at their next login.`,
    category: "general",
    role: "all",
    helpful: { yes: 156, no: 3 },
    lastUpdated: "2025-02-05",
    tags: ["2FA", "security", "authentication", "account security"],
    relatedArticles: ["kb-data-privacy-ndpr", "kb-exam-security-checklist"],
  },
];

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export const kbCategories: KBCategory[] = [
  {
    slug: "admin-guides",
    title: "Administrator Guides",
    description: "Setup, configuration, and management guides for school administrators.",
    icon: "Settings",
    articles: kbArticles.filter((a) => a.category === "admin-guides"),
    role: "admin",
  },
  {
    slug: "teacher-guides",
    title: "Teacher Guides",
    description: "Exam authoring, proctoring, and result interpretation guides for teachers.",
    icon: "GraduationCap",
    articles: kbArticles.filter((a) => a.category === "teacher-guides"),
    role: "teacher",
  },
  {
    slug: "student-guides",
    title: "Student Guides",
    description: "Taking exams, practice mode, and results guides for students.",
    icon: "BookOpen",
    articles: kbArticles.filter((a) => a.category === "student-guides"),
    role: "student",
  },
  {
    slug: "parent-guides",
    title: "Parent Guides",
    description: "Understanding results and supporting learning for parent observers.",
    icon: "Heart",
    articles: kbArticles.filter((a) => a.category === "parent-guides"),
    role: "parent",
  },
  {
    slug: "general",
    title: "General",
    description: "Cross-role articles on privacy, security, accessibility, and account management.",
    icon: "Info",
    articles: kbArticles.filter((a) => a.category === "general"),
    role: "all",
  },
];

// ---------------------------------------------------------------------------
// Interactive Tutorials / Walkthroughs
// ---------------------------------------------------------------------------

export const tutorials: Tutorial[] = [
  {
    slug: "tutorial-first-exam-setup",
    title: "First Exam Setup",
    description: "Walk through creating your first exam from scratch — from selecting a subject to publishing results.",
    steps: [
      { title: "Create a New Exam", description: "Navigate to Exams → Create Exam and enter the exam title, subject, and class.", action: "Click 'Exams' in the left sidebar, then click the 'Create Exam' button in the top-right corner." },
      { title: "Select Question Source", description: "Choose AI-Generate to let the platform create questions, or Manual to write your own.", action: "Select 'AI-Generate' from the Question Source dropdown, then choose your subject and topics." },
      { title: "Configure Generation Parameters", description: "Set the number of items, difficulty distribution, and cognitive levels.", action: "Enter 40 for item count, set difficulty to 20% easy / 50% medium / 30% hard, and click 'Generate'." },
      { title: "Review Generated Questions", description: "Browse the generated questions, edit any that need adjustment, and approve the batch.", action: "Scroll through the question list. Click 'Edit' on any item to modify it. Click 'Approve All' when satisfied." },
      { title: "Schedule the Exam", description: "Set the date, time window, and assign the student group.", action: "Click 'Schedule', select the date and time, choose the student class, and click 'Publish'." },
      { title: "Monitor the Exam", description: "On exam day, use the Invigilator Dashboard to monitor student progress and alerts.", action: "Navigate to Exams → Invigilate and select your exam session to view the real-time dashboard." },
    ],
    duration: "15 minutes",
    difficulty: "beginner",
    role: "teacher",
    videoUrl: "https://videos.examforge.ai/tutorials/first-exam-setup",
    category: "teacher-guides",
  },
  {
    slug: "tutorial-student-import",
    title: "Student Import Walkthrough",
    description: "Import your entire student body via CSV in under 10 minutes.",
    steps: [
      { title: "Prepare Your CSV File", description: "Create a spreadsheet with columns: FirstName, LastName, Email, Class, Subjects.", action: "Download the CSV template from Students → Import → Download Template. Fill in your student data." },
      { title: "Upload the File", description: "Navigate to the import page and upload your prepared CSV.", action: "Click 'Choose File', select your CSV, and click 'Upload'. The wizard will validate the file." },
      { title: "Review Validation Results", description: "Check for any errors or warnings in the uploaded data.", action: "Review the validation report. Fix any errors (highlighted in red) and re-upload if necessary." },
      { title: "Confirm Import", description: "Preview the data and confirm the import.", action: "Review the data preview table. Click 'Confirm Import' to create the student accounts." },
      { title: "Verify Results", description: "Check that all students were imported successfully.", action: "Review the import summary showing created, updated, and failed records. Navigate to Students to verify." },
    ],
    duration: "10 minutes",
    difficulty: "beginner",
    role: "admin",
    videoUrl: "https://videos.examforge.ai/tutorials/student-import",
    category: "admin-guides",
  },
  {
    slug: "tutorial-ai-question-generation",
    title: "AI Question Generation Walkthrough",
    description: "Generate, review, and certify a batch of AI-generated questions for a WAEC exam.",
    steps: [
      { title: "Select Subject & Topics", description: "Choose the subject and specific syllabus topics to cover.", action: "Navigate to Question Bank → AI Generate. Select 'Mathematics' and check 'Quadratic Equations', 'Simultaneous Equations', and 'Inequalities'." },
      { title: "Configure Parameters", description: "Set item count, difficulty, and cognitive level targets.", action: "Set count to 60, difficulty to 15% easy / 55% medium / 30% hard, and cognitive levels to match WAEC blueprint." },
      { title: "Generate Questions", description: "Run the AI engine and wait for the batch to be produced.", action: "Click 'Generate'. The engine will produce the batch in 2–5 minutes. Monitor progress on the status bar." },
      { title: "Review Quality Scores", description: "Check the AI's confidence scores for each quality gate.", action: "Sort the question list by confidence score. Review items with scores below 0.85 first." },
      { title: "Edit & Approve", description: "Edit any items that need improvement and approve the batch.", action: "Click 'Edit' on flagged items, make corrections, and save. Click 'Approve All' to certify the batch for live exams." },
    ],
    duration: "20 minutes",
    difficulty: "intermediate",
    role: "teacher",
    videoUrl: "https://videos.examforge.ai/tutorials/ai-question-generation",
    category: "teacher-guides",
  },
  {
    slug: "tutorial-report-builder",
    title: "Report Builder Walkthrough",
    description: "Create a custom report combining exam results, attendance, and practice data for a parent-teacher meeting.",
    steps: [
      { title: "Open Report Builder", description: "Navigate to Reports → Custom Report and start a new report.", action: "Click 'Reports' in the sidebar, then 'Custom Report', then 'New Report'." },
      { title: "Select Data Sources", description: "Choose which data to include in the report.", action: "Check 'Exam Results', 'Practice Activity', and 'Attendance'. Select the class and term." },
      { title: "Configure Layout", description: "Arrange the report sections and choose visualisations.", action: "Drag the 'Score Distribution' chart to the top, followed by 'Topic Heatmap' and 'Student List' table." },
      { title: "Set Filters", description: "Filter the data to show only relevant information.", action: "Set the subject filter to 'Mathematics' and the date range to the current term." },
      { title: "Generate & Export", description: "Generate the report and export it for the meeting.", action: "Click 'Generate'. Preview the report, then click 'Export as PDF' to download for printing." },
    ],
    duration: "12 minutes",
    difficulty: "intermediate",
    role: "teacher",
    videoUrl: "https://videos.examforge.ai/tutorials/report-builder",
    category: "teacher-guides",
  },
];

// ---------------------------------------------------------------------------
// Convenience lookups
// ---------------------------------------------------------------------------

export const allKBArticles = kbArticles;

export const kbArticleBySlug = Object.fromEntries(
  kbArticles.map((a) => [a.slug, a])
) as Record<string, KBArticle>;

export const kbCategoryBySlug = Object.fromEntries(
  kbCategories.map((c) => [c.slug, c])
) as Record<string, KBCategory>;

export const kbArticlesByRole = (role: KBRole): KBArticle[] =>
  role === "all"
    ? [...kbArticles]
    : kbArticles.filter((a) => a.role === role || a.role === "all");

export const kbArticlesByCategory = (categorySlug: string): KBArticle[] =>
  kbArticles.filter((a) => a.category === categorySlug);

export const tutorialBySlug = Object.fromEntries(
  tutorials.map((t) => [t.slug, t])
) as Record<string, Tutorial>;
