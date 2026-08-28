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
import { createUserAction } from '@/features/users/actions'

interface AddParentFormValues {
  email: string
  full_name: string
  password: string
  phone: string
  school_id: string
}

export function AddParentDialog({ schoolId }: { schoolId: string | null }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { control, handleSubmit, reset } = useForm<AddParentFormValues>({
    defaultValues: {
      email: '',
      full_name: '',
      password: '',
      phone: '',
      school_id: schoolId ?? '',
    },
  })

  async function onSubmit(data: AddParentFormValues) {
    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('email', data.email)
    formData.append('full_name', data.full_name)
    formData.append('password', data.password)
    formData.append('phone', data.phone)
    formData.append('role', 'parent')
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
          Add Parent
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Parent</DialogTitle>
          <DialogDescription>
            Create a new parent account. They will be able to monitor their children&apos;s progress.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <TextField
            control={control}
            name="full_name"
            label="Full Name"
            placeholder="Enter parent's full name"
            required
          />
          <TextField
            control={control}
            name="email"
            label="Email"
            type="email"
            placeholder="parent@email.com"
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
            placeholder="Phone number"
          />
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Parent
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
