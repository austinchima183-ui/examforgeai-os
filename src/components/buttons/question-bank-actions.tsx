'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { FileText, BookOpen, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export function QuestionBankActions({ schoolId }: { schoolId: string | null }) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    try {
      // Step 1: Validate the file
      const formData = new FormData()
      formData.append('file', file)
      if (schoolId) formData.append('schoolId', schoolId)

      const validateRes = await fetch('/api/import/validate', {
        method: 'POST',
        body: formData,
      })

      if (!validateRes.ok) {
        const err = await validateRes.json().catch(() => ({}))
        throw new Error(err.error || 'Validation failed')
      }

      const validation = await validateRes.json()

      // Step 2: Execute the import
      const executeRes = await fetch('/api/import/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId,
          fileName: file.name,
          fileType: file.name.endsWith('.json') ? 'json' : 'csv',
          data: validation.preview || validation.data,
        }),
      })

      if (!executeRes.ok) {
        const err = await executeRes.json().catch(() => ({}))
        throw new Error(err.error || 'Import failed')
      }

      const result = await executeRes.json()
      toast.success(`Imported ${result.imported || 0} questions${result.errors ? ` (${result.errors} errors)` : ''}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
      // Reset the file input so the same file can be re-imported
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function handleExport() {
    window.open('/api/questions/export', '_blank')
  }

  return (
    <>
      <Button variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()} disabled={importing}>
        {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
        {importing ? 'Importing...' : 'Import'}
      </Button>
      <Button variant="outline" className="gap-2" onClick={handleExport}>
        <BookOpen className="h-4 w-4" />
        Export
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.json"
        className="hidden"
        onChange={handleImport}
      />
    </>
  )
}
