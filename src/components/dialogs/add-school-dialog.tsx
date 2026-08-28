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
import { createSchoolAction } from '@/features/schools/actions'

interface AddSchoolFormValues {
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

export function AddSchoolDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { control, handleSubmit, reset } = useForm<AddSchoolFormValues>({
    defaultValues: {
      name: '',
      code: '',
      address: '',
      city: '',
      state: '',
      phone: '',
      email: '',
      motto: '',
      school_type: '',
      educational_level: '',
    },
  })

  async function onSubmit(data: AddSchoolFormValues) {
    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('name', data.name)
    formData.append('code', data.code)
    formData.append('address', data.address)
    formData.append('city', data.city)
    formData.append('state', data.state)
    formData.append('phone', data.phone)
    formData.append('email', data.email)
    formData.append('motto', data.motto)
    formData.append('school_type', data.school_type)
    formData.append('educational_level', data.educational_level)

    const result = await createSchoolAction(formData)

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
          Add School
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New School</DialogTitle>
          <DialogDescription>
            Register a new school on the platform.
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
              required
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
              Create School
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
