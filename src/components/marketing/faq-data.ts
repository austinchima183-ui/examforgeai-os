// ============================================================================
// ExamForge AI — Shared FAQ Data
// ============================================================================
// Centralized FAQ data used by the FAQ section component and the
// FAQJsonLd structured data on the landing page.

export const faqData = [
  {
    question: 'What is ExamForge AI?',
    answer:
      'ExamForge AI is an all-in-one platform for modern schools. It combines a Student Information System, AI-powered CBT (Computer-Based Testing) platform, School ERP, analytics engine, and AI assistant into a single, integrated solution. Schools use ExamForge AI to manage students, create and deliver exams, automate grading, analyze performance, and run their entire administration digitally.',
  },
  {
    question: 'How does the AI question generation work?',
    answer:
      'Our AI engine generates exam questions based on the subject, topic, difficulty level, and curriculum standards you specify. You simply describe what you need — for example, "5 multiple-choice questions on photosynthesis for SS2 Biology" — and the AI creates questions with answer keys, explanations, and difficulty ratings. You can edit, approve, or regenerate any question before publishing.',
  },
  {
    question: 'Is ExamForge AI suitable for primary and secondary schools?',
    answer:
      "Yes. ExamForge AI is designed for all levels of education — primary, secondary, and tertiary. The platform adapts to your school's needs, whether you are managing a small primary school or a large university. The CBT interface is intuitive enough for younger students, and the analytics are powerful enough for institutional research.",
  },
  {
    question: 'How does auto-marking work for essay questions?',
    answer:
      'Our AI uses natural language processing and rubric-based scoring to evaluate essay and short-answer questions. You define the marking rubric, and the AI scores each response against it, providing detailed feedback for students. Teachers can review and adjust AI-generated scores before they are finalized. This reduces marking time by up to 85% while maintaining accuracy.',
  },
  {
    question: 'What devices can students use to take exams?',
    answer:
      'ExamForge AI works on any modern device — desktop computers, laptops, tablets, and smartphones. The CBT interface is fully responsive and optimized for touch screens. We also support offline mode with automatic sync, so students can continue their exam even if they lose internet connectivity.',
  },
  {
    question: 'How secure is the platform?',
    answer:
      "Security is built into every layer. We use end-to-end encryption (TLS 1.3 in transit, AES-256 at rest), role-based access control with five distinct roles, comprehensive audit logging, and Supabase's enterprise-grade infrastructure. We also enforce HTTP security headers, support multi-tenant data isolation, and offer 99.9% uptime SLA for enterprise customers.",
  },
  {
    question: 'Can I migrate from my existing school software?',
    answer:
      "Yes. We provide migration tools and support to help you import your existing student data, question banks, and historical records into ExamForge AI. Our onboarding team will work with you to ensure a smooth transition with minimal disruption to your school's operations.",
  },
  {
    question: 'Is there a free trial?',
    answer:
      'Yes. Every plan includes a 14-day free trial with full access to all features. No credit card is required to start. At the end of your trial, you can choose the plan that best fits your school\'s needs, or continue with a limited free tier.',
  },
  {
    question: 'How does billing work?',
    answer:
      'Billing is handled through Flutterwave, which supports multiple payment methods including bank transfers, cards, and mobile money. You can choose monthly or annual billing. Annual plans save you 20% compared to monthly billing. Enterprise customers can arrange custom billing cycles and payment terms.',
  },
  {
    question: 'Can I manage multiple schools on one account?',
    answer:
      'Yes. Our Enterprise plan supports multi-school management from a single dashboard. Each school has its own data isolation, branding, and admin controls, while the central administration can manage all schools, view aggregate analytics, and enforce policies across the organization.',
  },
  {
    question: 'What happens if a student loses internet during an exam?',
    answer:
      'ExamForge AI includes offline support with automatic sync. If a student loses connectivity during an exam, their progress is saved locally and automatically synced when the connection is restored. The built-in timer continues running, and no answers are lost.',
  },
  {
    question: 'How does live exam monitoring work?',
    answer:
      'During an active exam, administrators and teachers can view a real-time dashboard showing every connected student. You can see their progress, time remaining, and current status. The system automatically flags suspicious activity such as tab-switching, multiple login attempts, or unusual response patterns.',
  },
  {
    question: 'Can parents access the platform?',
    answer:
      "Yes. Parents get their own portal with read-only access to their child's performance data, exam results, attendance records, and school announcements. They can also communicate with teachers through the built-in messaging system and receive notifications about important events.",
  },
  {
    question: 'What curriculum standards does ExamForge AI support?',
    answer:
      'ExamForge AI supports multiple curriculum frameworks including WAEC, NECO, JAMB, Cambridge IGCSE, and IB. The AI question generation can be aligned to specific curriculum standards, and you can create custom curriculum mappings for your school\'s unique requirements.',
  },
  {
    question: 'How does the marketplace work?',
    answer:
      'The marketplace is a community-driven resource library where educators can share and download exam templates, question banks, lesson plans, and other educational resources. You can publish your own content for others to use, or browse and import content created by verified educators. All marketplace content is reviewed for quality and curriculum alignment.',
  },
  {
    question: 'Can ExamForge AI generate certificates?',
    answer:
      "After an exam is completed and results are finalized, ExamForge AI can automatically generate certificates for qualifying students. Certificates are customizable with your school's branding, include QR codes for digital verification, and can be delivered directly to students via email or downloaded from their portal.",
  },
  {
    question: 'What kind of support do you offer?',
    answer:
      'Starter plans include standard email support with 24-hour response times. Professional plans get priority support with 4-hour response times and live chat. Enterprise customers receive dedicated account managers, 24/7 premium support, custom onboarding, and training sessions for their staff.',
  },
  {
    question: 'Is my data backed up?',
    answer:
      'Yes. We perform daily automated backups with point-in-time recovery capability. Your data is stored with geographic redundancy across multiple regions. Enterprise customers can also configure custom backup schedules and retention policies to meet their compliance requirements.',
  },
]
