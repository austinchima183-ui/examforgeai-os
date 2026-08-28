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
// ExamForge AI — Edit Teacher Dialog
// ============================================================================
// Pre-populated dialog for editing teacher profile. Updates both auth
// metadata and the profiles table via updateUserAction.
// ============================================================================

export interface TeacherData {
  id: string
  full_name: string
  email: string
  phone?: string | null
  department?: string | null
  subject?: string | null
  school_id?: string | null
}

interface EditTeacherFormValues {
  full_name: string
  email: string
  phone: string
  department: string
  subject: string
}

interface EditTeacherDialogProps {
  teacher: TeacherData
  onSuccess?: () => void
  trigger?: React.ReactNode
}

export function EditTeacherDialog({ teacher, onSuccess, trigger }: EditTeacherDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { control, handleSubmit, reset } = useForm<EditTeacherFormValues>({
    defaultValues: {
      full_name: teacher.full_name,
      email: teacher.email,
      phone: teacher.phone ?? '',
      department: teacher.department ?? '',
      subject: teacher.subject ?? '',
    },
  })

  async function onSubmit(data: EditTeacherFormValues) {
    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('full_name', data.full_name)
    formData.append('email', data.email)
    if (data.phone) formData.append('phone', data.phone)
    if (data.department) formData.append('department', data.department)
    if (data.subject) formData.append('subject', data.subject)

    const result = await updateUserAction(teacher.id, formData)

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
          <DialogTitle>Edit Teacher</DialogTitle>
          <DialogDescription>
            Update teacher profile information. Changes take effect immediately.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <TextField
            control={control}
            name="full_name"
            label="Full Name"
            placeholder="Enter teacher's full name"
            required
          />
          <TextField
            control={control}
            name="email"
            label="Email"
            type="email"
            placeholder="teacher@school.edu"
            required
          />
          <TextField
            control={control}
            name="phone"
            label="Phone"
            type="tel"
            placeholder="Optional"
          />
          <div className="grid grid-cols-2 gap-4">
            <SelectField
              control={control}
              name="department"
              label="Department"
              placeholder="Select department"
              options={[
                { label: 'Science', value: 'Science' },
                { label: 'Arts', value: 'Arts' },
                { label: 'Commercial', value: 'Commercial' },
                { label: 'General', value: 'General' },
              ]}
            />
            <SelectField
              control={control}
              name="subject"
              label="Subject"
              placeholder="Select subject"
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
