'use client';

// ============================================================================
// ExamForge Intelligence — Contextual AI Assistant
// ============================================================================
// A floating contextual AI assistant that appears on every authenticated page
// and provides role-specific, page-specific, context-aware suggestions.
// This is NOT a generic chatbot — it understands education context deeply.
// ============================================================================

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
  Brain,
  Send,
  X,
  Bot,
  User,
  Loader2,
  Lightbulb,
  GraduationCap,
  BookOpen,
  School,
  Shield,
  Users,
  BarChart3,
  FileQuestion,
  ClipboardList,
  TrendingUp,
  AlertTriangle,
  Calendar,
  MessageSquare,
  Sparkles,
  Target,
  Zap,
  RefreshCw,
} from 'lucide-react';

import { useAuthStore } from '@/lib/stores/auth-store';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

interface QuickAction {
  label: string;
  icon: React.ReactNode;
  prompt: string;
  /** Optional navigation path — if set, clicking navigates instead of chatting */
  href?: string;
  /** Category for grouping */
  category?: 'generate' | 'analyze' | 'review' | 'navigate';
}

// ──────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────

const STORAGE_KEY = 'examforge-intelligence-chat';
const MAX_STORED_MESSAGES = 50;

const ROLE_LABELS: Record<UserRole, string> = {
  student: 'Student',
  teacher: 'Teacher',
  school_admin: 'School Admin',
  super_admin: 'Super Admin',
  parent: 'Parent',
};

const ROLE_ICONS: Record<UserRole, React.ReactNode> = {
  student: <GraduationCap className="size-3.5" />,
  teacher: <BookOpen className="size-3.5" />,
  school_admin: <School className="size-3.5" />,
  super_admin: <Shield className="size-3.5" />,
  parent: <Users className="size-3.5" />,
};

// ──────────────────────────────────────────────────────────────
// Page Name Resolver
// ──────────────────────────────────────────────────────────────

type PageKey =
  | 'dashboard'
  | 'question-bank'
  | 'exams'
  | 'results'
  | 'analytics'
  | 'students'
  | 'teachers'
  | 'schools'
  | 'settings'
  | 'grading'
  | 'lesson-planner'
  | 'practice'
  | 'study-planner'
  | 'revision-hub'
  | 'ai-tutor'
  | 'progress'
  | 'billing'
  | 'marketplace'
  | 'cbt'
  | 'attendance'
  | 'calendar'
  | 'fees'
  | 'classes'
  | 'parent-dashboard'
  | 'child-progress'
  | 'other';

function resolvePageKey(pathname: string): PageKey {
  if (!pathname || pathname === '/') return 'dashboard';
  if (pathname.includes('/dashboard')) return 'dashboard';
  if (pathname.includes('/question-bank')) return 'question-bank';
  if (pathname.includes('/exams')) return 'exams';
  if (pathname.includes('/results')) return 'results';
  if (pathname.includes('/analytics')) return 'analytics';
  if (pathname.includes('/students')) return 'students';
  if (pathname.includes('/teachers')) return 'teachers';
  if (pathname.includes('/schools')) return 'schools';
  if (pathname.includes('/settings')) return 'settings';
  if (pathname.includes('/grading')) return 'grading';
  if (pathname.includes('/lesson-planner') || pathname.includes('/lesson')) return 'lesson-planner';
  if (pathname.includes('/practice')) return 'practice';
  if (pathname.includes('/study-planner')) return 'study-planner';
  if (pathname.includes('/revision-hub')) return 'revision-hub';
  if (pathname.includes('/ai-tutor')) return 'ai-tutor';
  if (pathname.includes('/progress')) return 'progress';
  if (pathname.includes('/billing')) return 'billing';
  if (pathname.includes('/marketplace')) return 'marketplace';
  if (pathname.includes('/cbt')) return 'cbt';
  if (pathname.includes('/attendance')) return 'attendance';
  if (pathname.includes('/calendar')) return 'calendar';
  if (pathname.includes('/fees')) return 'fees';
  if (pathname.includes('/classes')) return 'classes';
  if (pathname.includes('/parent/dashboard') || pathname.includes('/parent/child-progress')) return 'parent-dashboard';
  if (pathname.includes('/child-progress')) return 'child-progress';
  return 'other';
}

function getPageDisplayName(pathname: string): string {
  const key = resolvePageKey(pathname);
  const names: Record<PageKey, string> = {
    dashboard: 'Dashboard',
    'question-bank': 'Question Bank',
    exams: 'Exams',
    results: 'Results',
    analytics: 'Analytics',
    students: 'Students',
    teachers: 'Teachers',
    schools: 'Schools',
    settings: 'Settings',
    grading: 'Grading',
    'lesson-planner': 'Lesson Planner',
    practice: 'Practice',
    'study-planner': 'Study Planner',
    'revision-hub': 'Revision Hub',
    'ai-tutor': 'AI Tutor',
    progress: 'Progress',
    billing: 'Billing',
    marketplace: 'Marketplace',
    cbt: 'CBT Exams',
    attendance: 'Attendance',
    calendar: 'Calendar',
    fees: 'Fees',
    classes: 'Classes',
    'parent-dashboard': 'Parent Dashboard',
    'child-progress': 'Child Progress',
    other: 'Page',
  };
  return names[key];
}

// ──────────────────────────────────────────────────────────────
// Context-Aware Quick Actions (Role + Page)
// ──────────────────────────────────────────────────────────────

function getContextQuickActions(role: UserRole, page: PageKey): QuickAction[] {
  // Teacher Actions
  if (role === 'teacher') {
    switch (page) {
      case 'dashboard':
        return [
          { label: "Create tomorrow's lesson plan", icon: <Calendar className="size-4" />, prompt: 'Create a lesson plan for tomorrow based on my current curriculum schedule', href: '/lesson-planner', category: 'generate' },
          { label: 'Generate practice questions for your weakest class', icon: <FileQuestion className="size-4" />, prompt: 'Analyze my class performance data and generate practice questions targeting the weakest areas of my lowest-performing class', category: 'generate' },
          { label: 'Review pending submissions', icon: <ClipboardList className="size-4" />, prompt: 'Show me a summary of pending student submissions that need my review, prioritized by due date', href: '/grading', category: 'review' },
          { label: 'Analyze class performance trends', icon: <TrendingUp className="size-4" />, prompt: 'Analyze performance trends across all my classes over the past month, highlighting improvements and declines', category: 'analyze' },
        ];
      case 'question-bank':
        return [
          { label: 'Generate 20 MCQs on current subject', icon: <Zap className="size-4" />, prompt: 'Generate 20 multiple choice questions on the current subject I am viewing, with varying difficulty levels from easy to hard', category: 'generate' },
          { label: 'Find questions with low success rates', icon: <AlertTriangle className="size-4" />, prompt: 'Find questions in my question bank that have the lowest success rates across all exams, so I can review or replace them', category: 'analyze' },
          { label: 'Create a balanced exam paper', icon: <Target className="size-4" />, prompt: 'Help me create a balanced exam paper with questions distributed across difficulty levels, topics, and question types from my question bank', category: 'generate' },
          { label: 'Import questions from curriculum', icon: <BookOpen className="size-4" />, prompt: 'Help me import or generate questions aligned with the current curriculum standards and learning objectives', category: 'generate' },
        ];
      case 'exams':
        return [
          { label: 'Auto-grade completed exams', icon: <Sparkles className="size-4" />, prompt: 'Help me auto-grade all completed exams that are pending review, using AI-assisted marking for essay questions', category: 'review' },
          { label: 'Detect cheating patterns', icon: <AlertTriangle className="size-4" />, prompt: 'Analyze recent exam sessions for potential cheating patterns including similar answer patterns and timing anomalies', category: 'analyze' },
          { label: 'Generate exam variants', icon: <RefreshCw className="size-4" />, prompt: 'Generate variant versions of an existing exam with shuffled questions and alternative question forms to prevent cheating', category: 'generate' },
          { label: 'Schedule upcoming exams', icon: <Calendar className="size-4" />, prompt: 'Help me schedule and organize upcoming exams across different classes and time slots', category: 'navigate' },
        ];
      case 'analytics':
        return [
          { label: 'Identify struggling students', icon: <GraduationCap className="size-4" />, prompt: 'Identify students who are consistently performing below average and suggest targeted interventions for each', category: 'analyze' },
          { label: 'Compare class performance', icon: <BarChart3 className="size-4" />, prompt: 'Compare performance across all my classes on the same topics to identify which teaching approaches are working best', category: 'analyze' },
          { label: 'Predict next exam outcomes', icon: <TrendingUp className="size-4" />, prompt: 'Based on current performance trends and historical data, predict likely outcomes for the next round of exams', category: 'analyze' },
        ];
      case 'grading':
        return [
          { label: 'AI-assisted essay grading', icon: <Sparkles className="size-4" />, prompt: 'Help me grade pending essay submissions using AI-assisted marking with detailed feedback for each student', category: 'review' },
          { label: 'Generate rubric for grading', icon: <Target className="size-4" />, prompt: 'Generate a detailed grading rubric for the current assignment with clear criteria and performance levels', category: 'generate' },
          { label: 'Batch feedback generation', icon: <MessageSquare className="size-4" />, prompt: 'Generate personalized feedback for all graded submissions, highlighting strengths and specific areas for improvement', category: 'generate' },
        ];
      default:
        return [
          { label: 'Generate questions', icon: <FileQuestion className="size-4" />, prompt: 'Generate exam questions on a topic of my choice', category: 'generate' },
          { label: 'Create lesson plan', icon: <Calendar className="size-4" />, prompt: 'Help me create a structured lesson plan', category: 'generate' },
          { label: 'Analyze performance', icon: <TrendingUp className="size-4" />, prompt: 'Analyze my class performance data and highlight key insights', category: 'analyze' },
          { label: 'Review submissions', icon: <ClipboardList className="size-4" />, prompt: 'Show me pending submissions that need review', category: 'review' },
        ];
    }
  }

  // Student Actions
  if (role === 'student') {
    switch (page) {
      case 'dashboard':
        return [
          { label: 'What should I revise tonight?', icon: <Lightbulb className="size-4" />, prompt: 'Based on my upcoming exams and past performance, what topics should I prioritize for revision tonight?', category: 'analyze' },
          { label: 'Create a study plan for upcoming exams', icon: <Calendar className="size-4" />, prompt: 'Create a personalized study plan for all my upcoming exams, allocating more time to subjects where I need the most improvement', category: 'generate' },
          { label: 'Practice my weakest topics', icon: <Target className="size-4" />, prompt: 'Identify my weakest topics based on past results and generate practice questions specifically for those areas', href: '/practice', category: 'generate' },
          { label: 'Review my recent mistakes', icon: <RefreshCw className="size-4" />, prompt: 'Show me all the questions I got wrong in my recent exams with explanations of the correct answers', category: 'review' },
        ];
      case 'results':
        return [
          { label: 'Why did I score low in this subject?', icon: <AlertTriangle className="size-4" />, prompt: 'Analyze my recent results and explain why I scored low, identifying specific topics and question types where I struggled most', category: 'analyze' },
          { label: 'What topics should I focus on?', icon: <Target className="size-4" />, prompt: 'Based on my exam results, identify the specific topics and sub-topics I should focus my study time on', category: 'analyze' },
          { label: 'Create flashcards for missed questions', icon: <Zap className="size-4" />, prompt: 'Generate flashcards for all the questions I answered incorrectly, with the question on one side and the correct answer with explanation on the other', href: '/flashcards', category: 'generate' },
        ];
      case 'exams':
        return [
          { label: 'Exam tips and strategies', icon: <Lightbulb className="size-4" />, prompt: 'Give me specific exam strategies and time management tips for my upcoming exams', category: 'analyze' },
          { label: 'Practice similar questions', icon: <FileQuestion className="size-4" />, prompt: 'Generate practice questions similar to what I will face in my upcoming exams', href: '/practice', category: 'generate' },
          { label: 'Manage exam anxiety', icon: <Brain className="size-4" />, prompt: 'Give me practical techniques to manage exam anxiety and stay calm during my tests', category: 'analyze' },
        ];
      case 'practice':
        return [
          { label: 'Next difficulty level', icon: <TrendingUp className="size-4" />, prompt: 'I have been practicing — suggest the next difficulty level and topics I should challenge myself with', category: 'generate' },
          { label: 'Explain my wrong answers', icon: <RefreshCw className="size-4" />, prompt: 'Review my recent practice attempts and explain why my wrong answers were incorrect, with the correct reasoning', category: 'review' },
          { label: 'Timed practice session', icon: <Zap className="size-4" />, prompt: 'Set up a timed practice session that simulates real exam conditions for my upcoming test', category: 'generate' },
        ];
      case 'study-planner':
        return [
          { label: 'Optimize my schedule', icon: <Calendar className="size-4" />, prompt: 'Optimize my study schedule based on my exam dates and current performance in each subject', category: 'generate' },
          { label: 'Add break times', icon: <Lightbulb className="size-4" />, prompt: 'Help me add strategic break times to my study plan using the Pomodoro technique for maximum retention', category: 'generate' },
        ];
      default:
        return [
          { label: 'What should I study?', icon: <Lightbulb className="size-4" />, prompt: 'What should I focus on studying based on my upcoming exams and performance?', category: 'analyze' },
          { label: 'Practice questions', icon: <FileQuestion className="size-4" />, prompt: 'Generate practice questions tailored to my needs', href: '/practice', category: 'generate' },
          { label: 'Study plan', icon: <Calendar className="size-4" />, prompt: 'Help me create a study plan for my upcoming exams', category: 'generate' },
          { label: 'Review mistakes', icon: <RefreshCw className="size-4" />, prompt: 'Review my recent mistakes and explain the correct answers', category: 'review' },
        ];
    }
  }

  // Parent Actions
  if (role === 'parent') {
    switch (page) {
      case 'dashboard':
      case 'parent-dashboard':
        return [
          { label: 'How is my child performing?', icon: <GraduationCap className="size-4" />, prompt: 'Give me a comprehensive summary of my child\'s academic performance across all subjects, including recent trends', category: 'analyze' },
          { label: 'Which subjects need attention?', icon: <AlertTriangle className="size-4" />, prompt: 'Identify which subjects my child is struggling with and suggest specific actions I can take to help', category: 'analyze' },
          { label: 'Compare with class average', icon: <BarChart3 className="size-4" />, prompt: 'Compare my child\'s performance with the class average for each subject to understand where they stand', category: 'analyze' },
          { label: 'Schedule a teacher meeting', icon: <MessageSquare className="size-4" />, prompt: 'Help me prepare talking points and schedule a meeting with my child\'s teacher to discuss their progress', category: 'navigate' },
        ];
      case 'child-progress':
        return [
          { label: 'Performance trajectory', icon: <TrendingUp className="size-4" />, prompt: 'Show my child\'s performance trajectory over the semester — are they improving, stable, or declining?', category: 'analyze' },
          { label: 'Strengths & weaknesses', icon: <Target className="size-4" />, prompt: 'What are my child\'s strongest and weakest subjects? Give specific recommendations for each', category: 'analyze' },
          { label: 'Upcoming assessments', icon: <Calendar className="size-4" />, prompt: 'What upcoming assessments and exams does my child have? How can I help them prepare?', category: 'analyze' },
        ];
      default:
        return [
          { label: 'Child performance summary', icon: <GraduationCap className="size-4" />, prompt: 'Show me my child\'s overall performance summary', category: 'analyze' },
          { label: 'Subjects needing attention', icon: <AlertTriangle className="size-4" />, prompt: 'Which subjects need the most attention for my child?', category: 'analyze' },
          { label: 'Upcoming exams', icon: <Calendar className="size-4" />, prompt: 'What exams are coming up for my child?', category: 'analyze' },
          { label: 'How to help at home', icon: <Lightbulb className="size-4" />, prompt: 'How can I help my child study more effectively at home?', category: 'analyze' },
        ];
    }
  }

  // School Admin Actions
  if (role === 'school_admin') {
    switch (page) {
      case 'dashboard':
        return [
          { label: 'Which students are at risk of failing?', icon: <AlertTriangle className="size-4" />, prompt: 'Identify all students who are at risk of failing based on their current performance trajectory, and categorize by risk level', category: 'analyze' },
          { label: 'Show attendance trends', icon: <BarChart3 className="size-4" />, prompt: 'Show me attendance trends across the school for the past month, highlighting classes with concerning patterns', href: '/attendance', category: 'analyze' },
          { label: 'Identify underperforming classes', icon: <TrendingUp className="size-4" />, prompt: 'Identify classes that are underperforming compared to school averages and suggest potential causes and interventions', category: 'analyze' },
          { label: 'Generate school performance report', icon: <ClipboardList className="size-4" />, prompt: 'Generate a comprehensive school performance report covering academic results, attendance, and teacher effectiveness metrics', category: 'generate' },
        ];
      case 'analytics':
        return [
          { label: 'Teacher effectiveness rankings', icon: <BookOpen className="size-4" />, prompt: 'Analyze and rank teacher effectiveness based on student performance improvements, exam results, and feedback scores', category: 'analyze' },
          { label: 'Resource utilization', icon: <BarChart3 className="size-4" />, prompt: 'Analyze how effectively school resources are being utilized across departments and suggest optimizations', category: 'analyze' },
          { label: 'Year-over-year comparison', icon: <TrendingUp className="size-4" />, prompt: 'Compare this year\'s performance metrics with the previous year across all key indicators', category: 'analyze' },
        ];
      case 'teachers':
        return [
          { label: 'Teacher workload balance', icon: <Users className="size-4" />, prompt: 'Analyze teacher workload distribution and identify any imbalances or teachers who may be overburdened', category: 'analyze' },
          { label: 'Professional development needs', icon: <Lightbulb className="size-4" />, prompt: 'Based on class performance data, identify which teachers might benefit from professional development in specific areas', category: 'analyze' },
        ];
      default:
        return [
          { label: 'At-risk students', icon: <AlertTriangle className="size-4" />, prompt: 'Identify students at risk of failing across the school', category: 'analyze' },
          { label: 'Attendance trends', icon: <BarChart3 className="size-4" />, prompt: 'Show attendance trends for the school', category: 'analyze' },
          { label: 'Underperforming classes', icon: <TrendingUp className="size-4" />, prompt: 'Find classes performing below school average', category: 'analyze' },
          { label: 'Performance report', icon: <ClipboardList className="size-4" />, prompt: 'Generate a school performance report', category: 'generate' },
        ];
    }
  }

  // Super Admin Actions
  if (role === 'super_admin') {
    switch (page) {
      case 'dashboard':
        return [
          { label: 'Schools below performance benchmark', icon: <AlertTriangle className="size-4" />, prompt: 'List all schools that are below the platform performance benchmark, ranked by how far they fall short', category: 'analyze' },
          { label: 'Analyze platform-wide trends', icon: <TrendingUp className="size-4" />, prompt: 'Analyze platform-wide trends in exam participation, pass rates, and user growth over the past quarter', category: 'analyze' },
          { label: 'Identify schools needing intervention', icon: <School className="size-4" />, prompt: 'Identify schools that need administrative intervention based on declining metrics, low engagement, or compliance issues', category: 'analyze' },
          { label: 'Platform health overview', icon: <Shield className="size-4" />, prompt: 'Give me a platform health overview including uptime, active users, and any system alerts', category: 'analyze' },
        ];
      case 'schools':
        return [
          { label: 'School performance ranking', icon: <BarChart3 className="size-4" />, prompt: 'Rank all schools by overall performance score, with detailed breakdowns of how each metric contributes', category: 'analyze' },
          { label: 'Growth opportunities', icon: <TrendingUp className="size-4" />, prompt: 'Identify schools with the highest growth potential based on current trajectory and market conditions', category: 'analyze' },
          { label: 'Compliance audit', icon: <Shield className="size-4" />, prompt: 'Run a compliance audit summary for all schools, flagging any that have outstanding compliance issues', category: 'analyze' },
        ];
      case 'analytics':
        return [
          { label: 'Revenue by region', icon: <BarChart3 className="size-4" />, prompt: 'Break down platform revenue by region and school tier, identifying growth and contraction areas', category: 'analyze' },
          { label: 'User engagement metrics', icon: <Users className="size-4" />, prompt: 'Analyze user engagement metrics across the platform — active users, session duration, feature adoption rates', category: 'analyze' },
          { label: 'Predict churn risk', icon: <AlertTriangle className="size-4" />, prompt: 'Use engagement and payment data to predict which schools are at risk of churning in the next quarter', category: 'analyze' },
        ];
      default:
        return [
          { label: 'Schools below benchmark', icon: <AlertTriangle className="size-4" />, prompt: 'Show schools below the performance benchmark', category: 'analyze' },
          { label: 'Platform trends', icon: <TrendingUp className="size-4" />, prompt: 'Analyze platform-wide trends', category: 'analyze' },
          { label: 'Intervention needed', icon: <School className="size-4" />, prompt: 'Identify schools needing intervention', category: 'analyze' },
        ];
    }
  }

  // Fallback
  return [
    { label: 'Ask a question', icon: <Lightbulb className="size-4" />, prompt: 'I have a question about my education context', category: 'analyze' },
    { label: 'Get help', icon: <MessageSquare className="size-4" />, prompt: 'Help me with what I am currently working on', category: 'navigate' },
  ];
}

// ──────────────────────────────────────────────────────────────
// Context-Aware Greeting
// ──────────────────────────────────────────────────────────────

function getContextGreeting(role: UserRole, page: PageKey, userName: string): string {
  const firstName = userName.split(' ')[0] || userName;

  const greetings: Record<UserRole, Partial<Record<PageKey, string>>> = {
    teacher: {
      dashboard: `${firstName}, ready to shape minds today?`,
      'question-bank': 'Let\'s build some great questions together.',
      exams: 'Manage your exams with AI assistance.',
      grading: 'Speed up your grading with intelligent help.',
      analytics: 'Discover what your data is telling you.',
      'lesson-planner': 'Plan engaging lessons with AI support.',
    },
    student: {
      dashboard: `Hey ${firstName}, let's make today count!`,
      results: 'Every result is a learning opportunity.',
      practice: 'Practice makes progress — let\'s go!',
      'study-planner': 'Build a study plan that actually works.',
      'revision-hub': 'Focused revision leads to better scores.',
      exams: 'Exam prep made easier with AI.',
      'ai-tutor': 'Your personal tutor is here to help.',
    },
    parent: {
      dashboard: `Hi ${firstName}, stay connected with your child's progress.`,
      'parent-dashboard': 'Track your child\'s academic journey.',
      'child-progress': 'See how your child is growing academically.',
    },
    school_admin: {
      dashboard: `${firstName}, here's your school at a glance.`,
      analytics: 'Data-driven decisions start here.',
      students: 'Keep your students on track.',
      teachers: 'Support your teaching team.',
    },
    super_admin: {
      dashboard: `${firstName}, monitor your entire platform.`,
      schools: 'Manage schools across the platform.',
      analytics: 'Platform-wide insights at your fingertips.',
    },
  };

  return greetings[role]?.[page] || `How can I help you, ${firstName}?`;
}

// ──────────────────────────────────────────────────────────────
// LocalStorage Helpers
// ──────────────────────────────────────────────────────────────

function getStoredMessages(userId: string): ChatMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}-${userId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatMessage[];
    return Array.isArray(parsed) ? parsed.slice(-MAX_STORED_MESSAGES) : [];
  } catch {
    return [];
  }
}

function storeMessages(userId: string, messages: ChatMessage[]) {
  if (typeof window === 'undefined') return;
  try {
    const toStore = messages.slice(-MAX_STORED_MESSAGES);
    localStorage.setItem(`${STORAGE_KEY}-${userId}`, JSON.stringify(toStore));
  } catch {
    // Storage full or unavailable — silently fail
  }
}

function clearStoredMessages(userId: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(`${STORAGE_KEY}-${userId}`);
  } catch {
    // Silently fail
  }
}

// ──────────────────────────────────────────────────────────────
// Typing Indicator
// ──────────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="flex items-start gap-2.5 px-1"
    >
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Bot className="size-4 text-primary" />
      </div>
      <div className="flex items-center gap-2 rounded-xl rounded-tl-none bg-white/[0.04] border border-border/20 px-3 py-2.5 backdrop-blur-sm">
        <span className="size-1.5 rounded-full bg-cyan-400 animate-ai-think" />
        <span className="size-1.5 rounded-full bg-cyan-400 animate-ai-think [animation-delay:0.2s]" />
        <span className="size-1.5 rounded-full bg-cyan-400 animate-ai-think [animation-delay:0.4s]" />
        <span className="text-xs font-medium text-cyan-400">Thinking...</span>
      </div>
    </motion.div>
  );
}

// ──────────────────────────────────────────────────────────────
// Chat Message Bubble (with Markdown)
// ──────────────────────────────────────────────────────────────

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30, mass: 0.8 }}
      className={cn('flex items-start gap-2.5 px-1', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex size-7 shrink-0 items-center justify-center rounded-full',
          isUser
            ? 'bg-gradient-to-br from-primary to-blue-700 text-white shadow-sm shadow-primary/20'
            : 'bg-primary/10 text-primary'
        )}
      >
        {isUser ? (
          <User className="size-3.5" />
        ) : (
          <Bot className="size-4 text-primary" />
        )}
      </div>

      {/* Message Content */}
      <div
        className={cn(
          'max-w-[85%] rounded-xl px-3 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'rounded-tr-none bg-primary/10 text-foreground shadow-sm'
            : 'rounded-tl-none border-l-2 border-l-cyan-400/50 bg-white/[0.04] text-card-foreground shadow-sm backdrop-blur-sm forge-glass-surface'
        )}
      >
        {isUser ? (
          message.content
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:mb-1.5 [&_p:last-child]:mb-0 [&_ul]:mb-1.5 [&_ol]:mb-1.5 [&_li]:mb-0.5 [&_strong]:text-foreground [&_code]:rounded [&_code]:bg-white/[0.06] [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_code]:font-mono [&_pre]:rounded-lg [&_pre]:bg-white/[0.04] [&_pre]:border [&_pre]:border-border/20 [&_pre]:p-3 [&_pre]:font-mono">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ──────────────────────────────────────────────────────────────
// Main ExamForgeIntelligence Component
// ──────────────────────────────────────────────────────────────

export function ExamForgeIntelligence() {
  const pathname = usePathname();
  const router = useRouter();
  const isMobile = useIsMobile();
  const { user, role } = useAuthStore();

  // ── State ──
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ── Derived values ──
  const userId = user?.id || 'anonymous';
  const activeRole = (role || 'student') as UserRole;
  const pageKey = resolvePageKey(pathname);
  const pageDisplayName = getPageDisplayName(pathname);
  const quickActions = getContextQuickActions(activeRole, pageKey);
  const greeting = getContextGreeting(activeRole, pageKey, user?.fullName || 'there');

  // ── Load persisted messages ──
  useEffect(() => {
    if (user?.id) {
      const stored = getStoredMessages(user.id);
      setMessages(stored);
    }
  }, [user?.id]);

  // ── Persist messages on change ──
  useEffect(() => {
    if (user?.id && messages.length > 0) {
      storeMessages(user.id, messages);
    }
  }, [messages, user?.id]);

  // ── Auto-scroll to bottom ──
  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [messages, streamingContent]);

  // ── Focus input when panel opens ──
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // ── Build system context for AI ──
  const buildSystemContext = useCallback(() => {
    return {
      role: activeRole,
      page: pageKey,
      pageName: pageDisplayName,
      pathname,
      userName: user?.fullName || 'User',
      systemPrompt: `You are ExamForge Intelligence, an AI assistant embedded in the ExamForge education platform. You deeply understand education contexts including students, teachers, parents, exams, schools, curriculum, analytics, and performance. You are currently assisting a ${activeRole} on the ${pageDisplayName} page. Provide helpful, specific, and actionable guidance. Use markdown formatting when it helps readability (lists, bold, code). Keep responses concise but thorough.`,
    };
  }, [activeRole, pageKey, pageDisplayName, pathname, user?.fullName]);

  // ── Send message to AI stream endpoint ──
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      const userMessage: ChatMessage = {
        id: `msg-${Date.now()}-user`,
        role: 'user',
        content: text.trim(),
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputValue('');
      setError(null);
      setIsStreaming(true);
      setStreamingContent('');

      // Abort any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const context = buildSystemContext();
        const allMessages = [...messages, userMessage].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const response = await fetch('/api/ai/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: allMessages,
            systemContext: context,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        if (!response.body) {
          throw new Error('No response stream available');
        }

        // Read the stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulated += chunk;

          // Parse SSE data lines
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  setStreamingContent(parsed.content);
                }
              } catch {
                // If not JSON, treat as plain text content
                if (data && data !== '[DONE]') {
                  setStreamingContent((prev) => prev + data);
                }
              }
            }
          }
        }

        // Finalize the assistant message
        const finalContent = streamingContent || accumulated.trim() || 'I apologize, but I wasn\'t able to generate a response. Please try again.';
        const assistantMessage: ChatMessage = {
          id: `msg-${Date.now()}-assistant`,
          role: 'assistant',
          content: finalContent,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
        setError(errorMessage);

        const errorMsg: ChatMessage = {
          id: `msg-${Date.now()}-error`,
          role: 'assistant',
          content: `I encountered an error: ${errorMessage}. Please try again.`,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsStreaming(false);
        setStreamingContent('');
        abortControllerRef.current = null;
      }
    },
    [isStreaming, messages, buildSystemContext, streamingContent]
  );

  // ── Handle form submit ──
  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      sendMessage(inputValue);
    },
    [inputValue, sendMessage]
  );

  // ── Handle input keydown ──
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(inputValue);
      }
    },
    [inputValue, sendMessage]
  );

  // ── Clear conversation ──
  const clearConversation = useCallback(() => {
    setMessages([]);
    setError(null);
    if (user?.id) {
      clearStoredMessages(user.id);
    }
  }, [user?.id]);

  // ── Quick action click ──
  const handleQuickAction = useCallback(
    (action: QuickAction) => {
      if (action.href) {
        // Navigate first, then send prompt
        router.push(action.href);
      }
      sendMessage(action.prompt);
    },
    [sendMessage, router]
  );

  // ──────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Floating Action Button (FAB) ── */}
      <AnimatePresence>
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 1.2 }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className={cn(
            'fixed z-40 flex items-center justify-center rounded-full',
            'shadow-lg shadow-primary/25 transition-all duration-300',
            'bg-gradient-to-br from-primary to-cyan-600',
            'text-white hover:shadow-xl hover:shadow-primary/40',
            'forge-glow neural-glow',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
            'group',
            isMobile ? 'bottom-4 right-4 size-14' : 'bottom-6 right-6 size-14'
          )}
          aria-label="Open ExamForge Intelligence"
        >
          {/* Pulsing rings */}
          <span className="absolute inset-0 rounded-full animate-pulse-glow bg-primary/20" />

          <Brain className="relative z-10 size-6" />

          {/* Intelligence Badge */}
          <span
            className={cn(
              'absolute -top-1 -right-1 z-10 flex items-center justify-center',
              'rounded-full bg-cyan-400 text-[8px] font-bold text-[#0A0A0A]',
              'shadow-sm size-5'
            )}
          >
            AI
          </span>
        </motion.button>
      </AnimatePresence>

      {/* ── Intelligence Panel ── */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{
                opacity: 0,
                y: isMobile ? 300 : 100,
                scale: isMobile ? 1 : 0.95,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                y: isMobile ? 300 : 100,
                scale: isMobile ? 1 : 0.95,
              }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className={cn(
                'fixed z-50 flex flex-col overflow-hidden',
                'rounded-2xl border border-border/30 forge-glass-floating neural-glow forge-card-shadow backdrop-blur-md',
                isMobile
                  ? 'inset-x-0 bottom-0 h-[85vh] rounded-b-none'
                  : 'bottom-20 right-6 h-[520px] w-[400px]'
              )}
            >
              {/* ── Header ── */}
              <div className="flex items-center justify-between border-b border-border/30 bg-white/[0.02] px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-cyan-500 text-white shadow-sm shadow-primary/20 forge-glow">
                    <Brain className="size-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground forge-gradient-text">
                      ExamForge Intelligence
                    </h2>
                    <p className="text-[11px] text-muted-foreground">
                      Contextual AI for education
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="secondary" className="gap-1 text-[10px] font-medium">
                    {ROLE_ICONS[activeRole]}
                    {ROLE_LABELS[activeRole]}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => setIsOpen(false)}
                    aria-label="Close ExamForge Intelligence"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </div>

              {/* ── Context Bar ── */}
              <div className="flex items-center gap-2 border-b border-border/30 bg-white/[0.02] px-4 py-2">
                <Brain className="size-3 text-cyan-400" />
                <span className="text-[11px] text-muted-foreground">Context:</span>
                <Badge variant="outline" className="text-[10px] gap-1 border-border/50">
                  <BookOpen className="size-3" />
                  {pageDisplayName}
                </Badge>
                <Badge variant="outline" className="text-[10px] gap-1 border-border/50">
                  {ROLE_ICONS[activeRole]}
                  {ROLE_LABELS[activeRole]}
                </Badge>
              </div>

              {/* ── Main Content ── */}
              <div className="flex flex-1 flex-col overflow-hidden">
                {/* Quick Actions (only when conversation is empty) */}
                {messages.length === 0 && !isStreaming && (
                  <div className="border-b px-4 py-3">
                    {/* Greeting */}
                    <motion.p
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="mb-3 text-sm font-medium text-foreground forge-gradient-text"
                    >
                      {greeting}
                    </motion.p>
                    {/* Action Grid */}
                    <div className="grid grid-cols-2 gap-2">
                      {quickActions.map((action, i) => (
                        <motion.button
                          key={action.label}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.05 * i + 0.15 }}
                          onClick={() => handleQuickAction(action)}
                          className={cn(
                            'flex flex-col items-center gap-1.5 rounded-lg border border-white/[0.06] px-2 py-2.5',
                            'text-xs text-foreground transition-all duration-200',
                            'bg-white/[0.04] hover:border-cyan-400/30 hover:shadow-md hover:shadow-cyan-400/5',
                            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary',
                            'active:scale-[0.97]'
                          )}
                        >
                          <span className="text-cyan-400">
                            {action.icon}
                          </span>
                          <span className="text-center leading-tight">{action.label}</span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Chat Messages */}
                <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef}>
                  <div className="flex flex-col gap-3">
                    {messages.length === 0 && !isStreaming && (
                      <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                          className="flex size-12 items-center justify-center rounded-2xl bg-primary/5 forge-glow"
                        >
                          <Brain className="size-6 text-primary" />
                        </motion.div>
                        <div>
                          <p className="text-sm font-medium text-foreground forge-gradient-text">
                            {greeting}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Ask anything about exams, teaching, or learning
                          </p>
                        </div>
                      </div>
                    )}

                    {messages.map((message) => (
                      <ChatBubble key={message.id} message={message} />
                    ))}

                    {/* Streaming response */}
                    <AnimatePresence>
                      {isStreaming && streamingContent && (
                        <motion.div
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 8 }}
                          className="flex items-start gap-2.5 px-1"
                        >
                          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                            <Bot className="size-4 text-primary" />
                          </div>
                          <div className="max-w-[85%] rounded-xl rounded-tl-none border-l-2 border-l-cyan-400/50 bg-white/[0.04] px-3 py-2.5 text-sm leading-relaxed text-card-foreground shadow-sm backdrop-blur-sm forge-glass-surface">
                            <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:mb-1.5 [&_p:last-child]:mb-0 [&_ul]:mb-1.5 [&_ol]:mb-1.5 [&_li]:mb-0.5 [&_strong]:text-foreground [&_code]:rounded [&_code]:bg-white/[0.06] [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_code]:font-mono">
                              <ReactMarkdown>{streamingContent}</ReactMarkdown>
                            </div>
                            <motion.span
                              className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 bg-cyan-400"
                              animate={{ opacity: [1, 0] }}
                              transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut' }}
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Typing indicator (before first chunk) */}
                    <AnimatePresence>
                      {isStreaming && !streamingContent && <TypingIndicator />}
                    </AnimatePresence>

                    {/* Error display */}
                    {error && !isStreaming && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive"
                      >
                        Connection error. Please try again.
                      </motion.div>
                    )}
                  </div>
                </ScrollArea>

                {/* Clear conversation button */}
                {messages.length > 0 && !isStreaming && (
                  <div className="flex justify-end border-t border-border/30 px-4 py-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] text-muted-foreground hover:text-destructive"
                      onClick={clearConversation}
                    >
                      Clear conversation
                    </Button>
                  </div>
                )}

                {/* ── Input Area ── */}
                <div className="border-t border-border/30 bg-white/[0.02] px-4 py-3">
                  <form onSubmit={handleSubmit} className="flex items-end gap-2">
                    <textarea
                      ref={inputRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={
                        isStreaming ? 'Waiting for response...' : 'Ask anything about education...'
                      }
                      disabled={isStreaming}
                      rows={1}
                      className={cn(
                        'flex-1 resize-none rounded-lg border border-border/50 bg-muted/30 px-3 py-2',
                        'text-sm leading-relaxed',
                        'placeholder:text-muted-foreground',
                        'forge-input-glow',
                        'focus:border-cyan-400/40',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                        'max-h-24 overflow-y-auto'
                      )}
                      aria-label="Chat message input"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      disabled={!inputValue.trim() || isStreaming}
                      className={cn(
                        'size-9 shrink-0 transition-all duration-200',
                        inputValue.trim() && !isStreaming
                          ? 'bg-primary hover:bg-primary/90 text-white forge-glow'
                          : ''
                      )}
                      aria-label="Send message"
                    >
                      {isStreaming ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Send className="size-4" />
                      )}
                    </Button>
                  </form>
                  <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
                    Shift+Enter for new line &middot; AI responses may not always be accurate
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default ExamForgeIntelligence;
