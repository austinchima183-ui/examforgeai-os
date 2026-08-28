'use client'

import { useState, useCallback, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Sparkles, FileText, BookOpen, MessageSquare, Presentation,
  ClipboardList, Mic, ArrowLeft, Copy, Printer,
  Plus, Check, Loader2, GraduationCap, Pencil,
  Clock, Trophy, ChevronRight, X,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

import { useAuthStore } from '@/lib/stores/auth-store'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

// ============================================================================
// ExamForge AI — AI Content Assistant Page
// ============================================================================
// Provides 6 AI-powered content generation tools for teachers:
// Question Generator, Lesson Plan, Report Comments, Rubric, Worksheet, Oral Questions
// ============================================================================

// ─── Constants ────────────────────────────────────────────────────────────────

const NIGERIAN_SUBJECTS = [
  'Mathematics', 'English Language', 'Basic Science', 'Social Studies',
  'Civic Education', 'Christian Religious Knowledge', 'Islamic Religious Knowledge',
  'Agricultural Science', 'Business Studies', 'Computer Studies',
] as const

const CLASS_LEVELS = [
  'JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3',
] as const

const QUESTION_TYPES = [
  { value: 'single_choice', label: 'Single Choice' },
  { value: 'multi_choice', label: 'Multi Choice' },
  { value: 'true_false', label: 'True/False' },
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'essay', label: 'Essay' },
  { value: 'fill_blank', label: 'Fill in Blank' },
] as const

const DIFFICULTY_LEVELS = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
  { value: 'expert', label: 'Expert' },
] as const

const PERFORMANCE_LEVELS = [
  'Excellent', 'Good', 'Average', 'Below Average', 'Needs Improvement',
] as const

const ASSIGNMENT_TYPES = [
  'Essay', 'Project', 'Presentation', 'Lab Report',
] as const

const WORKSHEET_QUESTION_MIX = [
  { value: 'mcq', label: 'Multiple Choice' },
  { value: 'fill_blank', label: 'Fill in Blank' },
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'matching', label: 'Matching' },
] as const

// ─── Tool Types ───────────────────────────────────────────────────────────────

type ToolId = 'questions' | 'lesson-plan' | 'report-comments' | 'rubric' | 'worksheet' | 'oral-questions'

interface ToolConfig {
  id: ToolId
  title: string
  description: string
  icon: React.ElementType
  color: string
  bgColor: string
  borderColor: string
}

const TOOLS: ToolConfig[] = [
  {
    id: 'questions',
    title: 'Question Generator',
    description: 'Generate exam questions with AI — MCQ, True/False, Essay, and more',
    icon: ClipboardList,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/20',
  },
  {
    id: 'lesson-plan',
    title: 'Lesson Plan Generator',
    description: 'Create structured lesson plans with objectives, activities, and assessments',
    icon: BookOpen,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
  },
  {
    id: 'report-comments',
    title: 'Report Comments',
    description: 'Generate personalized student report comments for any performance level',
    icon: MessageSquare,
    color: 'text-ember',
    bgColor: 'bg-ember/10',
    borderColor: 'border-ember/20',
  },
  {
    id: 'rubric',
    title: 'Rubric Generator',
    description: 'Build assessment rubrics with criteria, levels, and point ranges',
    icon: Presentation,
    color: 'text-neural',
    bgColor: 'bg-neural/10',
    borderColor: 'border-neural/20',
  },
  {
    id: 'worksheet',
    title: 'Worksheet Generator',
    description: 'Create printable worksheets with mixed question types and formatting',
    icon: FileText,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/20',
  },
  {
    id: 'oral-questions',
    title: 'Oral Questions',
    description: 'Generate oral exam questions with expected answers and scoring guides',
    icon: Mic,
    color: 'text-neural',
    bgColor: 'bg-neural/10',
    borderColor: 'border-neural/20',
  },
]

// ─── Generated Content Types ──────────────────────────────────────────────────

interface GeneratedQuestion {
  id: string
  text: string
  type: string
  options?: string[]
  correctAnswer: string
  explanation: string
  difficulty: string
  marks: number
  subject: string
  topic: string
}

interface LessonPlanSection {
  title: string
  duration: string
  content: string
}

interface GeneratedLessonPlan {
  objectives: string[]
  materials: string[]
  sections: LessonPlanSection[]
  homework: string
  assessment: string
}

interface GeneratedComment {
  id: string
  text: string
  performanceLevel: string
}

interface RubricCriterion {
  name: string
  excellent: string
  good: string
  fair: string
  poor: string
  maxPoints: number
}

interface GeneratedRubric {
  criteria: RubricCriterion[]
  totalPoints: number
}

interface WorksheetQuestion {
  id: string
  number: number
  text: string
  type: string
  options?: string[]
  answer?: string
}

interface GeneratedWorksheet {
  questions: WorksheetQuestion[]
  header: { schoolName: string; className: string; subject: string; date: string }
}

interface OralQuestion {
  id: string
  number: number
  text: string
  expectedAnswer: string
  followUp: string
  marks: number
}

interface GeneratedOralQuestions {
  questions: OralQuestion[]
  totalMarks: number
}

// ─── AI Helper ─────────────────────────────────────────────────────────────────

async function callAI(prompt: string): Promise<string> {
  const response = await fetch('/api/ai/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      model: 'gemini-2.0-flash',
      temperature: 0.7,
      max_tokens: 4096,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(errorData.error || `AI request failed with status ${response.status}`)
  }

  const data = await response.json()
  return data.text || data.content || data.result || JSON.stringify(data)
}

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function ContentAssistantPage() {
  const [activeTool, setActiveTool] = useState<ToolId | null>(null)
  const { user } = useAuthStore()

  const handleBack = useCallback(() => setActiveTool(null), [])

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-neural/10 flex items-center justify-center neural-glow">
            <Sparkles className="h-5 w-5 text-neural" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">AI Content Assistant</h1>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary bg-primary/5">
                <Sparkles className="h-3 w-3 mr-0.5" />
                AI
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Generate lessons, questions, rubrics, and more with AI assistance
            </p>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        {!activeTool ? (
          <motion.div
            key="tool-grid"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {TOOLS.map((tool, index) => (
              <motion.div
                key={tool.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.08 }}
              >
                <Card
                  className={cn(
                    'cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 border',
                    tool.borderColor,
                  )}
                  onClick={() => setActiveTool(tool.id)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center', tool.bgColor)}>
                          <tool.icon className={cn('h-5 w-5', tool.color)} />
                        </div>
                        <div>
                          <CardTitle className="text-base">{tool.title}</CardTitle>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0 border-primary/30 text-primary bg-primary/5">
                        <Sparkles className="h-3 w-3 mr-0.5" />
                        AI
                      </Badge>
                    </div>
                    <CardDescription className="mt-1">{tool.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center text-sm font-medium text-primary/80 group">
                      Get started
                      <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key={activeTool}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <ToolInterface
              toolId={activeTool}
              onBack={handleBack}
              userId={user?.id}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Tool Interface Component ─────────────────────────────────────────────────

interface ToolInterfaceProps {
  toolId: ToolId
  onBack: () => void
  userId?: string
}

function ToolInterface({ toolId, onBack, userId }: ToolInterfaceProps) {
  const tool = TOOLS.find((t) => t.id === toolId)!

  return (
    <div className="space-y-6">
      {/* Back button and title */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <div className="flex items-center gap-2">
          <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center', tool.bgColor)}>
            <tool.icon className={cn('h-4 w-4', tool.color)} />
          </div>
          <h2 className="text-lg font-semibold">{tool.title}</h2>
        </div>
      </div>

      {/* Tool Content */}
      {toolId === 'questions' && <QuestionGenerator userId={userId} />}
      {toolId === 'lesson-plan' && <LessonPlanGenerator />}
      {toolId === 'report-comments' && <ReportCommentsGenerator />}
      {toolId === 'rubric' && <RubricGenerator />}
      {toolId === 'worksheet' && <WorksheetGenerator />}
      {toolId === 'oral-questions' && <OralQuestionsGenerator />}
    </div>
  )
}

// ─── 1. Question Generator ────────────────────────────────────────────────────

function QuestionGenerator({ userId }: { userId?: string }) {
  const { toast } = useToast()
  const [subject, setSubject] = useState('')
  const [topic, setTopic] = useState('')
  const [questionType, setQuestionType] = useState('single_choice')
  const [difficulty, setDifficulty] = useState('medium')
  const [numQuestions, setNumQuestions] = useState([5])
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())

  const handleGenerate = async () => {
    if (!subject || !topic) {
      toast({ title: 'Missing fields', description: 'Please select a subject and enter a topic.', variant: 'destructive' })
      return
    }
    setIsGenerating(true)
    setGeneratedQuestions([])

    const typeLabel = QUESTION_TYPES.find((t) => t.value === questionType)?.label ?? questionType
    const diffLabel = DIFFICULTY_LEVELS.find((d) => d.value === difficulty)?.label ?? difficulty
    const count = numQuestions[0]

    const prompt = `You are an expert Nigerian curriculum teacher. Generate exactly ${count} ${typeLabel} questions for ${subject} on the topic "${topic}" at ${diffLabel} difficulty level following the Nigerian educational curriculum (WAEC/NECO standards).

For each question, provide a JSON array where each item has:
- "text": the question text
- "options": array of 4 option strings (for MCQ only, otherwise empty array)
- "correctAnswer": the correct answer
- "explanation": a brief explanation of why the answer is correct
- "marks": marks for the question (1-5)

Return ONLY the JSON array, no additional text. Example format:
[{"text":"What is 2+2?","options":["3","4","5","6"],"correctAnswer":"4","explanation":"Basic addition","marks":1}]`

    try {
      const result = await callAI(prompt)
      const jsonMatch = result.match(/\[[\s\S]*\]/)
      if (!jsonMatch) throw new Error('No valid JSON array found in AI response')

      const parsed = JSON.parse(jsonMatch[0])
      const questions: GeneratedQuestion[] = parsed.map((q: Record<string, unknown>, i: number) => ({
        id: `q-${Date.now()}-${i}`,
        text: String(q.text || ''),
        type: questionType,
        options: Array.isArray(q.options) ? q.options.map(String) : undefined,
        correctAnswer: String(q.correctAnswer || ''),
        explanation: String(q.explanation || ''),
        difficulty,
        marks: Number(q.marks) || 1,
        subject,
        topic,
      }))

      setGeneratedQuestions(questions)
      toast({ title: 'Questions generated', description: `${questions.length} questions created successfully.` })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate questions'
      toast({ title: 'Generation failed', description: message, variant: 'destructive' })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleAddToBank = async (question: GeneratedQuestion) => {
    setSavingIds((prev) => new Set(prev).add(question.id))
    try {
      const formData = new FormData()
      formData.append('text', question.text)
      formData.append('type', question.type)
      formData.append('subject', question.subject)
      formData.append('topic', question.topic)
      formData.append('difficulty', question.difficulty)
      formData.append('marks', String(question.marks))
      formData.append('correct_answer', question.correctAnswer)
      formData.append('explanation', question.explanation)
      if (question.options && question.options.length > 0) {
        formData.append('options', JSON.stringify(question.options.map((opt, idx) => ({
          id: `opt-${idx}`,
          label: String.fromCharCode(65 + idx),
          content: opt,
          isCorrect: opt === question.correctAnswer,
        }))))
      }

      const { createQuestionAction } = await import('@/features/exams/actions')
      const result = await createQuestionAction(formData)

      if (result.error) {
        toast({ title: 'Save failed', description: result.error, variant: 'destructive' })
      } else {
        toast({ title: 'Saved to bank', description: 'Question added to your question bank.' })
      }
    } catch {
      toast({ title: 'Save failed', description: 'Could not save question. Please try again.', variant: 'destructive' })
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev)
        next.delete(question.id)
        return next
      })
    }
  }

  const handleAddAllToBank = async () => {
    for (const q of generatedQuestions) {
      await handleAddToBank(q)
    }
  }

  const handleEdit = (question: GeneratedQuestion) => {
    setEditingId(question.id)
    setEditText(question.text)
  }

  const handleSaveEdit = (id: string) => {
    setGeneratedQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, text: editText } : q)),
    )
    setEditingId(null)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Input Form */}
      <div className="lg:col-span-2">
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              Question Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {NIGERIAN_SUBJECTS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Topic</Label>
              <Input placeholder="e.g., Quadratic Equations" value={topic} onChange={(e) => setTopic(e.target.value)} className="forge-input-glow" />
            </div>

            <div className="space-y-2">
              <Label>Question Type</Label>
              <Select value={questionType} onValueChange={setQuestionType}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {QUESTION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIFFICULTY_LEVELS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Number of Questions: {numQuestions[0]}</Label>
              <Slider value={numQuestions} onValueChange={setNumQuestions} min={1} max={20} step={1} />
            </div>

            <Button onClick={handleGenerate} disabled={isGenerating} className="w-full gap-2 neural-glow">
              {isGenerating ? (
                <><Loader2 className="h-4 w-4 animate-spin animate-ai-think" /> Generating...</>
              ) : (
                <><Sparkles className="h-4 w-4" /> Generate Questions</>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Generated Questions Display */}
      <div className="lg:col-span-3">
        {isGenerating ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded w-3/4 mb-3" />
                  <div className="h-3 bg-muted rounded w-1/2 mb-2" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : generatedQuestions.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{generatedQuestions.length} questions generated</p>
              <Button variant="outline" size="sm" onClick={handleAddAllToBank} className="gap-2">
                <Plus className="h-3.5 w-3.5" />
                Add All to Bank
              </Button>
            </div>

            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-3 pr-4">
                {generatedQuestions.map((q, index) => (
                  <motion.div
                    key={q.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="border border-indigo-100/50 bg-gradient-to-br from-indigo-50/30 to-transparent">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            {editingId === q.id ? (
                              <div className="space-y-2">
                                <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={2} />
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={() => handleSaveEdit(q.id)} className="gap-1">
                                    <Check className="h-3 w-3" /> Save
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm font-medium">{index + 1}. {q.text}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Badge variant="outline" className="text-[10px]">{q.marks} mark{q.marks > 1 ? 's' : ''}</Badge>
                          </div>
                        </div>

                        {q.options && q.options.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {q.options.map((opt, optIdx) => (
                              <div
                                key={optIdx}
                                className={cn(
                                  'text-xs px-2.5 py-1.5 rounded-md border',
                                  opt === q.correctAnswer
                                    ? 'bg-green-50 dark:bg-green-950 border-emerald-200 text-green-700 dark:text-green-400 font-medium'
                                    : 'bg-muted/50 border-transparent',
                                )}
                              >
                                {String.fromCharCode(65 + optIdx)}. {opt}
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-start gap-2 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/50 px-2.5 py-2 rounded-md">
                          <Check className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          <span><strong>Answer:</strong> {q.correctAnswer}</span>
                        </div>

                        {q.explanation && (
                          <p className="text-xs text-muted-foreground italic">
                            <strong>Explanation:</strong> {q.explanation}
                          </p>
                        )}

                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            variant="ghost" size="sm" className="gap-1 text-xs h-7"
                            onClick={() => handleEdit(q)}
                            disabled={editingId === q.id}
                          >
                            <Pencil className="h-3 w-3" /> Edit
                          </Button>
                          <Button
                            variant="ghost" size="sm" className="gap-1 text-xs h-7"
                            onClick={() => handleAddToBank(q)}
                            disabled={savingIds.has(q.id)}
                          >
                            {savingIds.has(q.id) ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Plus className="h-3 w-3" />
                            )}
                            Add to Bank
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <ClipboardList className="h-12 w-12 mx-auto text-foreground/35 mb-4" />
              <p className="text-sm text-muted-foreground">Configure settings and generate questions to see them here.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

// ─── 2. Lesson Plan Generator ─────────────────────────────────────────────────

function LessonPlanGenerator() {
  const { toast } = useToast()
  const [subject, setSubject] = useState('')
  const [topic, setTopic] = useState('')
  const [classLevel, setClassLevel] = useState('')
  const [duration, setDuration] = useState('40')
  const [isGenerating, setIsGenerating] = useState(false)
  const [plan, setPlan] = useState<GeneratedLessonPlan | null>(null)

  const handleGenerate = async () => {
    if (!subject || !topic || !classLevel) {
      toast({ title: 'Missing fields', description: 'Please fill in all required fields.', variant: 'destructive' })
      return
    }
    setIsGenerating(true)
    setPlan(null)

    const prompt = `You are an expert Nigerian curriculum teacher. Create a detailed lesson plan for:
Subject: ${subject}
Topic: ${topic}
Class: ${classLevel}
Duration: ${duration} minutes

Return a JSON object with this exact structure:
{
  "objectives": ["objective1", "objective2", ...],
  "materials": ["material1", "material2", ...],
  "sections": [
    {"title": "Introduction/Warm-up", "duration": "5 min", "content": "detailed description"},
    {"title": "Main Content - Part 1", "duration": "X min", "content": "detailed teaching steps"},
    {"title": "Student Activity", "duration": "X min", "content": "activity description"},
    {"title": "Main Content - Part 2", "duration": "X min", "content": "detailed teaching steps"},
    {"title": "Assessment/Check Understanding", "duration": "X min", "content": "assessment methods"},
    {"title": "Closure/Summary", "duration": "X min", "content": "summary and recap"}
  ],
  "homework": "homework assignment description",
  "assessment": "how to assess student learning"
}

Ensure total duration adds up to ${duration} minutes. Follow Nigerian curriculum standards. Return ONLY valid JSON.`

    try {
      const result = await callAI(prompt)
      const jsonMatch = result.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No valid JSON found in AI response')
      const parsed = JSON.parse(jsonMatch[0])
      setPlan(parsed)
      toast({ title: 'Lesson plan generated', description: 'Your lesson plan is ready.' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate lesson plan'
      toast({ title: 'Generation failed', description: message, variant: 'destructive' })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleExport = () => {
    if (!plan) return
    const lines: string[] = []
    lines.push(`LESSON PLAN\n${'='.repeat(40)}`)
    lines.push(`Subject: ${subject} | Topic: ${topic} | Class: ${classLevel} | Duration: ${duration} min\n`)
    lines.push(`LEARNING OBJECTIVES:`)
    plan.objectives.forEach((obj, i) => lines.push(`  ${i + 1}. ${obj}`))
    lines.push(`\nMATERIALS NEEDED:`)
    plan.materials.forEach((m) => lines.push(`  - ${m}`))
    lines.push(`\nLESSON SECTIONS:`)
    plan.sections.forEach((s) => lines.push(`\n[${s.duration}] ${s.title}\n  ${s.content}`))
    lines.push(`\nHOMEWORK: ${plan.homework}`)
    lines.push(`\nASSESSMENT: ${plan.assessment}`)

    navigator.clipboard.writeText(lines.join('\n'))
    toast({ title: 'Copied', description: 'Lesson plan copied to clipboard.' })
  }

  const sectionIcons: Record<string, React.ElementType> = {
    'Introduction': Sparkles,
    'Main': BookOpen,
    'Student': GraduationCap,
    'Assessment': ClipboardList,
    'Closure': Check,
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-2">
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-green-600 dark:text-green-400" />
              Lesson Plan Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {NIGERIAN_SUBJECTS.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Topic</Label>
              <Input placeholder="e.g., Photosynthesis" value={topic} onChange={(e) => setTopic(e.target.value)} className="forge-input-glow" />
            </div>
            <div className="space-y-2">
              <Label>Class</Label>
              <Select value={classLevel} onValueChange={setClassLevel}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {CLASS_LEVELS.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <Input type="number" min={10} max={120} value={duration} onChange={(e) => setDuration(e.target.value)} className="forge-input-glow" />
            </div>
            <Button onClick={handleGenerate} disabled={isGenerating} className="w-full gap-2 neural-glow">
              {isGenerating ? <><Loader2 className="h-4 w-4 animate-spin animate-ai-think" /> Generating...</> : <><Sparkles className="h-4 w-4" /> Generate Lesson Plan</>}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-3">
        {isGenerating ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-4 bg-muted rounded w-3/4 mb-3" /><div className="h-3 bg-muted rounded w-1/2" /></CardContent></Card>
            ))}
          </div>
        ) : plan ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{subject} — {topic}</h3>
              <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
                <Copy className="h-3.5 w-3.5" /> Export
              </Button>
            </div>

            {/* Objectives */}
            <Card className="border border-emerald-100/50">
              <CardHeader><CardTitle className="text-sm">Learning Objectives</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {plan.objectives.map((obj, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                      {obj}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Timeline Sections */}
            <div className="space-y-3">
              {plan.sections.map((section, i) => {
                const IconComp = Object.entries(sectionIcons).find(([key]) => section.title.includes(key))?.[1] ?? BookOpen
                return (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}>
                    <Card className="border-l-4 border-l-emerald-400 bg-gradient-to-r from-emerald-50/30 to-transparent">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <IconComp className="h-4 w-4 text-green-600 dark:text-green-400" />
                          <span className="font-medium text-sm">{section.title}</span>
                          <Badge variant="outline" className="text-[10px] ml-auto">{section.duration}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{section.content}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>

            {/* Materials & Assessment */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
            <CardHeader><CardTitle className="text-sm">Materials Needed</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {plan.materials.map((m, i) => (
                      <li key={i} className="text-sm flex items-center gap-2"><Plus className="h-3 w-3 text-green-600 dark:text-green-400" />{m}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
            <CardHeader><CardTitle className="text-sm">Assessment & Homework</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div><p className="text-xs font-medium text-muted-foreground mb-1">Assessment</p><p className="text-sm">{plan.assessment}</p></div>
                  <Separator />
                  <div><p className="text-xs font-medium text-muted-foreground mb-1">Homework</p><p className="text-sm">{plan.homework}</p></div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <Card className="border-dashed"><CardContent className="p-12 text-center"><BookOpen className="h-12 w-12 mx-auto text-foreground/35 mb-4" /><p className="text-sm text-muted-foreground">Configure settings and generate a lesson plan.</p></CardContent></Card>
        )}
      </div>
    </div>
  )
}

// ─── 3. Report Comments Generator ─────────────────────────────────────────────

function ReportCommentsGenerator() {
  const { toast } = useToast()
  const [selectedClass, setSelectedClass] = useState('')
  const [performanceLevel, setPerformanceLevel] = useState('')
  const [subject, setSubject] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [comments, setComments] = useState<GeneratedComment[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  const handleGenerate = async () => {
    if (!selectedClass || !performanceLevel || !subject) {
      toast({ title: 'Missing fields', description: 'Please fill in all fields.', variant: 'destructive' })
      return
    }
    setIsGenerating(true)
    setComments([])

    const prompt = `You are an experienced Nigerian school teacher writing end-of-term report comments. Generate 8 unique, personalized student report comments for:
Class: ${selectedClass}
Performance Level: ${performanceLevel}
Subject: ${subject}

Each comment should be 2-3 sentences, encouraging but honest, specific to the performance level, and appropriate for Nigerian school context.

Return a JSON array of strings. Each string is a report comment. Return ONLY the JSON array.
Example: ["Student has shown excellent understanding...", "This student consistently demonstrates..."]`

    try {
      const result = await callAI(prompt)
      const jsonMatch = result.match(/\[[\s\S]*\]/)
      if (!jsonMatch) throw new Error('No valid JSON found')
      const parsed = JSON.parse(jsonMatch[0])
      const generated: GeneratedComment[] = parsed.map((text: string, i: number) => ({
        id: `comment-${Date.now()}-${i}`,
        text: String(text),
        performanceLevel,
      }))
      setComments(generated)
      toast({ title: 'Comments generated', description: `${generated.length} comments created.` })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate comments'
      toast({ title: 'Generation failed', description: message, variant: 'destructive' })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopyAll = () => {
    const text = comments.map((c, i) => `${i + 1}. ${c.text}`).join('\n\n')
    navigator.clipboard.writeText(text)
    toast({ title: 'Copied', description: 'All comments copied to clipboard.' })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-2">
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              Comment Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {CLASS_LEVELS.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Performance Level</Label>
              <Select value={performanceLevel} onValueChange={setPerformanceLevel}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select level" /></SelectTrigger>
                <SelectContent>
                  {PERFORMANCE_LEVELS.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {NIGERIAN_SUBJECTS.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGenerate} disabled={isGenerating} className="w-full gap-2 neural-glow">
              {isGenerating ? <><Loader2 className="h-4 w-4 animate-spin animate-ai-think" /> Generating...</> : <><Sparkles className="h-4 w-4" /> Generate Comments</>}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-3">
        {isGenerating ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-3 bg-muted rounded w-full mb-2" /><div className="h-3 bg-muted rounded w-4/5" /></CardContent></Card>
            ))}
          </div>
        ) : comments.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{comments.length} comments generated</p>
              <Button variant="outline" size="sm" onClick={handleCopyAll} className="gap-2">
                <Copy className="h-3.5 w-3.5" /> Copy All
              </Button>
            </div>
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-3 pr-4">
                {comments.map((comment, index) => (
                  <motion.div key={comment.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                    <Card className="border border-amber-100/50 bg-gradient-to-br from-amber-50/20 to-transparent">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400 mt-1">{index + 1}</span>
                          <div className="flex-1">
                            {editingId === comment.id ? (
                              <div className="space-y-2">
                                <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={3} />
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={() => { setComments((prev) => prev.map((c) => c.id === comment.id ? { ...c, text: editText } : c)); setEditingId(null) }} className="gap-1"><Check className="h-3 w-3" /> Save</Button>
                                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm">{comment.text}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditingId(comment.id); setEditText(comment.text) }}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => navigator.clipboard.writeText(comment.text).then(() => toast({ title: 'Copied' }))}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </div>
        ) : (
          <Card className="border-dashed"><CardContent className="p-12 text-center"><MessageSquare className="h-12 w-12 mx-auto text-foreground/35 mb-4" /><p className="text-sm text-muted-foreground">Configure settings and generate report comments.</p></CardContent></Card>
        )}
      </div>
    </div>
  )
}

// ─── 4. Rubric Generator ──────────────────────────────────────────────────────

function RubricGenerator() {
  const { toast } = useToast()
  const [assignmentType, setAssignmentType] = useState('')
  const [subject, setSubject] = useState('')
  const [gradeLevel, setGradeLevel] = useState('')
  const [numCriteria, setNumCriteria] = useState([4])
  const [isGenerating, setIsGenerating] = useState(false)
  const [rubric, setRubric] = useState<GeneratedRubric | null>(null)

  const handleGenerate = async () => {
    if (!assignmentType || !subject || !gradeLevel) {
      toast({ title: 'Missing fields', description: 'Please fill in all fields.', variant: 'destructive' })
      return
    }
    setIsGenerating(true)
    setRubric(null)

    const prompt = `You are an expert educator. Create a detailed assessment rubric for:
Assignment Type: ${assignmentType}
Subject: ${subject}
Grade Level: ${gradeLevel}
Number of Criteria: ${numCriteria[0]}

Return a JSON object:
{
  "criteria": [
    {
      "name": "Criterion Name",
      "excellent": "description for excellent performance",
      "good": "description for good performance",
      "fair": "description for fair performance",
      "poor": "description for poor performance",
      "maxPoints": 25
    }
  ],
  "totalPoints": 100
}

Make criteria relevant to the assignment type. Distribute points logically. Return ONLY valid JSON.`

    try {
      const result = await callAI(prompt)
      const jsonMatch = result.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No valid JSON found')
      const parsed = JSON.parse(jsonMatch[0])
      setRubric(parsed)
      toast({ title: 'Rubric generated', description: 'Your rubric is ready.' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate rubric'
      toast({ title: 'Generation failed', description: message, variant: 'destructive' })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleExport = () => {
    if (!rubric) return
    const lines: string[] = []
    lines.push(`RUBRIC: ${assignmentType} — ${subject} (${gradeLevel})\n`)
    lines.push('Criterion | Excellent | Good | Fair | Poor | Max Points')
    lines.push('-'.repeat(80))
    rubric.criteria.forEach((c) => {
      lines.push(`${c.name} | ${c.excellent} | ${c.good} | ${c.fair} | ${c.poor} | ${c.maxPoints}`)
    })
    lines.push(`\nTotal Points: ${rubric.totalPoints}`)
    navigator.clipboard.writeText(lines.join('\n'))
    toast({ title: 'Copied', description: 'Rubric copied to clipboard.' })
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-2">
        <Card className="border border-violet-200/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Presentation className="h-4 w-4 text-violet-600" />
              Rubric Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Assignment Type</Label>
              <Select value={assignmentType} onValueChange={setAssignmentType}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {ASSIGNMENT_TYPES.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {NIGERIAN_SUBJECTS.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Grade Level</Label>
              <Select value={gradeLevel} onValueChange={setGradeLevel}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select grade" /></SelectTrigger>
                <SelectContent>
                  {CLASS_LEVELS.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Number of Criteria: {numCriteria[0]}</Label>
              <Slider value={numCriteria} onValueChange={setNumCriteria} min={3} max={8} step={1} />
            </div>
            <Button onClick={handleGenerate} disabled={isGenerating} className="w-full gap-2 neural-glow">
              {isGenerating ? <><Loader2 className="h-4 w-4 animate-spin animate-ai-think" /> Generating...</> : <><Sparkles className="h-4 w-4" /> Generate Rubric</>}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-3">
        {isGenerating ? (
          <Card className="animate-pulse"><CardContent className="p-6"><div className="h-40 bg-muted rounded" /></CardContent></Card>
        ) : rubric ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{assignmentType} Rubric — {subject}</h3>
              <Button variant="outline" size="sm" onClick={handleExport} className="gap-2"><Copy className="h-3.5 w-3.5" /> Export</Button>
            </div>
            <Card className="overflow-hidden border border-violet-100/50">
              <ScrollArea className="max-h-[60vh]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-violet-50/50">
                      <TableHead className="w-[140px]">Criterion</TableHead>
                      <TableHead>Excellent</TableHead>
                      <TableHead>Good</TableHead>
                      <TableHead>Fair</TableHead>
                      <TableHead>Poor</TableHead>
                      <TableHead className="w-[70px] text-center">Points</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rubric.criteria.map((c, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium text-sm">{c.name}</TableCell>
                        <TableCell className="text-xs">{c.excellent}</TableCell>
                        <TableCell className="text-xs">{c.good}</TableCell>
                        <TableCell className="text-xs">{c.fair}</TableCell>
                        <TableCell className="text-xs">{c.poor}</TableCell>
                        <TableCell className="text-center font-semibold text-sm">{c.maxPoints}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </Card>
            <div className="text-right">
              <Badge variant="outline" className="text-sm px-3 py-1">
                Total: {rubric.totalPoints} points
              </Badge>
            </div>
          </div>
        ) : (
          <Card className="border-dashed"><CardContent className="p-12 text-center"><Presentation className="h-12 w-12 mx-auto text-foreground/35 mb-4" /><p className="text-sm text-muted-foreground">Configure settings and generate a rubric.</p></CardContent></Card>
        )}
      </div>
    </div>
  )
}

// ─── 5. Worksheet Generator ───────────────────────────────────────────────────

function WorksheetGenerator() {
  const { toast } = useToast()
  const [subject, setSubject] = useState('')
  const [topic, setTopic] = useState('')
  const [classLevel, setClassLevel] = useState('')
  const [numQuestions, setNumQuestions] = useState([10])
  const [questionMix, setQuestionMix] = useState<string[]>(['mcq', 'fill_blank'])
  const [isGenerating, setIsGenerating] = useState(false)
  const [worksheet, setWorksheet] = useState<GeneratedWorksheet | null>(null)
  const [showAnswers, setShowAnswers] = useState(false)

  const handleToggleMix = (type: string) => {
    setQuestionMix((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }

  const handleGenerate = async () => {
    if (!subject || !topic || !classLevel || questionMix.length === 0) {
      toast({ title: 'Missing fields', description: 'Please fill in all fields and select at least one question type.', variant: 'destructive' })
      return
    }
    setIsGenerating(true)
    setWorksheet(null)

    const mixLabels = questionMix.map((t) => WORKSHEET_QUESTION_MIX.find((w) => w.value === t)?.label).filter(Boolean).join(', ')

    const prompt = `You are an expert Nigerian curriculum teacher. Create a worksheet with ${numQuestions[0]} questions for:
Subject: ${subject}
Topic: ${topic}
Class: ${classLevel}
Question Types: ${mixLabels}

Return a JSON object:
{
  "questions": [
    {
      "number": 1,
      "text": "question text",
      "type": "mcq/fill_blank/short_answer/matching",
      "options": ["A. option1", "B. option2", "C. option3", "D. option4"],
      "answer": "correct answer"
    }
  ]
}

Include a variety of the specified question types. Follow Nigerian curriculum. Return ONLY valid JSON.`

    try {
      const result = await callAI(prompt)
      const jsonMatch = result.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No valid JSON found')
      const parsed = JSON.parse(jsonMatch[0])
      const ws: GeneratedWorksheet = {
        questions: parsed.questions.map((q: Record<string, unknown>, i: number) => ({
          id: `ws-${Date.now()}-${i}`,
          number: q.number ?? i + 1,
          text: String(q.text || ''),
          type: String(q.type || 'short_answer'),
          options: Array.isArray(q.options) ? q.options.map(String) : undefined,
          answer: q.answer ? String(q.answer) : undefined,
        })),
        header: {
          schoolName: 'School Name',
          className: classLevel,
          subject,
          date: new Date().toLocaleDateString(),
        },
      }
      setWorksheet(ws)
      toast({ title: 'Worksheet generated', description: `${ws.questions.length} questions created.` })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate worksheet'
      toast({ title: 'Generation failed', description: message, variant: 'destructive' })
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePrint = () => {
    if (!worksheet) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    const html = `<!DOCTYPE html><html><head><title>Worksheet</title><style>body{font-family:serif;max-width:800px;margin:0 auto;padding:40px}.header{text-align:center;margin-bottom:30px;border-bottom:2px solid #000;padding-bottom:15px}.student-info{display:flex;justify-content:space-between;margin:15px 0}.question{margin:20px 0}.options{margin:8px 0 8px 20px}</style></head><body>
<div class="header"><h1>${worksheet.header.schoolName}</h1><p>Class: ${worksheet.header.className} | Subject: ${worksheet.header.subject} | Date: ${worksheet.header.date}</p></div>
<div class="student-info"><span>Name: _________________________</span><span>Score: _______ / ${worksheet.questions.length}</span></div>
${worksheet.questions.map((q) => `<div class="question"><p><strong>${q.number}.</strong> ${q.text}</p>${q.options ? `<div class="options">${q.options.map((o) => `<p>${o}</p>`).join('')}</div>` : '<p style="margin:8px 0;border-bottom:1px dotted #ccc;height:25px"></p>'}</div>`).join('')}
<script>window.print()</script></body></html>`
    printWindow.document.write(html)
    printWindow.document.close()
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-2">
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-rose-600" />
              Worksheet Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {NIGERIAN_SUBJECTS.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Topic</Label>
              <Input placeholder="e.g., Algebraic Expressions" value={topic} onChange={(e) => setTopic(e.target.value)} className="forge-input-glow" />
            </div>
            <div className="space-y-2">
              <Label>Class</Label>
              <Select value={classLevel} onValueChange={setClassLevel}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {CLASS_LEVELS.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Number of Questions: {numQuestions[0]}</Label>
              <Slider value={numQuestions} onValueChange={setNumQuestions} min={5} max={30} step={1} />
            </div>
            <div className="space-y-2">
              <Label>Question Mix</Label>
              <div className="grid grid-cols-2 gap-2">
                {WORKSHEET_QUESTION_MIX.map((type) => (
                  <Button
                    key={type.value}
                    variant={questionMix.includes(type.value) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleToggleMix(type.value)}
                    className="text-xs"
                  >
                    {type.label}
                  </Button>
                ))}
              </div>
            </div>
            <Button onClick={handleGenerate} disabled={isGenerating} className="w-full gap-2 neural-glow">
              {isGenerating ? <><Loader2 className="h-4 w-4 animate-spin animate-ai-think" /> Generating...</> : <><Sparkles className="h-4 w-4" /> Generate Worksheet</>}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-3">
        {isGenerating ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="animate-pulse"><CardContent className="p-4"><div className="h-3 bg-muted rounded w-full mb-2" /><div className="h-3 bg-muted rounded w-3/4" /></CardContent></Card>
            ))}
          </div>
        ) : worksheet ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">Worksheet Preview</h3>
                <Badge variant="outline" className="text-[10px]">{worksheet.questions.length} questions</Badge>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <Switch checked={showAnswers} onCheckedChange={setShowAnswers} id="show-answers" />
                  <Label htmlFor="show-answers" className="text-xs">Show Answers</Label>
                </div>
                <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2"><Printer className="h-3.5 w-3.5" /> Print</Button>
              </div>
            </div>

            <Card className="border border-rose-100/50">
              {/* Worksheet Header */}
              <div className="text-center p-4 border-b">
                <p className="font-bold text-lg">School Name</p>
                <p className="text-sm text-muted-foreground">
                  Class: {worksheet.header.className} | Subject: {worksheet.header.subject} | Date: {worksheet.header.date}
                </p>
                <div className="flex justify-between mt-3 text-sm">
                  <span>Name: _________________________</span>
                  <span>Score: _______ / {worksheet.questions.length}</span>
                </div>
              </div>

              <ScrollArea className="max-h-[55vh]">
                <CardContent className="p-4 space-y-4">
                  {worksheet.questions.map((q) => (
                    <div key={q.id} className="space-y-1.5">
                      <p className="text-sm font-medium">{q.number}. {q.text}</p>
                      {q.options && q.options.length > 0 && (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 ml-4">
                          {q.options.map((opt, idx) => (
                            <p key={idx} className="text-sm">{opt}</p>
                          ))}
                        </div>
                      )}
                      {!q.options && (
                        <div className="ml-4 border-b border-dotted border-muted pb-4" />
                      )}
                      {showAnswers && q.answer && (
                        <p className="text-xs text-green-600 dark:text-green-400 ml-4 font-medium">Answer: {q.answer}</p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </ScrollArea>
            </Card>
          </div>
        ) : (
          <Card className="border-dashed"><CardContent className="p-12 text-center"><FileText className="h-12 w-12 mx-auto text-foreground/35 mb-4" /><p className="text-sm text-muted-foreground">Configure settings and generate a worksheet.</p></CardContent></Card>
        )}
      </div>
    </div>
  )
}

// ─── 6. Oral Questions Generator ──────────────────────────────────────────────

function OralQuestionsGenerator() {
  const { toast } = useToast()
  const [subject, setSubject] = useState('')
  const [topic, setTopic] = useState('')
  const [difficulty, setDifficulty] = useState('medium')
  const [numQuestions, setNumQuestions] = useState([10])
  const [isGenerating, setIsGenerating] = useState(false)
  const [oralQuestions, setOralQuestions] = useState<GeneratedOralQuestions | null>(null)
  const [examMode, setExamMode] = useState(false)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [timerSeconds, setTimerSeconds] = useState(60)
  const [timerActive, setTimerActive] = useState(false)
  const [scoredQuestions, setScoredQuestions] = useState<Record<number, boolean>>({})

  const handleGenerate = async () => {
    if (!subject || !topic) {
      toast({ title: 'Missing fields', description: 'Please fill in all required fields.', variant: 'destructive' })
      return
    }
    setIsGenerating(true)
    setOralQuestions(null)

    const diffLabel = DIFFICULTY_LEVELS.find((d) => d.value === difficulty)?.label ?? difficulty
    const count = numQuestions[0]

    const prompt = `You are an expert Nigerian curriculum teacher. Generate ${count} oral examination questions for:
Subject: ${subject}
Topic: ${topic}
Difficulty: ${diffLabel}

These questions should be suitable for oral/viva examination — clear, concise, and requiring verbal answers.

Return a JSON object:
{
  "questions": [
    {
      "number": 1,
      "text": "oral question text",
      "expectedAnswer": "expected answer",
      "followUp": "follow-up probing question",
      "marks": 2
    }
  ],
  "totalMarks": 20
}

Return ONLY valid JSON.`

    try {
      const result = await callAI(prompt)
      const jsonMatch = result.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No valid JSON found')
      const parsed = JSON.parse(jsonMatch[0])
      setOralQuestions({
        questions: parsed.questions.map((q: Record<string, unknown>, i: number) => ({
          id: `oral-${Date.now()}-${i}`,
          number: q.number ?? i + 1,
          text: String(q.text || ''),
          expectedAnswer: String(q.expectedAnswer || ''),
          followUp: String(q.followUp || ''),
          marks: Number(q.marks) || 2,
        })),
        totalMarks: Number(parsed.totalMarks) || count * 2,
      })
      toast({ title: 'Oral questions generated', description: `${count} questions created.` })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate oral questions'
      toast({ title: 'Generation failed', description: message, variant: 'destructive' })
    } finally {
      setIsGenerating(false)
    }
  }

  const startExam = () => {
    if (!oralQuestions) return
    setExamMode(true)
    setCurrentQuestionIndex(0)
    setTimerSeconds(60)
    setTimerActive(true)
    setScoredQuestions({})
  }

  // Timer effect
  useEffect(() => {
    if (!timerActive) return
    const interval = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          setTimerActive(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [timerActive])

  const handleNext = () => {
    if (!oralQuestions) return
    if (currentQuestionIndex < oralQuestions.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1)
      setTimerSeconds(60)
      setTimerActive(true)
    } else {
      setExamMode(false)
      setTimerActive(false)
      const totalScore = Object.values(scoredQuestions).filter(Boolean).length
      toast({ title: 'Oral exam complete', description: `Score: ${totalScore}/${oralQuestions.questions.length}` })
    }
  }

  const handleScore = (correct: boolean) => {
    setScoredQuestions((prev) => ({ ...prev, [currentQuestionIndex]: correct }))
    handleNext()
  }

  const answeredCount = Object.keys(scoredQuestions).length
  const totalForExam = oralQuestions?.questions.length ?? 0

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-2">
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Mic className="h-4 w-4 text-cyan-600" />
              Oral Question Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {NIGERIAN_SUBJECTS.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Topic</Label>
              <Input placeholder="e.g., Cell Biology" value={topic} onChange={(e) => setTopic(e.target.value)} className="forge-input-glow" />
            </div>
            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DIFFICULTY_LEVELS.map((d) => (<SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Number of Questions: {numQuestions[0]}</Label>
              <Slider value={numQuestions} onValueChange={setNumQuestions} min={5} max={30} step={1} />
            </div>
            <Button onClick={handleGenerate} disabled={isGenerating} className="w-full gap-2 neural-glow">
              {isGenerating ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</> : <><Sparkles className="h-4 w-4" /> Generate Oral Questions</>}
            </Button>

            {oralQuestions && !examMode && (
              <>
                <Separator />
                <Button onClick={startExam} className="w-full gap-2" variant="secondary">
                  <Mic className="h-4 w-4" /> Start Oral Exam
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-3">
        {isGenerating ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-3 bg-muted rounded w-full mb-2" /><div className="h-3 bg-muted rounded w-3/4" /></CardContent></Card>
            ))}
          </div>
        ) : examMode && oralQuestions ? (
          <div className="space-y-4">
            {/* Exam Mode Header */}
            <Card className="border border-cyan-300 bg-gradient-to-r from-cyan-50/50 to-transparent">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="outline" className="text-sm">
                    Question {currentQuestionIndex + 1} of {oralQuestions.questions.length}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <Clock className={cn('h-4 w-4', timerSeconds <= 10 ? 'text-destructive' : 'text-muted-foreground')} />
                    <span className={cn('font-mono text-lg font-bold', timerSeconds <= 10 ? 'text-destructive' : '')}>
                      {Math.floor(timerSeconds / 60)}:{(timerSeconds % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                </div>
                <Progress value={(answeredCount / totalForExam) * 100} className="h-2" />
              </CardContent>
            </Card>

            {/* Current Question */}
            <motion.div key={currentQuestionIndex} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
              <Card className="border-l-4 border-l-cyan-400">
                <CardContent className="p-6 space-y-4">
                  <div>
                    <p className="text-lg font-medium mb-3">
                      {oralQuestions.questions[currentQuestionIndex].number}. {oralQuestions.questions[currentQuestionIndex].text}
                    </p>
                    <Badge variant="outline">{oralQuestions.questions[currentQuestionIndex].marks} mark{oralQuestions.questions[currentQuestionIndex].marks > 1 ? 's' : ''}</Badge>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Expected Answer:</p>
                    <p className="text-sm bg-green-50 dark:bg-green-950 p-3 rounded-md">{oralQuestions.questions[currentQuestionIndex].expectedAnswer}</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Follow-up Prompt:</p>
                    <p className="text-sm bg-yellow-50 dark:bg-yellow-950 p-3 rounded-md">{oralQuestions.questions[currentQuestionIndex].followUp}</p>
                  </div>

                  <Separator />

                  <div className="flex gap-3">
                    <Button onClick={() => handleScore(true)} className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700">
                      <Check className="h-4 w-4" /> Correct
                    </Button>
                    <Button onClick={() => handleScore(false)} variant="destructive" className="flex-1 gap-2">
                      <X className="h-4 w-4" /> Incorrect
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Score Summary */}
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <Trophy className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                <div>
                  <p className="text-sm font-medium">
                    Score: {Object.values(scoredQuestions).filter(Boolean).length} / {answeredCount} answered
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {oralQuestions.questions.length - answeredCount} remaining
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : oralQuestions ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">Generated Oral Questions</h3>
                <Badge variant="outline" className="text-[10px]">{oralQuestions.questions.length} questions | {oralQuestions.totalMarks} total marks</Badge>
              </div>
              <Button variant="outline" size="sm" onClick={startExam} className="gap-2"><Mic className="h-3.5 w-3.5" /> Start Exam</Button>
            </div>

            <ScrollArea className="max-h-[65vh]">
              <div className="space-y-3 pr-4">
                {oralQuestions.questions.map((q, index) => (
                  <motion.div key={q.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                    <Card className="border border-cyan-100/50 bg-gradient-to-br from-cyan-50/20 to-transparent">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <p className="text-sm font-medium">{q.number}. {q.text}</p>
                          <Badge variant="outline" className="text-[10px] shrink-0 ml-2">{q.marks}m</Badge>
                        </div>
                        <div className="text-xs space-y-1.5 pl-4">
                          <p><span className="font-medium text-green-600 dark:text-green-400">Expected:</span> {q.expectedAnswer}</p>
                          <p><span className="font-medium text-yellow-600 dark:text-yellow-400">Follow-up:</span> {q.followUp}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </div>
        ) : (
          <Card className="border-dashed"><CardContent className="p-12 text-center"><Mic className="h-12 w-12 mx-auto text-foreground/35 mb-4" /><p className="text-sm text-muted-foreground">Configure settings and generate oral questions.</p></CardContent></Card>
        )}
      </div>
    </div>
  )
}
