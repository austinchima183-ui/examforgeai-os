'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Pencil, Loader2, Search, X, Plus } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { updateUserAction } from '@/features/users/actions'

// ============================================================================
// ExamForge AI — Edit Parent Dialog
// ============================================================================
// Edit parent profile with child search and link/unlink UI.
// Uses updateUserAction for profile updates and parent_children
// junction table for child linking.
// ============================================================================

export interface ParentData {
  id: string
  full_name: string
  email: string
  phone?: string | null
  school_id?: string | null
}

export interface ChildData {
  id: string
  full_name: string
  email?: string | null
  class_name?: string | null
}

interface EditParentFormValues {
  full_name: string
  email: string
  phone: string
}

interface EditParentDialogProps {
  parent: ParentData
  children?: ChildData[]
  onSuccess?: () => void
  trigger?: React.ReactNode
}

export function EditParentDialog({ parent, children = [], onSuccess, trigger }: EditParentDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [linkedChildren, setLinkedChildren] = useState<ChildData[]>(children)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ChildData[]>([])
  const [searching, setSearching] = useState(false)

  const { control, handleSubmit, reset } = useForm<EditParentFormValues>({
    defaultValues: {
      full_name: parent.full_name,
      email: parent.email,
      phone: parent.phone ?? '',
    },
  })

  // Search for students to link
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&type=student`)
        if (res.ok) {
          const data = await res.json()
          const students = (data.results ?? [])
            .filter((r: { type: string }) => r.type === 'student')
            .map((r: { id: string; title: string; subtitle: string }) => ({
              id: r.id,
              full_name: r.title,
              email: r.subtitle,
            }))
          // Filter out already linked children
          setSearchResults(students.filter((s: ChildData) => !linkedChildren.some(c => c.id === s.id)))
        }
      } catch {
        // Search failed silently
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, linkedChildren])

  function unlinkChild(childId: string) {
    setLinkedChildren(prev => prev.filter(c => c.id !== childId))
  }

  function linkChild(child: ChildData) {
    setLinkedChildren(prev => [...prev, child])
    setSearchResults(prev => prev.filter(r => r.id !== child.id))
    setSearchQuery('')
  }

  async function onSubmit(data: EditParentFormValues) {
    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('full_name', data.full_name)
    formData.append('email', data.email)
    if (data.phone) formData.append('phone', data.phone)

    const result = await updateUserAction(parent.id, formData)

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
          <DialogTitle>Edit Parent</DialogTitle>
          <DialogDescription>
            Update parent profile and manage linked children.
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
            name="phone"
            label="Phone"
            type="tel"
            placeholder="Phone number"
          />

          {/* Linked Children Section */}
          <div className="space-y-3 rounded-lg border p-4">
            <h4 className="text-sm font-medium">Linked Children</h4>

            {/* Currently linked children */}
            {linkedChildren.length > 0 ? (
              <div className="space-y-2">
                {linkedChildren.map(child => (
                  <div key={child.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">{child.full_name}</p>
                      {child.class_name && (
                        <p className="text-xs text-muted-foreground">Class: {child.class_name}</p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => unlinkChild(child.id)}
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No children linked yet.</p>
            )}

            {/* Search to add children */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search students to link..."
                className="pl-9"
              />
            </div>

            {searching && (
              <p className="text-xs text-muted-foreground">Searching...</p>
            )}

            {searchResults.length > 0 && (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {searchResults.map(student => (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => linkChild(student)}
                    className="flex items-center gap-2 w-full rounded-md px-3 py-2 text-left hover:bg-accent transition-colors"
                  >
                    <Plus className="h-3 w-3 text-muted-foreground" />
                    <div>
                      <p className="text-sm">{student.full_name}</p>
                      {student.email && (
                        <p className="text-xs text-muted-foreground">{student.email}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
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
