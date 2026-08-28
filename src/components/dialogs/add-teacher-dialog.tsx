'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Plus, Loader2 } from 'lucide-react'
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
import { createUserAction } from '@/features/users/actions'

interface AddTeacherFormValues {
  email: string
  full_name: string
  password: string
  phone: string
  department: string
  subject: string
  school_id: string
}

export function AddTeacherDialog({ schoolId }: { schoolId: string | null }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { control, handleSubmit, reset } = useForm<AddTeacherFormValues>({
    defaultValues: {
      email: '',
      full_name: '',
      password: '',
      phone: '',
      department: '',
      subject: '',
      school_id: schoolId ?? '',
    },
  })

  async function onSubmit(data: AddTeacherFormValues) {
    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('email', data.email)
    formData.append('full_name', data.full_name)
    formData.append('password', data.password)
    formData.append('phone', data.phone)
    formData.append('role', 'teacher')
    formData.append('department', data.department)
    formData.append('subject', data.subject)
    if (data.school_id) formData.append('school_id', data.school_id)

    const result = await createUserAction(formData)

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
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Teacher
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Teacher</DialogTitle>
          <DialogDescription>
            Create a new teacher account. They will receive an email to verify their account.
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
            name="password"
            label="Password"
            type="password"
            placeholder="Minimum 8 characters"
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
              Create Teacher
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
