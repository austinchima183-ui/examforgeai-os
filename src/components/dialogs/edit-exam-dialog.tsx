'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Pencil, Loader2, Sparkles } from 'lucide-react'
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
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { updateExamAction } from '@/features/exams/actions'

// ============================================================================
// ExamForge AI — Edit Exam Dialog (Premium)
// ============================================================================
// Pre-populated dialog for editing exam details.
// forge-glass-elevated content, premium form layout, AI features.
// ============================================================================

export interface ExamData {
  id: string
  title: string
  subject: string
  description?: string | null
  duration_minutes: number
  total_marks: number
  pass_mark: number
  class_name?: string | null
  start_time?: string | null
  end_time?: string | null
  instructions?: string | null
  shuffle_questions?: boolean
  show_results?: boolean
  allow_review?: boolean
  auto_submit?: boolean
}

interface EditExamFormValues {
  title: string
  subject: string
  description: string
  duration_minutes: string
  total_marks: string
  pass_mark: string
  class_name: string
  start_time: string
  end_time: string
  instructions: string
  shuffle_questions: boolean
  show_results: boolean
  allow_review: boolean
  auto_submit: boolean
}

interface EditExamDialogProps {
  exam: ExamData
  onSuccess?: () => void
  trigger?: React.ReactNode
}

export function EditExamDialog({ exam, onSuccess, trigger }: EditExamDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { control, handleSubmit, reset, watch, setValue } = useForm<EditExamFormValues>({
    defaultValues: {
      title: exam.title,
      subject: exam.subject,
      description: exam.description ?? '',
      duration_minutes: String(exam.duration_minutes),
      total_marks: String(exam.total_marks),
      pass_mark: String(exam.pass_mark),
      class_name: exam.class_name ?? '',
      start_time: exam.start_time ?? '',
      end_time: exam.end_time ?? '',
      instructions: exam.instructions ?? '',
      shuffle_questions: exam.shuffle_questions ?? false,
      show_results: exam.show_results ?? true,
      allow_review: exam.allow_review ?? false,
      auto_submit: exam.auto_submit ?? true,
    },
  })

  async function onSubmit(data: EditExamFormValues) {
    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('title', data.title)
    formData.append('subject', data.subject)
    if (data.description) formData.append('description', data.description)
    formData.append('duration_minutes', data.duration_minutes)
    formData.append('total_marks', data.total_marks)
    formData.append('pass_mark', data.pass_mark)
    if (data.class_name) formData.append('class_name', data.class_name)
    if (data.start_time) formData.append('start_time', data.start_time)
    if (data.end_time) formData.append('end_time', data.end_time)
    if (data.instructions) formData.append('instructions', data.instructions)
    formData.append('shuffle_questions', String(data.shuffle_questions))
    formData.append('show_results', String(data.show_results))
    formData.append('allow_review', String(data.allow_review))
    formData.append('auto_submit', String(data.auto_submit))

    const result = await updateExamAction(exam.id, formData)

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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto forge-glass-elevated border border-border/30">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight">Edit Exam</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Update exam details. Changes will be saved immediately.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <TextField
            control={control}
            name="title"
            label="Exam Title"
            placeholder="e.g. Mathematics Mid-Term Exam"
            required
          />
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
            <SelectField
              control={control}
              name="class_name"
              label="Class"
              placeholder="Select class"
              options={[
                { label: 'JSS1', value: 'JSS1' },
                { label: 'JSS2', value: 'JSS2' },
                { label: 'JSS3', value: 'JSS3' },
                { label: 'SS1', value: 'SS1' },
                { label: 'SS2', value: 'SS2' },
                { label: 'SS3', value: 'SS3' },
              ]}
            />
          </div>
          <TextareaField
            control={control}
            name="description"
            label="Description"
            placeholder="Brief description of the exam (optional)"
            rows={2}
          />
          <div className="grid grid-cols-3 gap-4">
            <TextField
              control={control}
              name="duration_minutes"
              label="Duration (min)"
              type="number"
              required
            />
            <TextField
              control={control}
              name="total_marks"
              label="Total Marks"
              type="number"
              required
            />
            <TextField
              control={control}
              name="pass_mark"
              label="Pass Mark"
              type="number"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <TextField
              control={control}
              name="start_time"
              label="Start Time"
              type="datetime-local"
            />
            <TextField
              control={control}
              name="end_time"
              label="End Time"
              type="datetime-local"
            />
          </div>
          <TextareaField
            control={control}
            name="instructions"
            label="Instructions"
            placeholder="Instructions shown to students before the exam"
            rows={3}
          />

          {/* AI Regeneration */}
          <Separator className="bg-border/30" />
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">AI Question Suggestions</p>
              <p className="text-xs text-muted-foreground mt-0.5">Get AI-powered question recommendations for this exam.</p>
            </div>
            <Button type="button" variant="outline" size="sm" className="gap-2 neural-glow border-neural/30 text-neural hover:bg-neural/10 hover:text-neural shrink-0">
              <Sparkles className="h-3.5 w-3.5" />
              Suggest
            </Button>
          </div>

          {/* Exam Settings */}
          <Separator className="bg-border/30" />
          <div className="space-y-4 rounded-xl bg-secondary/30 border border-border/20 p-4">
            <h4 className="text-sm font-semibold tracking-tight">Exam Settings</h4>
            <div className="flex items-center justify-between">
              <Label htmlFor="shuffle_questions" className="text-sm">Shuffle Questions</Label>
              <Switch
                id="shuffle_questions"
                checked={watch('shuffle_questions')}
                onCheckedChange={(v) => setValue('shuffle_questions', v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="show_results" className="text-sm">Show Results After Submit</Label>
              <Switch
                id="show_results"
                checked={watch('show_results')}
                onCheckedChange={(v) => setValue('show_results', v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="allow_review" className="text-sm">Allow Answer Review</Label>
              <Switch
                id="allow_review"
                checked={watch('allow_review')}
                onCheckedChange={(v) => setValue('allow_review', v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="auto_submit" className="text-sm">Auto-Submit on Time Up</Label>
              <Switch
                id="auto_submit"
                checked={watch('auto_submit')}
                onCheckedChange={(v) => setValue('auto_submit', v)}
              />
            </div>
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
