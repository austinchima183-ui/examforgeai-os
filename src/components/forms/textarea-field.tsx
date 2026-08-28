'use client'

import { type FieldValues, type FieldPath, type Control, Controller } from 'react-hook-form'
import { cn } from '@/lib/utils'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

// ============================================================================
// ExamForge AI — Form Textarea Field
// ============================================================================
// Wrapper around React Hook Form Controller + shadcn/ui Textarea.
// Displays validation error messages and supports configurable rows.
// ============================================================================

export interface TextareaFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  name: TName
  label: string
  placeholder?: string
  control: Control<TFieldValues>
  error?: string
  description?: string
  disabled?: boolean
  className?: string
  required?: boolean
  rows?: number
  maxLength?: number
}

export function TextareaField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  name,
  label,
  placeholder,
  control,
  error,
  description,
  disabled = false,
  className,
  required = false,
  rows = 3,
  maxLength,
}: TextareaFieldProps<TFieldValues, TName>) {
  return (
    <div className={cn('grid gap-2', className)}>
      <Label htmlFor={name} className="text-sm font-medium">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Textarea
            id={name}
            placeholder={placeholder}
            disabled={disabled}
            rows={rows}
            maxLength={maxLength}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${name}-error` : description ? `${name}-description` : undefined
            }
            className={cn('forge-input-glow', error && 'border-destructive focus-visible:ring-destructive/30')}
            {...field}
          />
        )}
      />
      <div className="flex items-center justify-between">
        {description && !error ? (
          <p id={`${name}-description`} className="text-xs text-muted-foreground">
            {description}
          </p>
        ) : error ? (
          <p id={`${name}-error`} className="text-xs text-destructive">
            {error}
          </p>
        ) : (
          <span />
        )}
        {maxLength && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {maxLength}
          </span>
        )}
      </div>
    </div>
  )
}
