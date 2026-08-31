'use client'
import { apiFetch } from '@/lib/api/client-fetch'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from 'sonner'
import {
  Shield,
  ShieldCheck,
  Smartphone,
  Key,
  Monitor,
  Globe,
  Clock,
  Loader2,
  Copy,
  CheckCheck,
  Trash2,
  LogOut,
  QrCode,
  Lock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  History,
} from 'lucide-react'

// ============================================================================
// ExamForge AI — Security Settings Page
// ============================================================================
// Two-Factor Authentication, Session Management, Login History, Password Policy.
// Data fetched from /api/settings/security (backed by Supabase).
// ============================================================================

interface Session {
  id: string
  device: string
  browser: string
  ip: string
  location: string
  lastActive: string
  current: boolean
}

interface LoginEntry {
  id: string
  ip: string
  device: string
  timestamp: string
  success: boolean
}

interface PasswordPolicy {
  minLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireNumbers: boolean
  requireSpecialChars: boolean
  expiryDays: number
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function SecuritySettingsPage() {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [sessions, setSessions] = useState<Session[]>([])
  const [loginHistory, setLoginHistory] = useState<LoginEntry[]>([])
  const [passwordPolicy, setPasswordPolicy] = useState<PasswordPolicy | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 2FA Setup State
  const [show2FASetup, setShow2FASetup] = useState(false)
  const [totpSecret, setTotpSecret] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [otpauthUrl, setOtpauthUrl] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [copiedSecret, setCopiedSecret] = useState(false)
  const [copiedBackup, setCopiedBackup] = useState(false)

  const fetchSecurityData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/settings/security')
      if (!res.ok) throw new Error('Failed to fetch security settings')
      const data = await res.json()
      setTwoFactorEnabled(data.twoFactorEnabled ?? false)
      setSessions(data.sessions ?? [])
      setLoginHistory(data.loginHistory ?? [])
      setPasswordPolicy(data.passwordPolicy ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load security settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSecurityData()
  }, [fetchSecurityData])

  const handleSetup2FA = async () => {
    try {
      const res = await apiFetch('/api/settings/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setup_2fa' }),
      })
      if (!res.ok) throw new Error('Failed to start 2FA setup')
      const data = await res.json()

      setTotpSecret(data.secret)
      setBackupCodes(data.backupCodes)
      setOtpauthUrl(data.otpauthUrl)
      setShow2FASetup(true)
    } catch {
      toast.error('Failed to start 2FA setup')
    }
  }

  const handleVerify2FA = async () => {
    setVerifying(true)
    try {
      const res = await apiFetch('/api/settings/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify_2fa', code: verificationCode }),
      })
      if (!res.ok) throw new Error('Verification failed')
      const data = await res.json()

      if (data.verified) {
        setTwoFactorEnabled(true)
        setShow2FASetup(false)
        toast.success('Two-factor authentication enabled!')
      } else {
        toast.error('Invalid verification code')
      }
    } catch {
      toast.error('Verification failed')
    } finally {
      setVerifying(false)
    }
  }

  const handleDisable2FA = async () => {
    try {
      const res = await apiFetch('/api/settings/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'disable_2fa' }),
      })
      if (!res.ok) throw new Error('Failed to disable 2FA')
      setTwoFactorEnabled(false)
      setTotpSecret('')
      setBackupCodes([])
      toast.success('Two-factor authentication disabled')
    } catch {
      toast.error('Failed to disable 2FA')
    }
  }

  const handleCopySecret = () => {
    navigator.clipboard.writeText(totpSecret)
    setCopiedSecret(true)
    setTimeout(() => setCopiedSecret(false), 2000)
  }

  const handleCopyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'))
    setCopiedBackup(true)
    setTimeout(() => setCopiedBackup(false), 2000)
  }

  const handleRevokeSession = async (sessionId: string) => {
    try {
      const res = await apiFetch('/api/settings/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revoke_session', sessionId }),
      })
      if (!res.ok) throw new Error('Failed to revoke session')
      setSessions(prev => prev.filter(s => s.id !== sessionId))
      toast.success('Session revoked')
    } catch {
      toast.error('Failed to revoke session')
    }
  }

  const handleRevokeAllSessions = async () => {
    try {
      const res = await apiFetch('/api/settings/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revoke_all_sessions' }),
      })
      if (!res.ok) throw new Error('Failed to revoke sessions')
      setSessions(prev => prev.filter(s => s.current))
      toast.success('All other sessions revoked')
    } catch {
      toast.error('Failed to revoke sessions')
    }
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
          <h1 className="text-3xl font-bold tracking-tight">Security Settings</h1>
        </div>
        <Card className="p-8 text-center forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
          <XCircle className="h-10 w-10 mx-auto text-destructive mb-3" />
          <h3 className="text-lg font-medium">Failed to load security settings</h3>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={fetchSecurityData}>
            <RefreshCw className="h-4 w-4 mr-1" /> Retry
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Security Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage two-factor authentication, sessions, and security policies.
        </p>
      </div>

      <Tabs defaultValue="2fa" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="2fa" className="gap-2">
            <Shield className="h-4 w-4 hidden sm:block" />
            2FA
          </TabsTrigger>
          <TabsTrigger value="sessions" className="gap-2">
            <Monitor className="h-4 w-4 hidden sm:block" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="policy" className="gap-2">
            <Lock className="h-4 w-4 hidden sm:block" />
            Policy
          </TabsTrigger>
        </TabsList>

        {/* 2FA Tab */}
        <TabsContent value="2fa" className="space-y-6">
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5" />
                    Two-Factor Authentication
                  </CardTitle>
                  <CardDescription>
                    Add an extra layer of security with TOTP-based 2FA.
                  </CardDescription>
                </div>
                <Badge variant={twoFactorEnabled ? 'default' : 'secondary'}>
                  {twoFactorEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {twoFactorEnabled ? (
                <>
                  <div className="rounded-lg border bg-green-50 dark:bg-green-950 dark:bg-emerald-950/30 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <span className="text-sm font-medium text-green-600 dark:text-green-400">
                        Two-factor authentication is active
                      </span>
                    </div>
                    <p className="text-xs text-green-600 dark:text-green-400 dark:text-green-600 dark:text-green-400">
                      You will be asked for a verification code when signing in.
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Shield className="h-4 w-4 mr-1" />
                        Disable 2FA
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="forge-glass-elevated border-white/[0.06] rounded-xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Disable Two-Factor Authentication?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove the extra security layer from your account. 
                          Are you sure you want to continue?
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDisable2FA}>
                          Disable 2FA
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              ) : (
                <>
                  <div className="rounded-lg border bg-yellow-50 dark:bg-yellow-950 dark:bg-amber-950/30 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                      <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                        Two-factor authentication is not enabled
                      </span>
                    </div>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 dark:text-yellow-600 dark:text-yellow-400">
                      Enable 2FA to protect your account with a verification code at sign-in.
                    </p>
                  </div>
                  <Button onClick={handleSetup2FA}>
                    <ShieldCheck className="h-4 w-4 mr-1" />
                    Set Up 2FA
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="space-y-6">
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Active Sessions</CardTitle>
                  <CardDescription>
                    Manage devices currently signed in to your account.
                  </CardDescription>
                </div>
                {sessions.length > 1 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <LogOut className="h-4 w-4 mr-1" />
                        Sign Out Others
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="forge-glass-elevated border-white/[0.06] rounded-xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Sign out all other devices?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will revoke all sessions except your current one.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRevokeAllSessions}>
                          Sign Out Others
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <EmptyState
                  icon={<Monitor className="h-8 w-8" />}
                  title="No Active Sessions"
                  description="There are no active sessions for your account. Sign in to create a new session."
                  className="border-0 bg-transparent"
                />
              ) : (
                <div className="space-y-1">
                  {sessions.map((session, idx) => (
                    <div key={session.id}>
                      <div className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                            <Monitor className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{session.device}</span>
                              {session.current && (
                                <Badge variant="default" className="text-[10px]">Current</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{session.browser}</span>
                              <span>·</span>
                              <span>{session.ip}</span>
                              <span>·</span>
                              <span>{session.location}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatRelativeTime(session.lastActive)}
                            </span>
                          </div>
                        </div>
                        {!session.current && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRevokeSession(session.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      {idx < sessions.length - 1 && <Separator />}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Login History */}
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
            <CardHeader>
              <CardTitle>Login History</CardTitle>
              <CardDescription>
                Recent login attempts to your account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loginHistory.length === 0 ? (
                <EmptyState
                  icon={<History className="h-8 w-8" />}
                  title="No Login History"
                  description="Login attempts will appear here when you or others try to sign in to your account."
                  className="border-0 bg-transparent"
                />
              ) : (
                <div className="space-y-2">
                  {loginHistory.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between py-2 text-sm">
                      <div className="flex items-center gap-3">
                        {entry.success ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                        <div>
                          <span className="font-medium">{entry.device}</span>
                          <div className="text-xs text-muted-foreground">
                            {entry.ip} · {new Date(entry.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <Badge variant={entry.success ? 'default' : 'destructive'} className="text-[10px]">
                        {entry.success ? 'Success' : 'Failed'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Policy Tab */}
        <TabsContent value="policy" className="space-y-6">
          {passwordPolicy ? (
            <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow hover:-translate-y-0.5 hover:border-white/[0.06] transition-all">
              <CardHeader>
                <CardTitle>Password Policy</CardTitle>
                <CardDescription>
                  Current password requirements for all users.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <span className="text-sm">Minimum Length</span>
                    <Badge variant="outline">{passwordPolicy.minLength} characters</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <span className="text-sm">Require Uppercase</span>
                    <Switch checked={passwordPolicy.requireUppercase} disabled />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <span className="text-sm">Require Lowercase</span>
                    <Switch checked={passwordPolicy.requireLowercase} disabled />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <span className="text-sm">Require Numbers</span>
                    <Switch checked={passwordPolicy.requireNumbers} disabled />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <span className="text-sm">Special Characters</span>
                    <Switch checked={passwordPolicy.requireSpecialChars} disabled />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <span className="text-sm">Password Expiry</span>
                    <Badge variant="outline">{passwordPolicy.expiryDays} days</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <EmptyState
              icon={<Lock className="h-8 w-8" />}
              title="No Password Policy Configured"
              description="Password policy settings will appear here once configured by your organization administrator."
              className="border-0 bg-transparent"
            />
          )}
        </TabsContent>
      </Tabs>

      {/* 2FA Setup Dialog */}
      <Dialog open={show2FASetup} onOpenChange={(open) => !open && setShow2FASetup(false)}>
        <DialogContent className="forge-glass-elevated border-white/[0.06] rounded-xl max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Set Up Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Follow these steps to enable TOTP-based 2FA for your account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Step 1: QR Code */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">1</span>
                Scan QR Code
              </h3>
              <p className="text-sm text-muted-foreground">
                Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.).
              </p>
              <div className="flex justify-center p-4 border rounded-lg bg-white">
                <div className="h-48 w-48 bg-muted flex items-center justify-center rounded">
                  <div className="text-center">
                    <QrCode className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">QR Code</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Manual Entry Key</Label>
                <div className="flex gap-2">
                  <Input value={totpSecret} readOnly className="font-mono text-sm forge-input-glow" />
                  <Button variant="outline" size="icon" onClick={handleCopySecret}>
                    {copiedSecret ? <CheckCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

            {/* Step 2: Verification */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">2</span>
                Verify Code
              </h3>
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code from your authenticator app.
              </p>
              <div className="flex gap-2">
                <Input
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="font-mono text-center text-lg tracking-widest"
                  maxLength={6}
                />
              </div>
            </div>

            <Separator />

            {/* Step 3: Backup Codes */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">3</span>
                Save Backup Codes
              </h3>
              <p className="text-sm text-muted-foreground">
                Store these backup codes in a safe place. Each code can only be used once.
              </p>
              <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg bg-muted/30 font-mono text-sm">
                {backupCodes.map((code, idx) => (
                  <div key={idx} className="flex items-center gap-1">
                    <span className="text-muted-foreground text-xs w-4">{idx + 1}.</span>
                    <span>{code}</span>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={handleCopyBackupCodes}>
                {copiedBackup ? <CheckCheck className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                Copy All Codes
              </Button>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShow2FASetup(false)}>Cancel</Button>
            <Button onClick={handleVerify2FA} disabled={verifying || verificationCode.length !== 6}>
              {verifying ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Enable 2FA
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
