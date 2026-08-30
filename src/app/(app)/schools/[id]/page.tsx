import { requireAuth } from '@/lib/auth/require-auth'
import { getSchoolById } from '@/lib/services/schools-service'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Building2, MapPin, Users, GraduationCap, Calendar, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

// ============================================================================
// ExamForge AI — School Detail Page
// ============================================================================
// Server Component. Shows a single school's profile and live metrics.
// Accessible to super_admin and school_admin (own school verified via RLS).
// ============================================================================

interface SchoolDetail {
  id: string
  name: string
  code?: string | null
  location?: string | null
  school_type?: string | null
  is_active: boolean
  created_at: string
  [key: string]: unknown
}

export default async function SchoolDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { user } = await requireAuth()
  const { id } = await params

  // Feature isolation: only super_admin and school_admin may view school profiles
  if (user.role !== 'super_admin' && user.role !== 'school_admin') {
    notFound()
  }

  const school = (await getSchoolById(id)) as SchoolDetail | null
  if (!school) {
    notFound()
  }

  // school_admin may only view their own school
  if (user.role === 'school_admin' && user.schoolId && user.schoolId !== school.id) {
    notFound()
  }

  const created = school.created_at ? new Date(school.created_at) : null

  return (
    <div className="space-y-6 animate-fade-in forge-ambient-bg min-h-screen">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 border border-white/[0.06]">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{school.name}</h1>
              <Badge variant={school.is_active ? 'default' : 'secondary'}>
                {school.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              School profile and operational overview
            </p>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href="/schools">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Schools
          </Link>
        </Button>
      </div>

      {/* Detail cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
          <CardHeader>
            <CardDescription className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" /> Location
            </CardDescription>
            <CardTitle className="text-lg">{school.location ?? 'Not specified'}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {school.code ? `School code: ${school.code}` : 'No school code assigned'}
            </p>
          </CardContent>
        </Card>

        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
          <CardHeader>
            <CardDescription className="flex items-center gap-2 text-sm">
              <GraduationCap className="h-4 w-4 text-muted-foreground" /> School Type
            </CardDescription>
            <CardTitle className="text-lg capitalize">{school.school_type ?? 'unspecified'}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Institution classification</p>
          </CardContent>
        </Card>

        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
          <CardHeader>
            <CardDescription className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" /> Registered
            </CardDescription>
            <CardTitle className="text-lg">
              {created ? created.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {created ? `Member since ${created.getFullYear()}` : 'No registration date'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Management actions */}
      <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
        <CardHeader>
          <CardTitle className="text-base">School Management</CardTitle>
          <CardDescription>Administrative actions for this school</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" asChild>
              <Link href="/students">
                <Users className="mr-2 h-4 w-4" /> View Students
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/teachers">
                <GraduationCap className="mr-2 h-4 w-4" /> View Teachers
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
