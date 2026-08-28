'use client'

import * as React from 'react'
import {
  Shield, Lock, GraduationCap, BookOpen, School, UserCog,
  Eye, Plus, Pencil, Trash2, Check, X, ChevronDown, AlertCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useApi, apiPut } from '@/lib/hooks/use-api'
import { useAuthStore } from '@/lib/stores/auth-store'
import { toast } from 'sonner'

const ROLE_META: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string; desc: string }> = {
  super_admin: { label: 'Super Admin', icon: <Shield className="h-5 w-5" />, color: 'text-violet-700', bg: 'bg-violet-100 dark:bg-violet-900/30', desc: 'Full platform control — all schools, all features' },
  school_admin: { label: 'School Admin', icon: <School className="h-5 w-5" />, color: 'text-sky-700', bg: 'bg-sky-100 dark:bg-sky-900/30', desc: 'Manage their school — users, exams, fees, reports' },
  teacher: { label: 'Teacher', icon: <BookOpen className="h-5 w-5" />, color: 'text-yellow-700 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-950 dark:bg-amber-900/30', desc: 'Create exams, manage classes, view reports' },
  parent: { label: 'Parent', icon: <UserCog className="h-5 w-5" />, color: 'text-teal-700', bg: 'bg-teal-100 dark:bg-teal-900/30', desc: 'View children\'s progress, attendance, fees, message teachers' },
  student: { label: 'Student', icon: <GraduationCap className="h-5 w-5" />, color: 'text-green-700 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950 dark:bg-emerald-900/30', desc: 'Take exams, view own results and schedule' },
}

const ROLE_HIERARCHY = ['student', 'parent', 'teacher', 'school_admin', 'super_admin']

export default function RolePermissionPage() {
  const { user } = useAuthStore()
  const { data, loading, error, refetch } = useApi<{
    roles: string[]
    resources: string[]
    actions: string[]
    matrix: { role: string; permissions: { resource: string; actions: { action: string; isAllowed: boolean }[] }[] }[]
  }>('/api/admin/roles')

  const [editMode, setEditMode] = React.useState(false)

  const handleToggle = async (role: string, resource: string, action: string, current: boolean) => {
    try {
      await apiPut('/api/admin/roles', { role, resource, action, isAllowed: !current, userId: user?.id || 'system' })
      toast.success(`Permission ${!current ? 'granted' : 'revoked'}: ${role} → ${resource}.${action}`)
      refetch()
    } catch {
      toast.error('Failed to update permission')
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><Shield className="h-7 w-7" /> Role & Permission Management</h1>
          <p className="text-sm text-muted-foreground">Configure role hierarchy and access control matrix</p>
        </div>
        <Button variant={editMode ? 'default' : 'outline'} onClick={() => setEditMode(!editMode)}>
          <Pencil className="h-4 w-4 mr-1" /> {editMode ? 'Done Editing' : 'Edit Permissions'}
        </Button>
      </div>

      {/* Role Hierarchy */}
      <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
            <CardHeader><CardTitle className="text-base">Role Hierarchy</CardTitle><CardDescription>student &lt; parent &lt; teacher &lt; school_admin &lt; super_admin</CardDescription></CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {ROLE_HIERARCHY.map((role, i) => {
              const meta = ROLE_META[role]
              return (
                <React.Fragment key={role}>
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${meta.bg} ${meta.color} min-w-fit`}>
                    {meta.icon}
                    <div>
                      <div className="font-semibold text-sm">{meta.label}</div>
                      <div className="text-xs opacity-70">Level {i}</div>
                    </div>
                  </div>
                  {i < ROLE_HIERARCHY.length - 1 && (
                    <ChevronDown className="h-4 w-4 text-muted-foreground rotate-[-90deg] shrink-0" />
                  )}
                </React.Fragment>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Role Descriptions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(ROLE_META).map(([role, meta]) => {
          const permCount = data?.matrix?.find(m => m.role === role)?.permissions
            .reduce((sum, p) => sum + p.actions.filter(a => a.isAllowed).length, 0) ?? 0
          return (
            <Card key={role} className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] hover:border-white/[0.08] transition-all duration-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-lg ${meta.bg} ${meta.color}`}>{meta.icon}</div>
                  <div>
                    <h3 className="font-semibold">{meta.label}</h3>
                    <p className="text-xs text-muted-foreground">{permCount} permissions granted</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{meta.desc}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Permission Matrix */}
      <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
            <CardHeader>
          <CardTitle className="text-base">Permission Matrix</CardTitle>
          <CardDescription>
            {editMode ? 'Click checkboxes to toggle permissions' : 'Switch to edit mode to modify permissions'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {error && <div className="p-6 text-center text-destructive"><AlertCircle className="h-5 w-5 inline mr-2" />{error}</div>}
          {loading && <div className="p-6 space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>}
          {data?.matrix && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10 min-w-[120px]">Role</TableHead>
                    {data.resources.map(resource => (
                      <TableHead key={resource} className="text-center min-w-[100px]">
                        <span className="text-xs font-medium">{resource}</span>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.matrix.map(({ role, permissions }) => {
                    const meta = ROLE_META[role] || ROLE_META.student
                    return (
                      <TableRow key={role} className="hover:bg-white/[0.02] transition-colors">
                        <TableCell className="sticky left-0 bg-background z-10">
                          <Badge variant="secondary" className={`${meta.bg} ${meta.color} border-0 gap-1`}>
                            {meta.icon} {meta.label}
                          </Badge>
                        </TableCell>
                        {permissions.map(perm => (
                          <TableCell key={perm.resource} className="text-center">
                            <div className="flex flex-wrap justify-center gap-1">
                              {perm.actions.map(act => (
                                editMode ? (
                                  <Checkbox
                                    key={act.action}
                                    checked={act.isAllowed}
                                    onCheckedChange={() => handleToggle(role, perm.resource, act.action, act.isAllowed)}
                                    className="h-4 w-4"
                                  />
                                ) : (
                                  <Badge key={act.action} variant={act.isAllowed ? 'default' : 'outline'} className="text-[10px] px-1 py-0">
                                    {act.action}
                                  </Badge>
                                )
                              ))}
                            </div>
                          </TableCell>
                        ))}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit Trail Note */}
      <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-medium text-sm">Audit Trail</h3>
              <p className="text-xs text-muted-foreground">All permission changes are logged in the audit system. View the complete trail in <a href="/admin/audit-logs" className="text-primary underline">Audit Logs</a>.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
