'use client'

import * as React from 'react'
import {
  Users, Plus, Search, Filter, Download, Upload, MoreVertical,
  Shield, GraduationCap, BookOpen, School, UserCog, Mail,
  Phone, CheckCircle, XCircle, Edit, Trash2, UserPlus, FileDown
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useApi, apiPost, apiPut, apiDelete } from '@/lib/hooks/use-api'
import { useAuthStore } from '@/lib/stores/auth-store'
import { toast } from 'sonner'

const ROLE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  super_admin: { label: 'Super Admin', icon: <Shield className="h-4 w-4" />, color: 'text-violet-700', bg: 'bg-violet-100 dark:bg-violet-900/30' },
  school_admin: { label: 'School Admin', icon: <School className="h-4 w-4" />, color: 'text-sky-700', bg: 'bg-sky-100 dark:bg-sky-900/30' },
  teacher: { label: 'Teacher', icon: <BookOpen className="h-4 w-4" />, color: 'text-yellow-700 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-950 dark:bg-amber-900/30' },
  parent: { label: 'Parent', icon: <UserCog className="h-4 w-4" />, color: 'text-teal-700', bg: 'bg-teal-100 dark:bg-teal-900/30' },
  student: { label: 'Student', icon: <GraduationCap className="h-4 w-4" />, color: 'text-green-700 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950 dark:bg-emerald-900/30' },
}

interface UserRow {
  id: string; email: string; fullName: string; role: string; phone?: string | null;
  isActive: boolean; isEmailVerified: boolean; schoolId?: string | null;
  school?: { id: string; name: string } | null;
  createdAt: string;
}

export default function UserManagementPage() {
  const { user: authUser } = useAuthStore()
  const [search, setSearch] = React.useState('')
  const [roleFilter, setRoleFilter] = React.useState('all')
  const [statusFilter, setStatusFilter] = React.useState('all')
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editOpen, setEditOpen] = React.useState(false)
  const [selectedUser, setSelectedUser] = React.useState<UserRow | null>(null)
  const [csvImportOpen, setCsvImportOpen] = React.useState(false)

  // Form state
  const [formName, setFormName] = React.useState('')
  const [formEmail, setFormEmail] = React.useState('')
  const [formRole, setFormRole] = React.useState('student')
  const [formPhone, setFormPhone] = React.useState('')

  const queryParams = new URLSearchParams()
  if (search) queryParams.set('search', search)
  if (roleFilter !== 'all') queryParams.set('role', roleFilter)
  if (statusFilter !== 'all') queryParams.set('status', statusFilter)

  const { data, loading, error, refetch } = useApi<{ users: UserRow[]; total: number }>(
    `/api/admin/users?${queryParams.toString()}`
  )

  const handleCreate = async () => {
    try {
      await apiPost('/api/admin/users', {
        fullName: formName, email: formEmail, role: formRole, phone: formPhone,
        createdBy: authUser?.id || 'system',
      })
      toast.success('User created successfully')
      setCreateOpen(false)
      setFormName(''); setFormEmail(''); setFormRole('student'); setFormPhone('')
      refetch()
    } catch { toast.error('Failed to create user') }
  }

  const handleEdit = async () => {
    if (!selectedUser) return
    try {
      await apiPut('/api/admin/users', {
        id: selectedUser.id, fullName: formName, role: formRole, phone: formPhone,
        createdBy: authUser?.id || 'system',
      })
      toast.success('User updated successfully')
      setEditOpen(false)
      setSelectedUser(null)
      refetch()
    } catch { toast.error('Failed to update user') }
  }

  const handleToggleActive = async (user: UserRow) => {
    try {
      await apiPut('/api/admin/users', {
        id: user.id, isActive: !user.isActive, createdBy: authUser?.id || 'system',
      })
      toast.success(user.isActive ? 'User deactivated' : 'User activated')
      refetch()
    } catch { toast.error('Failed to update user') }
  }

  const handleDelete = async (user: UserRow) => {
    try {
      await apiDelete(`/api/admin/users?id=${user.id}&createdBy=${authUser?.id || 'system'}`)
      toast.success('User deactivated')
      refetch()
    } catch { toast.error('Failed to deactivate user') }
  }

  const handleExport = () => {
    if (!data?.users) return
    const csv = ['Name,Email,Role,Status,School']
      .concat(data.users.map(u =>
        `${u.fullName},${u.email},${u.role},${u.isActive ? 'Active' : 'Inactive'},${u.school?.name || ''}`
      ))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'users.csv'; a.click()
    URL.revokeObjectURL(url)
    toast.success('Users exported')
  }

  const openEdit = (user: UserRow) => {
    setSelectedUser(user)
    setFormName(user.fullName); setFormEmail(user.email); setFormRole(user.role); setFormPhone(user.phone || '')
    setEditOpen(true)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Premium Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Manage users, roles, and access control</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCsvImportOpen(true)}>
            <Upload className="h-4 w-4 mr-1" /> Import CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={!data?.users?.length}>
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add User</Button>
            </DialogTrigger>
            <DialogContent className="forge-glass-elevated border-white/[0.06] rounded-xl">
              <DialogHeader><DialogTitle>Create New User</DialogTitle></DialogHeader>
              <div className="space-y-4 py-2">
                <div><Label>Full Name</Label><Input className="forge-input-glow" value={formName} onChange={e => setFormName(e.target.value)} placeholder="John Doe" /></div>
                <div><Label>Email</Label><Input className="forge-input-glow" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="john@school.edu" type="email" /></div>
                <div><Label>Role</Label>
                  <Select value={formRole} onValueChange={setFormRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
                        <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Phone</Label><Input className="forge-input-glow" value={formPhone} onChange={e => setFormPhone(e.target.value)} placeholder="+234-800-000-0000" /></div>
              </div>
              <DialogFooter><Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} disabled={!formName || !formEmail}>Create User</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9 forge-input-glow" placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[160px]"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)
        ) : (
          Object.entries(ROLE_CONFIG).map(([role, cfg]) => {
            const count = data?.users?.filter(u => u.role === role).length ?? 0
            return (
              <Card key={role} className="cursor-pointer forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:shadow-[0_2px_8px_rgba(59,130,246,0.15)] hover:border-white/[0.08] transition-all duration-200" onClick={() => setRoleFilter(role)}>
                <CardContent className="p-4 text-center">
                  <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg mb-2 ${cfg.bg} ${cfg.color}`}>
                    {cfg.icon}
                  </div>
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-xs text-muted-foreground">{cfg.label}s</div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* User Table */}
      <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Users ({data?.total ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {error && <div className="p-6 text-center text-destructive">Error: {error}</div>}
          {loading && (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          )}
          {!loading && !data?.users?.length && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-foreground/35" />
              <h3 className="mt-4 text-lg font-semibold">No users found</h3>
              <p className="mt-2 text-sm text-muted-foreground">Users will appear here once they register or are invited to the platform.</p>
            </div>
          )}
          {data?.users && data.users.length > 0 && (
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="sticky top-0 bg-background/95 backdrop-blur-sm">Name</TableHead>
                    <TableHead className="sticky top-0 bg-background/95 backdrop-blur-sm">Email</TableHead>
                    <TableHead className="sticky top-0 bg-background/95 backdrop-blur-sm">Role</TableHead>
                    <TableHead className="sticky top-0 bg-background/95 backdrop-blur-sm">School</TableHead>
                    <TableHead className="sticky top-0 bg-background/95 backdrop-blur-sm">Status</TableHead>
                    <TableHead className="sticky top-0 bg-background/95 backdrop-blur-sm">Verified</TableHead>
                    <TableHead className="w-12 sticky top-0 bg-background/95 backdrop-blur-sm" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.users.map(user => {
                    const cfg = ROLE_CONFIG[user.role] || ROLE_CONFIG.student
                    return (
                      <TableRow key={user.id} className="hover:bg-white/[0.02] transition-colors">
                        <TableCell className="font-medium">{user.fullName}</TableCell>
                        <TableCell className="text-muted-foreground">{user.email}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={`${cfg.bg} ${cfg.color} border-0 gap-1`}>
                            {cfg.icon} {cfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{user.school?.name || '—'}</TableCell>
                        <TableCell>
                          <Badge variant={user.isActive ? 'default' : 'destructive'} className="text-[10px] px-2 rounded-full">
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.isEmailVerified ? <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(user)}><Edit className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleActive(user)}>
                                {user.isActive ? <XCircle className="h-4 w-4 mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                                {user.isActive ? 'Deactivate' : 'Activate'}
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(user)}><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="forge-glass-elevated border-white/[0.06] rounded-xl">
          <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Full Name</Label><Input className="forge-input-glow" value={formName} onChange={e => setFormName(e.target.value)} /></div>
            <div><Label>Email</Label><Input value={formEmail} disabled className="bg-muted forge-input-glow" /></div>
            <div><Label>Role</Label>
              <Select value={formRole} onValueChange={setFormRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(ROLE_CONFIG).map(([key, cfg]) => <SelectItem key={key} value={key}>{cfg.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Phone</Label><Input className="forge-input-glow" value={formPhone} onChange={e => setFormPhone(e.target.value)} /></div>
            {selectedUser && (
              <div className="flex items-center gap-2">
                <Checkbox id="active" checked={selectedUser.isActive} onCheckedChange={() => setSelectedUser({ ...selectedUser, isActive: !selectedUser.isActive })} />
                <Label htmlFor="active">Active</Label>
              </div>
            )}
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button><Button onClick={handleEdit}>Save Changes</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV Import Dialog */}
      <Dialog open={csvImportOpen} onOpenChange={setCsvImportOpen}>
        <DialogContent className="forge-glass-elevated border-white/[0.06] rounded-xl">
          <DialogHeader><DialogTitle>Import Users via CSV</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Upload a CSV file with columns: Name, Email, Role, Phone</p>
            <Input type="file" accept=".csv" onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              const text = await file.text()
              const lines = text.split('\n').slice(1).filter(l => l.trim())
              let imported = 0
              for (const line of lines) {
                const [name, email, role, phone] = line.split(',').map(s => s.trim())
                if (!name || !email) continue
                try {
                  await apiPost('/api/admin/users', { fullName: name, email, role: role || 'student', phone, createdBy: authUser?.id || 'system' })
                  imported++
                } catch { /* skip duplicates */ }
              }
              toast.success(`Imported ${imported} users`)
              setCsvImportOpen(false)
              refetch()
            }} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
