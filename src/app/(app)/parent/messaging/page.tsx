'use client'

import * as React from 'react'
import {
  MessageSquare, Send, Paperclip, Search, Plus,
  ChevronLeft, Clock, CheckCircle, User, BookOpen,
  School, Shield, GraduationCap
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useApi, apiPost } from '@/lib/hooks/use-api'
import { useAuthStore } from '@/lib/stores/auth-store'
import { toast } from 'sonner'

const ROLE_ICON: Record<string, React.ReactNode> = {
  teacher: <BookOpen className="h-3 w-3" />,
  school_admin: <School className="h-3 w-3" />,
  super_admin: <Shield className="h-3 w-3" />,
  student: <GraduationCap className="h-3 w-3" />,
  parent: <User className="h-3 w-3" />,
}

interface Conversation {
  contact: { id: string; fullName: string; role: string; avatarUrl: string | null }
  lastMessage: string
  lastMessageAt: string
  unreadCount: number
}

interface Message {
  id: string; senderId: string; recipientId: string; subject: string | null; content: string;
  isRead: boolean; createdAt: string;
  sender: { id: string; fullName: string; role: string; avatarUrl: string | null }
  recipient: { id: string; fullName: string; role: string; avatarUrl: string | null }
}

export default function MessagingPage() {
  const [selectedContactId, setSelectedContactId] = React.useState<string | null>(null)
  const [newMessage, setNewMessage] = React.useState('')
  const [composeOpen, setComposeOpen] = React.useState(false)
  const [composeRecipient, setComposeRecipient] = React.useState('')
  const [composeSubject, setComposeSubject] = React.useState('')
  const [composeContent, setComposeContent] = React.useState('')
  const [sending, setSending] = React.useState(false)

  const { user } = useAuthStore()
  const currentUserId = user?.id || ''

  const { data: conversationsData, loading: convLoading, refetch: refetchConv } = useApi<{
    conversations: Conversation[]
  }>(`/api/parent/messaging?userId=${currentUserId}`)

  const { data: threadData, loading: threadLoading, refetch: refetchThread } = useApi<{
    messages: Message[]
  }>(selectedContactId ? `/api/parent/messaging?userId=${currentUserId}&contactId=${selectedContactId}` : null)

  const conversations = conversationsData?.conversations || []
  const messages = threadData?.messages || []

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedContactId) return
    setSending(true)
    try {
      await apiPost('/api/parent/messaging', {
        senderId: currentUserId,
        recipientId: selectedContactId,
        content: newMessage,
        schoolId: user?.schoolId || '',
      })
      setNewMessage('')
      refetchThread()
      refetchConv()
    } catch {
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleCompose = async () => {
    if (!composeRecipient || !composeContent.trim()) return
    setSending(true)
    try {
      await apiPost('/api/parent/messaging', {
        senderId: currentUserId,
        recipientId: composeRecipient,
        subject: composeSubject,
        content: composeContent,
        schoolId: user?.schoolId || '',
      })
      toast.success('Message sent')
      setComposeOpen(false)
      setComposeRecipient(''); setComposeSubject(''); setComposeContent('')
      refetchConv()
    } catch {
      toast.error('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in forge-ambient-bg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Messaging</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Communicate with teachers and school administrators</p>
        </div>
        <Button size="sm" onClick={() => setComposeOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> New Message
        </Button>
      </div>

      {/* Conversation List + Thread */}
      <div className="grid gap-0 lg:grid-cols-[320px_1fr] border border-white/[0.04] rounded-xl overflow-hidden min-h-[500px] forge-glass-surface forge-card-shadow">
        {/* Conversation List */}
        <div className={`border-r border-white/[0.04] ${selectedContactId ? 'hidden lg:block' : ''}`}>
          <div className="p-3 border-b border-white/[0.04]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9 forge-input-glow" placeholder="Search conversations..." />
            </div>
          </div>
          <ScrollArea className="h-[460px]">
            {convLoading && <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>}
            {!convLoading && conversations.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                <div className="relative inline-block mb-3">
                  <div className="absolute inset-0 blur-lg bg-violet-500/10 rounded-full" />
                  <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground relative" />
                </div>
                <p className="text-sm">No conversations yet</p>
              </div>
            )}
            <div className="divide-y divide-white/[0.04]">
              {conversations.map(conv => (
                <div
                  key={conv.contact.id}
                  className={`flex items-start gap-3 p-3 cursor-pointer hover:bg-white/[0.02] transition-colors ${
                    selectedContactId === conv.contact.id ? 'bg-white/[0.04]' : ''
                  }`}
                  onClick={() => setSelectedContactId(conv.contact.id)}
                >
                  <div className="w-10 h-10 rounded-full bg-sky-500/10 flex items-center justify-center shrink-0 border border-white/[0.04]">
                    {ROLE_ICON[conv.contact.role] || <User className="h-4 w-4 text-sky-400" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm truncate">{conv.contact.fullName}</span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {new Date(conv.lastMessageAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.lastMessage}</p>
                  </div>
                  {conv.unreadCount > 0 && (
                    <Badge className="text-[10px] h-5 min-w-[20px] flex items-center justify-center">{conv.unreadCount}</Badge>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Message Thread */}
        <div className={selectedContactId ? '' : 'hidden lg:block'}>
          {!selectedContactId ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <div className="relative inline-block mb-3">
                  <div className="absolute inset-0 blur-xl bg-violet-500/10 rounded-full" />
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground relative" />
                </div>
                <p>Select a conversation to start messaging</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Thread Header */}
              <div className="p-3 border-b border-white/[0.04] flex items-center gap-3">
                <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSelectedContactId(null)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {(() => {
                  const contact = conversations.find(c => c.contact.id === selectedContactId)?.contact
                  return contact ? (
                    <>
                      <div className="w-8 h-8 rounded-full bg-sky-500/10 flex items-center justify-center border border-white/[0.04]">
                        {ROLE_ICON[contact.role] || <User className="h-4 w-4 text-sky-400" />}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{contact.fullName}</p>
                        <p className="text-xs text-muted-foreground capitalize">{contact.role.replace('_', ' ')}</p>
                      </div>
                    </>
                  ) : null
                })()}
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4 h-[360px]">
                {threadLoading && <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>}
                <div className="space-y-3">
                  {messages.map(msg => {
                    const isMe = msg.senderId === currentUserId
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] ${isMe ? 'order-2' : 'order-1'}`}>
                          {msg.subject && !isMe && (
                            <p className="text-xs font-medium text-muted-foreground mb-1">{msg.subject}</p>
                          )}
                          <div className={`rounded-lg px-3 py-2 text-sm ${
                            isMe
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-white/[0.04] border border-white/[0.04]'
                          }`}>
                            <p>{msg.content}</p>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(msg.createdAt).toLocaleString()}
                            {isMe && msg.isRead && <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400" />}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>

              {/* Compose */}
              <div className="p-3 border-t border-white/[0.04]">
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" className="shrink-0">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                    className="flex-1 forge-input-glow"
                  />
                  <Button size="icon" onClick={handleSend} disabled={!newMessage.trim() || sending}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compose Dialog */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Message</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label htmlFor="msg-to" className="text-sm font-medium">To</label>
              <Select value={composeRecipient} onValueChange={setComposeRecipient}>
                <SelectTrigger id="msg-to" className="mt-1 forge-input-glow"><SelectValue placeholder="Select recipient..." /></SelectTrigger>
                <SelectContent>
                  {conversations.map(c => (
                    <SelectItem key={c.contact.id} value={c.contact.id}>{c.contact.fullName} ({c.contact.role.replace('_', ' ')})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="msg-subject" className="text-sm font-medium">Subject</label>
              <Input id="msg-subject" className="mt-1 forge-input-glow" value={composeSubject} onChange={e => setComposeSubject(e.target.value)} placeholder="Optional subject..." />
            </div>
            <div>
              <label htmlFor="msg-content" className="text-sm font-medium">Message</label>
              <Textarea id="msg-content" className="mt-1 forge-input-glow" value={composeContent} onChange={e => setComposeContent(e.target.value)} placeholder="Write your message..." rows={5} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setComposeOpen(false)}>Cancel</Button>
            <Button onClick={handleCompose} disabled={!composeRecipient || !composeContent.trim() || sending}>
              <Send className="h-4 w-4 mr-1" /> Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
