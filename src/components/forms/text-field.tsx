'use client'

import { type FieldValues, type FieldPath, type Control, Controller } from 'react-hook-form'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// ============================================================================
// ExamForge AI — Form Text Field
// ============================================================================
// Wrapper around React Hook Form Controller + shadcn/ui Input.
// Displays validation error messages and supports multiple input types.
// ============================================================================

export interface TextFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  name: TName
  label: string
  placeholder?: string
  type?: 'text' | 'email' | 'password' | 'number' | 'url' | 'tel' | 'search' | 'datetime-local' | 'date' | 'time'
  control: Control<TFieldValues>
  error?: string
  description?: string
  disabled?: boolean
  className?: string
  required?: boolean
}

export function TextField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  name,
  label,
  placeholder,
  type = 'text',
  control,
  error,
  description,
  disabled = false,
  className,
  required = false,
}: TextFieldProps<TFieldValues, TName>) {
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
          <Input
            id={name}
            type={type}
            placeholder={placeholder}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${name}-error` : description ? `${name}-description` : undefined
            }
            className={cn('forge-input-glow', error && 'border-destructive focus-visible:ring-destructive/30')}
            {...field}
          />
        )}
      />
      {description && !error && (
        <p id={`${name}-description`} className="text-xs text-muted-foreground">
          {description}
        </p>
      )}
      {error && (
        <p id={`${name}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
