'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Pencil, Loader2, Plus, Trash2, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { TextField } from '@/components/forms/text-field'
import { TextareaField } from '@/components/forms/textarea-field'
import { SelectField } from '@/components/forms/select-field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { updateQuestionAction } from '@/features/exams/actions'
import type { QuestionType, DifficultyLevel } from '@/lib/types'

// ============================================================================
// ExamForge AI — Edit Question Dialog (Premium)
// ============================================================================
// Edit dialog for questions with dynamic option builder for MCQ types.
// forge-glass-elevated content, premium form layout, AI features.
// ============================================================================

export interface QuestionData {
  id: string
  text: string
  type: QuestionType
  subject: string
  topic?: string | null
  difficulty: DifficultyLevel
  marks: number
  options?: unknown
  correct_answer?: string | null
  explanation?: string | null
}

interface OptionItem {
  label: string
  content: string
  isCorrect: boolean
}

interface EditQuestionFormValues {
  text: string
  type: string
  subject: string
  topic: string
  difficulty: string
  marks: string
  correct_answer: string
  explanation: string
}

interface EditQuestionDialogProps {
  question: QuestionData
  onSuccess?: () => void
  trigger?: React.ReactNode
}

const QUESTION_TYPES: { label: string; value: QuestionType }[] = [
  { label: 'Single Choice', value: 'single_choice' },
  { label: 'Multi Choice', value: 'multi_choice' },
  { label: 'Multi Select', value: 'multi_select' },
  { label: 'True/False', value: 'true_false' },
  { label: 'Short Answer', value: 'short_answer' },
  { label: 'Essay', value: 'essay' },
  { label: 'Fill in Blank', value: 'fill_blank' },
  { label: 'Matching', value: 'matching' },
  { label: 'Ordering', value: 'ordering' },
]

const SUBJECTS = [
  'Mathematics', 'English', 'Physics', 'Chemistry', 'Biology',
  'Government', 'Economics', 'Literature', 'History', 'Geography',
]

function parseOptions(options: unknown): OptionItem[] {
  if (Array.isArray(options)) {
    return options.map((opt: Record<string, unknown>, i: number) => ({
      label: String(opt.label ?? String.fromCharCode(65 + i)),
      content: String(opt.content ?? ''),
      isCorrect: Boolean(opt.isCorrect),
    }))
  }
  if (typeof options === 'string') {
    try {
      const parsed = JSON.parse(options)
      return parseOptions(parsed)
    } catch {
      return []
    }
  }
  return []
}

const TYPES_WITH_OPTIONS: QuestionType[] = ['single_choice', 'multi_choice', 'multi_select', 'true_false', 'matching', 'ordering']

export function EditQuestionDialog({ question, onSuccess, trigger }: EditQuestionDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [options, setOptions] = useState<OptionItem[]>(() => parseOptions(question.options))
  const [selectedType, setSelectedType] = useState<string>(question.type)

  const { control, handleSubmit, reset, watch, setValue } = useForm<EditQuestionFormValues>({
    defaultValues: {
      text: question.text,
      type: question.type,
      subject: question.subject,
      topic: question.topic ?? '',
      difficulty: question.difficulty,
      marks: String(question.marks),
      correct_answer: question.correct_answer ?? '',
      explanation: question.explanation ?? '',
    },
  })

  const watchedType = watch('type')
  const showOptions = TYPES_WITH_OPTIONS.includes(watchedType as QuestionType)

  function handleTypeChange(type: string) {
    setSelectedType(type)
    setValue('type', type)
    if (type === 'true_false') {
      setOptions([
        { label: 'A', content: 'True', isCorrect: question.correct_answer === 'True' },
        { label: 'B', content: 'False', isCorrect: question.correct_answer === 'False' },
      ])
    }
  }

  function addOption() {
    const nextLabel = String.fromCharCode(65 + options.length)
    setOptions([...options, { label: nextLabel, content: '', isCorrect: false }])
  }

  function removeOption(index: number) {
    setOptions(options.filter((_, i) => i !== index).map((opt, i) => ({
      ...opt,
      label: String.fromCharCode(65 + i),
    })))
  }

  function updateOption(index: number, field: keyof OptionItem, value: string | boolean) {
    const updated = [...options]
    updated[index] = { ...updated[index], [field]: value }
    // For single-select MCQ, only one correct answer
    if (field === 'isCorrect' && value === true && selectedType === 'single_choice') {
      updated.forEach((opt, i) => { if (i !== index) opt.isCorrect = false })
    }
    setOptions(updated)
  }

  async function onSubmit(data: EditQuestionFormValues) {
    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('text', data.text)
    formData.append('type', data.type)
    formData.append('subject', data.subject)
    if (data.topic) formData.append('topic', data.topic)
    formData.append('difficulty', data.difficulty)
    formData.append('marks', data.marks)
    formData.append('correct_answer', data.correct_answer)
    if (data.explanation) formData.append('explanation', data.explanation)

    // Include options for MCQ-type questions
    if (showOptions && options.length > 0) {
      formData.append('options', JSON.stringify(options))
    }

    const result = await updateQuestionAction(question.id, formData)

    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setOpen(false)
      setLoading(false)
      onSuccess?.()
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-2 border-border/40 hover:border-border/60">
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto forge-glass-elevated border border-border/30">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight">Edit Question</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Update question details, options, and correct answer.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <TextareaField
            control={control}
            name="text"
            label="Question Text"
            placeholder="Enter the question..."
            required
            rows={3}
          />
          <div className="grid grid-cols-2 gap-4">
            <SelectField
              control={control}
              name="type"
              label="Question Type"
              required
              options={QUESTION_TYPES.map(t => ({ label: t.label, value: t.value }))}
            />
            <SelectField
              control={control}
              name="difficulty"
              label="Difficulty"
              required
              options={[
                { label: 'Easy', value: 'easy' },
                { label: 'Medium', value: 'medium' },
                { label: 'Hard', value: 'hard' },
                { label: 'Expert', value: 'expert' },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <SelectField
              control={control}
              name="subject"
              label="Subject"
              placeholder="Select subject"
              required
              options={SUBJECTS.map(s => ({ label: s, value: s }))}
            />
            <TextField
              control={control}
              name="topic"
              label="Topic"
              placeholder="e.g. Algebra, Photosynthesis"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <TextField
              control={control}
              name="marks"
              label="Marks"
              type="number"
              required
            />
            {!showOptions && (
              <TextField
                control={control}
                name="correct_answer"
                label="Correct Answer"
                placeholder="e.g. A or the answer text"
              />
            )}
          </div>

          {/* Dynamic Option Builder for MCQ-type questions — Premium */}
          {showOptions && (
            <div className="space-y-3 rounded-xl bg-secondary/30 border border-border/20 p-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold tracking-tight">Options</h4>
                <Button type="button" variant="outline" size="sm" onClick={addOption} className="gap-1 border-border/40 hover:border-border/60">
                  <Plus className="h-3 w-3" />
                  Add Option
                </Button>
              </div>
              {options.map((opt, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="flex items-center gap-2 pt-2">
                    <Checkbox
                      checked={opt.isCorrect}
                      onCheckedChange={(v) => updateOption(index, 'isCorrect', v === true)}
                      className="border-border/40"
                    />
                    <span className="text-sm font-medium w-6 text-muted-foreground">{opt.label}</span>
                  </div>
                  <div className="flex-1">
                    <Label className="sr-only">Option {opt.label} content</Label>
                    <Input
                      value={opt.content}
                      onChange={(e) => updateOption(index, 'content', e.target.value)}
                      placeholder={`Option ${opt.label}`}
                      className="text-sm bg-secondary/50 border-border/30 forge-input-glow"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeOption(index)}
                    disabled={options.length <= 2}
                    className="mt-1 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <TextareaField
            control={control}
            name="explanation"
            label="Explanation"
            placeholder="Explain the correct answer (optional)"
            rows={2}
          />

          {/* AI Enhancement */}
          <Separator className="bg-border/30" />
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">AI Enhancement</p>
              <p className="text-xs text-muted-foreground mt-0.5">Improve this question or generate variations with AI.</p>
            </div>
            <Button type="button" variant="outline" size="sm" className="gap-2 neural-glow border-neural/30 text-neural hover:bg-neural/10 hover:text-neural shrink-0">
              <Wand2 className="h-3.5 w-3.5" />
              Enhance
            </Button>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
          )}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading} className="border-border/40">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="forge-glow">
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
