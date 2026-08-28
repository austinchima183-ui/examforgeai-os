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

interface AddStudentFormValues {
  email: string
  full_name: string
  password: string
  phone: string
  class_name: string
  school_id: string
}

export function AddStudentDialog({ schoolId }: { schoolId: string | null }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { control, handleSubmit, reset } = useForm<AddStudentFormValues>({
    defaultValues: {
      email: '',
      full_name: '',
      password: '',
      phone: '',
      class_name: '',
      school_id: schoolId ?? '',
    },
  })

  async function onSubmit(data: AddStudentFormValues) {
    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('email', data.email)
    formData.append('full_name', data.full_name)
    formData.append('password', data.password)
    formData.append('phone', data.phone)
    formData.append('role', 'student')
    formData.append('class_name', data.class_name)
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
          Add Student
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Student</DialogTitle>
          <DialogDescription>
            Create a new student account. They will receive an email to verify their account.
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
          <TextField
            control={control}
            name="password"
            label="Password"
            type="password"
            placeholder="Minimum 8 characters"
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
              Create Student
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
