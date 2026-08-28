'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Pencil, Loader2 } from 'lucide-react'
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
import { SelectField } from '@/components/forms/select-field'
import { updateUserAction } from '@/features/users/actions'

// ============================================================================
// ExamForge AI — Edit Student Dialog
// ============================================================================
// Pre-populated dialog for editing student profile. Updates both auth
// metadata and the profiles table via updateUserAction.
// ============================================================================

export interface StudentData {
  id: string
  full_name: string
  email: string
  phone?: string | null
  class_name?: string | null
  school_id?: string | null
}

interface EditStudentFormValues {
  full_name: string
  email: string
  phone: string
  class_name: string
}

interface EditStudentDialogProps {
  student: StudentData
  onSuccess?: () => void
  trigger?: React.ReactNode
}

export function EditStudentDialog({ student, onSuccess, trigger }: EditStudentDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { control, handleSubmit, reset } = useForm<EditStudentFormValues>({
    defaultValues: {
      full_name: student.full_name,
      email: student.email,
      phone: student.phone ?? '',
      class_name: student.class_name ?? '',
    },
  })

  async function onSubmit(data: EditStudentFormValues) {
    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('full_name', data.full_name)
    formData.append('email', data.email)
    if (data.phone) formData.append('phone', data.phone)
    if (data.class_name) formData.append('class_name', data.class_name)

    const result = await updateUserAction(student.id, formData)

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
          <Button variant="outline" size="sm" className="gap-2">
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Student</DialogTitle>
          <DialogDescription>
            Update student profile information. Changes take effect immediately.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <TextField
            control={control}
            name="full_name"
            label="Full Name"
            placeholder="Enter student's full name"
            required
          />
          <TextField
            control={control}
            name="email"
            label="Email"
            type="email"
            placeholder="student@school.edu"
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <TextField
              control={control}
              name="phone"
              label="Phone"
              type="tel"
              placeholder="Optional"
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
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
