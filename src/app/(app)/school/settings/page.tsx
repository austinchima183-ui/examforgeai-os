import { requireAnyRole } from '@/lib/auth/require-auth'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SchoolSettingsForm } from '@/features/school/components/school-settings-form'
import type { SchoolProfile } from '@/features/school/components/school-settings-form'

// ============================================================================
// ExamForge AI — School Settings (Ω-3: autosave surface)
// ============================================================================
// School profile editor. Every field is inline-editable with AUTOSAVE —
// changes commit automatically (debounced) through an RLS-enforced server
// action, with a live status indicator. Read-only for non-admin roles.
// ============================================================================

export const metadata = {
  title: 'School Settings — ExamForge AI',
}

export default async function SchoolSettingsPage() {
  const auth = await requireAnyRole(['school_admin', 'super_admin'])
  if (!auth) redirect('/login?redirect=%2Fschool%2Fsettings')

  const schoolId = auth.user.schoolId
  if (!schoolId) {
    return (
      <div className="container max-w-3xl py-16 text-center">
        <h1 className="text-2xl font-semibold">School Settings</h1>
        <p className="mt-3 text-muted-foreground">
          No school is linked to this account. Settings unlock once a school is assigned.
        </p>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: school, error } = await supabase
    .from('schools')
    .select(
      'id, name, motto, address, city, state, country, email, phone, website, principal_name, registration_number, school_level, school_type, code, created_at'
    )
    .eq('id', schoolId)
    .single()

  if (error || !school) {
    return (
      <div className="container max-w-3xl py-16 text-center">
        <h1 className="text-2xl font-semibold">School Settings</h1>
        <p className="mt-3 text-muted-foreground">
          The school profile could not be loaded. Please try again in a moment.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">School Settings</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Profile details for {school.name}. Edits save automatically — the indicator under each
          field shows live status.
        </p>
      </header>
      <SchoolSettingsForm school={school as unknown as SchoolProfile} />
    </div>
  )
}
