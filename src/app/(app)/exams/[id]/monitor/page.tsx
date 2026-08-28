'use client';

// ============================================================================
// ExamForge AI — Real-Time Exam Monitor Dashboard
// ============================================================================
// Proctoring dashboard for teachers to monitor live exams in real-time.
// Features: live stats, student grid, detail panel, real-time Supabase
// subscriptions, admin actions (end exam, extend time, broadcast, flag).
// ============================================================================

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow, differenceInSeconds, format } from 'date-fns';
import { toast } from 'sonner';
import {
  Users,
  Eye,
  Clock,
  AlertTriangle,
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  Wifi,
  WifiOff,
  Flag,
  Search,
  Download,
  MessageSquare,
  Plus,
  Shield,
  Activity,
  ChevronDown,
  ChevronUp,
  Radio,
  Zap,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { createClient, createClientOrNull } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/stores/auth-store';
import type { ExamSessionRow, ExamRow, ProfileRow } from '@/lib/supabase/types';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

type SessionStatus = ExamSessionRow['status'];

type MonitorFilter = 'all' | 'in_progress' | 'submitted' | 'not_started' | 'flagged';

type SortOption = 'name' | 'progress' | 'status' | 'last_activity';

type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

interface StudentSession extends ExamSessionRow {
  profile: Pick<ProfileRow, 'id' | 'full_name' | 'email' | 'avatar_url'> | null;
  isOnline: boolean;
  currentQuestion: number;
  flagged: boolean;
  suspiciousActivityCount: number;
  lastActivityAt: string | null;
  activityLog: ActivityEntry[];
}

interface ActivityEntry {
  id: string;
  type: 'navigate' | 'answer' | 'tab_switch' | 'submit' | 'flag';
  description: string;
  timestamp: string;
}

interface ExamData extends ExamRow {
  enrolledCount: number;
}

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

function statusToBadgeVariant(
  status: SessionStatus,
  flagged: boolean
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (flagged) return 'destructive';
  switch (status) {
    case 'in_progress':
      return 'default';
    case 'submitted':
    case 'graded':
    case 'timed_out':
      return 'secondary';
    case 'not_started':
      return 'outline';
    default:
      return 'outline';
  }
}

function statusLabel(status: SessionStatus, flagged: boolean): string {
  if (flagged) return 'Flagged';
  switch (status) {
    case 'in_progress':
      return 'In Progress';
    case 'submitted':
      return 'Submitted';
    case 'timed_out':
      return 'Timed Out';
    case 'graded':
      return 'Graded';
    case 'not_started':
      return 'Not Started';
    case 'abandoned':
      return 'Abandoned';
    default:
      return status;
  }
}

function statusBadgeColor(status: SessionStatus, flagged: boolean): string {
  if (flagged) return 'bg-destructive/10 text-destructive dark:bg-destructive/10 dark:text-destructive border-0';
  switch (status) {
    case 'in_progress':
      return 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 dark:bg-emerald-900/40 dark:text-green-400 border-0';
    case 'submitted':
    case 'graded':
    case 'timed_out':
      return 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 border-0';
    case 'not_started':
      return 'bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-400 border-0';
    default:
      return '';
  }
}

// ──────────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────────

export default function ExamMonitorPage() {
  const params = useParams<{ id: string }>();
  const examId = params.id;
  const { user } = useAuthStore();

  // ── Core State ──────────────────────────────────────────────
  const [exam, setExam] = useState<ExamData | null>(null);
  const [sessions, setSessions] = useState<StudentSession[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // ── UI State ────────────────────────────────────────────────
  const [filter, setFilter] = useState<MonitorFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [searchQuery, setSearchQuery] = useState('');
  const [chartsExpanded, setChartsExpanded] = useState(false);

  // ── Dialog State ────────────────────────────────────────────
  const [endExamDialogOpen, setEndExamDialogOpen] = useState(false);
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [broadcastDialogOpen, setBroadcastDialogOpen] = useState(false);
  const [forceSubmitDialogOpen, setForceSubmitDialogOpen] = useState(false);
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [sendMessageDialogOpen, setSendMessageDialogOpen] = useState(false);

  // ── Dialog Input State ──────────────────────────────────────
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [directMessage, setDirectMessage] = useState('');
  const [extendMinutes, setExtendMinutes] = useState(5);
  const [actionLoading, setActionLoading] = useState(false);

  // ── Refs ────────────────────────────────────────────────────
  const channelRef = useRef<ReturnType<NonNullable<ReturnType<typeof createClient>>['channel']> | null>(null);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const processedEventIdsRef = useRef(new Set<string>());

  // ────────────────────────────────────────────────────────────
  // Data Fetching
  // ────────────────────────────────────────────────────────────

  const fetchExamData = useCallback(async () => {
    const supabase = createClientOrNull();
    if (!supabase) return;
    supabaseRef.current = supabase;

    try {
      // Fetch exam details
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .single();

      if (examError || !examData) {
        toast.error('Failed to load exam data');
        return;
      }

      // Normalize column names: the live table uses start_time/end_time,
      // legacy UI code reads starts_at/ends_at.
      const examRow = examData as Record<string, unknown>
      const normalizedExam = {
        ...examData,
        starts_at: examRow.starts_at ?? examRow.start_time ?? null,
        ends_at: examRow.ends_at ?? examRow.end_time ?? null,
      }

      // Fetch enrolled count from exam_enrollments or exam_sessions
      const { count: enrolledCount } = await supabase
        .from('exam_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('exam_id', examId);

      setExam({ ...normalizedExam, enrolledCount: enrolledCount ?? 0 });

      // Fetch sessions with student profiles
      const { data: sessionRows, error: sessionsError } = await supabase
        .from('exam_sessions')
        .select(`
          *,
          profiles:student_id (
            id,
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('exam_id', examId);

      if (sessionsError) {
        toast.error('Failed to load exam sessions');
        return;
      }

      const mapped: StudentSession[] = (sessionRows ?? []).map((row: Record<string, unknown>) => {
        const session = row as unknown as ExamSessionRow & { profiles?: ProfileRow | null };
        const meta = (session.metadata as Record<string, unknown>) ?? {};
        return {
          ...session,
          profile: session.profiles
            ? {
                id: session.profiles.id,
                full_name: session.profiles.full_name,
                email: session.profiles.email,
                avatar_url: session.profiles.avatar_url,
              }
            : null,
          isOnline: (meta.isOnline as boolean) ?? false,
          currentQuestion: (meta.currentQuestion as number) ?? session.answers_completed,
          flagged: (meta.flagged as boolean) ?? false,
          suspiciousActivityCount: (meta.suspiciousActivityCount as number) ?? 0,
          lastActivityAt: session.updated_at,
          activityLog: (meta.activityLog as ActivityEntry[]) ?? [],
        };
      });

      setSessions(mapped);
    } catch (err) {
      console.error('[ExamMonitor] Fetch error:', err);
      toast.error('Network error — check your connection');
    } finally {
      setIsLoading(false);
    }
  }, [examId]);

  // ────────────────────────────────────────────────────────────
  // Realtime Subscription
  // ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!examId) return;

    fetchExamData();
    setConnectionStatus('connecting');

    const supabase = createClientOrNull();
    if (!supabase) return;
    supabaseRef.current = supabase;

    const channel = supabase
      .channel('exam-monitor')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'exam_sessions',
          filter: `exam_id=eq.${examId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const newRow = payload.new as unknown as ExamSessionRow;
          const eventId = `insert-${newRow.id}`;
          if (processedEventIdsRef.current.has(eventId)) return;
          processedEventIdsRef.current.add(eventId);

          // Fetch the full session with profile
          supabase
            .from('exam_sessions')
            .select(`
              *,
              profiles:student_id (
                id,
                full_name,
                email,
                avatar_url
              )
            `)
            .eq('id', newRow.id)
            .single()
            .then(({ data }: { data: Record<string, unknown> | null }) => {
              if (!data) return;
              const row = data as unknown as ExamSessionRow & { profiles?: ProfileRow | null };
              const meta = (row.metadata as Record<string, unknown>) ?? {};
              const newSession: StudentSession = {
                ...row,
                profile: row.profiles
                  ? {
                      id: row.profiles.id,
                      full_name: row.profiles.full_name,
                      email: row.profiles.email,
                      avatar_url: row.profiles.avatar_url,
                    }
                  : null,
                isOnline: (meta.isOnline as boolean) ?? true,
                currentQuestion: (meta.currentQuestion as number) ?? 0,
                flagged: (meta.flagged as boolean) ?? false,
                suspiciousActivityCount: (meta.suspiciousActivityCount as number) ?? 0,
                lastActivityAt: row.updated_at,
                activityLog: (meta.activityLog as ActivityEntry[]) ?? [],
              };

              setSessions((prev) => {
                if (prev.some((s) => s.id === newRow.id)) return prev;
                return [...prev, newSession];
              });

              const name = newSession.profile?.full_name ?? 'A student';
              toast.info(`${name} started the exam`);
            })
            .catch((err: unknown) => {
              console.error('[ExamMonitor] Failed to fetch session:', err);
            });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'exam_sessions',
          filter: `exam_id=eq.${examId}`,
        },
        (payload: { new: Record<string, unknown>; old: Record<string, unknown> }) => {
          const updatedRow = payload.new as unknown as ExamSessionRow;
          const oldRow = payload.old as unknown as Partial<ExamSessionRow>;
          const eventId = `update-${updatedRow.id}-${updatedRow.updated_at}`;
          if (processedEventIdsRef.current.has(eventId)) return;
          processedEventIdsRef.current.add(eventId);

          // Clean up old event IDs to prevent memory leak
          if (processedEventIdsRef.current.size > 500) {
            const entries = Array.from(processedEventIdsRef.current);
            processedEventIdsRef.current = new Set(entries.slice(-250));
          }

          const meta = (updatedRow.metadata as Record<string, unknown>) ?? {};

          setSessions((prev) =>
            prev.map((s) => {
              if (s.id !== updatedRow.id) return s;
              const updated: StudentSession = {
                ...s,
                ...updatedRow,
                isOnline: (meta.isOnline as boolean) ?? s.isOnline,
                currentQuestion: (meta.currentQuestion as number) ?? updatedRow.answers_completed,
                flagged: (meta.flagged as boolean) ?? s.flagged,
                suspiciousActivityCount:
                  (meta.suspiciousActivityCount as number) ?? s.suspiciousActivityCount,
                lastActivityAt: updatedRow.updated_at,
                activityLog: (meta.activityLog as ActivityEntry[]) ?? s.activityLog,
              };
              return updated;
            })
          );

          // Show toast for key state changes
          if (oldRow.status !== updatedRow.status) {
            const name = sessions.find((s) => s.id === updatedRow.id)?.profile?.full_name ?? 'A student';
            if (updatedRow.status === 'submitted') {
              toast.success(`${name} submitted their exam`);
            } else if (updatedRow.status === 'timed_out') {
              toast.warning(`${name}'s exam timed out`);
            }
          }

          // Toast for newly flagged
          const wasFlagged = sessions.find((s) => s.id === updatedRow.id)?.flagged ?? false;
          const nowFlagged = (meta.flagged as boolean) ?? false;
          if (!wasFlagged && nowFlagged) {
            const name = sessions.find((s) => s.id === updatedRow.id)?.profile?.full_name ?? 'A student';
            toast.warning(`${name} was flagged for review`, {
              icon: <Flag className="size-4 text-destructive" />,
            });
          }
        }
      )
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          setConnectionStatus('disconnected');
        } else if (status === 'TIMED_OUT') {
          setConnectionStatus('connecting');
        }
      });

    channelRef.current = channel;

    // Backup refresh every 5 seconds
    refreshIntervalRef.current = setInterval(() => {
      fetchExamData();
    }, 5000);

    return () => {
      if (channelRef.current && supabaseRef.current) {
        supabaseRef.current.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [examId, fetchExamData]);

  // ────────────────────────────────────────────────────────────
  // Elapsed Timer
  // ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!exam?.starts_at) return;

    const interval = setInterval(() => {
      setElapsedSeconds(differenceInSeconds(new Date(), new Date(exam.starts_at!)));
    }, 1000);

    setElapsedSeconds(differenceInSeconds(new Date(), new Date(exam.starts_at)));
    return () => clearInterval(interval);
  }, [exam?.starts_at]);

  // ────────────────────────────────────────────────────────────
  // Computed Stats
  // ────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const total = sessions.length;
    const online = sessions.filter((s) => s.isOnline).length;
    const submitted = sessions.filter(
      (s) => s.status === 'submitted' || s.status === 'graded' || s.status === 'timed_out'
    ).length;
    const inProgress = sessions.filter((s) => s.status === 'in_progress').length;
    const flagged = sessions.filter((s) => s.flagged).length;

    const totalQuestions = exam?.question_count ?? 0;
    const avgProgress =
      total > 0 && totalQuestions > 0
        ? Math.round(
            (sessions.reduce((sum, s) => sum + (s.answers_completed / totalQuestions) * 100, 0) /
              total)
          )
        : 0;

    const suspiciousCount = sessions.reduce((sum, s) => sum + s.suspiciousActivityCount, 0);

    const remainingSeconds = exam
      ? Math.max(
          0,
          exam.duration_minutes * 60 - elapsedSeconds
        )
      : 0;

    return {
      total,
      online,
      submitted,
      inProgress,
      flagged,
      avgProgress,
      suspiciousCount,
      remainingSeconds,
    };
  }, [sessions, exam, elapsedSeconds]);

  // ────────────────────────────────────────────────────────────
  // Filtered & Sorted Sessions
  // ────────────────────────────────────────────────────────────

  const filteredSessions = useMemo(() => {
    let list = [...sessions];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.profile?.full_name?.toLowerCase().includes(q) ||
          s.profile?.email?.toLowerCase().includes(q)
      );
    }

    // Filter
    switch (filter) {
      case 'in_progress':
        list = list.filter((s) => s.status === 'in_progress');
        break;
      case 'submitted':
        list = list.filter(
          (s) => s.status === 'submitted' || s.status === 'graded' || s.status === 'timed_out'
        );
        break;
      case 'not_started':
        list = list.filter((s) => s.status === 'not_started');
        break;
      case 'flagged':
        list = list.filter((s) => s.flagged);
        break;
    }

    // Sort
    list.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.profile?.full_name ?? '').localeCompare(b.profile?.full_name ?? '');
        case 'progress':
          return b.answers_completed - a.answers_completed;
        case 'status': {
          const order: SessionStatus[] = [
            'in_progress',
            'submitted',
            'timed_out',
            'graded',
            'not_started',
            'abandoned',
          ];
          return order.indexOf(a.status) - order.indexOf(b.status);
        }
        case 'last_activity': {
          const aTime = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
          const bTime = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
          return bTime - aTime;
        }
        default:
          return 0;
      }
    });

    return list;
  }, [sessions, searchQuery, filter, sortBy]);

  // ────────────────────────────────────────────────────────────
  // Admin Actions
  // ────────────────────────────────────────────────────────────

  const handleEndExam = useCallback(async () => {
    const supabase = createClientOrNull();
    if (!supabase) return;
    setActionLoading(true);
    try {
      // Mark exam as completed
      const { error } = await supabase
        .from('exams')
        .update({ status: 'completed', ends_at: new Date().toISOString() })
        .eq('id', examId);

      if (error) throw error;

      // Force-submit all in_progress sessions
      const { error: sessionsError } = await supabase
        .from('exam_sessions')
        .update({
          status: 'timed_out',
          submitted_at: new Date().toISOString(),
        })
        .eq('exam_id', examId)
        .in('status', ['in_progress', 'not_started']);

      if (sessionsError) throw sessionsError;

      toast.success('Exam ended for all students');
      setEndExamDialogOpen(false);
      fetchExamData();
    } catch {
      toast.error('Failed to end exam');
    } finally {
      setActionLoading(false);
    }
  }, [examId, fetchExamData]);

  const handleExtendTime = useCallback(async () => {
    const supabase = createClientOrNull();
    if (!supabase || !exam) return;
    setActionLoading(true);
    try {
      const newDuration = exam.duration_minutes + extendMinutes;
      const { error } = await supabase
        .from('exams')
        .update({ duration_minutes: newDuration })
        .eq('id', examId);

      if (error) throw error;

      toast.success(`Time extended by ${extendMinutes} minutes`);
      setExtendDialogOpen(false);
      fetchExamData();
    } catch {
      toast.error('Failed to extend time');
    } finally {
      setActionLoading(false);
    }
  }, [examId, exam, extendMinutes, fetchExamData]);

  const handleBroadcast = useCallback(async () => {
    const supabase = createClientOrNull();
    if (!supabase || !broadcastMessage.trim()) return;
    setActionLoading(true);
    try {
      // Insert notifications for all enrolled students
      const notifications = sessions.map((s) => ({
        user_id: s.student_id,
        title: 'Message from Proctor',
        body: broadcastMessage,
        type: 'exam_reminder',
        channel: 'in_app',
      }));

      const { error } = await supabase.from('notifications').insert(notifications);
      if (error) throw error;

      toast.success(`Message sent to ${sessions.length} students`);
      setBroadcastDialogOpen(false);
      setBroadcastMessage('');
    } catch {
      toast.error('Failed to broadcast message');
    } finally {
      setActionLoading(false);
    }
  }, [sessions, broadcastMessage]);

  const handleForceSubmit = useCallback(async () => {
    const supabase = createClientOrNull();
    if (!supabase || !selectedStudent) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('exam_sessions')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString(),
        })
        .eq('id', selectedStudent.id);

      if (error) throw error;

      toast.success(`${selectedStudent.profile?.full_name ?? 'Student'}'s exam force-submitted`);
      setForceSubmitDialogOpen(false);
      fetchExamData();
    } catch {
      toast.error('Failed to force submit');
    } finally {
      setActionLoading(false);
    }
  }, [selectedStudent, fetchExamData]);

  const handleFlagStudent = useCallback(async () => {
    const supabase = createClientOrNull();
    if (!supabase || !selectedStudent) return;
    setActionLoading(true);
    try {
      const newFlagged = !selectedStudent.flagged;
      const currentMeta = (selectedStudent.metadata as Record<string, unknown>) ?? {};
      const { error } = await supabase
        .from('exam_sessions')
        .update({
          metadata: { ...currentMeta, flagged: newFlagged },
        })
        .eq('id', selectedStudent.id);

      if (error) throw error;

      toast.success(
        newFlagged
          ? `${selectedStudent.profile?.full_name ?? 'Student'} flagged for review`
          : `Flag removed from ${selectedStudent.profile?.full_name ?? 'Student'}`
      );
      setFlagDialogOpen(false);
      fetchExamData();
    } catch {
      toast.error('Failed to update flag');
    } finally {
      setActionLoading(false);
    }
  }, [selectedStudent, fetchExamData]);

  const handleSendMessage = useCallback(async () => {
    const supabase = createClientOrNull();
    if (!supabase || !selectedStudent || !directMessage.trim()) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.from('notifications').insert({
        user_id: selectedStudent.student_id,
        title: 'Message from Proctor',
        body: directMessage,
        type: 'exam_reminder',
        channel: 'in_app',
      });

      if (error) throw error;

      toast.success('Message sent');
      setSendMessageDialogOpen(false);
      setDirectMessage('');
    } catch {
      toast.error('Failed to send message');
    } finally {
      setActionLoading(false);
    }
  }, [selectedStudent, directMessage]);

  const handleExportReport = useCallback(() => {
    const headers = [
      'Student Name',
      'Email',
      'Status',
      'Questions Answered',
      'Total Questions',
      'Progress %',
      'Time Remaining (s)',
      'Flagged',
      'Suspicious Activity',
      'Last Activity',
    ];
    const rows = sessions.map((s) => [
      s.profile?.full_name ?? 'Unknown',
      s.profile?.email ?? '',
      s.status,
      s.answers_completed,
      s.answers_total,
      s.answers_total > 0 ? Math.round((s.answers_completed / s.answers_total) * 100) : 0,
      s.time_remaining_seconds ?? '',
      s.flagged ? 'Yes' : 'No',
      s.suspiciousActivityCount,
      s.lastActivityAt ? format(new Date(s.lastActivityAt), 'yyyy-MM-dd HH:mm:ss') : '',
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `exam-${examId}-monitor-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported');
  }, [sessions, examId]);

  // ────────────────────────────────────────────────────────────
  // Charts Data
  // ────────────────────────────────────────────────────────────

  const progressDistribution = useMemo(() => {
    if (!exam?.question_count) return [];
    const buckets = [0, 0, 0, 0, 0]; // 0-20, 21-40, 41-60, 61-80, 81-100
    sessions.forEach((s) => {
      const pct = exam.question_count > 0 ? (s.answers_completed / exam.question_count) * 100 : 0;
      const idx = Math.min(Math.floor(pct / 20), 4);
      buckets[idx]++;
    });
    return buckets;
  }, [sessions, exam?.question_count]);

  const submissionTimeline = useMemo(() => {
    const submitted = sessions
      .filter((s) => s.submitted_at)
      .map((s) => new Date(s.submitted_at!).getTime())
      .sort((a, b) => a - b);

    if (submitted.length === 0 || !exam?.starts_at) return [];
    const start = new Date(exam.starts_at).getTime();
    const dur = exam.duration_minutes * 60 * 1000;
    const buckets = 6;
    const bucketSize = dur / buckets;
    const counts = new Array(buckets).fill(0);
    submitted.forEach((t) => {
      const idx = Math.min(Math.floor((t - start) / bucketSize), buckets - 1);
      if (idx >= 0) counts[idx]++;
    });
    return counts;
  }, [sessions, exam]);

  // ────────────────────────────────────────────────────────────
  // Format Helpers
  // ────────────────────────────────────────────────────────────

  const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  // ────────────────────────────────────────────────────────────
  // Loading State
  // ────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Connecting to exam monitor...</p>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center forge-ambient-bg">
        <Card className="max-w-md forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="relative">
              <div className="absolute -inset-3 rounded-full bg-destructive/10 blur-xl" />
              <XCircle className="relative size-10 text-destructive" />
            </div>
            <h2 className="text-lg font-semibold">Exam Not Found</h2>
            <p className="text-sm text-muted-foreground">
              The exam you are trying to monitor does not exist or you do not have access.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden -m-4 sm:-m-6 lg:-m-8 forge-ambient-bg">
        {/* ═══════════ Header ═══════════ */}
        <header className="flex items-center justify-between border-b border-border/30 forge-glass-elevated backdrop-blur-md px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-lg font-bold truncate sm:text-xl">{exam.title}</h1>
            <Badge className="gap-1.5 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 dark:bg-emerald-900/40 dark:text-green-400 border-0">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-green-50 dark:bg-green-950" />
              </span>
              Live
            </Badge>
            <Badge variant="outline" className="hidden sm:inline-flex gap-1">
              <Users className="size-3" />
              {stats.total}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className={cn(
                    'gap-1.5',
                    connectionStatus === 'connected' && 'border-emerald-300 text-green-700 dark:text-green-400 dark:border-emerald-700 dark:text-green-400',
                    connectionStatus === 'connecting' && 'border-amber-300 text-yellow-700 dark:text-yellow-400 dark:border-amber-700 dark:text-yellow-400',
                    connectionStatus === 'disconnected' && 'border-destructive/30 text-destructive dark:border-destructive dark:text-destructive'
                  )}
                >
                  {connectionStatus === 'connected' && <Wifi className="size-3" />}
                  {connectionStatus === 'connecting' && <Loader2 className="size-3 animate-spin" />}
                  {connectionStatus === 'disconnected' && <WifiOff className="size-3" />}
                  <span className="hidden sm:inline">
                    {connectionStatus === 'connected' && 'Connected'}
                    {connectionStatus === 'connecting' && 'Reconnecting...'}
                    {connectionStatus === 'disconnected' && 'Disconnected'}
                  </span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>Realtime connection status</TooltipContent>
            </Tooltip>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="size-3.5" />
              <span className="tabular-nums font-medium">{formatDuration(elapsedSeconds)}</span>
              <span className="hidden sm:inline text-xs">elapsed</span>
            </div>
          </div>
        </header>

        {/* ═══════════ Live Stats Bar ═══════════ */}
        <div className="border-b border-border/20 bg-secondary/30 backdrop-blur-sm px-4 py-2.5 sm:px-6">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Users className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">Enrolled</span>
              <span className="font-semibold tabular-nums">{stats.total}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-full bg-green-50 dark:bg-green-950" />
              </span>
              <span className="text-muted-foreground">Online</span>
              <span className="font-semibold tabular-nums">{stats.online}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="size-4 text-sky-500" />
              <span className="text-muted-foreground">Submitted</span>
              <span className="font-semibold tabular-nums">{stats.submitted}</span>
            </div>
            <div className="flex items-center gap-2 text-sm min-w-[140px]">
              <Activity className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">Avg Progress</span>
              <div className="flex items-center gap-2 flex-1">
                <Progress value={stats.avgProgress} className="h-2 flex-1" />
                <span className="font-semibold tabular-nums text-xs w-8 text-right">{stats.avgProgress}%</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">Remaining</span>
              <span className="font-semibold tabular-nums text-yellow-600 dark:text-yellow-400">
                {formatDuration(stats.remainingSeconds)}
              </span>
            </div>
            {stats.suspiciousCount > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="size-4 text-destructive" />
                <span className="text-muted-foreground">Suspicious</span>
                <span className="font-semibold tabular-nums text-destructive">
                  {stats.suspiciousCount}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ═══════════ Main Content: Student Grid + Detail Panel ═══════════ */}
        <div className="flex flex-1 overflow-hidden">
          {/* ── Left: Student Grid ── */}
          <div className="flex flex-1 flex-col overflow-hidden border-r">
            {/* Filters Row */}
            <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5 sm:px-6 forge-glass-surface backdrop-blur-sm">
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-sm bg-secondary/50 border-border/40 forge-input-glow"
                />
              </div>
              <Tabs
                value={filter}
                onValueChange={(v) => setFilter(v as MonitorFilter)}
                className="mr-auto"
              >
                <TabsList className="h-8">
                  <TabsTrigger value="all" className="text-xs px-2.5">All</TabsTrigger>
                  <TabsTrigger value="in_progress" className="text-xs px-2.5">Active</TabsTrigger>
                  <TabsTrigger value="submitted" className="text-xs px-2.5">Done</TabsTrigger>
                  <TabsTrigger value="flagged" className="text-xs px-2.5">
                    <Flag className="size-3 mr-1" />
                    Flagged
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">By Name</SelectItem>
                  <SelectItem value="progress">By Progress</SelectItem>
                  <SelectItem value="status">By Status</SelectItem>
                  <SelectItem value="last_activity">By Last Activity</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Student Cards Grid */}
            <ScrollArea className="flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 p-4 sm:p-6">
                <AnimatePresence mode="popLayout">
                  {filteredSessions.map((session) => {
                    const isSelected = selectedStudent?.id === session.id;
                    const progressPct =
                      session.answers_total > 0
                        ? Math.round((session.answers_completed / session.answers_total) * 100)
                        : 0;

                    return (
                      <motion.div
                        key={session.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Card
                          className={cn(
                            'cursor-pointer transition-all hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] hover:border-white/[0.06] forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all',
                            isSelected && 'ring-2 ring-primary shadow-md',
                            session.flagged && 'border-destructive/30 dark:border-red-800'
                          )}
                          onClick={() => setSelectedStudent(isSelected ? null : session)}
                        >
                          <CardContent className="p-3.5">
                            <div className="flex items-start gap-3">
                              {/* Avatar */}
                              <div className="relative shrink-0">
                                <Avatar className="size-9">
                                  <AvatarImage
                                    src={session.profile?.avatar_url ?? undefined}
                                    alt={session.profile?.full_name ?? ''}
                                  />
                                  <AvatarFallback className="text-xs">
                                    {getInitials(session.profile?.full_name)}
                                  </AvatarFallback>
                                </Avatar>
                                <span
                                  className={cn(
                                    'absolute -bottom-0.5 -right-0.5 flex size-3 rounded-full border-2 border-white dark:border-slate-900',
                                    session.isOnline ? 'bg-green-50 dark:bg-green-950' : 'bg-slate-300 dark:bg-slate-600'
                                  )}
                                />
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-sm font-medium truncate">
                                    {session.profile?.full_name ?? 'Unknown Student'}
                                  </span>
                                  <Badge
                                    className={cn(
                                      'text-[10px] px-1.5 py-0 shrink-0',
                                      statusBadgeColor(session.status, session.flagged)
                                    )}
                                  >
                                    {statusLabel(session.status, session.flagged)}
                                  </Badge>
                                </div>

                                <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>Q{session.currentQuestion + 1}</span>
                                  <span className="text-slate-300 dark:text-slate-700">|</span>
                                  <span className="tabular-nums">
                                    {session.answers_completed}/{session.answers_total}
                                  </span>
                                </div>

                                <Progress
                                  value={progressPct}
                                  className={cn(
                                    'mt-1.5 h-1.5',
                                    session.flagged && '[&>div]:bg-destructive/100'
                                  )}
                                />

                                <div className="mt-1.5 flex items-center justify-between">
                                  <span className="text-[10px] text-muted-foreground">
                                    {session.lastActivityAt
                                      ? formatDistanceToNow(new Date(session.lastActivityAt), {
                                          addSuffix: true,
                                        })
                                      : 'No activity'}
                                  </span>
                                  {session.suspiciousActivityCount > 0 && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="flex items-center gap-0.5 text-[10px] text-destructive">
                                          <AlertTriangle className="size-3" />
                                          {session.suspiciousActivityCount}
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {session.suspiciousActivityCount} suspicious event(s) detected
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {filteredSessions.length === 0 && (
                  <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <div className="relative mb-4">
                      <div className="absolute -inset-4 rounded-2xl bg-primary/8 blur-2xl" />
                      <Users className="relative size-8 opacity-50" />
                    </div>
                    <p className="text-sm">No students match your filter</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* ── Right: Detail Panel ── */}
          <AnimatePresence>
            {selectedStudent && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 360, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="hidden lg:flex flex-col overflow-hidden border-l forge-glass-surface shrink-0"
              >
                <ScrollArea className="flex-1">
                  <div className="p-4 space-y-4">
                    {/* Student Header */}
                    <div className="flex items-start gap-3">
                      <Avatar className="size-12">
                        <AvatarImage
                          src={selectedStudent.profile?.avatar_url ?? undefined}
                          alt={selectedStudent.profile?.full_name ?? ''}
                        />
                        <AvatarFallback>
                          {getInitials(selectedStudent.profile?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">
                          {selectedStudent.profile?.full_name ?? 'Unknown Student'}
                        </h3>
                        <p className="text-xs text-muted-foreground truncate">
                          {selectedStudent.profile?.email ?? ''}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge
                            className={cn(
                              'text-[10px] px-1.5 py-0',
                              statusBadgeColor(selectedStudent.status, selectedStudent.flagged)
                            )}
                          >
                            {statusLabel(selectedStudent.status, selectedStudent.flagged)}
                          </Badge>
                          <span
                            className={cn(
                              'flex items-center gap-1 text-[10px]',
                              selectedStudent.isOnline
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-slate-500'
                            )}
                          >
                            <span
                              className={cn(
                                'size-1.5 rounded-full',
                                selectedStudent.isOnline ? 'bg-green-50 dark:bg-green-950' : 'bg-slate-400'
                              )}
                            />
                            {selectedStudent.isOnline ? 'Online' : 'Offline'}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 shrink-0"
                        onClick={() => setSelectedStudent(null)}
                      >
                        <XCircle className="size-4" />
                      </Button>
                    </div>

                    <Separator />

                    {/* Progress Details */}
                    <div className="space-y-2.5">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Progress
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="space-y-0.5">
                          <span className="text-xs text-muted-foreground">Current Question</span>
                          <p className="font-medium tabular-nums">
                            Q{selectedStudent.currentQuestion + 1}
                          </p>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-xs text-muted-foreground">Answered</span>
                          <p className="font-medium tabular-nums">
                            {selectedStudent.answers_completed}/{selectedStudent.answers_total}
                          </p>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-xs text-muted-foreground">Time Spent</span>
                          <p className="font-medium tabular-nums">
                            {selectedStudent.started_at
                              ? formatDuration(
                                  differenceInSeconds(new Date(), new Date(selectedStudent.started_at))
                                )
                              : '—'}
                          </p>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-xs text-muted-foreground">Time Remaining</span>
                          <p className="font-medium tabular-nums">
                            {selectedStudent.time_remaining_seconds != null
                              ? formatDuration(selectedStudent.time_remaining_seconds)
                              : '—'}
                          </p>
                        </div>
                      </div>
                      <Progress
                        value={
                          selectedStudent.answers_total > 0
                            ? Math.round(
                                (selectedStudent.answers_completed / selectedStudent.answers_total) * 100
                              )
                            : 0
                        }
                        className="h-2"
                      />
                    </div>

                    <Separator />

                    {/* Activity Log */}
                    <div className="space-y-2.5">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Activity Log
                      </h4>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {(selectedStudent.activityLog?.length ?? 0) > 0 ? (
                          selectedStudent.activityLog
                            ?.sort(
                              (a, b) =>
                                new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                            )
                            .slice(0, 20)
                            .map((entry) => (
                              <div
                                key={entry.id}
                                className="flex items-start gap-2 text-xs"
                              >
                                <span className="text-muted-foreground shrink-0 tabular-nums">
                                  {format(new Date(entry.timestamp), 'HH:mm:ss')}
                                </span>
                                <span
                                  className={cn(
                                    entry.type === 'tab_switch' && 'text-destructive',
                                    entry.type === 'flag' && 'text-destructive',
                                    entry.type === 'answer' && 'text-green-600 dark:text-green-400',
                                    entry.type === 'submit' && 'text-sky-600 dark:text-sky-400'
                                  )}
                                >
                                  {entry.description}
                                </span>
                              </div>
                            ))
                        ) : (
                          <p className="text-xs text-muted-foreground">No activity recorded yet</p>
                        )}
                      </div>
                    </div>

                    <Separator />

                    {/* Actions */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Actions
                      </h4>
                      <div className="grid grid-cols-1 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 text-xs"
                          onClick={() => setSendMessageDialogOpen(true)}
                        >
                          <Send className="size-3.5" />
                          Send Message
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 text-xs"
                          onClick={() => setFlagDialogOpen(true)}
                        >
                          <Flag className="size-3.5" />
                          {selectedStudent.flagged ? 'Remove Flag' : 'Flag Student'}
                        </Button>
                        {selectedStudent.status === 'in_progress' && (
                          <Button
                            variant="destructive"
                            size="sm"
                            className="gap-2 text-xs"
                            onClick={() => setForceSubmitDialogOpen(true)}
                          >
                            <Shield className="size-3.5" />
                            Force Submit
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ═══════════ Collapsible Charts ═══════════ */}
        <div className="border-t">
          <button
            className="flex w-full items-center justify-between px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors sm:px-6"
            onClick={() => setChartsExpanded(!chartsExpanded)}
          >
            <span className="flex items-center gap-1.5">
              <Activity className="size-3.5" />
              Analytics & Charts
            </span>
            {chartsExpanded ? (
              <ChevronUp className="size-3.5" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
          </button>
          <AnimatePresence>
            {chartsExpanded && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 160 }}
                exit={{ height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-4 pb-3 sm:px-6">
                  {/* Progress Distribution */}
                  <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all shadow-none">
                    <CardHeader className="pb-1 pt-2 px-3">
                      <CardTitle className="text-xs">Progress Distribution</CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-2 pt-0">
                      <div className="flex items-end gap-1 h-16">
                        {progressDistribution.map((count, i) => {
                          const maxCount = Math.max(...progressDistribution, 1);
                          const pct = (count / maxCount) * 100;
                          return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                              <span className="text-[9px] tabular-nums text-muted-foreground">
                                {count}
                              </span>
                              <div
                                className="w-full rounded-t bg-emerald-400/70 dark:bg-emerald-600/60 transition-all"
                                style={{ height: `${Math.max(pct, 4)}%` }}
                              />
                              <span className="text-[8px] text-muted-foreground">
                                {i * 20}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Submission Timeline */}
                  <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all shadow-none">
                    <CardHeader className="pb-1 pt-2 px-3">
                      <CardTitle className="text-xs">Submissions Over Time</CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-2 pt-0">
                      {submissionTimeline.length > 0 ? (
                        <div className="flex items-end gap-1 h-16">
                          {submissionTimeline.map((count, i) => {
                            const maxCount = Math.max(...submissionTimeline, 1);
                            const pct = (count / maxCount) * 100;
                            const bucketMin = Math.round(
                              (i / submissionTimeline.length) * (exam?.duration_minutes ?? 0)
                            );
                            return (
                              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                                <span className="text-[9px] tabular-nums text-muted-foreground">
                                  {count}
                                </span>
                                <div
                                  className="w-full rounded-t bg-sky-400/70 dark:bg-sky-600/60 transition-all"
                                  style={{ height: `${Math.max(pct, 4)}%` }}
                                />
                                <span className="text-[8px] text-muted-foreground">
                                  {bucketMin}m
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-[10px] text-muted-foreground h-16 flex items-center justify-center">
                          No submissions yet
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Suspicious Activity Summary */}
                  <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all shadow-none">
                    <CardHeader className="pb-1 pt-2 px-3">
                      <CardTitle className="text-xs">Suspicious Activity</CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-2 pt-0">
                      <div className="h-16 flex flex-col items-center justify-center gap-1">
                        {stats.suspiciousCount > 0 ? (
                          <>
                            <AlertTriangle className="size-5 text-destructive" />
                            <span className="text-sm font-semibold text-destructive tabular-nums">
                              {stats.suspiciousCount} event(s)
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              across {sessions.filter((s) => s.suspiciousActivityCount > 0).length} student(s)
                            </span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="size-5 text-green-600 dark:text-green-400" />
                            <span className="text-xs text-green-600 dark:text-green-400">
                              All clear
                            </span>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ═══════════ Actions Bar ═══════════ */}
        <div className="border-t bg-secondary/80 backdrop-blur-sm px-4 py-2.5 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5"
              onClick={() => setEndExamDialogOpen(true)}
            >
              <Shield className="size-3.5" />
              <span className="hidden sm:inline">End Exam for All</span>
              <span className="sm:hidden">End All</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setExtendDialogOpen(true)}
            >
              <Plus className="size-3.5" />
              <span className="hidden sm:inline">Extend Time</span>
              <span className="sm:hidden">Extend</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setBroadcastDialogOpen(true)}
            >
              <MessageSquare className="size-3.5" />
              <span className="hidden sm:inline">Broadcast Message</span>
              <span className="sm:hidden">Broadcast</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleExportReport}
            >
              <Download className="size-3.5" />
              <span className="hidden sm:inline">Export Report</span>
              <span className="sm:hidden">Export</span>
            </Button>
            <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
              <Radio className="size-3 animate-pulse text-green-600 dark:text-green-400" />
              <span>Monitoring {stats.total} student(s)</span>
            </div>
          </div>
        </div>

        {/* ═══════════ Dialogs ═══════════ */}

        {/* End Exam Confirmation */}
        <AlertDialog open={endExamDialogOpen} onOpenChange={setEndExamDialogOpen}>
          <AlertDialogContent className="forge-glass-elevated border-white/[0.04]">
            <AlertDialogHeader>
              <AlertDialogTitle>End Exam for All Students?</AlertDialogTitle>
              <AlertDialogDescription>
                This will immediately end the exam for all students. Any in-progress sessions will
                be auto-submitted. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleEndExam();
                }}
                disabled={actionLoading}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {actionLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
                End Exam
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Extend Time Dialog */}
        <Dialog open={extendDialogOpen} onOpenChange={setExtendDialogOpen}>
          <DialogContent className="forge-glass-elevated border-white/[0.04]">
            <DialogHeader>
              <DialogTitle>Extend Exam Time</DialogTitle>
              <DialogDescription>
                Add extra minutes to the exam duration. All active students will receive the
                additional time.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-wrap gap-2 py-4">
              {[5, 10, 15, 30].map((mins) => (
                <Button
                  key={mins}
                  variant={extendMinutes === mins ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setExtendMinutes(mins)}
                  className="gap-1"
                >
                  <Plus className="size-3" />
                  {mins} min
                </Button>
              ))}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setExtendDialogOpen(false)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button onClick={handleExtendTime} disabled={actionLoading}>
                {actionLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
                Extend by {extendMinutes} minutes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Broadcast Message Dialog */}
        <Dialog open={broadcastDialogOpen} onOpenChange={setBroadcastDialogOpen}>
          <DialogContent className="forge-glass-elevated border-white/[0.04]">
            <DialogHeader>
              <DialogTitle>Broadcast Message</DialogTitle>
              <DialogDescription>
                Send a notification to all {sessions.length} enrolled students.
              </DialogDescription>
            </DialogHeader>
            <textarea
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px] resize-none"
              placeholder="Type your message..."
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
            />
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setBroadcastDialogOpen(false);
                  setBroadcastMessage('');
                }}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleBroadcast}
                disabled={actionLoading || !broadcastMessage.trim()}
              >
                {actionLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
                <Send className="mr-2 size-4" />
                Send to All
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Force Submit Confirmation */}
        <AlertDialog open={forceSubmitDialogOpen} onOpenChange={setForceSubmitDialogOpen}>
          <AlertDialogContent className="forge-glass-elevated border-white/[0.04]">
            <AlertDialogHeader>
              <AlertDialogTitle>Force Submit Exam?</AlertDialogTitle>
              <AlertDialogDescription>
                This will immediately submit{' '}
                <strong>{selectedStudent?.profile?.full_name ?? 'this student'}</strong>
                &rsquo;s exam with their current answers. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleForceSubmit();
                }}
                disabled={actionLoading}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {actionLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
                Force Submit
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Flag Student Confirmation */}
        <AlertDialog open={flagDialogOpen} onOpenChange={setFlagDialogOpen}>
          <AlertDialogContent className="forge-glass-elevated border-white/[0.04]">
            <AlertDialogHeader>
              <AlertDialogTitle>
                {selectedStudent?.flagged ? 'Remove Flag' : 'Flag Student for Review'}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                {selectedStudent?.flagged
                  ? 'This will remove the flag from this student\'s session.'
                  : 'This will mark this student\'s session for proctor review. They will still be able to continue the exam.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleFlagStudent();
                }}
                disabled={actionLoading}
              >
                {actionLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
                {selectedStudent?.flagged ? 'Remove Flag' : 'Flag Student'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Send Direct Message Dialog */}
        <Dialog open={sendMessageDialogOpen} onOpenChange={setSendMessageDialogOpen}>
          <DialogContent className="forge-glass-elevated border-white/[0.04]">
            <DialogHeader>
              <DialogTitle>Send Message to Student</DialogTitle>
              <DialogDescription>
                Send a direct notification to{' '}
                <strong>{selectedStudent?.profile?.full_name ?? 'this student'}</strong>.
              </DialogDescription>
            </DialogHeader>
            <textarea
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px] resize-none"
              placeholder="Type your message..."
              value={directMessage}
              onChange={(e) => setDirectMessage(e.target.value)}
            />
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setSendMessageDialogOpen(false);
                  setDirectMessage('');
                }}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendMessage}
                disabled={actionLoading || !directMessage.trim()}
              >
                {actionLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
                <Send className="mr-2 size-4" />
                Send
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
