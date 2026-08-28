'use client'

import { type FieldValues, type FieldPath, type Control, Controller } from 'react-hook-form'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

// ============================================================================
// ExamForge AI — Form Select Field
// ============================================================================
// Wrapper around React Hook Form Controller + shadcn/ui Select.
// Displays validation error messages and supports placeholder text.
// ============================================================================

export interface SelectOption {
  label: string
  value: string
  disabled?: boolean
}

export interface SelectFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
  name: TName
  label: string
  options: SelectOption[]
  control: Control<TFieldValues>
  placeholder?: string
  error?: string
  description?: string
  disabled?: boolean
  className?: string
  required?: boolean
}

export function SelectField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  name,
  label,
  options,
  control,
  placeholder = 'Select an option',
  error,
  description,
  disabled = false,
  className,
  required = false,
}: SelectFieldProps<TFieldValues, TName>) {
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
          <Select
            disabled={disabled}
            value={field.value ?? ''}
            onValueChange={field.onChange}
          >
            <SelectTrigger
              id={name}
              className={cn(
                'w-full forge-input-glow',
                error && 'border-destructive focus-visible:ring-destructive/30'
              )}
              aria-invalid={!!error}
              aria-describedby={
                error ? `${name}-error` : description ? `${name}-description` : undefined
              }
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent className="forge-glass-elevated border border-border/30">
              {options.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
