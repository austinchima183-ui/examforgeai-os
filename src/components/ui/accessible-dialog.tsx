'use client'

// ============================================================================
// ExamForge AI — Accessible Dialog (Enhanced)
// ============================================================================
// Built on Radix Dialog with comprehensive accessibility enhancements:
// - Focus trap with proper restore
// - Escape to close
// - Click outside to close
// - Announce open/close to screen readers
// - Scroll lock on body
// - Multiple dialog stacking support
// - Loading state within dialog
// WCAG 2.2 AA: 2.4.3 Focus Order, 4.1.2 Name/Role/Value, 2.1.1 Keyboard
// ============================================================================

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { XIcon, Loader2Icon } from 'lucide-react'
import { cn } from '@/lib/utils'

// ──────────────────────────────────────────────────────────────
// Dialog Stack Management
// ──────────────────────────────────────────────────────────────

const DIALOG_STACK: Set<string> = new Set()
let scrollLockCount = 0

function registerDialog(id: string) {
  DIALOG_STACK.add(id)
  scrollLockCount++
  if (scrollLockCount === 1) {
    document.body.style.overflow = 'hidden'
    // Save the current scroll position for restoration
    document.body.dataset.scrollLockY = String(window.scrollY)
  }
}

function unregisterDialog(id: string) {
  DIALOG_STACK.delete(id)
  scrollLockCount = Math.max(0, scrollLockCount - 1)
  if (scrollLockCount === 0) {
    document.body.style.overflow = ''
    delete document.body.dataset.scrollLockY
  }
}

function getDialogDepth(id: string): number {
  let depth = 0
  for (const dialogId of DIALOG_STACK) {
    depth++
    if (dialogId === id) break
  }
  return depth
}

// ──────────────────────────────────────────────────────────────
// AccessibleDialog Root
// ──────────────────────────────────────────────────────────────

interface AccessibleDialogProps
  extends React.ComponentProps<typeof DialogPrimitive.Root> {
  /** Unique ID for stacking management */
  dialogId?: string
  /** Announce open/close to screen readers */
  announceOpenClose?: boolean
  /** Accessible name for the dialog */
  accessibleName?: string
}

const AccessibleDialogContext = React.createContext<{
  dialogId: string
  isLoading: boolean
  setIsLoading: (_loading: boolean) => void
}>({
  dialogId: '',
  isLoading: false,
  setIsLoading: () => {},
})

/**
 * Enhanced accessible dialog root component.
 * Handles scroll lock, stacking, and screen reader announcements.
 */
function AccessibleDialog({
  dialogId: propDialogId,
  announceOpenClose = true,
  accessibleName,
  onOpenChange,
  open,
  ...props
}: AccessibleDialogProps) {
  const uniqueId = React.useId()
  const dialogId = propDialogId ?? uniqueId.replace(/:/g, '')
  const [isLoading, setIsLoading] = React.useState(false)

  // Announce dialog open/close to screen readers
  const announceRef = React.useRef<HTMLDivElement | null>(null)

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        registerDialog(dialogId)
        if (announceOpenClose && announceRef.current) {
          announceRef.current.textContent = `${accessibleName ?? 'Dialog'} opened`
        }
      } else {
        unregisterDialog(dialogId)
        if (announceOpenClose && announceRef.current) {
          announceRef.current.textContent = `${accessibleName ?? 'Dialog'} closed`
        }
      }
      onOpenChange?.(nextOpen)
    },
    [dialogId, announceOpenClose, accessibleName, onOpenChange]
  )

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (DIALOG_STACK.has(dialogId)) {
        unregisterDialog(dialogId)
      }
    }
  }, [dialogId])

  return (
    <AccessibleDialogContext.Provider value={{ dialogId, isLoading, setIsLoading }}>
      {/* Live region for announcements */}
      {announceOpenClose && (
        <div
          ref={announceRef}
          role="status"
          aria-live="assertive"
          aria-atomic="true"
          className="sr-only"
        />
      )}
      <DialogPrimitive.Root
        data-slot="accessible-dialog"
        open={open}
        onOpenChange={handleOpenChange}
        {...props}
      />
    </AccessibleDialogContext.Provider>
  )
}

// ──────────────────────────────────────────────────────────────
// AccessibleDialogTrigger
// ──────────────────────────────────────────────────────────────

function AccessibleDialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="accessible-dialog-trigger" {...props} />
}

// ──────────────────────────────────────────────────────────────
// AccessibleDialogContent
// ──────────────────────────────────────────────────────────────

interface AccessibleDialogContentProps
  extends React.ComponentProps<typeof DialogPrimitive.Content> {
  /** Show close button */
  showCloseButton?: boolean
  /** Loading overlay */
  loading?: boolean
  /** Loading message */
  loadingMessage?: string
  /** Close on click outside */
  closeOnOutsideClick?: boolean
}

function AccessibleDialogContent({
  className,
  children,
  showCloseButton = true,
  loading: loadingProp,
  loadingMessage = 'Loading...',
  closeOnOutsideClick = true,
  onPointerDownOutside,
  ...props
}: AccessibleDialogContentProps) {
  const { dialogId, isLoading } = React.useContext(AccessibleDialogContext)
  const depth = typeof window !== 'undefined' ? getDialogDepth(dialogId) : 0
  const showLoading = loadingProp ?? isLoading

  const handlePointerDownOutside = React.useCallback(
    (event: any) => {
      if (!closeOnOutsideClick) {
        event.preventDefault()
        return
      }
      onPointerDownOutside?.(event)
    },
    [closeOnOutsideClick, onPointerDownOutside]
  )

  // Calculate z-index based on stacking depth
  const zIndex = 50 + depth * 10

  return (
    <DialogPrimitive.Portal data-slot="accessible-dialog-portal">
      <DialogPrimitive.Overlay
        data-slot="accessible-dialog-overlay"
        className={cn(
          'fixed inset-0 bg-black/50',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
        )}
        style={{ zIndex }}
      />
      <DialogPrimitive.Content
        data-slot="accessible-dialog-content"
        className={cn(
          'fixed top-[50%] left-[50%] grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-6 shadow-lg duration-200',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          'sm:max-w-lg',
          className
        )}
        style={{ zIndex: zIndex + 1 }}
        onPointerDownOutside={handlePointerDownOutside}
        {...props}
      >
        {/* Loading overlay */}
        {showLoading && (
          <div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-lg bg-background/80 backdrop-blur-sm"
            role="alert"
            aria-busy="true"
            aria-label={loadingMessage}
          >
            <Loader2Icon className="size-6 animate-spin text-primary" aria-hidden="true" />
            <span className="text-sm text-muted-foreground">{loadingMessage}</span>
          </div>
        )}

        {children}

        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="accessible-dialog-close"
            className={cn(
              'absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100',
              'focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden',
              'disabled:pointer-events-none',
              '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4'
            )}
            aria-label="Close dialog"
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

// ──────────────────────────────────────────────────────────────
// AccessibleDialogHeader / Footer / Title / Description
// ──────────────────────────────────────────────────────────────

function AccessibleDialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="accessible-dialog-header"
      className={cn('flex flex-col gap-2 text-center sm:text-left', className)}
      {...props}
    />
  )
}

function AccessibleDialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="accessible-dialog-footer"
      className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  )
}

function AccessibleDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="accessible-dialog-title"
      className={cn('text-lg font-semibold leading-none', className)}
      {...props}
    />
  )
}

function AccessibleDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="accessible-dialog-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  )
}

// ──────────────────────────────────────────────────────────────
// AccessibleDialogClose
// ──────────────────────────────────────────────────────────────

function AccessibleDialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="accessible-dialog-close" {...props} />
}

// ──────────────────────────────────────────────────────────────
// useDialogLoading — Hook to control dialog loading state
// ──────────────────────────────────────────────────────────────

/**
 * Hook to control the loading state of an AccessibleDialog from within.
 *
 * @example
 * ```tsx
 * function MyDialogContent() {
 *   const { setLoading } = useDialogLoading()
 *
 *   const handleSubmit = async () => {
 *     setLoading(true)
 *     await saveData()
 *     setLoading(false)
 *   }
 * }
 * ```
 */
function useDialogLoading() {
  const { setIsLoading, isLoading } = React.useContext(AccessibleDialogContext)
  return { setLoading: setIsLoading, isLoading }
}

export {
  AccessibleDialog,
  AccessibleDialogClose,
  AccessibleDialogContent,
  AccessibleDialogDescription,
  AccessibleDialogFooter,
  AccessibleDialogHeader,
  AccessibleDialogTitle,
  AccessibleDialogTrigger,
  useDialogLoading,
}
