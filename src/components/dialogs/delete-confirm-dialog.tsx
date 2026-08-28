'use client'

import { useState, useCallback } from 'react'
import { Loader2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

// ============================================================================
// ExamForge AI — Delete Confirmation Dialog
// ============================================================================
// Reusable delete confirmation with type-safe confirmation, soft delete
// vs hard delete option, and "type name to confirm" safety mechanism.
// ============================================================================

export type DeleteEntityType =
  | 'exam'
  | 'question'
  | 'student'
  | 'teacher'
  | 'parent'
  | 'school'
  | 'user'
  | 'class'
  | 'resource'

interface DeleteConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityType: DeleteEntityType
  entityName: string
  entityId?: string
  onConfirm: (hardDelete: boolean) => void | Promise<void>
  /** Require typing the entity name to confirm (for destructive operations) */
  requireTyping?: boolean
  /** Allow choosing between soft delete (deactivate) and hard delete */
  allowSoftDelete?: boolean
  /** Default to soft delete if allowed */
  defaultSoftDelete?: boolean
  isLoading?: boolean
}

const ENTITY_LABELS: Record<DeleteEntityType, { singular: string; article: string }> = {
  exam: { singular: 'exam', article: 'this exam' },
  question: { singular: 'question', article: 'this question' },
  student: { singular: 'student', article: 'this student' },
  teacher: { singular: 'teacher', article: 'this teacher' },
  parent: { singular: 'parent', article: 'this parent' },
  school: { singular: 'school', article: 'this school' },
  user: { singular: 'user', article: 'this user' },
  class: { singular: 'class', article: 'this class' },
  resource: { singular: 'resource', article: 'this resource' },
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  entityType,
  entityName,
  onConfirm,
  requireTyping = false,
  allowSoftDelete = true,
  defaultSoftDelete = true,
  isLoading: externalLoading,
}: DeleteConfirmDialogProps) {
  const [internalLoading, setInternalLoading] = useState(false)
  const [confirmInput, setConfirmInput] = useState('')
  const [hardDelete, setHardDelete] = useState(!defaultSoftDelete)
  const [softDelete, setSoftDelete] = useState(defaultSoftDelete)

  const loading = externalLoading ?? internalLoading
  const entityLabel = ENTITY_LABELS[entityType]
  const isTypingMatch = !requireTyping || confirmInput === entityName
  const canConfirm = isTypingMatch && !loading

  const handleConfirm = useCallback(async () => {
    if (!canConfirm) return
    setInternalLoading(true)
    try {
      await onConfirm(hardDelete)
    } finally {
      setInternalLoading(false)
      setConfirmInput('')
      onOpenChange(false)
    }
  }, [canConfirm, hardDelete, onConfirm, onOpenChange])

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setConfirmInput('')
    }
    onOpenChange(newOpen)
  }

  function handleDeleteTypeChange(isSoft: boolean) {
    setSoftDelete(isSoft)
    setHardDelete(!isSoft)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[440px] forge-glass-elevated border-white/[0.06] rounded-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete {entityLabel.singular}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2">
              <p>
                Are you sure you want to delete{' '}
                <span className="font-medium text-foreground">{entityName}</span>?
                This action {(softDelete && allowSoftDelete) ? 'will deactivate' : 'cannot'} be easily undone.
              </p>
              {!(softDelete && allowSoftDelete) && (
                <p className="text-destructive font-medium">
                  Warning: This is a permanent action. All associated data will be lost.
                </p>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Soft delete vs hard delete option */}
          {allowSoftDelete && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Delete Method</Label>
              <div className="space-y-2">
                <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-accent/50 transition-colors">
                  <Checkbox
                    checked={softDelete}
                    onCheckedChange={() => handleDeleteTypeChange(true)}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium">Deactivate (Recommended)</p>
                    <p className="text-xs text-muted-foreground">
                      Mark as inactive. Data is preserved and can be reactivated later.
                    </p>
                  </div>
                </label>
                <label className="flex items-start gap-3 rounded-lg border border-destructive/30 p-3 cursor-pointer hover:bg-destructive/5 transition-colors">
                  <Checkbox
                    checked={hardDelete}
                    onCheckedChange={() => handleDeleteTypeChange(false)}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-sm font-medium text-destructive">Permanent Delete</p>
                    <p className="text-xs text-muted-foreground">
                      Permanently remove {entityLabel.article} and all associated data. This cannot be undone.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Type name to confirm safety mechanism */}
          {requireTyping && (
            <div className="space-y-2">
              <Label htmlFor="delete-confirm-input" className="text-sm font-medium">
                Type <span className="font-mono text-destructive">{entityName}</span> to confirm
              </Label>
              <Input
                id="delete-confirm-input"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder={entityName}
                className={cn(
                  'font-mono forge-input-glow',
                  confirmInput && confirmInput !== entityName && 'border-destructive focus-visible:ring-destructive/30',
                  confirmInput === entityName && 'border-green-500 focus-visible:ring-green-500/30'
                )}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {(softDelete && allowSoftDelete) ? 'Deactivate' : 'Delete Permanently'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
