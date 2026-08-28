'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Download,
  FileText,
  FileSpreadsheet,
  Table2,
  Printer,
  Share2,
  Clock,
  Mail,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'

// ============================================================================
// ExamForge AI — Report Export Toolbar
// ============================================================================
// Provides PDF, Excel, CSV, Print, Share, and Schedule export options.
// Premium AI OS visual treatment applied.
// ============================================================================

interface ReportExportToolbarProps {
  data: Record<string, unknown>[]
  reportTitle: string
  reportType: 'student' | 'class' | 'school' | 'exam'
  reportId?: string
}

export function ReportExportToolbar({
  data,
  reportTitle,
  reportType,
  reportId,
}: ReportExportToolbarProps) {
  const [exporting, setExporting] = useState<string | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [shareEmail, setShareEmail] = useState('')
  const [scheduleFrequency, setScheduleFrequency] = useState('weekly')
  const [scheduleEmail, setScheduleEmail] = useState('')

  // ─── CSV Export ────────────────────────────────────────────
  function exportCSV() {
    if (data.length === 0) {
      toast.error('No data to export')
      return
    }

    setExporting('csv')
    try {
      const headers = Object.keys(data[0])
      const csvRows = [
        headers.join(','),
        ...data.map(row =>
          headers.map(h => {
            const val = row[h]
            const str = val === null || val === undefined ? '' : String(val)
            return str.includes(',') || str.includes('"') || str.includes('\n')
              ? `"${str.replace(/"/g, '""')}"`
              : str
          }).join(',')
        ),
      ]

      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
      downloadBlob(blob, `${reportTitle}.csv`)
      toast.success('CSV exported successfully')
    } catch {
      toast.error('Failed to export CSV')
    } finally {
      setExporting(null)
    }
  }

  // ─── Excel Export ──────────────────────────────────────────
  async function exportExcel() {
    if (data.length === 0) {
      toast.error('No data to export')
      return
    }

    setExporting('excel')
    try {
      // Dynamic import of xlsx
      const XLSX = await import('xlsx')
      const worksheet = XLSX.utils.json_to_sheet(data)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Report')
      const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      downloadBlob(blob, `${reportTitle}.xlsx`)
      toast.success('Excel exported successfully')
    } catch {
      toast.error('Failed to export Excel. Install xlsx package.')
    } finally {
      setExporting(null)
    }
  }

  // ─── PDF Export ────────────────────────────────────────────
  async function exportPDF() {
    setExporting('pdf')
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF()

      // Title
      doc.setFontSize(18)
      doc.setTextColor(16, 185, 129) // emerald
      doc.text('ExamForge AI', 14, 20)
      doc.setFontSize(14)
      doc.setTextColor(0, 0, 0)
      doc.text(reportTitle, 14, 32)

      // Date
      doc.setFontSize(10)
      doc.setTextColor(128, 128, 128)
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 40)
      doc.text(`Report Type: ${reportType}`, 14, 46)

      // Table data
      if (data.length > 0) {
        const headers = Object.keys(data[0])
        const startY = 55

        // Table header
        doc.setFontSize(9)
        doc.setTextColor(255, 255, 255)
        doc.setFillColor(16, 185, 129)
        doc.rect(14, startY - 5, 182, 8, 'F')
        doc.text(headers.join('  |  '), 16, startY)

        // Table rows (limit to fit page)
        doc.setTextColor(0, 0, 0)
        const maxRows = Math.min(data.length, 40)
        for (let i = 0; i < maxRows; i++) {
          const y = startY + 8 + (i * 6)
          if (y > 280) break

          if (i % 2 === 0) {
            doc.setFillColor(245, 245, 245)
            doc.rect(14, y - 4, 182, 6, 'F')
          }

          const row = headers.map(h => {
            const val = data[i][h]
            return val === null || val === undefined ? '' : String(val)
          }).join('  |  ')

          doc.text(row.substring(0, 120), 16, y)
        }

        if (data.length > maxRows) {
          doc.text(`... and ${data.length - maxRows} more rows`, 16, startY + 8 + (maxRows * 6) + 4)
        }
      } else {
        doc.text('No data available for this report.', 14, 55)
      }

      // Footer
      doc.setFontSize(8)
      doc.setTextColor(128, 128, 128)
      doc.text('ExamForge AI — Powered by Z.ai', 14, 290)

      const blob = doc.output('blob')
      downloadBlob(blob, `${reportTitle}.pdf`)
      toast.success('PDF exported successfully')
    } catch {
      toast.error('Failed to export PDF')
    } finally {
      setExporting(null)
    }
  }

  // ─── Print ────────────────────────────────────────────────
  function handlePrint() {
    // Add print-specific styles
    const style = document.createElement('style')
    style.id = 'print-styles'
    style.textContent = `
      @media print {
        body * { visibility: hidden; }
        .print-area, .print-area * { visibility: visible; }
        .print-area { position: absolute; left: 0; top: 0; width: 100%; }
        nav, header, aside, .no-print { display: none !important; }
      }
    `
    document.head.appendChild(style)
    window.print()
    setTimeout(() => {
      const el = document.getElementById('print-styles')
      if (el) el.remove()
    }, 1000)
  }

  // ─── Share ────────────────────────────────────────────────
  async function handleShare() {
    // Generate a shareable link
    const baseUrl = window.location.origin
    const shareUrl = `${baseUrl}/reports?type=${reportType}&id=${reportId ?? ''}`

    await navigator.clipboard.writeText(shareUrl)
    toast.success('Report link copied to clipboard')
  }

  async function handleEmailShare() {
    if (!shareEmail) {
      toast.error('Please enter an email address')
      return
    }

    try {
      const res = await fetch('/api/reports/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: shareEmail,
          reportTitle,
          reportType,
          reportId,
          shareUrl: window.location.href,
        }),
      })

      if (res.ok) {
        toast.success(`Report shared with ${shareEmail}`)
        setShareOpen(false)
        setShareEmail('')
      } else {
        toast.error('Failed to share report')
      }
    } catch {
      toast.error('Failed to share report')
    }
  }

  // ─── Schedule ─────────────────────────────────────────────
  async function handleSchedule() {
    if (!scheduleEmail) {
      toast.error('Please enter an email address')
      return
    }

    try {
      const res = await fetch('/api/reports/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: scheduleEmail,
          reportTitle,
          reportType,
          reportId,
          frequency: scheduleFrequency,
        }),
      })

      if (res.ok) {
        toast.success(`${scheduleFrequency.charAt(0).toUpperCase() + scheduleFrequency.slice(1)} report scheduled for ${scheduleEmail}`)
        setScheduleOpen(false)
        setScheduleEmail('')
        setScheduleFrequency('weekly')
      } else {
        toast.error('Failed to schedule report')
      }
    } catch {
      toast.error('Failed to schedule report')
    }
  }

  // ─── Helper ───────────────────────────────────────────────
  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const isLoading = exporting !== null

  return (
    <div className="flex items-center gap-2">
      {/* Quick Export Buttons */}
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 h-8 border-border/30 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
        onClick={exportCSV}
        disabled={isLoading}
      >
        {exporting === 'csv' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Table2 className="h-3.5 w-3.5" />}
        CSV
      </Button>

      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 h-8 border-border/30 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all duration-200"
        onClick={exportExcel}
        disabled={isLoading}
      >
        {exporting === 'excel' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
        Excel
      </Button>

      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 h-8 border-border/30 hover:border-ember/30 hover:bg-ember/5 transition-all duration-200"
        onClick={exportPDF}
        disabled={isLoading}
      >
        {exporting === 'pdf' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
        PDF
      </Button>

      {/* More Options */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 h-8 border-border/30 hover:border-primary/30 hover:bg-primary/5 transition-all duration-200" disabled={isLoading}>
            <Download className="h-3.5 w-3.5" />
            More
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="forge-glass-elevated border border-border/30">
          <DropdownMenuItem onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Print Report
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShareOpen(true)} className="gap-2">
            <Share2 className="h-4 w-4" />
            Share Report
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleShare} className="gap-2">
            <Mail className="h-4 w-4" />
            Copy Share Link
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setScheduleOpen(true)} className="gap-2">
            <Clock className="h-4 w-4" />
            Schedule Delivery
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Share Dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-md forge-glass-elevated border border-border/30">
          <DialogHeader>
            <DialogTitle>Share Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="share-email">Email Address</Label>
              <Input
                id="share-email"
                type="email"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                placeholder="colleague@school.edu"
                className="mt-1.5 forge-input-glow"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              The recipient will receive an email with a link to view this report.
            </p>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="border-border/30">Cancel</Button>
            </DialogClose>
            <Button onClick={handleEmailShare} className="forge-glow">
              <Mail className="h-4 w-4 mr-2" />
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Dialog */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="sm:max-w-md forge-glass-elevated border border-border/30">
          <DialogHeader>
            <DialogTitle>Schedule Report Delivery</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="schedule-email">Email Address</Label>
              <Input
                id="schedule-email"
                type="email"
                value={scheduleEmail}
                onChange={(e) => setScheduleEmail(e.target.value)}
                placeholder="admin@school.edu"
                className="mt-1.5 forge-input-glow"
              />
            </div>
            <div>
              <Label>Frequency</Label>
              <Select value={scheduleFrequency} onValueChange={setScheduleFrequency}>
                <SelectTrigger className="mt-1.5 forge-input-glow">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              The report will be automatically generated and delivered at the selected frequency.
            </p>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="border-border/30">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSchedule} className="forge-glow">
              <Clock className="h-4 w-4 mr-2" />
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
