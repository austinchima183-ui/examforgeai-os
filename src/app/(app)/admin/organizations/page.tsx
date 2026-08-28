'use client'

import { useState, useMemo, useCallback } from 'react'
import { useApi } from '@/lib/hooks/use-api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Label } from '@/components/ui/label'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Building2, Plus, Search, ChevronRight, ChevronDown, Users,
  ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, Globe, TreePine,
  MoreHorizontal, Pencil, Trash2, Eye
} from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { OrganizationType, OrganizationTreeNode } from '@/lib/enterprise/types'
import { ORGANIZATION_HIERARCHY_LEVELS } from '@/lib/enterprise/types'

// ── Constants ────────────────────────────────────────────────

const ORG_TYPE_LABELS: Record<OrganizationType, string> = {
  school: 'School',
  school_group: 'School Group',
  district: 'District',
  ministry: 'Ministry',
  region: 'Region',
  country: 'Country',
  campus: 'Campus',
  branch: 'Branch',
  department: 'Department',
  faculty: 'Faculty',
  university: 'University',
  college: 'College',
  examination_council: 'Examination Council',
  ngo: 'NGO',
  corporate_training: 'Corporate Training',
  international_network: 'International Network',
}

const ORG_TYPES: OrganizationType[] = [
  'international_network', 'country', 'ministry', 'region', 'district',
  'school_group', 'campus', 'university', 'college', 'branch',
  'department', 'faculty', 'school', 'examination_council', 'ngo', 'corporate_training',
]

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
] as const

const PAGE_SIZES = [10, 25, 50]

// ── Helper Functions ─────────────────────────────────────────

function flattenOrgs(nodes: OrganizationTreeNode[]): OrganizationTreeNode[] {
  return nodes.flatMap(n => [n, ...flattenOrgs(n.children)])
}

type SortField = 'name' | 'type' | 'code' | 'status' | 'members'
type SortDir = 'asc' | 'desc'

function SortIcon({ field, currentField, currentDir }: { field: SortField; currentField: SortField; currentDir: SortDir }) {
  if (field !== currentField) return <ArrowUpDown className="h-3.5 w-3.5 text-foreground/35" />
  return currentDir === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
}

function OrgTypeBadge({ type }: { type: OrganizationType }) {
  const level = ORGANIZATION_HIERARCHY_LEVELS[type]
  const colorMap: Record<number, string> = {
    0: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200',
    1: 'bg-green-50 dark:bg-green-950 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
    2: 'bg-yellow-50 dark:bg-yellow-950 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    3: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200',
    4: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200',
    5: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
    6: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    7: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
    8: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900 dark:text-fuchsia-200',
    9: 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200',
  }
  return (
    <Badge variant="secondary" className={colorMap[level] ?? 'bg-gray-100 text-gray-800'}>
      {ORG_TYPE_LABELS[type]}
    </Badge>
  )
}

// ── Tree Component ───────────────────────────────────────────

function TreeItem({ node, depth, expandedIds, onToggle, onSelect, selectedId }: {
  node: OrganizationTreeNode
  depth: number
  expandedIds: Set<string>
  onToggle: (id: string) => void
  onSelect: (node: OrganizationTreeNode) => void
  selectedId: string | null
}) {
  const hasChildren = node.children.length > 0
  const isExpanded = expandedIds.has(node.id)
  const isSelected = selectedId === node.id

  return (
    <div>
      <button
        onClick={() => onSelect(node)}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors hover:bg-accent ${
          isSelected ? 'bg-accent text-accent-foreground font-medium' : ''
        }`}
        style={{ paddingLeft: `${depth * 20 + 12}px` }}
      >
        {hasChildren ? (
          <button onClick={(e) => { e.stopPropagation(); onToggle(node.id) }} className="shrink-0">
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="truncate">{node.name}</span>
      </button>
      {hasChildren && isExpanded && (
        <div>
          {node.children.map(child => (
            <TreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onSelect={onSelect}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Page Component ──────────────────────────────────────

export default function OrganizationsPage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<OrganizationType | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['1', '2', '3']))
  const [selectedOrg, setSelectedOrg] = useState<OrganizationTreeNode | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const [newOrg, setNewOrg] = useState({ name: '', type: 'school' as OrganizationType, parent: '', code: '', country: '' })

  const { data: orgsData, loading: isLoading, error } = useApi<OrganizationTreeNode[] | { organizations: OrganizationTreeNode[]; total: number }>('/api/organizations')
  // API returns a paginated envelope ({ organizations, total, ... }) — normalize to an array
  const orgs = Array.isArray(orgsData) ? orgsData : orgsData?.organizations ?? []

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSort = useCallback((field: SortField) => {
    setSortField(prev => {
      if (prev === field) {
        setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        return prev
      }
      setSortDir('asc')
      return field
    })
  }, [])

  const filteredAndSorted = useMemo(() => {
    let all = flattenOrgs(orgs)
    if (search) {
      const q = search.toLowerCase()
      all = all.filter(o => o.name.toLowerCase().includes(q) || o.code.toLowerCase().includes(q))
    }
    if (typeFilter !== 'all') {
      all = all.filter(o => o.type === typeFilter)
    }
    if (statusFilter !== 'all') {
      all = all.filter(o => statusFilter === 'active' ? o.is_active : !o.is_active)
    }
    all.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'name': cmp = a.name.localeCompare(b.name); break
        case 'type': cmp = ORG_TYPE_LABELS[a.type].localeCompare(ORG_TYPE_LABELS[b.type]); break
        case 'code': cmp = a.code.localeCompare(b.code); break
        case 'status': cmp = Number(a.is_active) - Number(b.is_active); break
        case 'members': cmp = (a.metadata.studentCount ?? 0) - (b.metadata.studentCount ?? 0); break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return all
  }, [search, typeFilter, statusFilter, sortField, sortDir])

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / pageSize))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const paginated = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize
    return filteredAndSorted.slice(start, start + pageSize)
  }, [filteredAndSorted, safeCurrentPage, pageSize])

  // ── Loading State ─────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Skeleton className="h-5 w-72" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-[200px]" />
          <Skeleton className="h-10 w-[160px]" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          <Skeleton className="h-80" />
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        </div>
      </div>
    )
  }

  // ── Main Render ───────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href="/admin/organizations">Admin</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink href="/admin/organizations">Organizations</BreadcrumbLink></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Organization Management
          </h1>
          <p className="text-sm text-muted-foreground">Manage the organizational hierarchy across your enterprise</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Create Organization</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md forge-glass-elevated border-white/[0.06] rounded-xl">
            <DialogHeader>
              <DialogTitle>Create Organization</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input className="forge-input-glow" value={newOrg.name} onChange={e => setNewOrg(p => ({ ...p, name: e.target.value }))} placeholder="Organization name" />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={newOrg.type} onValueChange={v => setNewOrg(p => ({ ...p, type: v as OrganizationType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ORG_TYPES.map(t => <SelectItem key={t} value={t}>{ORG_TYPE_LABELS[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Parent Organization</Label>
                <Select value={newOrg.parent} onValueChange={v => setNewOrg(p => ({ ...p, parent: v }))}>
                  <SelectTrigger><SelectValue placeholder="None (root)" /></SelectTrigger>
                  <SelectContent>
                    {flattenOrgs(orgs).map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Code</Label>
                <Input className="forge-input-glow" value={newOrg.code} onChange={e => setNewOrg(p => ({ ...p, code: e.target.value }))} placeholder="ORG-001" />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Input className="forge-input-glow" value={newOrg.country} onChange={e => setNewOrg(p => ({ ...p, country: e.target.value }))} placeholder="Nigeria" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={() => setCreateOpen(false)}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9 forge-input-glow" placeholder="Search organizations by name or code..." value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1) }} />
        </div>
        <Select value={typeFilter} onValueChange={v => { setTypeFilter(v as OrganizationType | 'all'); setCurrentPage(1) }}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="All types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {ORG_TYPES.map(t => <SelectItem key={t} value={t}>{ORG_TYPE_LABELS[t]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v as typeof statusFilter); setCurrentPage(1) }}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Main Content: Tree + Data Table */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Hierarchy Tree */}
        <Card className="h-fit forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TreePine className="h-4 w-4" />Hierarchy
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2 max-h-[600px] overflow-y-auto">
            {orgs.map(root => (
              <TreeItem
                key={root.id}
                node={root}
                depth={0}
                expandedIds={expandedIds}
                onToggle={toggleExpand}
                onSelect={setSelectedOrg}
                selectedId={selectedOrg?.id ?? null}
              />
            ))}
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow overflow-hidden">
          <CardContent className="p-0">
            {filteredAndSorted.length === 0 ? (
              <div className="py-16 text-center">
                <Building2 className="h-12 w-12 mx-auto text-foreground/30" />
                <h3 className="mt-4 text-lg font-semibold">No organizations found</h3>
                <p className="text-muted-foreground text-sm">Try adjusting your search or filters</p>
                <Button variant="outline" className="mt-4" onClick={() => { setSearch(''); setTypeFilter('all'); setStatusFilter('all') }}>
                  Clear filters
                </Button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="cursor-pointer select-none hover:bg-accent/50 transition-colors" onClick={() => handleSort('name')}>
                          <span className="flex items-center gap-1">Name <SortIcon field="name" currentField={sortField} currentDir={sortDir} /></span>
                        </TableHead>
                        <TableHead className="cursor-pointer select-none hover:bg-accent/50 transition-colors" onClick={() => handleSort('type')}>
                          <span className="flex items-center gap-1">Type <SortIcon field="type" currentField={sortField} currentDir={sortDir} /></span>
                        </TableHead>
                        <TableHead className="cursor-pointer select-none hover:bg-accent/50 transition-colors" onClick={() => handleSort('code')}>
                          <span className="flex items-center gap-1">Code <SortIcon field="code" currentField={sortField} currentDir={sortDir} /></span>
                        </TableHead>
                        <TableHead className="cursor-pointer select-none hover:bg-accent/50 transition-colors" onClick={() => handleSort('status')}>
                          <span className="flex items-center gap-1">Status <SortIcon field="status" currentField={sortField} currentDir={sortDir} /></span>
                        </TableHead>
                        <TableHead className="cursor-pointer select-none hover:bg-accent/50 transition-colors" onClick={() => handleSort('members')}>
                          <span className="flex items-center gap-1">Members <SortIcon field="members" currentField={sortField} currentDir={sortDir} /></span>
                        </TableHead>
                        <TableHead className="w-[60px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginated.map(org => (
                        <TableRow key={org.id} className="cursor-pointer hover:bg-white/[0.02] transition-colors" onClick={() => setSelectedOrg(org)}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                <Building2 className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">{org.name}</p>
                                <p className="text-xs text-muted-foreground">Level {org.level}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell><OrgTypeBadge type={org.type} /></TableCell>
                          <TableCell><code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{org.code}</code></TableCell>
                          <TableCell>
                            <Badge variant={org.is_active ? 'default' : 'secondary'} className="text-xs">
                              {org.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{org.metadata.studentCount?.toLocaleString() ?? 0}</span>
                              <span className="flex items-center gap-1"><Globe className="h-3.5 w-3.5" />{org.metadata.staffCount?.toLocaleString() ?? 0} staff</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem><Eye className="h-4 w-4 mr-2" />View Details</DropdownMenuItem>
                                <DropdownMenuItem><Pencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Showing {((safeCurrentPage - 1) * pageSize) + 1}–{Math.min(safeCurrentPage * pageSize, filteredAndSorted.length)} of {filteredAndSorted.length}</span>
                    <span className="mx-2">|</span>
                    <Select value={String(pageSize)} onValueChange={v => { setPageSize(Number(v)); setCurrentPage(1) }}>
                      <SelectTrigger className="h-8 w-[70px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PAGE_SIZES.map(s => <SelectItem key={s} value={String(s)}>{s}/page</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8" disabled={safeCurrentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <Button
                        key={page}
                        variant={page === safeCurrentPage ? 'default' : 'outline'}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    ))}
                    <Button variant="outline" size="icon" className="h-8 w-8" disabled={safeCurrentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
