'use client'

import { useState, useEffect } from 'react'
import { useApi, apiPut } from '@/lib/hooks/use-api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Building2,
  Palette,
  Calendar,
  GraduationCap,
  ToggleLeft,
  Mail,
  Database,
  Save,
  Loader2,
  Globe,
  Clock,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react'

// ============================================================================
// ExamForge AI — Organization Settings Page
// ============================================================================
// Organization branding, academic year, grading, feature flags, data retention.
// ============================================================================

interface Term {
  name: string
  startDate: string
  endDate: string
}

interface GradeScale {
  grade: string
  minScore: number
  maxScore: number
  gpa: number
}

interface FeatureFlags {
  cbt: boolean
  ai: boolean
  marketplace: boolean
  offline: boolean
  parentPortal: boolean
  multiSchool: boolean
}

const DEFAULT_TERMS: Term[] = [
  { name: 'First Term', startDate: '2024-09-01', endDate: '2024-12-20' },
  { name: 'Second Term', startDate: '2025-01-06', endDate: '2025-04-11' },
  { name: 'Third Term', startDate: '2025-04-28', endDate: '2025-07-31' },
]

const DEFAULT_GRADE_SCALE: GradeScale[] = [
  { grade: 'A+', minScore: 90, maxScore: 100, gpa: 4.0 },
  { grade: 'A', minScore: 80, maxScore: 89, gpa: 3.7 },
  { grade: 'B+', minScore: 75, maxScore: 79, gpa: 3.3 },
  { grade: 'B', minScore: 70, maxScore: 74, gpa: 3.0 },
  { grade: 'C+', minScore: 65, maxScore: 69, gpa: 2.7 },
  { grade: 'C', minScore: 60, maxScore: 64, gpa: 2.0 },
  { grade: 'D', minScore: 50, maxScore: 59, gpa: 1.0 },
  { grade: 'F', minScore: 0, maxScore: 49, gpa: 0.0 },
]

const DEFAULT_FEATURES: FeatureFlags = {
  cbt: true, ai: true, marketplace: true, offline: false, parentPortal: true, multiSchool: true,
}

interface OrgSettingsData {
  orgName: string
  primaryColor: string
  timezone: string
  yearStart: string
  yearEnd: string
  terms: Term[]
  gradingType: string
  gradeScale: GradeScale[]
  features: FeatureFlags
  emailDomain: string
  retentionDays: number
}

export default function OrganizationSettingsPage() {
  const [saving, setSaving] = useState(false)

  const { data: settingsData, loading, error, refetch } = useApi<OrgSettingsData>('/api/admin/organization-settings')

  // Branding
  const [orgName, setOrgName] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#10b981')
  const [timezone, setTimezone] = useState('Africa/Lagos')

  // Academic Year
  const [yearStart, setYearStart] = useState('')
  const [yearEnd, setYearEnd] = useState('')
  const [terms, setTerms] = useState<Term[]>(DEFAULT_TERMS)

  // Grading
  const [gradingType, setGradingType] = useState<string>('letter')
  const [gradeScale, setGradeScale] = useState<GradeScale[]>(DEFAULT_GRADE_SCALE)

  // Feature Flags
  const [features, setFeatures] = useState<FeatureFlags>(DEFAULT_FEATURES)

  // Security
  const [emailDomain, setEmailDomain] = useState<string>('')
  const [retentionDays, setRetentionDays] = useState(365)

  // Sync from API data
  useEffect(() => {
    if (settingsData) {
      setOrgName(settingsData.orgName)
      setPrimaryColor(settingsData.primaryColor)
      setTimezone(settingsData.timezone)
      setYearStart(settingsData.yearStart)
      setYearEnd(settingsData.yearEnd)
      setTerms(settingsData.terms)
      setGradingType(settingsData.gradingType)
      setGradeScale(settingsData.gradeScale)
      setFeatures(settingsData.features)
      setEmailDomain(settingsData.emailDomain)
      setRetentionDays(settingsData.retentionDays)
    }
  }, [settingsData])

  const handleSave = async () => {
    setSaving(true)
    try {
      await apiPut('/api/admin/organization-settings', {
        orgName, primaryColor, timezone, yearStart, yearEnd, terms,
        gradingType, gradeScale, features, emailDomain, retentionDays,
      })
      toast.success('Organization settings saved')
      refetch()
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const addTerm = () => {
    setTerms(prev => [...prev, { name: `Term ${prev.length + 1}`, startDate: '', endDate: '' }])
  }

  const removeTerm = (idx: number) => {
    setTerms(prev => prev.filter((_, i) => i !== idx))
  }

  const updateTerm = (idx: number, updates: Partial<Term>) => {
    setTerms(prev => prev.map((t, i) => i === idx ? { ...t, ...updates } : t))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organization Settings</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Configure organization-wide settings, branding, and policies.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
          Save All
        </Button>
      </div>

      <Tabs defaultValue="branding" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="branding" className="gap-1 text-xs sm:text-sm">
            <Building2 className="h-3.5 w-3.5 hidden sm:block" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="academic" className="gap-1 text-xs sm:text-sm">
            <Calendar className="h-3.5 w-3.5 hidden sm:block" />
            Academic
          </TabsTrigger>
          <TabsTrigger value="grading" className="gap-1 text-xs sm:text-sm">
            <GraduationCap className="h-3.5 w-3.5 hidden sm:block" />
            Grading
          </TabsTrigger>
          <TabsTrigger value="features" className="gap-1 text-xs sm:text-sm">
            <ToggleLeft className="h-3.5 w-3.5 hidden sm:block" />
            Features
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1 text-xs sm:text-sm">
            <Mail className="h-3.5 w-3.5 hidden sm:block" />
            Access
          </TabsTrigger>
          <TabsTrigger value="retention" className="gap-1 text-xs sm:text-sm">
            <Database className="h-3.5 w-3.5 hidden sm:block" />
            Data
          </TabsTrigger>
        </TabsList>

        {/* Branding Tab */}
        <TabsContent value="branding">
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Organization Branding
              </CardTitle>
              <CardDescription>
                Customize your organization&apos;s identity and appearance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Organization Name</Label>
                  <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Logo</Label>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <Button variant="outline" size="sm">
                      <Upload className="h-4 w-4 mr-1" />
                      Upload Logo
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="flex-1" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Africa/Lagos">Africa/Lagos (WAT)</SelectItem>
                      <SelectItem value="Africa/Abuja">Africa/Abuja (WAT)</SelectItem>
                      <SelectItem value="Africa/Accra">Africa/Accra (GMT)</SelectItem>
                      <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                      <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                      <SelectItem value="Asia/Dubai">Asia/Dubai (GST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Color preview */}
              <div className="rounded-lg border p-4" style={{ borderColor: primaryColor }}>
                <p className="text-sm text-muted-foreground mb-2">Preview</p>
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full" style={{ backgroundColor: primaryColor }} />
                  <span className="font-medium" style={{ color: primaryColor }}>{orgName}</span>
                  <Badge style={{ backgroundColor: primaryColor, color: '#fff' }}>Sample Badge</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Academic Year Tab */}
        <TabsContent value="academic">
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Academic Year Configuration
              </CardTitle>
              <CardDescription>
                Define the academic year and terms/semesters.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Year Start Date</Label>
                  <Input type="date" value={yearStart} onChange={(e) => setYearStart(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Year End Date</Label>
                  <Input type="date" value={yearEnd} onChange={(e) => setYearEnd(e.target.value)} />
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Terms / Semesters</Label>
                  <Button variant="outline" size="sm" onClick={addTerm}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add Term
                  </Button>
                </div>
                {terms.map((term, idx) => (
                  <div key={idx} className="rounded-lg border p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <Input
                        value={term.name}
                        onChange={(e) => updateTerm(idx, { name: e.target.value })}
                        className="font-medium max-w-[200px]"
                      />
                      {terms.length > 1 && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeTerm(idx)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Start Date</Label>
                        <Input type="date" value={term.startDate} onChange={(e) => updateTerm(idx, { startDate: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">End Date</Label>
                        <Input type="date" value={term.endDate} onChange={(e) => updateTerm(idx, { endDate: e.target.value })} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Grading Tab */}
        <TabsContent value="grading">
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Grading System
              </CardTitle>
              <CardDescription>
                Configure the grading system and scale.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Grading Type</Label>
                <Select value={gradingType} onValueChange={setGradingType}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="points">Points</SelectItem>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="letter">Letter Grades (A-F)</SelectItem>
                    <SelectItem value="gpa">GPA Scale</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(gradingType === 'letter' || gradingType === 'gpa') && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <Label>Grade Scale</Label>
                    <div className="rounded-lg border">
                      <div className="grid grid-cols-4 gap-2 p-3 bg-muted/50 text-xs font-medium">
                        <span>Grade</span>
                        <span>Min Score</span>
                        <span>Max Score</span>
                        <span>GPA</span>
                      </div>
                      {gradeScale.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-4 gap-2 p-3 border-t">
                          <Input value={item.grade} onChange={(e) => {
                            const updated = [...gradeScale]
                            updated[idx] = { ...updated[idx], grade: e.target.value }
                            setGradeScale(updated)
                          }} className="h-8 text-sm font-bold" />
                          <Input type="number" value={item.minScore} onChange={(e) => {
                            const updated = [...gradeScale]
                            updated[idx] = { ...updated[idx], minScore: parseInt(e.target.value) || 0 }
                            setGradeScale(updated)
                          }} className="h-8 text-sm" />
                          <Input type="number" value={item.maxScore} onChange={(e) => {
                            const updated = [...gradeScale]
                            updated[idx] = { ...updated[idx], maxScore: parseInt(e.target.value) || 0 }
                            setGradeScale(updated)
                          }} className="h-8 text-sm" />
                          <Input type="number" value={item.gpa} onChange={(e) => {
                            const updated = [...gradeScale]
                            updated[idx] = { ...updated[idx], gpa: parseFloat(e.target.value) || 0 }
                            setGradeScale(updated)
                          }} className="h-8 text-sm" step="0.1" />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feature Flags Tab */}
        <TabsContent value="features">
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ToggleLeft className="h-5 w-5" />
                Feature Flags
              </CardTitle>
              <CardDescription>
                Enable or disable platform modules and features.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {[
                { key: 'cbt' as const, label: 'CBT (Computer-Based Testing)', desc: 'Online exam delivery and proctoring' },
                { key: 'ai' as const, label: 'AI Features', desc: 'AI-powered question generation, grading, and insights' },
                { key: 'marketplace' as const, label: 'Marketplace', desc: 'Question bank and resource marketplace' },
                { key: 'offline' as const, label: 'Offline Mode', desc: 'Take exams offline with sync support' },
                { key: 'parentPortal' as const, label: 'Parent Portal', desc: 'Parent access to student progress and fees' },
                { key: 'multiSchool' as const, label: 'Multi-School', desc: 'Manage multiple schools under one organization' },
              ].map((feature, idx) => (
                <div key={feature.key}>
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <Label className="text-sm font-medium">{feature.label}</Label>
                      <p className="text-xs text-muted-foreground">{feature.desc}</p>
                    </div>
                    <Switch
                      checked={features[feature.key]}
                      onCheckedChange={(checked) => setFeatures(prev => ({ ...prev, [feature.key]: checked }))}
                    />
                  </div>
                  {idx < 5 && <Separator />}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Access Control Tab */}
        <TabsContent value="security">
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <CardHeader>
              <CardTitle>Email Domain Restriction</CardTitle>
              <CardDescription>
                Restrict user registration to specific email domains.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Allowed Domains</Label>
                <Input
                  placeholder="e.g., school.edu.ng, university.edu"
                  value={emailDomain}
                  onChange={(e) => setEmailDomain(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Comma-separated list of allowed email domains. Leave empty to allow all domains.
                </p>
              </div>
              {emailDomain && (
                <div className="flex flex-wrap gap-1">
                  {emailDomain.split(',').map(d => d.trim()).filter(Boolean).map(domain => (
                    <Badge key={domain} variant="outline" className="text-xs">@{domain}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Retention Tab */}
        <TabsContent value="retention">
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Data Retention Policy
              </CardTitle>
              <CardDescription>
                Configure how long data is retained before automatic cleanup.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Retention Period (days)</Label>
                <Input
                  type="number"
                  value={retentionDays}
                  onChange={(e) => setRetentionDays(parseInt(e.target.value) || 365)}
                  min={30}
                  max={3650}
                />
                <p className="text-xs text-muted-foreground">
                  Data older than {retentionDays} days will be automatically archived and eventually deleted.
                  Minimum: 30 days.
                </p>
              </div>
              <div className="rounded-lg border bg-yellow-50 dark:bg-yellow-950 dark:bg-amber-950/30 p-4">
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  <strong>Note:</strong> Some data (exam records, financial transactions) may be exempt from 
                  automatic deletion due to regulatory requirements.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
