'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Plus, Loader2, Sparkles, Wand2 } from 'lucide-react'
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
import { Separator } from '@/components/ui/separator'
import { createQuestionAction } from '@/features/exams/actions'

// ============================================================================
// ExamForge AI — Create Question Dialog (Premium)
// ============================================================================
// forge-glass-elevated content, premium form layout,
// AI generation button with neural glow.
// ============================================================================

interface CreateQuestionFormValues {
  text: string
  type: string
  subject: string
  topic: string
  difficulty: string
  marks: string
  correct_answer: string
  explanation: string
  options: string
  school_id: string
}

export function CreateQuestionDialog({ schoolId }: { schoolId: string | null }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { control, handleSubmit, reset } = useForm<CreateQuestionFormValues>({
    defaultValues: {
      text: '',
      type: 'single_choice',
      subject: '',
      topic: '',
      difficulty: 'medium',
      marks: '1',
      correct_answer: '',
      explanation: '',
      options: '',
      school_id: schoolId ?? '',
    },
  })

  async function onSubmit(data: CreateQuestionFormValues) {
    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('text', data.text)
    formData.append('type', data.type)
    formData.append('subject', data.subject)
    formData.append('topic', data.topic)
    formData.append('difficulty', data.difficulty)
    formData.append('marks', data.marks)
    formData.append('correct_answer', data.correct_answer)
    formData.append('explanation', data.explanation)
    formData.append('options', data.options)
    if (data.school_id) formData.append('school_id', data.school_id)

    const result = await createQuestionAction(formData)

    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setOpen(false)
      reset()
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 forge-glow">
          <Plus className="h-4 w-4" />
          Create Question
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto forge-glass-elevated border-white/[0.06] rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight">Create New Question</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Add a question to the question bank. For multiple choice, provide options as JSON array.
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
              options={[
                { label: 'Single Choice', value: 'single_choice' },
                { label: 'Multi Choice', value: 'multi_choice' },
                { label: 'Multi Select', value: 'multi_select' },
                { label: 'True/False', value: 'true_false' },
                { label: 'Short Answer', value: 'short_answer' },
                { label: 'Essay', value: 'essay' },
                { label: 'Fill in Blank', value: 'fill_blank' },
                { label: 'Matching', value: 'matching' },
                { label: 'Ordering', value: 'ordering' },
              ]}
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
              options={[
                { label: 'Mathematics', value: 'Mathematics' },
                { label: 'English', value: 'English' },
                { label: 'Physics', value: 'Physics' },
                { label: 'Chemistry', value: 'Chemistry' },
                { label: 'Biology', value: 'Biology' },
                { label: 'Government', value: 'Government' },
                { label: 'Economics', value: 'Economics' },
                { label: 'Literature', value: 'Literature' },
                { label: 'History', value: 'History' },
                { label: 'Geography', value: 'Geography' },
              ]}
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
            <TextField
              control={control}
              name="correct_answer"
              label="Correct Answer"
              placeholder="e.g. A or the answer text"
            />
          </div>
          <TextareaField
            control={control}
            name="options"
            label="Options (JSON)"
            placeholder='[{"label":"A","content":"Option A","isCorrect":true},{"label":"B","content":"Option B"}]'
            description="For multiple choice questions. Provide as JSON array."
            rows={3}
          />
          <TextareaField
            control={control}
            name="explanation"
            label="Explanation"
            placeholder="Explain the correct answer (optional)"
            rows={2}
          />

          {/* AI Generation */}
          <Separator className="bg-border/30" />
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">AI-Powered Creation</p>
              <p className="text-xs text-muted-foreground mt-0.5">Let AI generate similar questions based on your subject and topic.</p>
            </div>
            <Button type="button" variant="outline" size="sm" className="gap-2 neural-glow border-neural/30 text-neural hover:bg-neural/10 hover:text-neural shrink-0">
              <Wand2 className="h-3.5 w-3.5" />
              Auto-fill
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
              Create Question
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
