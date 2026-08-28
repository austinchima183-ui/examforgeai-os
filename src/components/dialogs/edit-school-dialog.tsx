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
import { TextareaField } from '@/components/forms/textarea-field'
import { SelectField } from '@/components/forms/select-field'
import { updateSchoolAction } from '@/features/schools/actions'

// ============================================================================
// ExamForge AI — Edit School Dialog
// ============================================================================
// Pre-populated dialog for editing school details. Calls updateSchoolAction
// which validates with Zod and checks admin role.
// ============================================================================

export interface SchoolData {
  id: string
  name: string
  code?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  phone?: string | null
  email?: string | null
  motto?: string | null
  school_type?: string | null
  educational_level?: string | null
}

interface EditSchoolFormValues {
  name: string
  code: string
  address: string
  city: string
  state: string
  phone: string
  email: string
  motto: string
  school_type: string
  educational_level: string
}

interface EditSchoolDialogProps {
  school: SchoolData
  onSuccess?: () => void
  trigger?: React.ReactNode
}

export function EditSchoolDialog({ school, onSuccess, trigger }: EditSchoolDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { control, handleSubmit, reset } = useForm<EditSchoolFormValues>({
    defaultValues: {
      name: school.name,
      code: school.code ?? '',
      address: school.address ?? '',
      city: school.city ?? '',
      state: school.state ?? '',
      phone: school.phone ?? '',
      email: school.email ?? '',
      motto: school.motto ?? '',
      school_type: school.school_type ?? '',
      educational_level: school.educational_level ?? '',
    },
  })

  async function onSubmit(data: EditSchoolFormValues) {
    setLoading(true)
    setError(null)

    const formData = new FormData()
    if (data.name) formData.append('name', data.name)
    if (data.code) formData.append('code', data.code)
    if (data.address) formData.append('address', data.address)
    if (data.city) formData.append('city', data.city)
    if (data.state) formData.append('state', data.state)
    if (data.phone) formData.append('phone', data.phone)
    if (data.email) formData.append('email', data.email)
    if (data.motto) formData.append('motto', data.motto)
    if (data.school_type) formData.append('school_type', data.school_type)
    if (data.educational_level) formData.append('educational_level', data.educational_level)

    const result = await updateSchoolAction(school.id, formData)

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
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit School</DialogTitle>
          <DialogDescription>
            Update school information. Changes take effect immediately.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <TextField
              control={control}
              name="name"
              label="School Name"
              placeholder="Enter school name"
              required
            />
            <TextField
              control={control}
              name="code"
              label="School Code"
              placeholder="Unique code"
            />
          </div>
          <TextField
            control={control}
            name="address"
            label="Address"
            placeholder="Street address"
          />
          <div className="grid grid-cols-3 gap-4">
            <TextField
              control={control}
              name="city"
              label="City"
              placeholder="City"
            />
            <TextField
              control={control}
              name="state"
              label="State"
              placeholder="State"
            />
            <TextField
              control={control}
              name="phone"
              label="Phone"
              type="tel"
              placeholder="Phone"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <TextField
              control={control}
              name="email"
              label="Email"
              type="email"
              placeholder="school@email.com"
            />
            <TextField
              control={control}
              name="motto"
              label="Motto"
              placeholder="School motto"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <SelectField
              control={control}
              name="school_type"
              label="School Type"
              placeholder="Select type"
              options={[
                { label: 'Primary', value: 'primary' },
                { label: 'Secondary', value: 'secondary' },
                { label: 'Tertiary', value: 'tertiary' },
                { label: 'Mixed', value: 'mixed' },
              ]}
            />
            <SelectField
              control={control}
              name="educational_level"
              label="Educational Level"
              placeholder="Select level"
              options={[
                { label: 'Primary', value: 'primary' },
                { label: 'Secondary', value: 'secondary' },
                { label: 'Vocational', value: 'vocational' },
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
