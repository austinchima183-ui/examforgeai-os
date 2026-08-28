'use client';

// ============================================================================
// ExamForge AI — AI Copilot Component
// ============================================================================
// A persistent, role-aware, context-aware AI assistant panel that appears
// on every authenticated page. Triggered by a floating button (like GitHub
// Copilot / Notion AI) with Cmd/Ctrl+K keyboard shortcut.
// ============================================================================

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Send,
  X,
  Bot,
  User,
  Loader2,
  MessageSquare,
  Lightbulb,
  Brain,
  GraduationCap,
  BookOpen,
  School,
  Shield,
} from 'lucide-react';

import { useAuthStore } from '@/lib/stores/auth-store';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { ForgeAnvil } from '@/components/marketing/design-system/forge-icons';
import type { UserRole } from '@/lib/types';

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
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
}

interface AiCopilotProps {
  /** External open state (controlled by provider) */
  isOpen?: boolean;
  /** External open handler */
  onOpenChange?: (open: boolean) => void;
}

// ──────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────

const STORAGE_KEY_PREFIX = 'examforge-ai-copilot-';
const MAX_STORED_MESSAGES = 50;

const ROLE_LABELS: Record<string, string> = {
  student: 'Student',
  teacher: 'Teacher',
  school_admin: 'School Admin',
  super_admin: 'Super Admin',
  parent: 'Parent',
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
  student: <GraduationCap className="size-3.5" />,
  teacher: <BookOpen className="size-3.5" />,
  school_admin: <School className="size-3.5" />,
  super_admin: <Shield className="size-3.5" />,
  parent: <User className="size-3.5" />,
};

const QUICK_ACTIONS: Record<string, QuickAction[]> = {
  student: [
    { label: 'Explain a concept', icon: <Lightbulb className="size-4" />, prompt: 'Explain a concept I\'m struggling with' },
    { label: 'Practice questions', icon: <Brain className="size-4" />, prompt: 'Generate practice questions for me' },
    { label: 'Study plan', icon: <BookOpen className="size-4" />, prompt: 'Help me create a study plan' },
    { label: 'Review my answers', icon: <MessageSquare className="size-4" />, prompt: 'Review my recent answers and give feedback' },
  ],
  teacher: [
    { label: 'Generate questions', icon: <Brain className="size-4" />, prompt: 'Generate exam questions on a topic' },
    { label: 'Create lesson plan', icon: <BookOpen className="size-4" />, prompt: 'Help me create a lesson plan' },
    { label: 'Write report comments', icon: <MessageSquare className="size-4" />, prompt: 'Write student report comments' },
    { label: 'Analyze performance', icon: <Sparkles className="size-4" />, prompt: 'Analyze my class performance data' },
  ],
  school_admin: [
    { label: 'Performance summary', icon: <Sparkles className="size-4" />, prompt: 'Give me a school performance summary' },
    { label: 'Generate report', icon: <BookOpen className="size-4" />, prompt: 'Generate a school performance report' },
    { label: 'Find at-risk students', icon: <GraduationCap className="size-4" />, prompt: 'Identify at-risk students based on data' },
    { label: 'Suggest improvements', icon: <Lightbulb className="size-4" />, prompt: 'Suggest improvements for our school' },
  ],
  super_admin: [
    { label: 'Platform health', icon: <Shield className="size-4" />, prompt: 'Show platform health summary' },
    { label: 'Revenue analysis', icon: <Sparkles className="size-4" />, prompt: 'Analyze revenue trends' },
    { label: 'Usage insights', icon: <Brain className="size-4" />, prompt: 'Give me usage insights across schools' },
    { label: 'Anomaly detection', icon: <MessageSquare className="size-4" />, prompt: 'Detect any anomalies or unusual patterns' },
  ],
  parent: [
    { label: 'Child performance', icon: <GraduationCap className="size-4" />, prompt: 'Show my child\'s performance summary' },
    { label: 'Study recommendations', icon: <Lightbulb className="size-4" />, prompt: 'Recommend study areas for my child' },
    { label: 'Upcoming exams', icon: <BookOpen className="size-4" />, prompt: 'What exams are coming up?' },
    { label: 'Progress report', icon: <MessageSquare className="size-4" />, prompt: 'Generate a progress report' },
  ],
};

const SUGGESTED_PROMPTS: Record<string, string[]> = {
  student: [
    'How do I solve quadratic equations?',
    'Explain photosynthesis in simple terms',
    'Tips for managing exam anxiety',
  ],
  teacher: [
    'Create a rubric for essay grading',
    'Differentiate instruction for mixed abilities',
    'Best practices for formative assessment',
  ],
  school_admin: [
    'How can we improve student retention?',
    'What metrics should we track monthly?',
    'Analyze teacher workload distribution',
  ],
  super_admin: [
    'What\'s the platform growth trend?',
    'Identify underperforming schools',
    'Suggest pricing strategy improvements',
  ],
  parent: [
    'How can I help my child study better?',
    'What subjects need more attention?',
    'How to interpret the latest test scores',
  ],
};

// ──────────────────────────────────────────────────────────────
// Page Name Resolver
// ──────────────────────────────────────────────────────────────

function getPageName(pathname: string): string {
  if (!pathname || pathname === '/') return 'Home';
  const segments = pathname.split('/').filter(Boolean);
  const last = segments[segments.length - 1] || 'Home';
  const nameMap: Record<string, string> = {
    dashboard: 'Dashboard',
    exams: 'Exams',
    'question-bank': 'Question Bank',
    students: 'Students',
    teachers: 'Teachers',
    schools: 'Schools',
    analytics: 'Analytics',
    reports: 'Reports',
    settings: 'Settings',
    profile: 'Profile',
    billing: 'Billing',
    marketplace: 'Marketplace',
    cbt: 'CBT',
    notifications: 'Notifications',
    results: 'Results',
    search: 'Search',
    parents: 'Parents',
  };
  return nameMap[last] || last.charAt(0).toUpperCase() + last.slice(1);
}

// ──────────────────────────────────────────────────────────────
// LocalStorage Helpers
// ──────────────────────────────────────────────────────────────

function getStoredMessages(userId: string): ChatMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`);
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
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(toStore));
  } catch {
    // Storage full or unavailable — silently fail
  }
}

function clearStoredMessages(userId: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${userId}`);
  } catch {
    // Silently fail
  }
}

// ──────────────────────────────────────────────────────────────
// Typing Indicator Component
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
// Chat Message Bubble
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
          <Bot className="size-4" />
        )}
      </div>

      {/* Message Content */}
      <div
        className={cn(
          'max-w-[80%] rounded-xl px-3 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'rounded-tr-none bg-primary/10 text-foreground shadow-sm'
            : 'rounded-tl-none border-l-2 border-l-cyan-400/50 bg-white/[0.04] text-card-foreground shadow-sm backdrop-blur-sm forge-glass-surface'
        )}
      >
        {message.content}
      </div>
    </motion.div>
  );
}

// ──────────────────────────────────────────────────────────────
// Main AiCopilot Component
// ──────────────────────────────────────────────────────────────

export function AiCopilot({ isOpen: externalIsOpen, onOpenChange }: AiCopilotProps = {}) {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const { user, role } = useAuthStore();

  // ── State ──
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalOpen;
  const setOpen = useCallback(
    (open: boolean) => {
      if (onOpenChange) {
        onOpenChange(open);
      } else {
        setInternalOpen(open);
      }
    },
    [onOpenChange]
  );

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [suggestionIndex, setSuggestionIndex] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ── Derived values ──
  const userId = user?.id || 'anonymous';
  const activeRole = role || 'student';
  const pageName = getPageName(pathname);
  const quickActions = QUICK_ACTIONS[activeRole] || QUICK_ACTIONS.student;
  const suggestedPrompts = SUGGESTED_PROMPTS[activeRole] || SUGGESTED_PROMPTS.student;

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

  // ── Rotate suggestions ──
  useEffect(() => {
    const interval = setInterval(() => {
      setSuggestionIndex((prev) => (prev + 1) % suggestedPrompts.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [suggestedPrompts.length]);

  // ── Keyboard shortcut: Cmd/Ctrl+K ──
  useEffect(() => {
    function handleKeyDown(e: globalThis.KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        // Don't intercept if user is in a search/command palette
        const target = e.target as HTMLElement;
        if (target.closest('[cmdk-root]') || target.closest('[data-command-input]')) return;
        e.preventDefault();
        setOpen(!isOpen);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setOpen]);

  // ── Build system context for AI ──
  const buildSystemContext = useCallback(() => {
    return {
      role: activeRole,
      page: pageName,
      pathname,
      userName: user?.fullName || 'User',
    };
  }, [activeRole, pageName, pathname, user?.fullName]);

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
        const finalContent = accumulated.trim() || 'I apologize, but I wasn\'t able to generate a response. Please try again.';
        const assistantMessage: ChatMessage = {
          id: `msg-${Date.now()}-assistant`,
          role: 'assistant',
          content: finalContent,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          // User aborted — ignore
          return;
        }
        const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
        setError(errorMessage);

        // Add error as assistant message so user can see it
        const errorMsg: ChatMessage = {
          id: `msg-${Date.now()}-error`,
          role: 'assistant',
          content: `I'm sorry, I encountered an error: ${errorMessage}. Please try again.`,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsStreaming(false);
        setStreamingContent('');
        abortControllerRef.current = null;
      }
    },
    [isStreaming, messages, buildSystemContext]
  );

  // ── Listen for external send events from AiCopilotProvider ──
  useEffect(() => {
    function handleCopilotSend(e: Event) {
      const customEvent = e as CustomEvent<{ message: string }>;
      if (customEvent.detail?.message) {
        sendMessage(customEvent.detail.message);
      }
    }
    window.addEventListener('examforge:copilot:send', handleCopilotSend);
    return () => window.removeEventListener('examforge:copilot:send', handleCopilotSend);
  }, [sendMessage]);

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
    (e: KeyboardEvent<HTMLInputElement>) => {
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
    (prompt: string) => {
      sendMessage(prompt);
    },
    [sendMessage]
  );

  // ── Suggested prompt click ──
  const handleSuggestedPrompt = useCallback(
    (prompt: string) => {
      sendMessage(prompt);
    },
    [sendMessage]
  );

  // ──────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Floating Trigger Button ── */}
      <AnimatePresence>
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.5 }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setOpen(true)}
          className={cn(
            'fixed bottom-6 right-6 z-40 flex size-14 items-center justify-center rounded-full',
            'shadow-lg shadow-primary/25 transition-all duration-300',
            'bg-gradient-to-br from-primary via-primary to-cyan-600',
            'text-white hover:shadow-xl hover:shadow-primary/40',
            'forge-glow neural-glow',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
            'group'
          )}
          aria-label="Open AI Copilot"
          aria-keyshortcuts="Meta+K"
        >
          {/* Pulse ring */}
          <span className="absolute inset-0 rounded-full animate-pulse-glow bg-primary/30" />

          <ForgeAnvil size={24} className="relative z-10" />

          {/* AI Badge */}
          <span
            className={cn(
              'absolute -top-1 -right-1 z-10 flex size-5 items-center justify-center',
              'rounded-full bg-cyan-400 text-[9px] font-bold text-[#0A0A0A]',
              'shadow-sm'
            )}
          >
            AI
          </span>
          {/* Neural glow border */}
          <span className="absolute inset-0 rounded-full border border-primary/30 neural-glow" aria-hidden="true" />
        </motion.button>
      </AnimatePresence>

      {/* ── Slide-Over Panel ── */}
      <Sheet open={isOpen} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className={cn(
            'flex flex-col gap-0 p-0 forge-glass-elevated neural-glow border-border/30',
            isMobile ? 'w-full' : 'w-full sm:max-w-[400px]'
          )}
        >
          {/* Header */}
          <SheetHeader className="border-b border-border/30 bg-white/[0.02] px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-cyan-500 text-white shadow-sm shadow-primary/20 forge-glow">
                  <Sparkles className="size-4" />
                </div>
                <div>
                  <SheetTitle className="text-base font-semibold forge-gradient-text">AI Copilot</SheetTitle>
                  <SheetDescription className="text-xs text-muted-foreground">
                    Your intelligent exam assistant
                  </SheetDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className="gap-1 text-[10px] font-medium"
                >
                  {ROLE_ICONS[activeRole]}
                  {ROLE_LABELS[activeRole] || activeRole}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  onClick={() => setOpen(false)}
                  aria-label="Close AI Copilot"
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>
          </SheetHeader>

          {/* Context Bar */}
          <div className="flex items-center gap-2 border-b border-border/30 bg-white/[0.02] px-4 py-2">
            <Brain className="size-3 text-cyan-400" />
            <span className="text-xs text-muted-foreground">Context:</span>
            <Badge variant="outline" className="text-[10px] gap-1 border-border/50">
              <BookOpen className="size-3" />
              {pageName}
            </Badge>
            <Badge variant="outline" className="text-[10px] gap-1 border-border/50">
              {ROLE_ICONS[activeRole]}
              {ROLE_LABELS[activeRole] || activeRole}
            </Badge>
          </div>

          {/* Main Content Area */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Quick Actions (only show when conversation is empty) */}
            {messages.length === 0 && !isStreaming && (
              <div className="border-b border-border/30 px-4 py-3">
                <p className="mb-2.5 text-xs font-medium text-muted-foreground">
                  Quick actions
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {quickActions.map((action) => (
                    <Button
                      key={action.label}
                      variant="outline"
                      size="sm"
                      className="h-auto flex-col gap-1.5 py-2.5 text-xs bg-white/[0.04] border-white/[0.06] hover:border-cyan-400/30 hover:shadow-md hover:shadow-cyan-400/5 transition-all duration-200"
                      onClick={() => handleQuickAction(action.prompt)}
                    >
                      <span className="text-cyan-400">
                        {action.icon}
                      </span>
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Chat Messages */}
            <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef}>
              <div className="flex flex-col gap-3">
                {messages.length === 0 && !isStreaming && (
                  <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                      className="flex size-14 items-center justify-center rounded-2xl bg-primary/5 forge-glow"
                    >
                      <ForgeAnvil size={28} className="text-primary" />
                    </motion.div>
                    <div>
                      <p className="text-sm font-medium text-foreground forge-gradient-text">
                        How can I help you?
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Ask anything about exams, studying, or teaching
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
                      <div className="max-w-[80%] rounded-xl rounded-tl-none border-l-2 border-l-cyan-400/50 bg-white/[0.04] px-3 py-2.5 text-sm leading-relaxed text-card-foreground shadow-sm backdrop-blur-sm forge-glass-surface">
                        {streamingContent}
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

            {/* Suggested Prompts (rotate) */}
            {messages.length === 0 && !isStreaming && (
              <div className="border-t border-border/30 px-4 py-2">
                <div className="flex items-center gap-2">
                  <Lightbulb className="size-3 text-amber-400" />
                  <button
                    onClick={() =>
                      handleSuggestedPrompt(suggestedPrompts[suggestionIndex])
                    }
                    className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors truncate text-left"
                  >
                    {suggestedPrompts[suggestionIndex]}
                  </button>
                </div>
              </div>
            )}

            {/* Clear conversation button (when messages exist) */}
            {messages.length > 0 && !isStreaming && (
              <div className="flex justify-end border-t border-border/30 px-4 py-1.5">
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

            {/* Input Area */}
            <div className="border-t border-border/30 bg-white/[0.02] px-4 py-3">
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isStreaming ? 'Waiting for response...' : 'Ask anything...'
                  }
                  disabled={isStreaming}
                  className="flex-1 text-sm forge-input-glow bg-muted/30 border-border/50 focus:border-cyan-400/40"
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
                <kbd className="rounded border bg-muted px-1 font-mono text-[9px]">
                  {typeof navigator !== 'undefined' && navigator.platform?.includes('Mac')
                    ? '⌘'
                    : 'Ctrl'}
                  +K
                </kbd>{' '}
                to toggle &middot; AI responses may not always be accurate
              </p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export default AiCopilot;
