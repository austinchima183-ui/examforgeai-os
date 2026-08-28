'use client';

// ============================================================================
// ExamForge AI — Exam Take Experience (CBT Interface)
// ============================================================================
// The CORE product experience: the Computer-Based Test interface where
// students take exams. Handles pre-exam, active exam, and post-exam states
// with timer, auto-save, anti-cheat, offline resilience, and mobile support.
// ============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Send,
  Loader2,
  Eye,
  EyeOff,
  Flag,
  Save,
  Wifi,
  WifiOff,
  Maximize,
  BookOpen,
  X,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';

// shadcn/ui components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

// Stores & Hooks
import { useAuthStore } from '@/lib/stores/auth-store';
import { apiFetch } from '@/lib/api/client-fetch';
import { useExamSessionStore } from '@/lib/stores/exam-session-store';
import { useIsMobile } from '@/hooks/use-mobile';
import { useOffline } from '@/hooks/use-offline';
import { cn } from '@/lib/utils/cn';

// Types
import type { QuestionType, ExamSettings, QuestionOption } from '@/lib/types';

// ============================================================================
// Local Types
// ============================================================================

interface ExamQuestion {
  id: string;
  type: QuestionType;
  content: string;
  options?: QuestionOption[];
  marks: number;
  correctAnswer?: string;
  explanation?: string;
  order?: number;
}

interface ExamData {
  id: string;
  title: string;
  subject: string;
  className: string;
  duration: number; // minutes
  totalMarks: number;
  passingMarks: number;
  totalQuestions: number;
  settings: ExamSettings;
  questions: ExamQuestion[];
  status: string;
}

type ExamPhase = 'loading' | 'pre-exam' | 'active' | 'submitted' | 'post-exam';
type QuestionStatus = 'not-visited' | 'current' | 'answered' | 'marked';

interface SubmitResult {
  score: number;
  totalMarks: number;
  percentage: number;
  passed: boolean;
  submittedAt: string;
  answeredQuestions?: number;
  totalQuestions?: number;
}

// ============================================================================
// Constants
// ============================================================================

const AUTO_SAVE_INTERVAL_MS = 30_000;
const TIMER_TICK_INTERVAL_MS = 1_000;
const WARNING_TIME_SECONDS = 5 * 60; // 5 minutes
const CRITICAL_TIME_SECONDS = 1 * 60; // 1 minute
const TAB_CHANNEL_NAME = 'examforge-exam-tab';

// ============================================================================
// Helpers
// ============================================================================

function formatTimer(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function formatTimeAgo(timestamp: string | null): string {
  if (!timestamp) return '';
  const diff = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (diff < 5) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function shuffleArray<T>(array: T[], shouldShuffle: boolean): T[] {
  if (!shouldShuffle) return array;
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getOptionLabel(index: number): string {
  return String.fromCharCode(65 + index); // A, B, C, D...
}

// ============================================================================
// Component: QuestionInput
// ============================================================================

function QuestionInput({
  question,
  answer,
  onAnswerChange,
  disabled,
}: {
  question: ExamQuestion;
  answer: string;
  onAnswerChange: (value: string) => void;
  disabled: boolean;
}) {
  switch (question.type) {
    case 'single_choice':
  case 'multi_choice': {
      return (
        <RadioGroup
          value={answer}
          onValueChange={onAnswerChange}
          disabled={disabled}
          className="space-y-3"
        >
          {question.options?.map((opt, idx) => (
            <div
              key={opt.id || idx}
              className={cn(
                'flex items-center gap-3 rounded-lg border p-4 transition-colors cursor-pointer',
                'hover:bg-accent/50',
                answer === opt.id && 'border-primary bg-primary/5 ring-1 ring-primary/20'
              )}
              onClick={() => !disabled && onAnswerChange(opt.id)}
            >
              <RadioGroupItem value={opt.id} id={`opt-${opt.id}`} />
              <Label
                htmlFor={`opt-${opt.id}`}
                className="flex-1 cursor-pointer text-base"
              >
                <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                  {getOptionLabel(idx)}
                </span>
                {opt.content}
              </Label>
            </div>
          ))}
        </RadioGroup>
      );
    }

    case 'multi_select': {
      const selectedIds = answer
        ? answer.split(',').filter(Boolean)
        : [];
      const toggleOption = (optId: string) => {
        if (disabled) return;
        const next = selectedIds.includes(optId)
          ? selectedIds.filter((id) => id !== optId)
          : [...selectedIds, optId];
        onAnswerChange(next.join(','));
      };

      return (
        <div className="space-y-3">
          {question.options?.map((opt, idx) => (
            <div
              key={opt.id || idx}
              className={cn(
                'flex items-center gap-3 rounded-lg border p-4 transition-colors cursor-pointer',
                'hover:bg-accent/50',
                selectedIds.includes(opt.id) &&
                  'border-primary bg-primary/5 ring-1 ring-primary/20'
              )}
              onClick={() => toggleOption(opt.id)}
            >
              <Checkbox
                checked={selectedIds.includes(opt.id)}
                onCheckedChange={() => toggleOption(opt.id)}
                disabled={disabled}
              />
              <Label className="flex-1 cursor-pointer text-base">
                <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                  {getOptionLabel(idx)}
                </span>
                {opt.content}
              </Label>
            </div>
          ))}
        </div>
      );
    }

    case 'true_false': {
      return (
        <div className="flex gap-4">
          {['True', 'False'].map((val) => (
            <button
              key={val}
              type="button"
              disabled={disabled}
              onClick={() => onAnswerChange(val)}
              className={cn(
                'flex-1 rounded-xl border-2 p-6 text-lg font-semibold transition-all',
                'hover:bg-accent/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                answer === val
                  ? 'border-primary bg-primary/10 text-primary shadow-sm'
                  : 'border-muted bg-card text-foreground',
                disabled && 'cursor-not-allowed opacity-50'
              )}
            >
              {val === 'True' ? (
                <CheckCircle2 className="mx-auto mb-2 h-8 w-8" />
              ) : (
                <X className="mx-auto mb-2 h-8 w-8" />
              )}
              {val}
            </button>
          ))}
        </div>
      );
    }

    case 'short_answer': {
      return (
        <Input
          value={answer}
          onChange={(e) => onAnswerChange(e.target.value)}
          disabled={disabled}
          placeholder="Type your answer..."
          className="text-base"
          maxLength={500}
        />
      );
    }

    case 'essay': {
      return (
        <div className="space-y-2">
          <Textarea
            value={answer}
            onChange={(e) => {
              if (disabled) return;
              // Anti-cheat: block paste
              onAnswerChange(e.target.value);
            }}
            disabled={disabled}
            placeholder="Write your answer here..."
            className="min-h-[200px] text-base resize-y"
            maxLength={10000}
            onPaste={(e) => {
              e.preventDefault();
            }}
            onCopy={(e) => {
              e.preventDefault();
            }}
            onCut={(e) => {
              e.preventDefault();
            }}
          />
          <p className="text-xs text-muted-foreground text-right">
            {answer.length.toLocaleString()} / 10,000 characters
          </p>
        </div>
      );
    }

    case 'fill_blank': {
      // Split content by ___ or {{blank}} patterns
      const parts = question.content.split(/(___|\{\{blank\}\})/g);
      let blankIndex = 0;
      const blankAnswers = answer ? answer.split('|||') : [];

      return (
        <div className="space-y-4 animate-fade-in">
          <div className="text-base leading-8">
            {parts.map((part, idx) => {
              if (part === '___' || part === '{{blank}}') {
                const bIdx = blankIndex++;
                return (
                  <Input
                    key={idx}
                    value={blankAnswers[bIdx] || ''}
                    onChange={(e) => {
                      if (disabled) return;
                      const updated = [...blankAnswers];
                      updated[bIdx] = e.target.value;
                      onAnswerChange(updated.join('|||'));
                    }}
                    disabled={disabled}
                    className="inline-flex w-40 mx-1 text-center"
                    placeholder={`Blank ${bIdx + 1}`}
                  />
                );
              }
              return <span key={idx}>{part}</span>;
            })}
          </div>
        </div>
      );
    }

    case 'matching': {
      const pairs = answer ? JSON.parse(answer || '[]') : [];
      const leftItems = question.options?.filter((_, i) => i % 2 === 0) || [];
      const rightItems = question.options?.filter((_, i) => i % 2 === 1) || [];

      const handleMatch = (leftIdx: number, rightId: string) => {
        if (disabled) return;
        const updated = [...pairs];
        updated[leftIdx] = rightId;
        onAnswerChange(JSON.stringify(updated));
      };

      return (
        <div className="space-y-3">
          {leftItems.map((left, idx) => (
            <div
              key={left.id || idx}
              className="flex items-center gap-4 rounded-lg border p-3"
            >
              <span className="flex-1 font-medium">{left.content}</span>
              <select
                value={pairs[idx] || ''}
                onChange={(e) => handleMatch(idx, e.target.value)}
                disabled={disabled}
                className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="">Select match...</option>
                {rightItems.map((right, rIdx) => (
                  <option key={right.id || rIdx} value={right.id}>
                    {right.content}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      );
    }

    case 'ordering': {
      const order = answer
        ? answer.split(',').filter(Boolean)
        : question.options?.map((o) => o.id) || [];
      const items = question.options || [];

      const moveItem = (fromIdx: number, toIdx: number) => {
        if (disabled) return;
        const updated = [...order];
        const [moved] = updated.splice(fromIdx, 1);
        updated.splice(toIdx, 0, moved);
        onAnswerChange(updated.join(','));
      };

      return (
        <div className="space-y-2">
          {order.map((id, idx) => {
            const item = items.find((o) => o.id === id);
            if (!item) return null;
            return (
              <div
                key={id}
                className="flex items-center gap-3 rounded-lg border p-4"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-bold">
                  {idx + 1}
                </span>
                <span className="flex-1 text-base">{item.content}</span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={disabled || idx === 0}
                    onClick={() => moveItem(idx, idx - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={disabled || idx === order.length - 1}
                    onClick={() => moveItem(idx, idx + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    case 'short_answer': {
      // Numerical answers are handled as short_answer
      return (
        <div className="space-y-2">
          <Input
            type="text"
            value={answer}
            onChange={(e) => onAnswerChange(e.target.value)}
            disabled={disabled}
            placeholder="Enter your answer"
            className="text-base"
          />
        </div>
      );
    }

    default:
      return (
        <Input
          value={answer}
          onChange={(e) => onAnswerChange(e.target.value)}
          disabled={disabled}
          placeholder="Type your answer..."
          className="text-base"
        />
      );
  }
}

// ============================================================================
// Component: QuestionNavigatorGrid
// ============================================================================

function QuestionNavigatorGrid({
  questions,
  currentIndex,
  answers,
  markedForReview,
  onNavigate,
}: {
  questions: ExamQuestion[];
  currentIndex: number;
  answers: Record<string, string>;
  markedForReview: Set<string>;
  onNavigate: (index: number) => void;
}) {
  const getStatus = (idx: number): QuestionStatus => {
    if (idx === currentIndex) return 'current';
    const q = questions[idx];
    if (markedForReview.has(q.id)) return 'marked';
    if (answers[q.id] && answers[q.id].length > 0) return 'answered';
    return 'not-visited';
  };

  const statusColors: Record<QuestionStatus, string> = {
    'not-visited': 'bg-secondary/60 text-muted-foreground hover:bg-secondary/80 border border-border/20',
    current: 'bg-primary text-primary-foreground ring-2 ring-primary/40 forge-glow',
    answered: 'bg-emerald-500 text-white hover:bg-emerald-600',
    marked: 'bg-ember text-ember-foreground hover:bg-ember/80',
  };

  return (
    <div className="grid grid-cols-5 gap-2">
      {questions.map((q, idx) => {
        const status = getStatus(idx);
        return (
          <button
            key={q.id}
            type="button"
            onClick={() => onNavigate(idx)}
            className={cn(
              'h-10 w-full rounded-lg text-sm font-semibold transition-all',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              statusColors[status]
            )}
            title={`Question ${idx + 1} — ${status.replace('-', ' ')}`}
          >
            {idx + 1}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// Main Component: ExamTakePage
// ============================================================================

export default function ExamTakePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const examId = params.id;
  const isMobile = useIsMobile();
  const { isOffline: browserOffline } = useOffline();

  // Stores
  const { user } = useAuthStore();
  const [serverSessionId, setServerSessionId] = useState<string | null>(null);
  const sessionStore = useExamSessionStore();

  // ── Core State ──
  const [phase, setPhase] = useState<ExamPhase>('loading');
  const [exam, setExam] = useState<ExamData | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showTabWarning, setShowTabWarning] = useState(false);
  const [showTimeUpDialog, setShowTimeUpDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Refs
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tabChannelRef = useRef<BroadcastChannel | null>(null);
  const tabSwitchCountRef = useRef(0);
  const hasRestoredRef = useRef(false);
  const handleSubmitRef = useRef<((fromTimer?: boolean) => Promise<void>) | null>(null);

  // ── Derived State ──
  const currentIndex = sessionStore.currentQuestionIndex;
  const currentQuestion = questions[currentIndex] ?? null;
  const answers = sessionStore.answers;
  const timerRemaining = sessionStore.timerRemaining;
  const isTimerWarning = timerRemaining <= WARNING_TIME_SECONDS && timerRemaining > CRITICAL_TIME_SECONDS;
  const isTimerCritical = timerRemaining <= CRITICAL_TIME_SECONDS && timerRemaining > 0;
  const answeredCount = questions.filter((q) => answers[q.id] && answers[q.id].length > 0).length;
  const unansweredCount = questions.length - answeredCount;
  const progressPercent = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  // ── Fetch Exam Data ──
  useEffect(() => {
    if (!examId) return;

    const fetchExam = async () => {
      try {
        const res = await fetch(`/api/cbt/exam?id=${encodeURIComponent(examId)}`);
        if (!res.ok) {
          if (res.status === 404) {
            setFetchError('Exam not found. It may have been deleted or is not available.');
          } else if (res.status === 401) {
            setFetchError('You are not authorized to take this exam.');
          } else {
            setFetchError('Failed to load exam. Please try again.');
          }
          setPhase('pre-exam');
          return;
        }

        const data = await res.json();

        // Check if already submitted
        if (data.sessionStatus === 'submitted' || data.sessionStatus === 'graded' || data.sessionStatus === 'timed_out') {
          setFetchError('You have already submitted this exam.');
          setPhase('pre-exam');
          return;
        }

        const examData: ExamData = {
          id: data.id,
          title: data.title,
          subject: data.subject ?? '',
          className: data.className ?? '',
          duration: data.duration_minutes ?? data.duration ?? 0,
          totalMarks: data.total_marks ?? data.totalMarks ?? 0,
          passingMarks: data.passing_marks ?? data.passingMarks ?? 0,
          totalQuestions: data.questions?.length ?? 0,
          settings: data.settings ?? {
            shuffleQuestions: false,
            showResults: true,
            allowReview: true,
            autoSubmit: true,
          },
          questions: data.questions ?? [],
          status: data.status ?? 'active',
        };

        setExam(examData);

        // Shuffle if needed
        const orderedQuestions = shuffleArray(
          examData.questions,
          examData.settings.shuffleQuestions
        );
        setQuestions(orderedQuestions);

        // Check if there's an active session in the store (resume)
        if (sessionStore.activeExamId === examId && sessionStore.timerRemaining > 0) {
          hasRestoredRef.current = true;
          setPhase('active');
        } else {
          setPhase('pre-exam');
        }
      } catch (err) {
        console.error('Failed to fetch exam:', err);
        setFetchError('Network error. Please check your connection and try again.');
        setPhase('pre-exam');
      }
    };

    fetchExam();
  }, [examId]);

  // ── Timer System ──
  useEffect(() => {
    if (phase !== 'active') {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      const current = sessionStore.timerRemaining;
      if (current <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        // Time's up
        if (exam?.settings.autoSubmit) {
          handleSubmitRef.current?.(true);
        } else {
          setShowTimeUpDialog(true);
        }
        return;
      }
      sessionStore.setTimerRemaining(current - 1);
    }, TIMER_TICK_INTERVAL_MS);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [phase]);

  // ── Auto-Save System ──
  useEffect(() => {
    if (phase !== 'active') {
      if (autoSaveRef.current) {
        clearInterval(autoSaveRef.current);
        autoSaveRef.current = null;
      }
      return;
    }

    const performSave = async () => {
      if (browserOffline) {
        sessionStore.setOffline(true);
        return;
      }

      sessionStore.setSyncStatus('syncing');

      try {
        // Heartbeat: confirm the session is live with the server clock.
        // (Answers persist individually via /api/cbt/answer on change.)
        const res = serverSessionId
          ? await apiFetch('/api/cbt/timing', {
              method: 'POST',
              body: { sessionId: serverSessionId, action: 'resume' },
            })
          : null;

        if (res && res.ok) {
          sessionStore.setLastSaved(new Date().toISOString());
          sessionStore.setOffline(false);
        } else {
          sessionStore.setSyncStatus('error');
        }
      } catch {
        sessionStore.setOffline(true);
      }
    };

    // Save immediately on start, then every 30s
    performSave();
    autoSaveRef.current = setInterval(performSave, AUTO_SAVE_INTERVAL_MS);

    return () => {
      if (autoSaveRef.current) {
        clearInterval(autoSaveRef.current);
        autoSaveRef.current = null;
      }
    };
  }, [phase, browserOffline]);

  // ── Offline/Online Sync ──
  useEffect(() => {
    if (!browserOffline && phase === 'active' && sessionStore.isOffline) {
      // Came back online — sync all answers
      const syncAll = async () => {
        sessionStore.setSyncStatus('syncing');
        try {
          // Reconnect: flush any locally-held answers, then heartbeat
          const localAnswers = useExamSessionStore.getState().getAnswers();
          if (serverSessionId) {
            await Promise.allSettled(
              Object.entries(localAnswers).map(([questionId, answer]) =>
                apiFetch('/api/cbt/answer', {
                  method: 'POST',
                  body: { sessionId: serverSessionId, questionId, answer },
                }).catch(() => undefined)
              )
            );
          }
          const res = serverSessionId
            ? await apiFetch('/api/cbt/timing', {
                method: 'POST',
                body: { sessionId: serverSessionId, action: 'resume' },
              })
            : null;
          if (res && res.ok) {
            sessionStore.setLastSaved(new Date().toISOString());
            sessionStore.setOffline(false);
          }
        } catch {
          // Still failing, keep offline flag
        }
      };
      syncAll();
    }
  }, [browserOffline, phase, examId, sessionStore, serverSessionId]);

  // ── Anti-Cheat: Tab Visibility ──
  useEffect(() => {
    if (phase !== 'active') return;

    const handleVisibility = () => {
      if (document.hidden) {
        tabSwitchCountRef.current += 1;
        setShowTabWarning(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [phase]);

  // ── Anti-Cheat: Multiple Tab Detection ──
  useEffect(() => {
    if (phase !== 'active') return;

    try {
      const channel = new BroadcastChannel(TAB_CHANNEL_NAME);
      tabChannelRef.current = channel;

      // Announce this tab
      channel.postMessage({ type: 'tab-opened', examId, tabId: crypto.randomUUID() });

      channel.onmessage = (event) => {
        if (event.data?.type === 'tab-opened' && event.data?.examId === examId) {
          setShowTabWarning(true);
        }
      };

      return () => {
        channel.close();
        tabChannelRef.current = null;
      };
    } catch {
      // BroadcastChannel not supported
    }
  }, [phase, examId]);

  // ── Anti-Cheat: Disable Right Click ──
  useEffect(() => {
    if (phase !== 'active') return;

    const handler = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', handler);
    return () => document.removeEventListener('contextmenu', handler);
  }, [phase]);

  // ── Anti-Cheat: Disable Copy/Paste globally ──
  useEffect(() => {
    if (phase !== 'active') return;

    const handleCopy = (e: ClipboardEvent) => e.preventDefault();
    const handlePaste = (e: ClipboardEvent) => {
      // Allow paste only in non-essay inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'TEXTAREA') {
        e.preventDefault();
      }
    };

    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
    };
  }, [phase]);

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
      tabChannelRef.current?.close();
    };
  }, []);

  // ── Handlers ──

  const handleEnterFullscreen = useCallback(() => {
    try {
      const elem = document.documentElement as HTMLElement & {
        requestFullscreen?: () => Promise<void>;
      };
      if (!document.fullscreenElement) {
        elem.requestFullscreen?.().catch(() => {});
      } else {
        document.exitFullscreen?.().catch(() => {});
      }
    } catch {
      // Fullscreen not supported or denied
    }
  }, []);

  const handleStartExam = useCallback(async () => {
    if (!exam) return;
    setPhase('active');
    sessionStore.startExam(examId, exam.duration * 60, exam.questions.length);

    // Create the server-authoritative session (timing, attempt locking).
    // Local state is optimistic; the server clock is the source of truth.
    try {
      // Resolve the user id — prefer the hydrated store, fall back to the
      // live Supabase session (the Zustand store can lag on hard reloads)
      let userId = user?.id
      if (!userId) {
        const { createClient } = await import('@/lib/supabase/client')
        const sb = createClient()
        const { data: { user: authUser } } = await sb.auth.getUser()
        userId = authUser?.id ?? null
      }
      if (userId) {
        const res = await apiFetch('/api/cbt/session', {
          method: 'POST',
          body: {
            userId,
            examId,
            clientTimestamp: new Date().toISOString(),
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.sessionId) {
            setServerSessionId(data.sessionId as string);
            if (typeof data.remainingSeconds === 'number' && data.remainingSeconds > 0) {
              sessionStore.setTimerRemaining(data.remainingSeconds);
            }
          }
        }
      }
      // Non-ok: server-side validation rejected the start (attempts, window,
      // enrollment). The local session continues; the server guards remain
      // enforced on answer save and submit.
    } catch {
      // Offline-tolerant: exam continues locally, syncs on reconnect
    }

    // Encourage fullscreen
    try {
      const elem = document.documentElement as HTMLElement & {
        requestFullscreen?: () => Promise<void>;
      };
      elem.requestFullscreen?.().catch(() => {});
    } catch {
      // Fullscreen not supported or denied
    }
  }, [exam, examId, sessionStore, user]);

  // In-flight answer saves (per-question serialization — the server locks
  // a session during a save, so parallel saves for the same session race)
  const inFlightSavesRef = useRef<Set<string>>(new Set())

  const handleAnswerChange = useCallback(
    (questionId: string, value: string) => {
      // Optimistic local save (instant UI feedback, offline resilience)
      sessionStore.setAnswer(questionId, value);

      // Server-authoritative persist (versioning, audit trail).
      // NOTE: the route schema is strict — only these three fields are accepted.
      if (!serverSessionId) return
      if (inFlightSavesRef.current.has(questionId)) return // serialize per question

      const persist = async (attempt = 0) => {
        inFlightSavesRef.current.add(questionId)
        try {
          const res = await apiFetch('/api/cbt/answer', {
            method: 'POST',
            body: {
              sessionId: serverSessionId,
              questionId,
              answer: value,
            },
          })
          if (!res.ok && attempt < 2) {
            // Lock contention or transient failure — brief backoff, retry
            await new Promise(r => setTimeout(r, 300 * (attempt + 1)))
            return persist(attempt + 1)
          }
        } catch {
          // Offline — local answer retained; sync happens via the timing
          // heartbeat and final submission
        } finally {
          inFlightSavesRef.current.delete(questionId)
        }
      }
      persist()
    },
    [sessionStore, serverSessionId]
  );

  const handleNavigate = useCallback(
    (index: number) => {
      if (index < 0 || index >= questions.length) return;
      sessionStore.setCurrentQuestion(index);
    },
    [questions.length, sessionStore]
  );

  const handleToggleMark = useCallback(() => {
    if (!currentQuestion) return;
    setMarkedForReview((prev) => {
      const next = new Set(prev);
      if (next.has(currentQuestion.id)) {
        next.delete(currentQuestion.id);
      } else {
        next.add(currentQuestion.id);
      }
      return next;
    });
  }, [currentQuestion]);

  const handleSubmit = useCallback(
    async (fromTimer = false) => {
      setIsSubmitting(true);

      try {
        if (serverSessionId && user) {
          // ── Server-authoritative submission ──
          // Flush any locally-held answers first (offline resilience)
          const localAnswers = sessionStore.getAnswers();
          await Promise.allSettled(
            Object.entries(localAnswers).map(([questionId, answer]) =>
              apiFetch('/api/cbt/answer', {
                method: 'POST',
                body: {
                  sessionId: serverSessionId,
                  questionId,
                  answer,
                },
              }).catch(() => undefined)
            )
          );

          const res = await apiFetch('/api/cbt/submit', {
            method: 'POST',
            body: {
              sessionId: serverSessionId,
              userId: user.id,
              clientTimestamp: new Date().toISOString(),
            },
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error ?? 'Submission failed');
          }

          const data = await res.json();
          setSubmitResult({
            score: data.score ?? 0,
            totalMarks: data.totalMarks ?? exam?.totalMarks ?? 0,
            percentage: data.percentage ?? 0,
            passed: data.passed ?? (data.percentage ?? 0) >= 50,
            submittedAt: data.submittedAt ?? new Date().toISOString(),
            answeredQuestions: data.answeredQuestions ?? 0,
            totalQuestions: data.totalQuestions ?? exam?.totalQuestions ?? 0,
          });
        } else {
          // ── Local-only fallback (no server session — e.g. offline start) ──
          const res = await apiFetch('/api/cbt/submit', {
            method: 'POST',
            body: {
              examId,
              answers: sessionStore.getAnswers(),
              timerRemaining: sessionStore.timerRemaining,
              tabSwitchCount: tabSwitchCountRef.current,
              timedOut: fromTimer,
            },
          }).catch(() => null);

          const data = res && res.ok ? await res.json().catch(() => ({})) : {};
          setSubmitResult({
            score: data.score ?? 0,
            totalMarks: data.totalMarks ?? exam?.totalMarks ?? 0,
            percentage: data.percentage ?? 0,
            passed: data.passed ?? (data.percentage ?? 0) >= 50,
            submittedAt: new Date().toISOString(),
            answeredQuestions: Object.keys(sessionStore.getAnswers()).length,
            totalQuestions: exam?.totalQuestions ?? 0,
          });
        }

        setPhase('post-exam');
        sessionStore.clearExam();
      } catch (err) {
        console.error('Submission failed:', err);
        setSubmissionError(
          err instanceof Error ? err.message : 'An error occurred during submission. Your answers are saved.'
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [serverSessionId, user, examId, exam, sessionStore]
  );

  // ── Touch/Swipe navigation ──
  const touchStartRef = useRef<number | null>(null);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
  }, []);
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartRef.current === null) return;
      const diff = touchStartRef.current - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 60) {
        if (diff > 0) handleNavigate(currentIndex + 1); // swipe left = next
        else handleNavigate(currentIndex - 1); // swipe right = prev
      }
      touchStartRef.current = null;
    },
    [currentIndex, handleNavigate]
  );

  // ── Refresh time-ago display ──
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(iv);
  }, []);
  // Use tick to force re-render for time-ago
  const savedLabel = useMemo(
    () => formatTimeAgo(sessionStore.lastSavedAt),
    [sessionStore.lastSavedAt, tick, sessionStore]
  );

  // ============================================================================
  // RENDER: Loading
  // ============================================================================

  if (phase === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center forge-ambient-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute -inset-4 rounded-full bg-primary/10 blur-xl" />
            <Loader2 className="relative h-10 w-10 animate-spin text-primary" />
          </div>
          <p className="text-lg text-muted-foreground">Loading exam...</p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: Fetch Error (standalone)
  // ============================================================================
  if (fetchError && phase === 'pre-exam' && !exam) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 forge-ambient-bg">
        <Card className="max-w-md w-full forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
          <CardHeader className="text-center">
            <div className="relative mx-auto mb-2">
              <div className="absolute -inset-3 rounded-full bg-destructive/10 blur-xl" />
              <AlertCircle className="relative h-12 w-12 text-destructive" />
            </div>
            <CardTitle className="mt-4">Unable to Load Exam</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">{fetchError}</p>
            <Button variant="outline" onClick={() => router.push('/dashboard')} className="border-border/40">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================================================
  // RENDER: Pre-Exam
  // ============================================================================

  if (phase === 'pre-exam' && exam) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 forge-ambient-bg">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl w-full space-y-6"
        >
          <Card className="overflow-hidden forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <div className="relative bg-gradient-to-r from-primary to-neural p-6 text-white overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/70 to-neural/90" />
              <div className="relative">
                <h1 className="text-2xl font-bold tracking-tight">{exam.title}</h1>
              <p className="mt-1 text-white/80">
                {exam.subject}
                {exam.className ? ` · ${exam.className}` : ''}
              </p>
              </div>
            </div>
            <CardContent className="p-6 space-y-6">
              {/* Exam Info Grid */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="text-center p-3 rounded-lg bg-secondary/30 border border-border/20">
                  <p className="text-2xl font-bold text-primary">{exam.totalQuestions}</p>
                  <p className="text-xs text-muted-foreground">Questions</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-secondary/30 border border-border/20">
                  <p className="text-2xl font-bold text-primary">{exam.totalMarks}</p>
                  <p className="text-xs text-muted-foreground">Total Marks</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-secondary/30 border border-border/20">
                  <p className="text-2xl font-bold text-primary">{exam.duration}</p>
                  <p className="text-xs text-muted-foreground">Minutes</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-secondary/30 border border-border/20">
                  <p className="text-2xl font-bold text-primary">{exam.passingMarks}</p>
                  <p className="text-xs text-muted-foreground">Passing Marks</p>
                </div>
              </div>

              <Separator className="bg-border/30" />

              {/* Instructions */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Instructions
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    The timer will start as soon as you begin and <strong>cannot be paused</strong>.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    Your answers are saved automatically every 30 seconds.
                  </li>
                  {exam.settings.shuffleQuestions && (
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      Questions will be presented in a <strong>shuffled</strong> order.
                    </li>
                  )}
                  {exam.settings.showResults && (
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      Results will be shown <strong>immediately</strong> after submission.
                    </li>
                  )}
                  {exam.settings.allowReview && (
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      You can <strong>review answers</strong> after submission.
                    </li>
                  )}
                  {exam.settings.autoSubmit && (
                    <li className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      The exam will <strong>auto-submit</strong> when time runs out.
                    </li>
                  )}
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    You can <strong>mark questions for review</strong> and revisit them later.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    Switching tabs or applications may be detected.
                  </li>
                </ul>
              </div>

              <Separator />

              {/* Confirmation */}
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Are you ready? Once you start, the timer cannot be paused. Make sure you have a
                  stable internet connection and sufficient time to complete the exam.
                </AlertDescription>
              </Alert>

              {/* Start Button */}
              <Button
                onClick={handleStartExam}
                size="lg"
                className="w-full text-lg h-14 forge-glow"
              >
                Start Exam
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: Post-Exam
  // ============================================================================

  if (phase === 'submitted') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 forge-ambient-bg">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl w-full space-y-6"
        >
          <Card className="overflow-hidden forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <div className="relative bg-gradient-to-r from-emerald-500 to-teal-500 p-8 text-white text-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/90 via-emerald-500/70 to-teal-500/90" />
              <div className="relative">
                <CheckCircle2 className="mx-auto h-16 w-16 mb-4" />
                <h1 className="text-3xl font-bold tracking-tight">Exam Submitted</h1>
                <p className="mt-2 text-emerald-100">
                  {submitResult?.submittedAt
                    ? new Date(submitResult.submittedAt).toLocaleString()
                    : 'Just now'}
                </p>
              </div>
            </div>
            <CardContent className="p-6 space-y-6">
              {exam?.settings.showResults && submitResult ? (
                <>
                  {/* Score Card */}
                  <div className="text-center space-y-2">
                    <p className="text-5xl font-bold forge-gradient-text">
                      {submitResult.percentage.toFixed(1)}%
                    </p>
                    <p className="text-lg text-muted-foreground">
                      {submitResult.score} / {submitResult.totalMarks} marks
                    </p>
                    <Badge
                      variant={submitResult.passed ? 'default' : 'destructive'}
                      className="text-base px-4 py-1"
                    >
                      {submitResult.passed ? 'PASSED' : 'FAILED'}
                    </Badge>
                  </div>

                  <Progress
                    value={submitResult.percentage}
                    className="h-3"
                  />

                  {/* Question-by-question review */}
                  {exam.settings.allowReview && questions.length > 0 && (
                    <div className="space-y-4 animate-fade-in">
                      <h3 className="font-semibold text-lg">Answer Review</h3>
                      <ScrollArea className="max-h-[400px]">
                        <div className="space-y-4 pr-4">
                          {questions.map((q, idx) => {
                            const userAnswer = answers[q.id] ?? '';
                            const isCorrect = userAnswer === q.correctAnswer;
                            return (
                              <div
                                key={q.id}
                                className={cn(
                                  'rounded-lg border p-4 space-y-2',
                                  isCorrect
                                    ? 'border-emerald-200 bg-green-50 dark:bg-green-950 dark:border-emerald-800 dark:bg-emerald-950'
                                    : 'border-red-200 bg-destructive/10 dark:border-red-800 dark:bg-red-950'
                                )}
                              >
                                <div className="flex items-start gap-2">
                                  {isCorrect ? (
                                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                                  ) : (
                                    <X className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                                  )}
                                  <div className="flex-1">
                                    <p className="font-medium text-sm">
                                      Q{idx + 1}: {q.content.substring(0, 100)}
                                      {q.content.length > 100 ? '...' : ''}
                                    </p>
                                    <p className="text-sm mt-1">
                                      <span className="text-muted-foreground">Your answer: </span>
                                      <span className={isCorrect ? 'text-green-700 dark:text-green-400 font-medium' : 'text-destructive font-medium'}>
                                        {userAnswer || '(not answered)'}
                                      </span>
                                    </p>
                                    {!isCorrect && q.correctAnswer && (
                                      <p className="text-sm">
                                        <span className="text-muted-foreground">Correct answer: </span>
                                        <span className="text-green-700 dark:text-green-400 font-medium">{q.correctAnswer}</span>
                                      </p>
                                    )}
                                    {q.explanation && (
                                      <p className="text-sm text-muted-foreground mt-1 italic">
                                        {q.explanation}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-lg text-muted-foreground">
                    Your results will be published by your teacher.
                  </p>
                </div>
              )}

              <Button
                onClick={() => router.push('/dashboard')}
                className="w-full forge-glow"
                size="lg"
              >
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: Active Exam
  // ============================================================================

  return (
    <div
      className="flex min-h-screen flex-col bg-background"
      onTouchStart={isMobile ? handleTouchStart : undefined}
      onTouchEnd={isMobile ? handleTouchEnd : undefined}
    >
      {/* ── Top Bar ── */}
      <header className="sticky top-0 z-40 border-b border-border/30 forge-glass-elevated backdrop-blur-md">
        <div className="flex h-14 items-center justify-between px-4 gap-2">
          {/* Left: Exam Title */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <FileTextIcon className="h-4 w-4 text-primary shrink-0" />
            <span className="font-medium text-sm truncate">{exam?.title}</span>
          </div>

          {/* Center: Timer */}
          <div
            className={cn(
              'flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-mono font-bold tabular-nums',
              isTimerCritical
                ? 'bg-destructive/10 text-destructive dark:bg-red-900 dark:text-destructive animate-pulse'
                : isTimerWarning
                  ? 'bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400 dark:bg-amber-900 dark:text-yellow-400'
                  : 'bg-muted text-foreground'
            )}
          >
            <Clock className="h-3.5 w-3.5" />
            {formatTimer(timerRemaining)}
          </div>

          {/* Right: Question Nav + Save Status */}
          <div className="flex items-center gap-3 flex-1 justify-end">
            <Badge variant="outline" className="text-xs whitespace-nowrap">
              Q {currentIndex + 1} of {questions.length}
            </Badge>

            {/* Auto-save indicator */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {sessionStore.isOffline ? (
                <>
                  <WifiOff className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />
                  <span className="hidden sm:inline text-yellow-600 dark:text-yellow-400">Offline</span>
                </>
              ) : sessionStore.syncStatus === 'syncing' ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                  <span className="hidden sm:inline">Saving...</span>
                </>
              ) : sessionStore.syncStatus === 'synced' ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-green-50 dark:bg-green-950" />
                  <span className="hidden sm:inline">Saved {savedLabel}</span>
                </>
              ) : sessionStore.syncStatus === 'error' ? (
                <>
                  <AlertCircle className="h-3 w-3 text-destructive" />
                  <span className="hidden sm:inline text-destructive">Error</span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                  <span className="hidden sm:inline">Unsaved</span>
                </>
              )}
            </div>

            {/* Fullscreen button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hidden sm:flex"
              onClick={handleEnterFullscreen}
              title="Enter fullscreen"
            >
              <Maximize className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <Progress value={progressPercent} className="h-1 rounded-none" />
      </header>

      {/* ── Main Content Area ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Question Panel */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl p-4 sm:p-6 lg:p-8">
            <AnimatePresence mode="wait">
              {currentQuestion && (
                <motion.div
                  key={currentQuestion.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {/* Question Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-sm px-3 py-1 bg-primary/15 text-primary border-primary/20">
                        Question {currentIndex + 1}
                      </Badge>
                      <Badge variant="outline" className="text-sm border-border/40">
                        {currentQuestion.marks} mark{currentQuestion.marks !== 1 ? 's' : ''}
                      </Badge>
                      <Badge variant="outline" className="text-xs capitalize border-border/40 text-muted-foreground">
                        {currentQuestion.type.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleToggleMark}
                      className={cn(
                        'gap-1.5',
                        markedForReview.has(currentQuestion.id) &&
                          'text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:text-yellow-400'
                      )}
                    >
                      <Flag
                        className={cn(
                          'h-4 w-4',
                          markedForReview.has(currentQuestion.id) && 'fill-yellow-600'
                        )}
                      />
                      <span className="hidden sm:inline">
                        {markedForReview.has(currentQuestion.id)
                          ? 'Marked'
                          : 'Mark for Review'}
                      </span>
                    </Button>
                  </div>

                  {/* Question Content */}
                  {currentQuestion.type !== 'fill_blank' && (
                    <div className="text-lg leading-relaxed whitespace-pre-wrap">
                      {currentQuestion.content}
                    </div>
                  )}

                  {/* Answer Input */}
                  <QuestionInput
                    question={currentQuestion}
                    answer={answers[currentQuestion.id] ?? ''}
                    onAnswerChange={(value) =>
                      handleAnswerChange(currentQuestion.id, value)
                    }
                    disabled={isSubmitting}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        {/* ── Right Sidebar: Question Navigator (Desktop) ── */}
        {!isMobile && (
          <aside className="hidden lg:flex w-64 border-l border-border/30 forge-glass-surface flex-col">
            <div className="p-4 border-b border-border/20">
              <h3 className="font-semibold text-sm tracking-tight">Question Navigator</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {answeredCount} of {questions.length} answered
              </p>
            </div>
            <ScrollArea className="flex-1 p-4">
              <QuestionNavigatorGrid
                questions={questions}
                currentIndex={currentIndex}
                answers={answers}
                markedForReview={markedForReview}
                onNavigate={handleNavigate}
              />
            </ScrollArea>
            {/* Legend */}
            <div className="p-4 border-t border-border/20 space-y-2 text-xs">
              <p className="font-semibold text-muted-foreground mb-2">Legend</p>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm bg-muted" />
                <span>Not visited</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm bg-primary" />
                <span>Current</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm bg-emerald-500" />
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm bg-ember" />
                <span>Marked for review</span>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* ── Bottom Navigation Bar ── */}
      <footer className="sticky bottom-0 z-40 border-t border-border/30 forge-glass-elevated backdrop-blur-md">
        <div className="flex items-center justify-between p-3 sm:p-4 gap-2">
          {/* Previous Button */}
          <Button
            variant="outline"
            onClick={() => handleNavigate(currentIndex - 1)}
            disabled={currentIndex === 0}
            className="gap-1.5"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Previous</span>
          </Button>

          {/* Center: Mobile navigator trigger + Mark toggle */}
          <div className="flex items-center gap-2">
            {isMobile && (
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Eye className="h-4 w-4" />
                    Navigator
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="max-h-[70vh]">
                  <SheetHeader>
                    <SheetTitle>Question Navigator</SheetTitle>
                  </SheetHeader>
                  <div className="p-4 space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {answeredCount} of {questions.length} answered
                    </p>
                    <QuestionNavigatorGrid
                      questions={questions}
                      currentIndex={currentIndex}
                      answers={answers}
                      markedForReview={markedForReview}
                      onNavigate={(idx) => {
                        handleNavigate(idx);
                        setSheetOpen(false);
                      }}
                    />
                    {/* Legend */}
                    <div className="grid grid-cols-2 gap-2 text-xs pt-2">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-sm bg-muted" />
                        <span>Not visited</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-sm bg-primary" />
                        <span>Current</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-sm bg-emerald-500" />
                        <span>Answered</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-sm bg-ember" />
                        <span>Marked</span>
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            )}

            {isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleMark}
                className={cn(
                  'gap-1.5',
                  markedForReview.has(currentQuestion?.id ?? '') &&
                    'text-yellow-600 dark:text-yellow-400'
                )}
              >
                <Flag
                  className={cn(
                    'h-4 w-4',
                    markedForReview.has(currentQuestion?.id ?? '') &&
                      'fill-yellow-600'
                  )}
                />
                {markedForReview.has(currentQuestion?.id ?? '') ? 'Marked' : 'Mark'}
              </Button>
            )}
          </div>

          {/* Next / Submit Buttons */}
          <div className="flex items-center gap-2">
            {currentIndex < questions.length - 1 ? (
              <Button
                onClick={() => handleNavigate(currentIndex + 1)}
                className="gap-1.5"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={() => setShowSubmitDialog(true)}
                className="gap-1.5 forge-glow"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Submit
              </Button>
            )}

            {/* Submit button (always accessible on non-last questions on desktop) */}
            {currentIndex < questions.length - 1 && !isMobile && (
              <Button
                variant="outline"
                onClick={() => setShowSubmitDialog(true)}
                disabled={isSubmitting}
                className="gap-1.5"
              >
                <Send className="h-4 w-4" />
                Submit
              </Button>
            )}
          </div>
        </div>
      </footer>

      {/* ── Submit Confirmation Dialog ── */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent className="forge-glass-elevated border-white/[0.04]">
          <DialogHeader>
            <DialogTitle>Submit Exam?</DialogTitle>
            <DialogDescription>
              {unansweredCount > 0 ? (
                <>
                  You have{' '}
                  <strong className="text-foreground">
                    {unansweredCount} unanswered question
                    {unansweredCount !== 1 ? 's' : ''}
                  </strong>
                  . Are you sure you want to submit? You cannot change your answers after
                  submission.
                </>
              ) : (
                <>
                  All questions answered. Are you sure you want to submit? You cannot change
                  your answers after submission.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSubmitDialog(false)}
              disabled={isSubmitting}
            >
              Continue Exam
            </Button>
            <Button
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting}
              className="gap-1.5"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Submit Exam
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Tab Switch Warning Dialog ── */}
      <Dialog open={showTabWarning} onOpenChange={setShowTabWarning}>
        <DialogContent className="forge-glass-elevated border-white/[0.04]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              Attention!
            </DialogTitle>
            <DialogDescription>
              You switched away from the exam tab. This activity has been recorded.
              Switching tabs during an exam may be reported to your teacher. Please stay on
              this tab until you finish.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowTabWarning(false)}>I Understand</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Time's Up Dialog ── */}
      <Dialog open={showTimeUpDialog}>
        <DialogContent showCloseButton={false} className="forge-glass-elevated border-white/[0.04]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Clock className="h-5 w-5" />
              Time&apos;s Up!
            </DialogTitle>
            <DialogDescription>
              The exam time has expired. Your answers will be submitted automatically.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting}
              className="gap-1.5"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Submit Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Inline icon for header (avoid importing FileText which is used elsewhere) ──
function FileTextIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  );
}
