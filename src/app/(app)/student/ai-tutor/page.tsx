'use client'
import { apiFetch } from '@/lib/api/client-fetch'

// ============================================================================
// ExamForge AI — Student AI Tutor Page
// ============================================================================
// The flagship student-facing feature: a full AI Tutor experience with
// four modes — Chat, Practice, Explain, and Study Plan — making ExamForge
// feel like the world's first AI-powered Education Operating System.
// ============================================================================

import { useState, useRef, useEffect, useCallback, type FormEvent } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { ROUTES } from '@/lib/constants/routes'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'

// ── shadcn/ui ──
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'

// ── Lucide Icons ──
import {
  Brain,
  MessageSquare,
  BookOpen,
  Target,
  Calendar,
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  Sparkles,
  GraduationCap,
  Clock,
  ArrowRight,
  Lightbulb,
  RotateCcw,
  ChevronRight,
} from 'lucide-react'

// ── Framer Motion ──
import { AnimatePresence, motion } from 'framer-motion'

// ── react-markdown ──
import ReactMarkdown from 'react-markdown'

// ============================================================================
// Types
// ============================================================================

type TutorMode = 'chat' | 'practice' | 'explain' | 'study-plan'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
}

interface PracticeQuestion {
  question: string
  options: string[]
  correctAnswer: string
  explanation: string
}

interface PracticeState {
  subject: string
  difficulty: string
  currentQuestion: PracticeQuestion | null
  userAnswer: string
  isCorrect: boolean | null
  score: number
  total: number
  streak: number
  showFeedback: boolean
  isActive: boolean
}

interface ExplainState {
  topic: string
  explanation: string
  isLoading: boolean
}

interface StudyPlanState {
  examDate: string
  subjects: string
  hoursPerDay: string
  plan: string
  isLoading: boolean
}

// ============================================================================
// Constants
// ============================================================================

const SYSTEM_PROMPT = `You are ExamForge AI Tutor, an expert educational AI assistant for Nigerian secondary school students. Help with any subject, explain concepts step by step, solve problems, and provide study strategies. Use clear, simple language. When solving math, show all steps. Format your responses using markdown when appropriate — use **bold** for emphasis, bullet points with -, numbered lists, and code blocks with \`\`\` for math or code.`

const STARTER_PROMPTS = [
  'Explain photosynthesis',
  'Solve: 2x² + 5x - 3 = 0',
  'What are the causes of WW1?',
  'Help me understand Newton\'s laws',
]

const SUBJECTS = [
  'Mathematics',
  'English',
  'Physics',
  'Chemistry',
  'Biology',
  'Government',
  'Economics',
  'Literature',
  'History',
  'Geography',
]

const DIFFICULTIES = ['Easy', 'Medium', 'Hard']

const TOPIC_CARDS = [
  { subject: 'Mathematics', topics: ['Quadratic Equations', 'Trigonometry', 'Differentiation'] },
  { subject: 'Physics', topics: ['Newton\'s Laws', 'Electricity', 'Waves & Sound'] },
  { subject: 'Chemistry', topics: ['Organic Chemistry', 'Chemical Bonding', 'Acids & Bases'] },
  { subject: 'Biology', topics: ['Photosynthesis', 'Cell Division', 'Genetics'] },
  { subject: 'English', topics: ['Essay Writing', 'Comprehension', 'Figures of Speech'] },
  { subject: 'Government', topics: ['The Constitution', 'Separation of Powers', 'Political Parties'] },
]

const SUBJECT_COLORS: Record<string, string> = {
  Mathematics: 'bg-rose-500/15 text-rose-700 dark:text-rose-400',
  English: 'bg-yellow-50 dark:bg-yellow-950/15 text-yellow-700 dark:text-yellow-400',
  Physics: 'bg-sky-500/15 text-sky-700 dark:text-sky-400',
  Chemistry: 'bg-green-50 dark:bg-green-950/15 text-green-600 dark:text-green-400',
  Biology: 'bg-lime-500/15 text-lime-700 dark:text-lime-400',
  Government: 'bg-violet-500/15 text-violet-700 dark:text-violet-400',
  Economics: 'bg-orange-500/15 text-orange-700 dark:text-orange-400',
  Literature: 'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-400',
  History: 'bg-teal-500/15 text-teal-700 dark:text-teal-400',
  Geography: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400',
}

const CHAT_STORAGE_KEY = 'examforge-ai-tutor-chat'

// ============================================================================
// Helper: Generate unique IDs
// ============================================================================

function uid(): string {
  return `${Date.now()}-${crypto.randomUUID().slice(0, 9)}`
}

// ============================================================================
// Helper: Streaming fetch for AI chat
// ============================================================================

async function streamAIResponse(
  messages: { role: string; content: string }[],
  onChunk: (chunk: string) => void,
  onDone: () => void,
  onError: (err: string) => void,
  abortSignal?: AbortSignal,
): Promise<void> {
  try {
    const res = await apiFetch('/api/ai/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, stream: true }),
      signal: abortSignal,
    })

    if (!res.ok) {
      onError(`Request failed (${res.status})`)
      return
    }

    const reader = res.body?.getReader()
    if (!reader) {
      onError('No stream available')
      return
    }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      if (abortSignal?.aborted) break
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim()
          if (data === '[DONE]') {
            onDone()
            return
          }
          try {
            const parsed = JSON.parse(data)
            const content = parsed.choices?.[0]?.delta?.content ?? parsed.content ?? ''
            if (content) onChunk(content)
          } catch {
            // Non-JSON chunk — treat as raw text
            if (data) onChunk(data)
          }
        }
      }
    }

    onDone()
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return
    onError(err instanceof Error ? err.message : 'Stream failed')
  }
}

// ============================================================================
// Helper: Completion fetch for AI
// ============================================================================

async function completeAI(prompt: string): Promise<string> {
  const res = await apiFetch('/api/ai/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  })

  if (!res.ok) {
    throw new Error(`Request failed (${res.status})`)
  }

  const data = await res.json()
  return data.content ?? data.text ?? data.message ?? JSON.stringify(data)
}

// ============================================================================
// Component: Markdown Renderer
// ============================================================================

function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-semibold prose-pre:bg-muted prose-pre:p-3 prose-code:text-neural prose-code:font-mono">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  )
}

// ============================================================================
// Component: Mode Selector Pills
// ============================================================================

function ModeSelector({
  mode,
  onModeChange,
}: {
  mode: TutorMode
  onModeChange: (mode: TutorMode) => void
}) {
  const modes: { value: TutorMode; label: string; icon: React.ReactNode }[] = [
    { value: 'chat', label: 'Chat', icon: <MessageSquare className="h-3.5 w-3.5" /> },
    { value: 'practice', label: 'Practice', icon: <Target className="h-3.5 w-3.5" /> },
    { value: 'explain', label: 'Explain', icon: <BookOpen className="h-3.5 w-3.5" /> },
    { value: 'study-plan', label: 'Study Plan', icon: <Calendar className="h-3.5 w-3.5" /> },
  ]

  return (
    <div className="flex gap-2 flex-wrap" role="tablist" aria-label="AI Tutor modes">
      {modes.map((m) => (
        <button
          key={m.value}
          role="tab"
          aria-selected={mode === m.value}
          onClick={() => onModeChange(m.value)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neural focus-visible:ring-offset-2',
            mode === m.value
              ? 'bg-neural text-neural-foreground shadow-sm'
              : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
          )}
        >
          {m.icon}
          {m.label}
        </button>
      ))}
    </div>
  )
}

// ============================================================================
// Component: Chat Mode
// ============================================================================

function loadChatHistory(): ChatMessage[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(CHAT_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as ChatMessage[]
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {
    // Ignore parse errors
  }
  return []
}

function ChatMode() {
  const [messages, setMessages] = useState<ChatMessage[]>(loadChatHistory)
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Save chat history to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages))
    }
  }, [messages])

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, streamingContent])

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return

      const userMsg: ChatMessage = {
        id: uid(),
        role: 'user',
        content: content.trim(),
        timestamp: Date.now(),
      }

      const updatedMessages = [...messages, userMsg]
      setMessages(updatedMessages)
      setInput('')
      setIsStreaming(true)
      setStreamingContent('')

      // Create AbortController for this stream
      const controller = new AbortController()
      abortControllerRef.current = controller

      const apiMessages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...updatedMessages.map((m) => ({ role: m.role, content: m.content })),
      ]

      await streamAIResponse(
        apiMessages,
        (chunk) => setStreamingContent((prev) => prev + chunk),
        () => {
          abortControllerRef.current = null
          setStreamingContent((final) => {
            const assistantMsg: ChatMessage = {
              id: uid(),
              role: 'assistant',
              content: final,
              timestamp: Date.now(),
            }
            setMessages((prev) => [...prev, assistantMsg])
            return ''
          })
          setIsStreaming(false)
          inputRef.current?.focus()
        },
        (err) => {
          const errorMsg: ChatMessage = {
            id: uid(),
            role: 'assistant',
            content: `I encountered an error: ${err}. Please try again.`,
            timestamp: Date.now(),
          }
          abortControllerRef.current = null
          setMessages((prev) => [...prev, errorMsg])
          setIsStreaming(false)
          setStreamingContent('')
        },
        controller.signal,
      )
    },
    [messages, isStreaming],
  )

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  // Abort stream on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  const clearChat = () => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setMessages([])
    setStreamingContent('')
    localStorage.removeItem(CHAT_STORAGE_KEY)
  }

  const isEmpty = messages.length === 0 && !isStreaming

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Chat Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto min-h-0 px-1">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 py-12">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="h-16 w-16 rounded-2xl bg-neural/10 flex items-center justify-center"
            >
              <Brain className="h-8 w-8 text-neural" />
            </motion.div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">Ask me anything</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                I&apos;m your AI Tutor — ready to help with any subject, solve problems, or explain concepts step by step.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full max-w-md">
              {STARTER_PROMPTS.map((prompt) => (
                <motion.button
                  key={prompt}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  onClick={() => sendMessage(prompt)}
                  className="text-left text-sm rounded-lg border border-white/[0.04] bg-card px-3 py-2.5 hover:bg-accent hover:border-neural/30 hover:-translate-y-0.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neural"
                >
                  {prompt}
                </motion.button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <AnimatePresence mode="popLayout">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className={cn(
                    'flex gap-3',
                    msg.role === 'user' ? 'justify-end' : 'justify-start',
                  )}
                >
                  {msg.role === 'assistant' && (
                    <div className="shrink-0 h-8 w-8 rounded-lg bg-neural/10 flex items-center justify-center mt-0.5">
                      <Brain className="h-4 w-4 text-neural" />
                    </div>
                  )}
                  <div
                    className={cn(
                      'max-w-[80%] rounded-xl px-4 py-3 text-sm',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'forge-glass-surface border-white/[0.04] border-l-2 border-l-neural',
                    )}
                  >
                    {msg.role === 'assistant' ? (
                      <MarkdownContent content={msg.content} />
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Streaming message */}
            {isStreaming && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 justify-start"
              >
                <div className="shrink-0 h-8 w-8 rounded-lg bg-neural/10 flex items-center justify-center mt-0.5">
                  <Brain className="h-4 w-4 text-neural" />
                </div>
                <div className="max-w-[80%] rounded-xl px-4 py-3 text-sm forge-glass-surface border-white/[0.04] border-l-2 border-l-neural">
                  {streamingContent ? (
                    <MarkdownContent content={streamingContent} />
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Thinking...</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* Chat Input */}
      <div className="shrink-0 pt-3 border-t border-white/[0.04]">
        {messages.length > 0 && (
          <div className="flex justify-end mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearChat}
              className="text-xs text-muted-foreground h-7"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Clear chat
            </Button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your AI Tutor anything..."
            disabled={isStreaming}
            className="flex-1 h-11 forge-input-glow"
            aria-label="Chat message input"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isStreaming}
            className="h-11 w-11 shrink-0 bg-neural hover:bg-neural/90 text-neural-foreground neural-glow"
            aria-label="Send message"
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}

// ============================================================================
// Component: Practice Mode
// ============================================================================

function PracticeMode() {
  const [state, setState] = useState<PracticeState>({
    subject: '',
    difficulty: '',
    currentQuestion: null,
    userAnswer: '',
    isCorrect: null,
    score: 0,
    total: 0,
    streak: 0,
    showFeedback: false,
    isActive: false,
  })
  const [isLoading, setIsLoading] = useState(false)

  const generateQuestion = useCallback(async () => {
    if (!state.subject || !state.difficulty) return
    setIsLoading(true)

    try {
      const prompt = `You are ExamForge AI Tutor. Generate a single ${state.difficulty.toLowerCase()}-difficulty practice question for Nigerian secondary school ${state.subject}.

Return your response as a JSON object with this exact format:
{
  "question": "the question text",
  "options": ["A. option1", "B. option2", "C. option3", "D. option4"],
  "correctAnswer": "A. option1",
  "explanation": "step by step explanation of why the answer is correct"
}

Only return valid JSON, no other text.`

      const result = await completeAI(prompt)
      // Extract JSON from the response (handle markdown code blocks)
      const jsonMatch = result.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Invalid response format')

      const parsed = JSON.parse(jsonMatch[0]) as PracticeQuestion
      setState((prev) => ({
        ...prev,
        currentQuestion: parsed,
        userAnswer: '',
        isCorrect: null,
        showFeedback: false,
        isActive: true,
      }))
    } catch {
      setState((prev) => ({
        ...prev,
        currentQuestion: {
          question: 'Failed to generate question. Please try again.',
          options: [],
          correctAnswer: '',
          explanation: '',
        },
        userAnswer: '',
        isCorrect: null,
        showFeedback: false,
      }))
    } finally {
      setIsLoading(false)
    }
  }, [state.subject, state.difficulty])

  const handleAnswer = (option: string) => {
    if (state.showFeedback || !state.currentQuestion) return
    const correct = option === state.currentQuestion.correctAnswer
    setState((prev) => ({
      ...prev,
      userAnswer: option,
      isCorrect: correct,
      showFeedback: true,
      score: correct ? prev.score + 1 : prev.score,
      total: prev.total + 1,
      streak: correct ? prev.streak + 1 : 0,
    }))
  }

  const nextQuestion = () => {
    generateQuestion()
  }

  const endSession = () => {
    setState((prev) => ({
      ...prev,
      isActive: false,
      currentQuestion: null,
    }))
  }

  const startPractice = () => {
    generateQuestion()
  }

  const resetPractice = () => {
    setState({
      subject: '',
      difficulty: '',
      currentQuestion: null,
      userAnswer: '',
      isCorrect: null,
      score: 0,
      total: 0,
      streak: 0,
      showFeedback: false,
      isActive: false,
    })
  }

  // Setup screen
  if (!state.isActive && !state.currentQuestion) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 py-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="h-16 w-16 rounded-2xl bg-neural/10 flex items-center justify-center"
        >
          <Target className="h-8 w-8 text-neural" />
        </motion.div>

        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">Practice Mode</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Test your knowledge with AI-generated questions. Get instant feedback and explanations.
          </p>
        </div>

        <Card className="w-full max-w-md forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
          <CardContent className="p-6 space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground" htmlFor="practice-subject">Subject</label>
              <Select
                value={state.subject}
                onValueChange={(v) => setState((prev) => ({ ...prev, subject: v }))}
              >
                <SelectTrigger id="practice-subject" className="w-full h-10 forge-input-glow">
                  <SelectValue placeholder="Select a subject" />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground" htmlFor="practice-difficulty">Difficulty</label>
              <Select
                value={state.difficulty}
                onValueChange={(v) => setState((prev) => ({ ...prev, difficulty: v }))}
              >
                <SelectTrigger id="practice-difficulty" className="w-full h-10 forge-input-glow">
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  {DIFFICULTIES.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={startPractice}
              disabled={!state.subject || !state.difficulty || isLoading}
              className="w-full bg-neural hover:bg-neural/90 text-neural-foreground"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Start Practice
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Session summary
  if (!state.isActive && state.total > 0) {
    const percentage = state.total > 0 ? Math.round((state.score / state.total) * 100) : 0
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 py-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="h-16 w-16 rounded-2xl bg-neural/10 flex items-center justify-center"
        >
          <GraduationCap className="h-8 w-8 text-neural" />
        </motion.div>

        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">Session Complete!</h3>
          <p className="text-sm text-muted-foreground">Here&apos;s how you did</p>
        </div>

        <Card className="w-full max-w-md forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
          <CardContent className="p-6 space-y-5">
            <div className="text-center space-y-1">
              <div className="text-4xl font-bold text-neural">{percentage}%</div>
              <p className="text-sm text-muted-foreground">
                {state.score} of {state.total} correct
              </p>
            </div>

            <Progress value={percentage} className="h-2" />

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="space-y-1">
                <CheckCircle2 className="h-5 w-5 mx-auto text-green-600 dark:text-green-400" />
                <p className="text-lg font-semibold">{state.score}</p>
                <p className="text-xs text-muted-foreground">Correct</p>
              </div>
              <div className="space-y-1">
                <XCircle className="h-5 w-5 mx-auto text-destructive" />
                <p className="text-lg font-semibold">{state.total - state.score}</p>
                <p className="text-xs text-muted-foreground">Incorrect</p>
              </div>
            </div>

            <Button onClick={resetPractice} className="w-full bg-neural hover:bg-neural/90 text-neural-foreground">
              <RotateCcw className="h-4 w-4 mr-2" />
              New Session
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Active practice
  return (
    <div className="flex flex-col h-full gap-4">
      {/* Stats bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className={cn('text-xs', SUBJECT_COLORS[state.subject] ?? '')}>
            {state.subject}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {state.difficulty}
          </Badge>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
            {state.score}/{state.total}
          </span>
          {state.streak > 1 && (
            <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
              <Sparkles className="h-3.5 w-3.5" />
              {state.streak} streak
            </span>
          )}
        </div>
      </div>

      {/* Progress */}
      <Progress value={state.total > 0 ? (state.score / state.total) * 100 : 0} className="h-1.5" />

      {/* Question Card */}
      {state.currentQuestion && (
        <motion.div
          key={state.currentQuestion.question}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className="flex-1"
        >
          <Card className="h-full forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
            <CardContent className="p-6 space-y-5">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">Question {state.total + (state.showFeedback ? 0 : 1)}</p>
                <p className="text-base font-medium leading-relaxed">
                  {state.currentQuestion.question}
                </p>
              </div>

              <div className="space-y-2">
                {state.currentQuestion.options.map((option) => {
                  const isSelected = state.userAnswer === option
                  const isCorrectOption = option === state.currentQuestion!.correctAnswer
                  const showResult = state.showFeedback

                  return (
                    <button
                      key={option}
                      onClick={() => handleAnswer(option)}
                      disabled={state.showFeedback}
                      className={cn(
                        'w-full text-left rounded-lg border px-4 py-3 text-sm transition-all duration-200',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neural',
                        !showResult && !isSelected && 'hover:bg-accent hover:border-neural/30',
                        !showResult && isSelected && 'border-neural bg-neural/5',
                        showResult && isCorrectOption && 'border-emerald-500 bg-green-50 dark:bg-green-950/10 text-green-600 dark:text-green-400',
                        showResult && isSelected && !isCorrectOption && 'border-destructive bg-destructive/10 text-destructive',
                        showResult && !isCorrectOption && !isSelected && 'opacity-50',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {showResult && isCorrectOption && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                        {showResult && isSelected && !isCorrectOption && <XCircle className="h-4 w-4 shrink-0" />}
                        {!showResult && (
                          <div className={cn(
                            'h-4 w-4 rounded-full border-2 shrink-0',
                            isSelected ? 'border-neural bg-neural' : 'border-muted-foreground/30',
                          )} />
                        )}
                        <span>{option}</span>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Feedback */}
              <AnimatePresence>
                {state.showFeedback && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Separator className="mb-4" />
                    <div className={cn(
                      'rounded-lg p-4 text-sm',
                      state.isCorrect
                        ? 'bg-green-50 dark:bg-green-950/10 text-green-600 dark:text-green-400'
                        : 'bg-destructive/10 text-destructive',
                    )}>
                      <p className="font-medium mb-1">
                        {state.isCorrect ? '✓ Correct!' : '✗ Incorrect'}
                      </p>
                      <p className="leading-relaxed">{state.currentQuestion.explanation}</p>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button
                        onClick={nextQuestion}
                        disabled={isLoading}
                        className="flex-1 bg-neural hover:bg-neural/90 text-neural-foreground"
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <ArrowRight className="h-4 w-4 mr-2" />
                        )}
                        Next Question
                      </Button>
                      <Button variant="outline" onClick={endSession}>
                        End Session
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {isLoading && !state.currentQuestion && (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Generating question...</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Component: Explain Mode
// ============================================================================

function ExplainMode() {
  const [state, setState] = useState<ExplainState>({
    topic: '',
    explanation: '',
    isLoading: false,
  })
  const [inputValue, setInputValue] = useState('')

  const getExplanation = useCallback(async (topic: string, rephrase = false) => {
    if (!topic.trim()) return
    setState({ topic: topic.trim(), explanation: '', isLoading: true })

    try {
      const rephraseInstruction = rephrase
        ? 'Provide a DIFFERENT explanation than before — use simpler language, a different example, or a different teaching approach. '
        : ''

      const prompt = `You are ExamForge AI Tutor. ${rephraseInstruction}Provide a structured explanation of "${topic.trim()}" for a Nigerian secondary school student.

Format your response EXACTLY as follows using markdown:

## 📖 Definition
[Clear, simple definition of the topic]

## 🔑 Key Points
- [Point 1]
- [Point 2]
- [Point 3]
- [Point 4]
- [Point 5]

## 💡 Example
[A practical example that illustrates the concept]

## ⚠️ Common Mistakes
- [Common mistake 1]
- [Common mistake 2]
- [Common mistake 3]

## 🔗 Related Topics
- [Related topic 1]
- [Related topic 2]
- [Related topic 3]

## 📝 Quick Practice
[A short practice question with the answer]`

      const result = await completeAI(prompt)
      setState((prev) => ({ ...prev, explanation: result, isLoading: false }))
    } catch {
      setState((prev) => ({
        ...prev,
        explanation: 'Failed to get explanation. Please try again.',
        isLoading: false,
      }))
    }
  }, [])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    getExplanation(inputValue)
  }

  const handleTopicCard = (topic: string) => {
    setInputValue(topic)
    getExplanation(topic)
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Topic Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Enter a topic or concept to explain..."
          disabled={state.isLoading}
          className="flex-1 h-11 forge-input-glow"
          aria-label="Topic input"
        />
        <Button
          type="submit"
          disabled={!inputValue.trim() || state.isLoading}
          className="h-11 bg-neural hover:bg-neural/90 text-neural-foreground"
        >
          {state.isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Lightbulb className="h-4 w-4" />
          )}
        </Button>
      </form>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {!state.topic && !state.isLoading ? (
          <div className="space-y-6 py-4">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">What do you want to learn?</h3>
              <p className="text-sm text-muted-foreground">
                Enter a topic or pick from popular subjects below
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {TOPIC_CARDS.map((card) => (
                <Card key={card.subject} className="overflow-hidden forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] transition-all">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Badge variant="secondary" className={cn('text-[10px] px-1.5', SUBJECT_COLORS[card.subject] ?? '')}>
                        {card.subject}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-1.5">
                    {card.topics.map((topic) => (
                      <button
                        key={topic}
                        onClick={() => handleTopicCard(`${card.subject}: ${topic}`)}
                        className="w-full text-left text-sm rounded-md px-2.5 py-1.5 hover:bg-accent transition-colors flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neural"
                      >
                        <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                        {topic}
                      </button>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : state.isLoading ? (
          <div className="flex items-center justify-center h-48">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-3 text-muted-foreground"
            >
              <Loader2 className="h-6 w-6 animate-spin animate-ai-think text-neural" />
              <span className="text-sm">Explaining &quot;{state.topic}&quot;...</span>
            </motion.div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="space-y-4 py-2"
          >
            {/* Topic header */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-neural" />
                <h3 className="font-semibold">{state.topic}</h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => getExplanation(state.topic, true)}
                className="text-xs h-8"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Explain differently
              </Button>
            </div>

            {/* Explanation */}
            <Card className="border-l-2 border-l-neural forge-glass-surface border-white/[0.04] rounded-xl">
              <CardContent className="p-5">
                <MarkdownContent content={state.explanation} />
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Component: Study Plan Mode
// ============================================================================

function StudyPlanMode() {
  const [state, setState] = useState<StudyPlanState>({
    examDate: '',
    subjects: '',
    hoursPerDay: '3',
    plan: '',
    isLoading: false,
  })

  const generatePlan = useCallback(async () => {
    if (!state.examDate || !state.subjects.trim()) return
    setState((prev) => ({ ...prev, plan: '', isLoading: true }))

    try {
      const prompt = `You are ExamForge AI Tutor, an expert study planner for Nigerian secondary school students.

Create a detailed, personalized study plan with the following details:
- Exam date: ${state.examDate}
- Subjects to study: ${state.subjects}
- Available study hours per day: ${state.hoursPerDay}

Today's date: ${new Date().toISOString().split('T')[0]}

Format your response using markdown with this structure:

## 📅 Study Plan Overview
[Brief overview of the plan and strategy]

## 🎯 Subject Priorities
[Ranked list of subjects by priority based on exam proximity and difficulty]

## 📆 Daily Schedule
[Day-by-day schedule with specific time blocks, subjects, and topics to cover. Use a clear format like:]

**Day 1 — [Date]**
| Time | Subject | Topic | Activity |
|------|---------|-------|----------|
| 9:00-10:00 | Mathematics | Quadratic Equations | Practice problems |
| 10:00-10:15 | — | Break | Rest & hydrate |
[Continue for each day...]

## 🔄 Review Sessions
[When to schedule review sessions and what to review]

## 💪 Study Tips
[3-5 specific tips for effective studying given these subjects]

## ⚡ Quick Wins
[Easy topics or concepts that can be mastered quickly for confidence building]

Make the plan realistic, balanced with breaks, and focused on high-yield topics. Prioritize subjects closer to exam date.`

      const result = await completeAI(prompt)
      setState((prev) => ({ ...prev, plan: result, isLoading: false }))
    } catch {
      setState((prev) => ({
        ...prev,
        plan: 'Failed to generate study plan. Please try again.',
        isLoading: false,
      }))
    }
  }, [state.examDate, state.subjects, state.hoursPerDay])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    generatePlan()
  }

  const daysUntilExam = state.examDate
    ? Math.max(0, Math.ceil((new Date(state.examDate).getTime() - Date.now()) / 86400000))
    : null

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Setup form */}
      {!state.plan && !state.isLoading ? (
        <div className="flex flex-col items-center justify-center h-full gap-6 py-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="h-16 w-16 rounded-2xl bg-neural/10 flex items-center justify-center"
          >
            <Calendar className="h-8 w-8 text-neural" />
          </motion.div>

          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">Study Plan Generator</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Get a personalized, AI-generated study schedule tailored to your exams and available time.
            </p>
          </div>

          <Card className="w-full max-w-md forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
            <form onSubmit={handleSubmit}>
              <CardContent className="p-6 space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground" htmlFor="exam-date">Exam Date</label>
                  <Input
                    id="exam-date"
                    type="date"
                    value={state.examDate}
                    onChange={(e) => setState((prev) => ({ ...prev, examDate: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full"
                  />
                  {daysUntilExam !== null && daysUntilExam > 0 && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {daysUntilExam} days until exam
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground" htmlFor="study-subjects">Subjects</label>
                  <Textarea
                    id="study-subjects"
                    value={state.subjects}
                    onChange={(e) => setState((prev) => ({ ...prev, subjects: e.target.value }))}
                    placeholder="e.g., Mathematics, Physics, Chemistry, English"
                    className="w-full min-h-[80px]"
                  />
                  <p className="text-xs text-muted-foreground">Comma-separated list of subjects</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground" htmlFor="hours-per-day">Hours per day</label>
                  <Select
                    value={state.hoursPerDay}
                    onValueChange={(v) => setState((prev) => ({ ...prev, hoursPerDay: v }))}
                  >
                    <SelectTrigger id="hours-per-day" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['1', '2', '3', '4', '5', '6', '7', '8'].map((h) => (
                        <SelectItem key={h} value={h}>{h} hours</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="submit"
                  disabled={!state.examDate || !state.subjects.trim() || state.isLoading}
                  className="w-full bg-neural hover:bg-neural/90 text-neural-foreground"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Study Plan
                </Button>
              </CardContent>
            </form>
          </Card>
        </div>
      ) : state.isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-4 text-muted-foreground"
          >
            <div className="relative">
              <Loader2 className="h-8 w-8 animate-spin animate-ai-think text-neural" />
              <Calendar className="h-4 w-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-neural-foreground" />
            </div>
            <span className="text-sm">Creating your personalized study plan...</span>
          </motion.div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex-1 overflow-y-auto min-h-0 space-y-4"
        >
          {/* Plan header */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-neural" />
              <h3 className="font-semibold">Your Study Plan</h3>
              {daysUntilExam !== null && (
                <Badge variant="secondary" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {daysUntilExam} days
                </Badge>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setState((prev) => ({ ...prev, plan: '' }))}
              className="text-xs h-8"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Adjust plan
            </Button>
          </div>

          {/* Plan content */}
          <Card className="border-l-2 border-l-neural">
            <CardContent className="p-5">
              <MarkdownContent content={state.plan} />
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  )
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function AITutorPage() {
  const { user, role } = useAuthStore()
  const [mode, setMode] = useState<TutorMode>('chat')
  const isMobile = useIsMobile()

  // Redirect non-student/parent users (soft check — actual auth is in middleware)
  useEffect(() => {
    if (role && role !== 'student' && role !== 'parent') {
      window.location.href = ROUTES.DASHBOARD
    }
  }, [role])

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] gap-4">
      {/* Page Header */}
      <div className="shrink-0 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-neural/10 flex items-center justify-center neural-glow animate-ai-think">
              <Brain className="h-5 w-5 text-neural" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">AI Tutor</h1>
              <p className="text-sm text-muted-foreground mt-1.5">
                Your personal AI learning assistant — chat, practice, explain, plan
              </p>
            </div>
          </div>
          {!isMobile && user && (
            <Badge variant="secondary" className="text-xs w-fit">
              <GraduationCap className="h-3 w-3 mr-1" />
              {user.fullName?.split(' ')[0] ?? 'Student'}
            </Badge>
          )}
        </div>

        {/* Mode Selector */}
        <ModeSelector mode={mode} onModeChange={setMode} />
      </div>

      {/* Mode Content */}
      <div className="flex-1 min-h-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="h-full"
          >
            {mode === 'chat' && <ChatMode />}
            {mode === 'practice' && <PracticeMode />}
            {mode === 'explain' && <ExplainMode />}
            {mode === 'study-plan' && <StudyPlanMode />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
