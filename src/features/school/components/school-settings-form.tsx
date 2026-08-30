'use client'

import { useCallback } from 'react'
import { Building2, MapPin, Contact, Globe } from 'lucide-react'
import { InlineEditField } from '@/components/system/inline-edit-field'
import { updateSchoolField } from '@/features/school/actions/update-school-field.action'

// ============================================================================
// ExamForge AI — School Settings Form (Ω-3: autosave surface)
// ============================================================================
// Every editable field uses InlineEditField with autoSave enabled: edits
// commit through an RLS-enforced server action after a 1.5s debounce, with a
// live Autosaving… / Autosaved / failed indicator. Failed saves keep the
// editor open so nothing is lost.
// ============================================================================

export interface SchoolProfile {
  id: string
  name: string | null
  motto: string | null
  address: string | null
  city: string | null
  state: string | null
  country: string | null
  email: string | null
  phone: string | null
  website: string | null
  principal_name: string | null
  registration_number: string | null
  school_level: string | null
  school_type: string | null
  code: string | null
  created_at: string | null
}

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section
      aria-labelledby={`section-${title.toLowerCase().replace(/\s+/g, '-')}`}
      className="rounded-xl border border-border/30 bg-[#111]/60 p-5 forge-card-shadow"
    >
      <div className="mb-4 flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <h2
            id={`section-${title.toLowerCase().replace(/\s+/g, '-')}`}
            className="text-sm font-semibold text-foreground/90"
          >
            {title}
          </h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">{children}</div>
    </section>
  )
}

function Field({
  label,
  field,
  value,
  schoolId,
  multiline,
  placeholder,
}: {
  label: string
  field: string
  value: string | null
  schoolId: string
  multiline?: boolean
  placeholder?: string
}) {
  const commit = useCallback(
    async (next: string) => {
      const result = await updateSchoolField(schoolId, field, next)
      if (!result.success) {
        throw new Error(result.error ?? 'Save failed')
      }
    },
    [schoolId, field]
  )

  return (
    <div className="grid gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-foreground/50">
        {label}
      </span>
      <InlineEditField
        value={value ?? ''}
        onCommit={commit}
        multiline={multiline}
        placeholder={placeholder ?? 'Not set'}
        inputWidth="w-full max-w-sm"
        autoSave={{ debounceMs: 1500 }}
        editLabel={`Edit ${label}`}
      />
    </div>
  )
}

export function SchoolSettingsForm({ school }: { school: SchoolProfile }) {
  return (
    <div className="space-y-6">
      <Section
        icon={Building2}
        title="Identity"
        description="The basics shown across the platform, reports and billing documents."
      >
        <Field label="School name" field="name" value={school.name} schoolId={school.id} placeholder="School name" />
        <Field label="Motto" field="motto" value={school.motto} schoolId={school.id} multiline placeholder="Add a motto" />
        <Field label="Principal" field="principal_name" value={school.principal_name} schoolId={school.id} placeholder="Principal name" />
        <Field label="Registration no." field="registration_number" value={school.registration_number} schoolId={school.id} placeholder="Registration number" />
        <div className="grid gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-foreground/50">Level</span>
          <p className="text-sm text-foreground/80">{school.school_level ?? '—'}</p>
        </div>
        <div className="grid gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-foreground/50">Type</span>
          <p className="text-sm text-foreground/80">{school.school_type ?? '—'}</p>
        </div>
      </Section>

      <Section
        icon={MapPin}
        title="Location"
        description="Physical address used for correspondence and official documents."
      >
        <Field label="Address" field="address" value={school.address} schoolId={school.id} multiline placeholder="Street address" />
        <Field label="City" field="city" value={school.city} schoolId={school.id} placeholder="City" />
        <Field label="State" field="state" value={school.state} schoolId={school.id} placeholder="State" />
        <Field label="Country" field="country" value={school.country} schoolId={school.id} placeholder="Country" />
      </Section>

      <Section
        icon={Contact}
        title="Contact"
        description="How parents, teachers and support reach the school."
      >
        <Field label="Email" field="email" value={school.email} schoolId={school.id} placeholder="school@example.com" />
        <Field label="Phone" field="phone" value={school.phone} schoolId={school.id} placeholder="+234 …" />
      </Section>

      <Section
        icon={Globe}
        title="Web"
        description="Public web presence."
      >
        <Field label="Website" field="website" value={school.website} schoolId={school.id} placeholder="https://…" />
        <div className="grid gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-foreground/50">School code</span>
          <p className="font-mono text-sm text-foreground/80">{school.code ?? '—'}</p>
        </div>
      </Section>
    </div>
  )
}
