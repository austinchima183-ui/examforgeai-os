'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useSupabase } from '@/lib/hooks/use-supabase'
import { useAuthStore } from '@/lib/stores/auth-store'
import { updateProfileSchema, type UpdateProfileInput } from '@/lib/validators/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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
import {
  User,
  Mail,
  Phone,
  Calendar,
  Shield,
  Loader2,
  Save,
  Pencil,
} from 'lucide-react'

// ============================================================================
// ExamForge AI — Profile Page
// ============================================================================
// Client component with user avatar and info, edit profile form,
// and account details.
// Premium AI OS visual treatment applied.
// ============================================================================

export default function ProfilePage() {
  const supabase = useSupabase()
  const { user, setUser } = useAuthStore()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      fullName: user?.fullName ?? '',
      phone: user?.phone ?? '',
      avatarUrl: user?.avatarUrl ?? '',
    },
  })

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const roleLabels: Record<string, string> = {
    student: 'Student',
    teacher: 'Teacher',
    school_admin: 'School Admin',
    super_admin: 'Super Admin',
  }

  const onSubmit = async (values: UpdateProfileInput) => {
    setSaving(true)

    try {
      if (!supabase) {
        toast.error('Service unavailable. Please try again later.')
        setSaving(false)
        return
      }

      const { error: updateError } = await supabase.auth.updateUser({
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

      if (user) {
        setUser({
          ...user,
          fullName: values.fullName,
          phone: values.phone ?? null,
          avatarUrl: values.avatarUrl ?? null,
        })
      }

      toast.success('Profile updated successfully')
      setEditing(false)
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Premium Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight forge-gradient-text">Profile</h1>
          <p className="text-sm text-muted-foreground mt-1.5">View and manage your personal information.</p>
        </div>
      </div>

      {/* Profile Header */}
      <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-primary/10 blur-xl" />
              <Avatar className="h-24 w-24 relative border-2 border-primary/30 ring-4 ring-primary/10 forge-glow">
                <AvatarImage src={user?.avatarUrl ?? undefined} alt={user?.fullName ?? 'User'} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {user?.fullName ? getInitials(user.fullName) : 'U'}
                </AvatarFallback>
              </Avatar>
            </div>

            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-2xl font-bold forge-gradient-text-warm">{user?.fullName ?? 'User'}</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <div className="flex items-center gap-2 mt-2 justify-center sm:justify-start">
                <Badge variant="secondary" className="gap-1 rounded-full px-3 py-0.5 text-xs forge-glass-surface border-white/[0.04]">
                  <Shield className="h-3 w-3" />
                  {roleLabels[user?.role ?? 'student']}
                </Badge>
                {user?.isEmailVerified && (
                  <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">
                    Verified
                  </Badge>
                )}
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => {
                if (editing) {
                  form.reset()
                }
                setEditing(!editing)
              }}
              className="gap-2 hover:border-primary/50 transition-all duration-200"
            >
              <Pencil className="h-4 w-4" />
              {editing ? 'Cancel' : 'Edit Profile'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Edit Profile Form */}
      {editing ? (
        <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
          <CardHeader className="border-b border-border/20">
            <CardTitle>Edit Profile</CardTitle>
            <CardDescription>
              Update your personal information below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
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
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="+1 (555) 000-0000"
                            className="forge-input-glow bg-[#1D1D1D]/50"
                            {...field}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="avatarUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Avatar URL</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://example.com/avatar.jpg"
                            className="forge-input-glow bg-[#1D1D1D]/50"
                            {...field}
                            value={field.value ?? ''}
                          />
                        </FormControl>
                        <FormDescription>
                          Enter a URL for your profile picture
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      form.reset()
                      setEditing(false)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving} className="forge-glow">
                    {saving ? (
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
      ) : null}

      {/* Account Details */}
      <Card className="forge-glass-surface border-white/[0.04] rounded-xl forge-card-shadow">
        <CardHeader className="border-b border-border/20">
          <CardTitle>Account Details</CardTitle>
          <CardDescription>
            Your account information and key dates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-secondary/50 flex items-center justify-center border-white/[0.04]">
                <Mail className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Email Address</p>
                <p className="text-sm text-muted-foreground">{user?.email ?? 'Not set'}</p>
              </div>
              {user?.isEmailVerified ? (
                <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">
                  Verified
                </Badge>
              ) : (
                <Badge variant="outline" className="text-ember border-ember/30">
                  Unverified
                </Badge>
              )}
            </div>

            <Separator className="opacity-30" />

            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-secondary/50 flex items-center justify-center border-white/[0.04]">
                <Phone className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Phone Number</p>
                <p className="text-sm text-muted-foreground">{user?.phone ?? 'Not set'}</p>
              </div>
            </div>

            <Separator className="opacity-30" />

            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-secondary/50 flex items-center justify-center border-white/[0.04]">
                <Shield className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Role</p>
                <p className="text-sm text-muted-foreground">
                  {roleLabels[user?.role ?? 'student']}
                </p>
              </div>
            </div>

            <Separator className="opacity-30" />

            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-secondary/50 flex items-center justify-center border-white/[0.04]">
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Member Since</p>
                <p className="text-sm text-muted-foreground font-mono">
                  {user?.createdAt
                    ? new Date(user.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : 'Unknown'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
