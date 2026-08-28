'use client'

import * as React from 'react'
import {
  Palette, Upload, Save, Eye, Mail, FileText, Image,
  Paintbrush, Type, Monitor, RotateCcw
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useApi, apiPut } from '@/lib/hooks/use-api'
import { useAuthStore } from '@/lib/stores/auth-store'
import { toast } from 'sonner'

export default function BrandingPage() {
  const { user } = useAuthStore()
  const { data, loading, error, refetch } = useApi<{
    school: { id: string; name: string; tagline: string | null; logoUrl: string | null; primaryColor: string | null; accentColor: string | null; address: string | null; city: string | null; phone: string | null; email: string | null } | null
    settings: Record<string, string>
  }>(`/api/admin/branding?schoolId=${user?.schoolId || ''}`)

  const [schoolData, setSchoolData] = React.useState({
    name: '', tagline: '', logoUrl: '', primaryColor: '#10b981', accentColor: '#059669',
    address: '', city: '', phone: '', email: '',
  })
  const [emailTemplates, setEmailTemplates] = React.useState({
    welcome: '', report: '', feeReminder: '',
  })
  const [previewOpen, setPreviewOpen] = React.useState(false)

  React.useEffect(() => {
    if (data?.school) {
      setSchoolData({
        name: data.school.name,
        tagline: data.school.tagline || '',
        logoUrl: data.school.logoUrl || '',
        primaryColor: data.school.primaryColor || '#10b981',
        accentColor: data.school.accentColor || '#059669',
        address: data.school.address || '',
        city: data.school.city || '',
        phone: data.school.phone || '',
        email: data.school.email || '',
      })
    }
    if (data?.settings) {
      setEmailTemplates({
        welcome: data.settings.email_template_welcome || 'Dear {name}, welcome to {school}!',
        report: data.settings.email_template_report || 'Dear {parent}, {child}\'s report is ready.',
        feeReminder: data.settings.email_template_fee_reminder || 'Dear {parent}, payment of {amount} is due by {date}.',
      })
    }
  }, [data])

  const handleSave = async () => {
    try {
      await apiPut('/api/admin/branding', {
        schoolId: data?.school?.id || user?.schoolId || '',
        schoolData,
        settings: {
          email_template_welcome: emailTemplates.welcome,
          email_template_report: emailTemplates.report,
          email_template_fee_reminder: emailTemplates.feeReminder,
          primary_color: schoolData.primaryColor,
          accent_color: schoolData.accentColor,
        },
        userId: user?.id || 'system',
      })
      toast.success('Branding settings saved')
      refetch()
    } catch {
      toast.error('Failed to save settings')
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><Palette className="h-7 w-7" /> Branding & Organization</h1>
          <p className="text-sm text-muted-foreground">Customize school identity, email templates, and appearance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setPreviewOpen(!previewOpen)}>
            <Eye className="h-4 w-4 mr-1" /> Preview
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-1" /> Save Changes
          </Button>
        </div>
      </div>

      {loading && <div className="space-y-4 animate-fade-in">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-lg" />)}</div>}
      {error && <div className="p-6 text-center text-destructive">{error}</div>}

      {!loading && (
        <Tabs defaultValue="identity" className="space-y-4">
          <TabsList>
            <TabsTrigger value="identity"><Paintbrush className="h-4 w-4 mr-1" /> Identity</TabsTrigger>
            <TabsTrigger value="colors"><Palette className="h-4 w-4 mr-1" /> Colors</TabsTrigger>
            <TabsTrigger value="emails"><Mail className="h-4 w-4 mr-1" /> Email Templates</TabsTrigger>
            <TabsTrigger value="preview"><Monitor className="h-4 w-4 mr-1" /> Preview</TabsTrigger>
          </TabsList>

          {/* Identity Tab */}
          <TabsContent value="identity">
            <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <CardHeader><CardTitle className="text-base">School Identity</CardTitle><CardDescription>Basic school information and branding</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label>School Name</Label><Input value={schoolData.name} onChange={e => setSchoolData({ ...schoolData, name: e.target.value })} /></div>
                  <div><Label>Tagline</Label><Input value={schoolData.tagline} onChange={e => setSchoolData({ ...schoolData, tagline: e.target.value })} placeholder="Excellence in Education" /></div>
                  <div><Label>Email</Label><Input value={schoolData.email} onChange={e => setSchoolData({ ...schoolData, email: e.target.value })} type="email" /></div>
                  <div><Label>Phone</Label><Input value={schoolData.phone} onChange={e => setSchoolData({ ...schoolData, phone: e.target.value })} /></div>
                  <div><Label>Address</Label><Input value={schoolData.address} onChange={e => setSchoolData({ ...schoolData, address: e.target.value })} /></div>
                  <div><Label>City</Label><Input value={schoolData.city} onChange={e => setSchoolData({ ...schoolData, city: e.target.value })} /></div>
                </div>

                <Separator />

                <div>
                  <Label>School Logo</Label>
                  <div className="mt-2 flex items-center gap-4">
                    <div className="w-24 h-24 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center bg-muted/50">
                      {schoolData.logoUrl ? (
                        <Image className="h-8 w-8 text-muted-foreground" />
                      ) : (
                        <Upload className="h-8 w-8 text-foreground/35" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <Input type="file" accept="image/*" onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) setSchoolData({ ...schoolData, logoUrl: URL.createObjectURL(file) })
                      }} />
                      <p className="text-xs text-muted-foreground">PNG, JPG up to 2MB. Recommended: 200x200px</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Colors Tab */}
          <TabsContent value="colors">
            <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <CardHeader><CardTitle className="text-base">Brand Colors</CardTitle><CardDescription>Customize the color scheme for your school</CardDescription></CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <Label>Primary Color</Label>
                    <div className="flex items-center gap-3 mt-2">
                      <input type="color" value={schoolData.primaryColor} onChange={e => setSchoolData({ ...schoolData, primaryColor: e.target.value })} className="w-12 h-12 rounded-lg cursor-pointer border" />
                      <Input value={schoolData.primaryColor} onChange={e => setSchoolData({ ...schoolData, primaryColor: e.target.value })} className="w-32 font-mono" />
                    </div>
                  </div>
                  <div>
                    <Label>Accent Color</Label>
                    <div className="flex items-center gap-3 mt-2">
                      <input type="color" value={schoolData.accentColor} onChange={e => setSchoolData({ ...schoolData, accentColor: e.target.value })} className="w-12 h-12 rounded-lg cursor-pointer border" />
                      <Input value={schoolData.accentColor} onChange={e => setSchoolData({ ...schoolData, accentColor: e.target.value })} className="w-32 font-mono" />
                    </div>
                  </div>
                </div>

                {/* Color Preview */}
                <div className="rounded-lg border p-4 space-y-3">
                  <h4 className="font-medium text-sm">Color Preview</h4>
                  <div className="flex gap-2">
                    <div className="h-10 flex-1 rounded-md" style={{ backgroundColor: schoolData.primaryColor }} />
                    <div className="h-10 flex-1 rounded-md" style={{ backgroundColor: schoolData.accentColor }} />
                    <div className="h-10 flex-1 rounded-md" style={{ backgroundColor: schoolData.primaryColor, opacity: 0.7 }} />
                    <div className="h-10 flex-1 rounded-md" style={{ backgroundColor: schoolData.accentColor, opacity: 0.7 }} />
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {[0.9, 0.7, 0.5, 0.3, 0.1].map(op => (
                      <div key={op} className="h-6 rounded" style={{ backgroundColor: schoolData.primaryColor, opacity: op }} />
                    ))}
                  </div>
                </div>

                <Button variant="outline" size="sm" onClick={() => setSchoolData({ ...schoolData, primaryColor: '#10b981', accentColor: '#059669' })}>
                  <RotateCcw className="h-4 w-4 mr-1" /> Reset to Default
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Email Templates Tab */}
          <TabsContent value="emails">
            <div className="space-y-4 animate-fade-in">
              <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <CardHeader><CardTitle className="text-base">Welcome Email</CardTitle><CardDescription>Sent when a new user joins the school</CardDescription></CardHeader>
                <CardContent>
                  <Textarea value={emailTemplates.welcome} onChange={e => setEmailTemplates({ ...emailTemplates, welcome: e.target.value })} rows={4} />
                  <div className="mt-2 flex gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs cursor-pointer">{'{name}'}</Badge>
                    <Badge variant="outline" className="text-xs cursor-pointer">{'{school}'}</Badge>
                    <Badge variant="outline" className="text-xs cursor-pointer">{'{role}'}</Badge>
                  </div>
                </CardContent>
              </Card>
              <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <CardHeader><CardTitle className="text-base">Report Notification</CardTitle><CardDescription>Sent when a student report is generated</CardDescription></CardHeader>
                <CardContent>
                  <Textarea value={emailTemplates.report} onChange={e => setEmailTemplates({ ...emailTemplates, report: e.target.value })} rows={4} />
                  <div className="mt-2 flex gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">{'{parent}'}</Badge>
                    <Badge variant="outline" className="text-xs">{'{child}'}</Badge>
                    <Badge variant="outline" className="text-xs">{'{term}'}</Badge>
                  </div>
                </CardContent>
              </Card>
              <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <CardHeader><CardTitle className="text-base">Fee Reminder</CardTitle><CardDescription>Sent when a fee payment is due</CardDescription></CardHeader>
                <CardContent>
                  <Textarea value={emailTemplates.feeReminder} onChange={e => setEmailTemplates({ ...emailTemplates, feeReminder: e.target.value })} rows={4} />
                  <div className="mt-2 flex gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">{'{parent}'}</Badge>
                    <Badge variant="outline" className="text-xs">{'{amount}'}</Badge>
                    <Badge variant="outline" className="text-xs">{'{date}'}</Badge>
                    <Badge variant="outline" className="text-xs">{'{child}'}</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Login Page Preview */}
              <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <CardHeader><CardTitle className="text-base">Branded Login Page</CardTitle></CardHeader>
                <CardContent>
                  <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: `${schoolData.primaryColor}08` }}>
                    <div className="p-6 text-center space-y-3" style={{ borderTop: `4px solid ${schoolData.primaryColor}` }}>
                      <div className="w-16 h-16 rounded-full mx-auto" style={{ backgroundColor: schoolData.primaryColor }} />
                      <h3 className="text-lg font-bold">{schoolData.name || 'School Name'}</h3>
                      <p className="text-sm text-muted-foreground">{schoolData.tagline || 'Tagline'}</p>
                      <div className="max-w-xs mx-auto space-y-2 mt-4">
                        <Input placeholder="Email" className="text-sm forge-input-glow" />
                        <Input placeholder="Password" type="password" className="text-sm forge-input-glow" />
                        <Button className="w-full" style={{ backgroundColor: schoolData.primaryColor }}>Sign In</Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Email Preview */}
              <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <CardHeader><CardTitle className="text-base">Email Preview</CardTitle></CardHeader>
                <CardContent>
                  <div className="rounded-lg border overflow-hidden">
                    <div className="p-1" style={{ backgroundColor: schoolData.primaryColor }} />
                    <div className="p-6 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full" style={{ backgroundColor: schoolData.primaryColor }} />
                        <div>
                          <div className="font-semibold text-sm">{schoolData.name}</div>
                          <div className="text-xs text-muted-foreground">{schoolData.email}</div>
                        </div>
                      </div>
                      <Separator />
                      <p className="text-sm">
                        {emailTemplates.welcome
                          .replace('{name}', 'John Doe')
                          .replace('{school}', schoolData.name)
                          .replace('{role}', 'Student')}
                      </p>
                      <Separator />
                      <p className="text-xs text-muted-foreground text-center">
                        © {new Date().getFullYear()} {schoolData.name}. All rights reserved.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

function Separator() {
  return <div className="border-t my-2" />
}
