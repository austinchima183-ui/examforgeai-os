'use client'
import { apiFetch } from '@/lib/api/client-fetch'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from 'sonner'
import {
  FileText,
  Edit3,
  Eye,
  Save,
  Loader2,
  Plus,
  Mail,
  MessageSquare,
  Smartphone,
  Variable,
  XCircle,
  RefreshCw,
} from 'lucide-react'

// ============================================================================
// ExamForge AI — Notification Templates Page
// ============================================================================
// List, edit, and preview notification templates with variable placeholders.
// Data fetched from /api/notifications/templates (backed by Supabase).
// ============================================================================

interface Template {
  id: string
  key: string
  name: string
  subject: string
  body: string
  variables: string[]
  channel: string
  updatedAt: string
}

/** Generate preview values for template variables based on their names. */
function generatePreviewData(variables: string[]): Record<string, string> {
  const knownValues: Record<string, string> = {
    student_name: 'John Doe',
    exam_title: 'Mathematics Mid-Term',
    exam_date: '2025-03-15',
    exam_duration: '90',
    subject_name: 'Mathematics',
    school_name: 'Springfield Academy',
    score: '78',
    total_marks: '100',
    grade: 'B+',
    percentage: '78',
    parent_name: 'Mrs. Doe',
    invoice_amount: '$25,000',
    invoice_number: 'INV-2025-001',
    due_date: '2025-04-01',
    description: 'Tuition Fee - Term 2',
    user_name: 'John Doe',
    role: 'Student',
    reset_link: 'https://examforge.ai/reset/example',
    expiry_hours: '24',
    attendance_status: 'Present',
    date: '2025-03-10',
    class_name: 'Grade 10A',
    attendance_rate: '92',
  }
  const data: Record<string, string> = {}
  for (const v of variables) {
    data[v] = knownValues[v] || `[${v}]`
  }
  return data
}

const CHANNEL_ICONS: Record<string, typeof Mail> = {
  email: Mail,
  sms: MessageSquare,
  push: Smartphone,
  in_app: FileText,
}

function renderTemplate(template: string, data: Record<string, string>): string {
  let rendered = template
  for (const [key, value] of Object.entries(data)) {
    rendered = rendered.replaceAll(`{{${key}}}`, value)
  }
  rendered = rendered.replaceAll(/\{\{(\w+)\}\}/g, '[$1]')
  return rendered
}

export default function NotificationTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null)
  const [editSubject, setEditSubject] = useState('')
  const [editBody, setEditBody] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/notifications/templates')
      if (!res.ok) throw new Error('Failed to fetch templates')
      const data = await res.json()
      setTemplates(data.templates ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates')
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const handleEdit = (template: Template) => {
    setEditingTemplate(template)
    setEditSubject(template.subject)
    setEditBody(template.body)
  }

  const handleSave = async () => {
    if (!editingTemplate) return
    setSaving(true)

    try {
      const res = await apiFetch('/api/notifications/templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingTemplate.id, subject: editSubject, body: editBody }),
      })
      if (!res.ok) throw new Error('Failed to save template')

      setTemplates(prev =>
        prev.map(t =>
          t.id === editingTemplate.id
            ? { ...t, subject: editSubject, body: editBody, updatedAt: new Date().toISOString() }
            : t
        )
      )
      setEditingTemplate(null)
      toast.success('Template updated successfully')
    } catch {
      toast.error('Failed to update template')
    } finally {
      setSaving(false)
    }
  }

  const handlePreview = (template: Template) => {
    setPreviewTemplate(template)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notification Templates</h1>
        </div>
        <Card className="p-8 text-center forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
          <XCircle className="h-10 w-10 mx-auto text-destructive mb-3" />
          <h3 className="text-lg font-medium">Failed to load templates</h3>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={fetchTemplates}>
            <RefreshCw className="h-4 w-4 mr-1" /> Retry
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notification Templates</h1>
          <p className="text-muted-foreground mt-1">
            Manage and customize system notification templates with variable placeholders.
          </p>
        </div>
        {templates.length > 0 && (
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-1" />
                Create Template
              </Button>
            </DialogTrigger>
            <DialogContent className="forge-glass-elevated border-white/[0.06] rounded-xl max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Template</DialogTitle>
                <DialogDescription>Add a new notification template with variable placeholders.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 text-sm text-muted-foreground text-center">
                <p>Template creation is available through the API.</p>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Empty State */}
      {templates.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-8 w-8" />}
          title="No Templates Yet"
          description="Create notification templates to standardize communications like exam assignments, result publications, and payment reminders."
          primaryAction={{
            label: 'Create Template',
            icon: <Plus className="h-4 w-4" />,
            onClick: () => toast.info('Template creation is available via the Notifications API. See the documentation for details.'),
          }}
          aiSuggestion={{
            text: 'AI can auto-generate templates from common patterns',
          }}
          helpLink={{
            label: 'Template creation guide',
            href: 'https://docs.examforge.ai/notifications/templates',
          }}
        />
      ) : (
        /* Templates Grid */
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => {
            const ChannelIcon = CHANNEL_ICONS[template.channel] || FileText
            return (
              <Card key={template.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ChannelIcon className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-base">{template.name}</CardTitle>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {template.channel}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs font-mono truncate">
                    {template.subject}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  {/* Variables */}
                  <div className="flex flex-wrap gap-1">
                    {template.variables.map((v) => (
                      <Badge key={v} variant="secondary" className="text-[10px] px-1.5 py-0">
                        <Variable className="h-3 w-3 mr-0.5" />
                        {v}
                      </Badge>
                    ))}
                  </div>

                  {/* Body Preview */}
                  <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-line">
                    {template.body}
                  </p>

                  <p className="text-[10px] text-muted-foreground">
                    Updated: {new Date(template.updatedAt).toLocaleDateString()}
                  </p>
                </CardContent>

                {/* Actions */}
                <div className="flex border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 rounded-none rounded-bl-lg"
                    onClick={() => handleEdit(template)}
                  >
                    <Edit3 className="h-3.5 w-3.5 mr-1" />
                    Edit
                  </Button>
                  <Separator orientation="vertical" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 rounded-none rounded-br-lg"
                    onClick={() => handlePreview(template)}
                  >
                    <Eye className="h-3.5 w-3.5 mr-1" />
                    Preview
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
        <DialogContent className="forge-glass-elevated border-white/[0.06] rounded-xl max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Template: {editingTemplate?.name}</DialogTitle>
            <DialogDescription>
              Edit the subject and body. Use {'{{variable_name}}'} for dynamic placeholders.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={editSubject}
                onChange={(e) => setEditSubject(e.target.value)}
                placeholder="Email subject line..."
              />
            </div>
            <div className="space-y-2">
              <Label>Body</Label>
              <Textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                placeholder="Email body with {{variables}}..."
                rows={12}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label>Available Variables</Label>
              <div className="flex flex-wrap gap-1">
                {editingTemplate?.variables.map((v) => (
                  <Badge key={v} variant="outline" className="text-xs cursor-pointer hover:bg-accent"
                    onClick={() => setEditBody(prev => prev + `{{${v}}}`)}>
                    {`{{${v}}}`}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditingTemplate(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Save Template
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
        <DialogContent className="forge-glass-elevated border-white/[0.06] rounded-xl max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview: {previewTemplate?.name}</DialogTitle>
            <DialogDescription>
              Rendered with sample data. Variables replaced with example values.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Subject</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-medium">
                  {previewTemplate && renderTemplate(previewTemplate.subject, generatePreviewData(previewTemplate.variables))}
                </p>
              </CardContent>
            </Card>
            <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Body</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-line">
                  {previewTemplate && renderTemplate(previewTemplate.body, generatePreviewData(previewTemplate.variables))}
                </p>
              </CardContent>
            </Card>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Sample Data Used</Label>
              <div className="grid grid-cols-2 gap-1 text-xs">
                {previewTemplate?.variables.map((v) => (
                  <div key={v} className="flex gap-1">
                    <span className="text-muted-foreground">{v}:</span>
                    <span className="font-medium">{generatePreviewData(previewTemplate?.variables ?? [])[v] || '(no sample)'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
