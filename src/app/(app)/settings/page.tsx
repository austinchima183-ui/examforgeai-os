'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSupabase } from '@/lib/hooks/use-supabase'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useTheme } from '@/lib/stores/theme-store'
import { updateProfileSchema, type UpdateProfileInput } from '@/lib/validators/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { toast } from 'sonner'
import Image from 'next/image'
import {
  User,
  Bell,
  Palette,
  Shield,
  Loader2,
  Save,
  Moon,
  Sun,
  Monitor,
  Upload,
  Plug,
  Trash2,
  AlertTriangle,
  Key,
  Globe,
} from 'lucide-react'

// ============================================================================
// ExamForge AI — Settings Page
// ============================================================================
// Client component with profile, theme, notification, and security sections.
// Notification preferences are persisted to Supabase profiles.preferences.
// Avatar upload uses Supabase Storage.
// Premium AI OS visual treatment applied.
// ============================================================================

interface NotificationPreferences {
  emailNotifications: boolean
  examReminders: boolean
  resultAlerts: boolean
  systemUpdates: boolean
  marketingEmails: boolean
}

export default function SettingsPage() {
  const supabase = useSupabase()
  const { user, setUser } = useAuthStore()
  const { theme, setTheme } = useTheme()
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [savingNotifications, setSavingNotifications] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const [notifications, setNotifications] = useState<NotificationPreferences>({
    emailNotifications: true,
    examReminders: true,
    resultAlerts: true,
    systemUpdates: false,
    marketingEmails: false,
  })

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const profileForm = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      fullName: user?.fullName ?? '',
      phone: user?.phone ?? '',
      avatarUrl: user?.avatarUrl ?? '',
    },
  })

  // Load notification preferences from Supabase
  useEffect(() => {
    async function loadPreferences() {
      const { data: { user: authUser } } = await supabase!.auth.getUser()
      if (!authUser) return

      const { data: profile } = await supabase!
        .from('users')
        .select('settings')
        .eq('id', authUser.id)
        .maybeSingle()

      const profileData = profile as { settings: Record<string, unknown> | null } | null
      if (profileData?.settings) {
        const prefs = profileData.settings
        const notifPrefs = prefs.notifications as NotificationPreferences | undefined
        if (notifPrefs) {
          setNotifications(notifPrefs)
        }
      }
    }
    loadPreferences()
  }, [supabase])

  const onProfileSubmit = async (values: UpdateProfileInput) => {
    setSavingProfile(true)

    try {
      const { error: updateError } = await supabase!.auth.updateUser({
        data: {
          full_name: values.fullName,
          phone: values.phone ?? '',
          avatar_url: values.avatarUrl ?? '',
        },
      })

      if (updateError) {
        toast.error('Failed to update profile', { description: updateError.message })
        return
      }

      const { data: { user: authUser } } = await supabase!.auth.getUser()
      if (authUser) {
        await supabase!
          .from('users')
          .update({
            full_name: values.fullName,
            phone: values.phone ?? null,
            avatar_url: values.avatarUrl ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', authUser.id)
      }

      if (user) {
        setUser({
          ...user,
          fullName: values.fullName,
          phone: values.phone ?? null,
          avatarUrl: values.avatarUrl ?? null,
        })
      }

      toast.success('Profile updated successfully')
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      toast.error('File too large', { description: 'Avatar must be under 2MB' })
      return
    }

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      toast.error('Invalid file type', { description: 'Only JPEG, PNG, WebP, and GIF are allowed' })
      return
    }

    setUploadingAvatar(true)

    try {
      const { data: { user: authUser } } = await supabase!.auth.getUser()
      if (!authUser) return

      const fileExt = file.name.split('.').pop()
      const filePath = `avatars/${authUser.id}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase!.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) {
        toast.error('Upload failed', { description: uploadError.message })
        return
      }

      const { data: urlData } = supabase!.storage
        .from('avatars')
        .getPublicUrl(filePath)

      const avatarUrl = urlData.publicUrl

      await supabase!.auth.updateUser({
        data: { avatar_url: avatarUrl },
      })

      await supabase!
        .from('users')
        .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
        .eq('id', authUser.id)

      profileForm.setValue('avatarUrl', avatarUrl)
      if (user) {
        setUser({ ...user, avatarUrl })
      }

      toast.success('Avatar uploaded successfully')
    } catch {
      toast.error('An unexpected error occurred during upload')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleSaveNotifications = async () => {
    setSavingNotifications(true)

    try {
      const { data: { user: authUser } } = await supabase!.auth.getUser()
      if (!authUser) return

      const { data: profile } = await supabase!
        .from('users')
        .select('preferences')
        .eq('id', authUser.id)
        .single()

      const currentPrefs = (profile?.preferences as Record<string, unknown>) ?? {}

      const { error } = await supabase!
        .from('users')
        .update({
          preferences: { ...currentPrefs, notifications },
          updated_at: new Date().toISOString(),
        })
        .eq('id', authUser.id)

      if (error) {
        toast.error('Failed to save notification preferences', { description: error.message })
        return
      }

      toast.success('Notification preferences saved')
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setSavingNotifications(false)
    }
  }

  const handlePasswordChange = async () => {
    setPasswordError(null)

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters')
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }

    if (!passwordForm.currentPassword) {
      setPasswordError('Current password is required')
      return
    }

    setSavingPassword(true)

    try {
      const { error: updateError } = await supabase!.auth.updateUser({
        password: passwordForm.newPassword,
      })

      if (updateError) {
        setPasswordError(updateError.message)
        return
      }

      toast.success('Password changed successfully')
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch {
      setPasswordError('An unexpected error occurred')
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Premium Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight forge-gradient-text">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Manage your account settings and preferences.</p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 forge-glass-surface border-white/[0.04] rounded-xl p-1">
          <TabsTrigger value="profile" className="gap-2 data-[state=active]:forge-glow data-[state=active]:shadow-sm rounded-lg transition-all duration-200">
            <User className="h-4 w-4 hidden sm:block" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2 data-[state=active]:forge-glow data-[state=active]:shadow-sm rounded-lg transition-all duration-200">
            <Shield className="h-4 w-4 hidden sm:block" />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2 data-[state=active]:forge-glow data-[state=active]:shadow-sm rounded-lg transition-all duration-200">
            <Bell className="h-4 w-4 hidden sm:block" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2 data-[state=active]:forge-glow data-[state=active]:shadow-sm rounded-lg transition-all duration-200">
            <Plug className="h-4 w-4 hidden sm:block" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2 data-[state=active]:forge-glow data-[state=active]:shadow-sm rounded-lg transition-all duration-200">
            <Palette className="h-4 w-4 hidden sm:block" />
            Appearance
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal details and contact information.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                  <FormField
                    control={profileForm.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your full name" className="forge-input-glow bg-[#1D1D1D]/50" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={profileForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="+234 800 000 0000"
                              className="forge-input-glow bg-[#1D1D1D]/50"
                              {...field}
                              value={field.value ?? ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        value={user?.email ?? ''}
                        disabled
                        className="bg-secondary/50 forge-input-glow"
                      />
                      <p className="text-xs text-muted-foreground">
                        Email cannot be changed here. Contact support if needed.
                      </p>
                    </div>
                  </div>

                  {/* Gradient Separator */}
                  <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent my-2" />

                  {/* Avatar Upload via Supabase Storage */}
                  <div className="space-y-3">
                    <Label>Profile Picture</Label>
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="absolute inset-0 rounded-full bg-primary/10 blur-xl" />
                        <div className="relative h-16 w-16 rounded-full bg-secondary/50 flex items-center justify-center overflow-hidden border-white/[0.04] ring-2 ring-border/50">
                          {user?.avatarUrl ? (
                            <Image src={user.avatarUrl} alt="Avatar" width={64} height={64} className="h-full w-full object-cover" />
                          ) : (
                            <User className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                      <div>
                        <label htmlFor="avatar-upload">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={uploadingAvatar}
                            onClick={() => document.getElementById('avatar-upload')?.click()}
                            className="hover:border-primary/50 transition-all duration-200"
                          >
                            {uploadingAvatar ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="h-4 w-4" />
                                Upload Avatar
                              </>
                            )}
                          </Button>
                        </label>
                        <input
                          id="avatar-upload"
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          className="hidden"
                          onChange={handleAvatarUpload}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          JPEG, PNG, WebP or GIF. Max 2MB.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={savingProfile} className="forge-glow">
                      {savingProfile ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password to keep your account secure.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  placeholder="Enter current password"
                  className="forge-input-glow bg-[#1D1D1D]/50"
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))
                  }
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Enter new password"
                    className="forge-input-glow bg-[#1D1D1D]/50"
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                  <Input
                    id="confirmNewPassword"
                    type="password"
                    placeholder="Confirm new password"
                    className="forge-input-glow bg-[#1D1D1D]/50"
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                    }
                  />
                </div>
              </div>

              {passwordError && (
                <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive border border-white/[0.04]">
                  {passwordError}
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={handlePasswordChange}
                  disabled={savingPassword}
                  className="forge-glow"
                >
                  {savingPassword ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Key className="h-4 w-4" />
                      Change Password
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Two-Factor Authentication */}
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
            <CardHeader>
              <CardTitle>Two-Factor Authentication</CardTitle>
              <CardDescription>
                Add an extra layer of security to your account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center border-white/[0.04]">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Authenticator App</p>
                    <p className="text-xs text-muted-foreground">Use an authenticator app for verification codes</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="hover:border-primary/50 transition-all duration-200">
                  Enable
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="forge-glass-surface border border-destructive/30 rounded-xl overflow-hidden ember-glow">
            <CardHeader className="bg-destructive/5 border-b border-destructive/10">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center border border-white/[0.04]">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </div>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
              </div>
              <CardDescription>
                Irreversible and destructive actions. Proceed with caution.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-destructive/5 transition-colors duration-200">
                <div>
                  <p className="text-sm font-medium">Delete Account</p>
                  <p className="text-xs text-muted-foreground">Permanently delete your account and all associated data</p>
                </div>
                <Button variant="destructive" size="sm" className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  Delete Account
                </Button>
              </div>
              <div className="h-px bg-gradient-to-r from-transparent via-destructive/20 to-transparent" />
              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-destructive/5 transition-colors duration-200">
                <div>
                  <p className="text-sm font-medium">Export Data</p>
                  <p className="text-xs text-muted-foreground">Download all your data before deletion</p>
                </div>
                <Button variant="outline" size="sm" className="hover:border-destructive/50 text-destructive hover:text-destructive transition-all duration-200">
                  Export
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose what notifications you want to receive. Preferences are saved to your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center border-white/[0.04]">
                    <Bell className="h-4 w-4 text-primary" />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Email Notifications</Label>
                    <p className="text-xs text-muted-foreground">
                      Receive notifications via email
                    </p>
                  </div>
                </div>
                <Switch
                  checked={notifications.emailNotifications}
                  onCheckedChange={(checked) =>
                    setNotifications((prev) => ({ ...prev, emailNotifications: checked }))
                  }
                  className="data-[state=checked]:forge-glow"
                />
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-ember/10 flex items-center justify-center border-white/[0.04]">
                    <Bell className="h-4 w-4 text-ember" />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Exam Reminders</Label>
                    <p className="text-xs text-muted-foreground">
                      Get notified about upcoming exams
                    </p>
                  </div>
                </div>
                <Switch
                  checked={notifications.examReminders}
                  onCheckedChange={(checked) =>
                    setNotifications((prev) => ({ ...prev, examReminders: checked }))
                  }
                  className="data-[state=checked]:forge-glow"
                />
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-neural/10 flex items-center justify-center border-white/[0.04]">
                    <Bell className="h-4 w-4 text-neural" />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Result Alerts</Label>
                    <p className="text-xs text-muted-foreground">
                      Get notified when results are published
                    </p>
                  </div>
                </div>
                <Switch
                  checked={notifications.resultAlerts}
                  onCheckedChange={(checked) =>
                    setNotifications((prev) => ({ ...prev, resultAlerts: checked }))
                  }
                  className="data-[state=checked]:forge-glow"
                />
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center border-white/[0.04]">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">System Updates</Label>
                    <p className="text-xs text-muted-foreground">
                      Get notified about platform updates and new features
                    </p>
                  </div>
                </div>
                <Switch
                  checked={notifications.systemUpdates}
                  onCheckedChange={(checked) =>
                    setNotifications((prev) => ({ ...prev, systemUpdates: checked }))
                  }
                  className="data-[state=checked]:forge-glow"
                />
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center border-white/[0.04]">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">Marketing Emails</Label>
                    <p className="text-xs text-muted-foreground">
                      Receive promotional offers and tips
                    </p>
                  </div>
                </div>
                <Switch
                  checked={notifications.marketingEmails}
                  onCheckedChange={(checked) =>
                    setNotifications((prev) => ({ ...prev, marketingEmails: checked }))
                  }
                  className="data-[state=checked]:forge-glow"
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveNotifications} disabled={savingNotifications} className="forge-glow">
                  {savingNotifications ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Preferences
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations">
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
            <CardHeader>
              <CardTitle>Connected Services</CardTitle>
              <CardDescription>
                Manage third-party integrations and connected applications.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border-white/[0.04] hover:bg-secondary/30 hover:border-white/[0.06] hover:-translate-y-0.5 transition-all duration-200 group">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center border-white/[0.04] group-hover:shadow-[0_0_20px_rgba(59,130,246,0.25)] transition-all duration-300">
                    <Globe className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Google Workspace</p>
                    <p className="text-xs text-muted-foreground">Sync with Google Classroom and Drive</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs forge-glass-surface">Coming Soon</Badge>
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />

              <div className="flex items-center justify-between p-4 rounded-lg border-white/[0.04] hover:bg-secondary/30 hover:border-white/[0.06] hover:-translate-y-0.5 transition-all duration-200 group">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-neural/10 flex items-center justify-center border-white/[0.04] group-hover:neural-glow transition-all duration-300">
                    <Plug className="h-5 w-5 text-neural" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Microsoft Teams</p>
                    <p className="text-xs text-muted-foreground">Connect with Teams for education</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs forge-glass-surface">Coming Soon</Badge>
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />

              <div className="flex items-center justify-between p-4 rounded-lg border-white/[0.04] hover:bg-secondary/30 hover:border-white/[0.06] hover:-translate-y-0.5 transition-all duration-200 group">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-ember/10 flex items-center justify-center border-white/[0.04] group-hover:ember-glow transition-all duration-300">
                    <Plug className="h-5 w-5 text-ember" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Webhooks</p>
                    <p className="text-xs text-muted-foreground">Receive real-time event notifications</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="hover:border-primary/50 transition-all duration-200">
                  Configure
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Tab */}
        <TabsContent value="appearance">
          <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>
                Customize how ExamForge AI looks and feels.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Theme</Label>
                <div className="grid grid-cols-3 gap-4">
                  <button
                    onClick={() => setTheme('light')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 forge-glass-surface ${
                      theme === 'light' ? 'border-primary bg-primary/5 forge-glow' : 'border-white/[0.04] hover:border-primary/50'
                    }`}
                  >
                    <Sun className="h-6 w-6" />
                    <span className="text-sm font-medium">Light</span>
                  </button>

                  <button
                    onClick={() => setTheme('dark')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 forge-glass-surface ${
                      theme === 'dark' ? 'border-primary bg-primary/5 forge-glow' : 'border-white/[0.04] hover:border-primary/50'
                    }`}
                  >
                    <Moon className="h-6 w-6" />
                    <span className="text-sm font-medium">Dark</span>
                  </button>

                  <button
                    onClick={() => setTheme('system')}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 forge-glass-surface ${
                      theme === 'system' ? 'border-primary bg-primary/5 forge-glow' : 'border-white/[0.04] hover:border-primary/50'
                    }`}
                  >
                    <Monitor className="h-6 w-6" />
                    <span className="text-sm font-medium">System</span>
                  </button>
                </div>
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />

              <div className="space-y-3">
                <Label>Accent Color</Label>
                <div className="flex gap-3">
                  {[
                    { name: 'Electric Blue', color: '#3B82F6', glow: 'forge-glow' },
                    { name: 'Neural Cyan', color: '#22D3EE', glow: 'neural-glow' },
                    { name: 'Ember', color: '#F59E0B', glow: 'ember-glow' },
                    { name: 'Violet', color: '#8B5CF6', glow: '' },
                    { name: 'Rose', color: '#F43F5E', glow: '' },
                  ].map((accent) => (
                    <button
                      key={accent.name}
                      className={`h-8 w-8 rounded-full border-2 transition-all duration-200 hover:scale-110 ${accent.color === '#3B82F6' ? 'border-foreground ring-2 ring-offset-2 ring-offset-background ring-primary forge-glow' : 'border-white/[0.04] hover:border-white/[0.06]'}`}
                      style={{ backgroundColor: accent.color }}
                      title={accent.name}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Accent color customization coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
