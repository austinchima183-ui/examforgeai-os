// ============================================================================
// ExamForge AI — Contextual AI Suggestions
// ============================================================================
// Page-specific AI suggestion definitions for every major context in the app.
// Each function returns an array of AISuggestion objects tailored to what
// the user would find most useful on that page.
// ============================================================================

import {
  BookOpen,
  Users,
  FileQuestion,
  Brain,
  TrendingUp,
  GraduationCap,
  Target,
  Calendar,
  Layers,
  RotateCcw,
  BarChart3,
  AlertTriangle,
  DollarSign,
  Briefcase,
  Search,
  Scale,
  Sparkles,
  ClipboardList,
  Clock,
  CheckCircle2,
  PieChart,
  GitCompare,
  FileText,
  Home,
  Eye,
  Lightbulb,
  Wand2,
  Tag,
  Copy,
  SlidersHorizontal,
  Shuffle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { resolveIcon } from '@/lib/design/icon-registry'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export interface AISuggestion {
  /** Unique identifier for this suggestion */
  id: string;
  /** Icon component */
  icon: string | LucideIcon;
  /** Short title (1-4 words) */
  title: string;
  /** Brief description of what the AI will do */
  description: string;
  /** The action key sent to the backend when executed */
  action: string;
  /** Optional category for grouping */
  category?: 'generate' | 'analyze' | 'predict' | 'recommend' | 'optimize';
  /** Whether this is a premium feature */
  premium?: boolean;
}

// ──────────────────────────────────────────────────────────────
// Teacher Dashboard
// ──────────────────────────────────────────────────────────────

export function teacherDashboardSuggestions(): AISuggestion[] {
  return [
    {
      id: 'teacher-generate-lesson-plan',
      icon: BookOpen,
      title: 'Generate lesson plan',
      description: 'AI creates a structured lesson plan based on your syllabus and upcoming topics',
      action: 'teacher:generate-lesson-plan',
      category: 'generate',
    },
    {
      id: 'teacher-find-struggling-students',
      icon: Users,
      title: 'Find struggling students',
      description: 'Identify students who are falling behind based on recent scores and engagement',
      action: 'teacher:find-struggling-students',
      category: 'analyze',
    },
    {
      id: 'teacher-suggest-homework',
      icon: ClipboardList,
      title: 'Suggest homework',
      description: 'Get personalized homework recommendations for each student or the whole class',
      action: 'teacher:suggest-homework',
      category: 'recommend',
    },
    {
      id: 'teacher-create-quiz-weak-areas',
      icon: FileQuestion,
      title: 'Create quiz from weak areas',
      description: 'Auto-generate a quiz targeting the class\'s weakest topics from recent results',
      action: 'teacher:create-quiz-weak-areas',
      category: 'generate',
    },
    {
      id: 'teacher-predict-class-performance',
      icon: TrendingUp,
      title: 'Predict class performance',
      description: 'Forecast how the class is likely to perform on the upcoming exam',
      action: 'teacher:predict-class-performance',
      category: 'predict',
    },
  ];
}

// ──────────────────────────────────────────────────────────────
// Student Dashboard
// ──────────────────────────────────────────────────────────────

export function studentDashboardSuggestions(): AISuggestion[] {
  return [
    {
      id: 'student-explain-difficult-topic',
      icon: GraduationCap,
      title: 'Explain difficult topic',
      description: 'Get a simple, step-by-step explanation of a topic you\'re struggling with',
      action: 'student:explain-difficult-topic',
      category: 'generate',
    },
    {
      id: 'student-practice-weak-areas',
      icon: Target,
      title: 'Practice weak areas',
      description: 'Generate practice questions targeting your weakest subjects and topics',
      action: 'student:practice-weak-areas',
      category: 'generate',
    },
    {
      id: 'student-create-study-plan',
      icon: Calendar,
      title: 'Create study plan',
      description: 'AI builds a personalized study schedule based on your exam dates and progress',
      action: 'student:create-study-plan',
      category: 'recommend',
    },
    {
      id: 'student-generate-flashcards',
      icon: Layers,
      title: 'Generate flashcards',
      description: 'Turn your notes and textbook content into review-ready flashcards',
      action: 'student:generate-flashcards',
      category: 'generate',
    },
    {
      id: 'student-review-past-mistakes',
      icon: RotateCcw,
      title: 'Review past mistakes',
      description: 'Analyze your previous errors and get targeted explanations to avoid repeating them',
      action: 'student:review-past-mistakes',
      category: 'analyze',
    },
  ];
}

// ──────────────────────────────────────────────────────────────
// Parent Dashboard
// ──────────────────────────────────────────────────────────────

export function parentDashboardSuggestions(): AISuggestion[] {
  return [
    {
      id: 'parent-weekly-summary',
      icon: BarChart3,
      title: 'Weekly summary',
      description: 'Get a concise summary of your child\'s academic week — scores, attendance, activity',
      action: 'parent:weekly-summary',
      category: 'analyze',
    },
    {
      id: 'parent-home-learning-activities',
      icon: Home,
      title: 'Home learning activities',
      description: 'AI suggests activities you can do at home to support your child\'s learning',
      action: 'parent:home-learning-activities',
      category: 'recommend',
    },
    {
      id: 'parent-attendance-prediction',
      icon: Eye,
      title: 'Attendance prediction',
      description: 'Predict future attendance patterns and flag potential chronic absenteeism',
      action: 'parent:attendance-prediction',
      category: 'predict',
    },
    {
      id: 'parent-performance-comparison',
      icon: GitCompare,
      title: 'Performance comparison',
      description: 'See how your child\'s performance trends compared to previous terms',
      action: 'parent:performance-comparison',
      category: 'analyze',
    },
    {
      id: 'parent-recommend-resources',
      icon: Lightbulb,
      title: 'Recommend resources',
      description: 'Get curated learning resources tailored to your child\'s current needs',
      action: 'parent:recommend-resources',
      category: 'recommend',
    },
  ];
}

// ──────────────────────────────────────────────────────────────
// School Admin Dashboard
// ──────────────────────────────────────────────────────────────

export function schoolAdminSuggestions(): AISuggestion[] {
  return [
    {
      id: 'admin-school-recommendations',
      icon: Sparkles,
      title: 'School recommendations',
      description: 'AI analyzes school performance and provides actionable improvement suggestions',
      action: 'admin:school-recommendations',
      category: 'recommend',
    },
    {
      id: 'admin-budget-forecast',
      icon: DollarSign,
      title: 'Budget forecast',
      description: 'Predict budget needs for next quarter based on enrollment and spending trends',
      action: 'admin:budget-forecast',
      category: 'predict',
    },
    {
      id: 'admin-risk-alerts',
      icon: AlertTriangle,
      title: 'Risk alerts',
      description: 'Identify at-risk students, teachers, or departments before problems escalate',
      action: 'admin:risk-alerts',
      category: 'analyze',
    },
    {
      id: 'admin-staff-optimization',
      icon: Briefcase,
      title: 'Staff optimization',
      description: 'Optimize teacher assignments and workload distribution across departments',
      action: 'admin:staff-optimization',
      category: 'optimize',
    },
    {
      id: 'admin-curriculum-gaps',
      icon: Search,
      title: 'Curriculum gaps',
      description: 'Detect coverage gaps in the curriculum based on exam results and standards',
      action: 'admin:curriculum-gaps',
      category: 'analyze',
    },
  ];
}

// ──────────────────────────────────────────────────────────────
// Government / Policy Dashboard
// ──────────────────────────────────────────────────────────────

export function governmentSuggestions(): AISuggestion[] {
  return [
    {
      id: 'gov-policy-recommendations',
      icon: Scale,
      title: 'Policy recommendations',
      description: 'Data-driven policy suggestions based on regional education performance patterns',
      action: 'gov:policy-recommendations',
      category: 'recommend',
      premium: true,
    },
    {
      id: 'gov-regional-comparison',
      icon: GitCompare,
      title: 'Regional comparison',
      description: 'Compare performance metrics across districts and identify top performers',
      action: 'gov:regional-comparison',
      category: 'analyze',
    },
    {
      id: '?gov-funding-suggestions',
      icon: DollarSign,
      title: 'Funding suggestions',
      description: 'Optimize funding allocation based on need, performance gaps, and enrollment',
      action: 'gov:funding-suggestions',
      category: 'optimize',
      premium: true,
    },
    {
      id: 'gov-performance-trends',
      icon: TrendingUp,
      title: 'Performance trends',
      description: 'Analyze multi-year performance trends across schools and districts',
      action: 'gov:performance-trends',
      category: 'analyze',
    },
    {
      id: 'gov-equity-analysis',
      icon: PieChart,
      title: 'Equity analysis',
      description: 'Measure educational equity across demographics, regions, and school types',
      action: 'gov:equity-analysis',
      category: 'analyze',
      premium: true,
    },
  ];
}

// ──────────────────────────────────────────────────────────────
// Exam Context
// ──────────────────────────────────────────────────────────────

export function examSuggestions(): AISuggestion[] {
  return [
    {
      id: 'exam-generate-questions',
      icon: Wand2,
      title: 'Generate questions',
      description: 'Auto-generate exam questions from syllabus topics with balanced coverage',
      action: 'exam:generate-questions',
      category: 'generate',
    },
    {
      id: 'exam-set-difficulty-curve',
      icon: SlidersHorizontal,
      title: 'Set difficulty curve',
      description: 'AI calibrates question difficulty to achieve the desired score distribution',
      action: 'exam:set-difficulty-curve',
      category: 'optimize',
    },
    {
      id: 'exam-predict-pass-rate',
      icon: TrendingUp,
      title: 'Predict pass rate',
      description: 'Forecast the likely pass/fail distribution based on student preparedness data',
      action: 'exam:predict-pass-rate',
      category: 'predict',
    },
    {
      id: 'exam-optimize-time-allocation',
      icon: Clock,
      title: 'Optimize time allocation',
      description: 'Calculate ideal time-per-section based on question complexity and length',
      action: 'exam:optimize-time-allocation',
      category: 'optimize',
    },
    {
      id: 'exam-review-coverage',
      icon: CheckCircle2,
      title: 'Review coverage',
      description: 'Check if the exam adequately covers all required syllabus topics and standards',
      action: 'exam:review-coverage',
      category: 'analyze',
    },
  ];
}

// ──────────────────────────────────────────────────────────────
// Analytics Context
// ──────────────────────────────────────────────────────────────

export function analyticsSuggestions(): AISuggestion[] {
  return [
    {
      id: 'analytics-explain-trends',
      icon: TrendingUp,
      title: 'Explain trends',
      description: 'AI interprets current data trends and explains what\'s driving the changes',
      action: 'analytics:explain-trends',
      category: 'analyze',
    },
    {
      id: 'analytics-predict-next-quarter',
      icon: Brain,
      title: 'Predict next quarter',
      description: 'Forecast key metrics for the upcoming quarter using historical patterns',
      action: 'analytics:predict-next-quarter',
      category: 'predict',
    },
    {
      id: 'analytics-identify-anomalies',
      icon: AlertTriangle,
      title: 'Identify anomalies',
      description: 'Detect unusual patterns, outliers, or unexpected shifts in the data',
      action: 'analytics:identify-anomalies',
      category: 'analyze',
    },
    {
      id: 'analytics-compare-periods',
      icon: GitCompare,
      title: 'Compare periods',
      description: 'Compare current performance against previous terms, semesters, or years',
      action: 'analytics:compare-periods',
      category: 'analyze',
    },
    {
      id: 'analytics-generate-report',
      icon: FileText,
      title: 'Generate report',
      description: 'Create a comprehensive analytics report with insights and visualizations',
      action: 'analytics:generate-report',
      category: 'generate',
    },
  ];
}

// ──────────────────────────────────────────────────────────────
// Question Bank Context
// ──────────────────────────────────────────────────────────────

export function questionBankSuggestions(): AISuggestion[] {
  return [
    {
      id: 'qb-generate-questions',
      icon: Wand2,
      title: 'Generate questions',
      description: 'Bulk-generate questions for selected topics and difficulty levels',
      action: 'qb:generate-questions',
      category: 'generate',
    },
    {
      id: 'qb-categorize-by-topic',
      icon: Tag,
      title: 'Categorize by topic',
      description: 'AI automatically tags and categorizes uncategorized questions by subject and topic',
      action: 'qb:categorize-by-topic',
      category: 'optimize',
    },
    {
      id: 'qb-find-duplicates',
      icon: Copy,
      title: 'Find duplicates',
      description: 'Detect duplicate or near-duplicate questions that can be consolidated',
      action: 'qb:find-duplicates',
      category: 'analyze',
    },
    {
      id: 'qb-balance-difficulty',
      icon: SlidersHorizontal,
      title: 'Balance difficulty',
      description: 'Analyze the difficulty distribution and suggest questions to balance the bank',
      action: 'qb:balance-difficulty',
      category: 'optimize',
    },
    {
      id: 'qb-create-variations',
      icon: Shuffle,
      title: 'Create variations',
      description: 'Generate alternative versions of existing questions to expand the question pool',
      action: 'qb:create-variations',
      category: 'generate',
    },
  ];
}

// ──────────────────────────────────────────────────────────────
// Suggestion Resolver — Get suggestions by page context string
// ──────────────────────────────────────────────────────────────

export type PageContext =
  | 'teacher-dashboard'
  | 'student-dashboard'
  | 'parent-dashboard'
  | 'school-admin'
  | 'government'
  | 'exam'
  | 'analytics'
  | 'question-bank';

const suggestionMap: Record<PageContext, () => AISuggestion[]> = {
  'teacher-dashboard': teacherDashboardSuggestions,
  'student-dashboard': studentDashboardSuggestions,
  'parent-dashboard': parentDashboardSuggestions,
  'school-admin': schoolAdminSuggestions,
  government: governmentSuggestions,
  exam: examSuggestions,
  analytics: analyticsSuggestions,
  'question-bank': questionBankSuggestions,
};

/**
 * Get AI suggestions for a given page context.
 * Falls back to an empty array if the context is not recognized.
 */
export function getSuggestionsForContext(context: PageContext): AISuggestion[] {
  const fn = suggestionMap[context];
  return fn ? fn() : [];
}

/**
 * Resolve a PageContext from a pathname.
 * Used by the contextual AI assistant to auto-detect which suggestions to show.
 */
export function resolveContextFromPath(pathname: string): PageContext | null {
  if (pathname.includes('/teacher') || pathname.includes('/dashboard/teacher')) {
    return 'teacher-dashboard';
  }
  if (pathname.includes('/student') || pathname.includes('/dashboard/student')) {
    return 'student-dashboard';
  }
  if (pathname.includes('/parent') || pathname.includes('/dashboard/parent')) {
    return 'parent-dashboard';
  }
  if (pathname.includes('/school-admin') || pathname.includes('/dashboard/school-admin')) {
    return 'school-admin';
  }
  if (pathname.includes('/government')) {
    return 'government';
  }
  if (pathname.includes('/exam') || pathname.includes('/cbt')) {
    return 'exam';
  }
  if (pathname.includes('/analytics') || pathname.includes('/reports') || pathname.includes('/results')) {
    return 'analytics';
  }
  if (pathname.includes('/question-bank')) {
    return 'question-bank';
  }
  return null;
}
