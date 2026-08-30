'use client'

import * as React from 'react'
import { Check, X, Pencil, Loader2, CloudUpload, CloudOff, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useAutosave } from '@/hooks/use-autosave'

// ============================================================================
// ExamForge AI OS — InlineEditField
// ============================================================================
// Inline-editable text field. Renders as plain text with a hover-edit affordance;
// clicking the pencil enters edit mode (renders an input + save/cancel buttons).
// On save, calls onCommit which can be async (shows spinner during commit).
//
// Pattern: optimistic updates — call onCommit, parent updates local state,
// server reconciles. Failed commits bubble up via rejected promise.
// ============================================================================

export interface InlineEditFieldProps {
  /** Current value */
  value: string
  /** Commit handler — receives the new value. May return a Promise. */
  onCommit: (value: string) => void | Promise<void>
  /** Input placeholder */
  placeholder?: string
  /** Whether to render a textarea (multi-line) instead of an input */
  multiline?: boolean
  /** Whether the field is editable — defaults to true */
  editable?: boolean
  /** Display formatting — applied to the rendered value when not editing */
  display?: (value: string) => React.ReactNode
  /** Max width for the editing state input (e.g. "w-64") */
  inputWidth?: string
  className?: string
  /** Accessible label for the edit button */
  editLabel?: string
  /**
   * Autosave mode: commits the draft automatically after the debounce window
   * while the editor stays open, with a live status indicator. When set, the
   * explicit save button becomes optional (still shown for immediate commit).
   */
  autoSave?: {
    /** Debounce in ms (default 1500) */
    debounceMs?: number
  }
}

export function InlineEditField({
  value,
  onCommit,
  placeholder = 'Click to edit...',
  multiline = false,
  editable = true,
  display,
  inputWidth = 'w-48',
  className,
  editLabel = 'Edit',
  autoSave,
}: InlineEditFieldProps) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [draft, setDraft] = React.useState(value)
  const [isSaving, setIsSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!isEditing) setDraft(value)
  }, [value, isEditing])

  const startEdit = () => {
    if (!editable) return
    setDraft(value)
    setIsEditing(true)
    setError(null)
  }

  const cancel = () => {
    setDraft(value)
    setIsEditing(false)
    setError(null)
  }

  const save = async () => {
    if (draft === value) {
      setIsEditing(false)
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      await onCommit(draft)
      setIsEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  // ── Autosave: debounce commits while the editor is open ──
  const autosave = useAutosave(isEditing ? draft : value, {
    enabled: !!autoSave && isEditing,
    interval: autoSave?.debounceMs ?? 1500,
    maxRetries: 2,
    detectChanges: true,
    onSave: async (next) => {
      const text = String(next)
      if (text === value) return
      await onCommit(text)
    },
  })

  if (isEditing) {
    const InputComp = multiline ? Textarea : Input
    return (
      <div className="inline-flex flex-col gap-1">
        <div className="flex items-start gap-1.5">
          <InputComp
            value={draft}
            onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
              setDraft(e.target.value)
            }
            placeholder={placeholder}
            className={cn(
              'h-8 text-sm bg-background/60 border-white/[0.06]',
              !multiline && inputWidth,
              multiline && 'min-h-[60px] resize-y',
            )}
            autoFocus
            disabled={isSaving}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !multiline && !e.shiftKey) {
                e.preventDefault()
                save()
              } else if (e.key === 'Escape') {
                e.preventDefault()
                cancel()
              }
            }}
            aria-label={editLabel}
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={save}
            disabled={isSaving}
            className="h-8 w-8 text-emerald-600 hover:text-emerald-500 hover:bg-emerald-500/10"
            aria-label="Save"
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={cancel}
            disabled={isSaving}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label="Cancel edit"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        {autoSave && !error && (
          <p
            className="flex items-center gap-1 text-[11px] text-foreground/50"
            role="status"
            aria-live="polite"
          >
            {autosave.status === 'saving' && (
              <>
                <CloudUpload className="h-3 w-3 animate-pulse" aria-hidden="true" />
                Autosaving…
              </>
            )}
            {autosave.status === 'saved' && (
              <>
                <CheckCircle2 className="h-3 w-3 text-emerald-500" aria-hidden="true" />
                Autosaved
              </>
            )}
            {autosave.status === 'error' && (
              <>
                <CloudOff className="h-3 w-3 text-destructive" aria-hidden="true" />
                {autosave.lastError ?? 'Autosave failed — use Save'}
              </>
            )}
            {autosave.status === 'idle' && <span>Autosave on · Esc cancels</span>}
          </p>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'group inline-flex items-center gap-1.5 rounded-md px-1 -mx-1',
        editable && 'cursor-text hover:bg-white/[0.04]',
        className,
      )}
      onClick={editable ? startEdit : undefined}
      role={editable ? 'button' : undefined}
      tabIndex={editable ? 0 : undefined}
      onKeyDown={
        editable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                startEdit()
              }
            }
          : undefined
      }
      aria-label={editable ? `${editLabel}: ${value}` : undefined}
    >
      <span className="text-sm text-foreground/90">
        {value ? (display ? display(value) : value) : (
          <span className="text-muted-foreground/50 italic">{placeholder}</span>
        )}
      </span>
      {editable && (
        <Pencil
          className="h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground/70 transition-colors"
          aria-hidden="true"
        />
      )}
    </div>
  )
}
