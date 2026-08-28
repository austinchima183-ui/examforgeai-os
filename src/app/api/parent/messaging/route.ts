import { createServiceClient } from '@/lib/supabase/service'
import { requireApiRole } from '@/lib/api/auth-guard'
import { enforceCsrf } from '@/lib/api/csrf-guard'
import { NextRequest, NextResponse } from 'next/server'
import { validateInput, validateId, parseJsonBody } from '@/lib/api/validate'
import { parentMessagingSchema, parentMessagingQuerySchema } from '@/lib/validators/api-schemas'

// PostgREST many-to-one embeds return objects at runtime; the untyped
// supabase-js client infers them as arrays. This permissive row type
// restores accurate runtime shapes (verified against the live API).
type Row = Record<string, any>


// ============================================================================
// ExamForge AI — Parent Messaging API Route (Supabase data layer)
// ============================================================================
// GET /api/parent/messaging - Get conversations and messages
// POST /api/parent/messaging - Send message
// messages embeds sender/recipient via the messages_sender_id_fkey and
// messages_recipient_id_fkey foreign keys (both point at users).
// ============================================================================

// GET /api/parent/messaging - Get conversations and messages
export async function GET(request: NextRequest) {
  // ─── Auth + CSRF guard (MISSION 4+11: feature isolation) ───
  const auth = await requireApiRole(request, ['parent', 'school_admin', 'super_admin'])
  if (auth instanceof NextResponse) return auth
  const csrfGuard = enforceCsrf(request, auth)
  if (csrfGuard) return csrfGuard
  try {
    const { searchParams } = new URL(request.url)
    const queryObj = Object.fromEntries(searchParams.entries())
    const queryResult = validateInput(parentMessagingQuerySchema, queryObj)
    if ('error' in queryResult) return queryResult.error
    const { userId, contactId } = queryResult.data

    // Supabase service client (server-side data layer)
    const supabase = createServiceClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    if (contactId) {
      // Get message thread with specific contact
      const { data: messageRows__d, error: messagesError } = await supabase
        .from('messages')
        .select(`
          id, sender_id, recipient_id, school_id, subject, content, parent_id, is_read, attachment_url, attachment_name, created_at, updated_at,
          sender_id:users!messages_sender_id_fkey(id, full_name, role, avatar_url),
          recipient:users!messages_recipient_id_fkey(id, full_name, role, avatar_url)
        `)
        .or(`and(sender_id.eq.${userId},recipient_id.eq.${contactId}),and(sender_id.eq.${contactId},recipient_id.eq.${userId})`)
        .order('created_at', { ascending: true })
      const messageRows = messageRows__d as unknown as Row[]
      if (messagesError) throw messagesError

      // Normalize rows to the original (Prisma camelCase) shape
      const messages = (messageRows ?? []).map(m => ({
        id: m.id,
        senderId: m.sender_id,
        recipientId: m.recipient_id,
        schoolId: m.school_id,
        subject: m.subject,
        content: m.content,
        parentId: m.parent_id,
        isRead: m.is_read,
        attachmentUrl: m.attachment_url,
        attachmentName: m.attachment_name,
        createdAt: new Date(m.created_at).toISOString(),
        updatedAt: new Date(m.updated_at).toISOString(),
        sender: m.sender
          ? { id: m.sender.id, fullName: m.sender.full_name, role: m.sender.role, avatarUrl: m.sender.avatar_url }
          : null,
        recipient: m.recipient
          ? { id: m.recipient.id, fullName: m.recipient.full_name, role: m.recipient.role, avatarUrl: m.recipient.avatar_url }
          : null,
      }))

      // Mark unread messages as read
      const { error: markReadError } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('sender_id', contactId)
        .eq('recipient_id', userId)
        .eq('is_read', false)
      if (markReadError) throw markReadError

      return NextResponse.json({ messages })
    }

    // Get conversation list
    const { data: sentRows__d, error: sentError } = await supabase
      .from('messages')
      .select(`
        id, sender_id, recipient_id, school_id, subject, content, parent_id, is_read, attachment_url, attachment_name, created_at, updated_at,
        recipient:users!messages_recipient_id_fkey(id, full_name, role, avatar_url)
      `)
      .eq('sender_id', userId)
      .order('created_at', { ascending: false })
    const sentRows = sentRows__d as unknown as Row[]
    if (sentError) throw sentError

    const { data: receivedRows__d, error: receivedError } = await supabase
      .from('messages')
      .select(`
        id, sender_id, recipient_id, school_id, subject, content, parent_id, is_read, attachment_url, attachment_name, created_at, updated_at,
        sender:users!messages_sender_id_fkey(id, full_name, role, avatar_url)
      `)
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false })
    const receivedRows = receivedRows__d as unknown as Row[]
    if (receivedError) throw receivedError

    // Normalize rows to the original (Prisma camelCase) shape
    const sentMessages = (sentRows ?? []).map(m => ({
      id: m.id,
      senderId: m.sender_id,
      recipientId: m.recipient_id,
      schoolId: m.school_id,
      subject: m.subject,
      content: m.content,
      parentId: m.parent_id,
      isRead: m.is_read,
      attachmentUrl: m.attachment_url,
      attachmentName: m.attachment_name,
      createdAt: new Date(m.created_at).toISOString(),
      updatedAt: new Date(m.updated_at).toISOString(),
      recipient: m.recipient
        ? { id: m.recipient.id, fullName: m.recipient.full_name, role: m.recipient.role, avatarUrl: m.recipient.avatar_url }
        : null,
    }))

    const receivedMessages = (receivedRows ?? []).map(m => ({
      id: m.id,
      senderId: m.sender_id,
      recipientId: m.recipient_id,
      schoolId: m.school_id,
      subject: m.subject,
      content: m.content,
      parentId: m.parent_id,
      isRead: m.is_read,
      attachmentUrl: m.attachment_url,
      attachmentName: m.attachment_name,
      createdAt: new Date(m.created_at).toISOString(),
      updatedAt: new Date(m.updated_at).toISOString(),
      sender: m.sender
        ? { id: m.sender.id, fullName: m.sender.full_name, role: m.sender.role, avatarUrl: m.sender.avatar_url }
        : null,
    }))

    // Group by contact
    const conversations = new Map<string, {
      contact: { id: string; fullName: string; role: string; avatarUrl: string | null }
      lastMessage: string
      lastMessageAt: Date
      unreadCount: number
    }>()

    for (const m of receivedMessages) {
      const key = m.sender!.id
      const existing = conversations.get(key)
      if (!existing || new Date(m.createdAt) > existing.lastMessageAt) {
        conversations.set(key, {
          contact: m.sender!,
          lastMessage: m.content,
          lastMessageAt: new Date(m.createdAt),
          unreadCount: (existing?.unreadCount || 0) + (m.isRead ? 0 : 1),
        })
      } else if (!m.isRead) {
        existing.unreadCount++
      }
    }

    for (const m of sentMessages) {
      const key = m.recipient!.id
      const existing = conversations.get(key)
      if (!existing || new Date(m.createdAt) > existing.lastMessageAt) {
        conversations.set(key, {
          contact: m.recipient!,
          lastMessage: m.content,
          lastMessageAt: new Date(m.createdAt),
          unreadCount: existing?.unreadCount || 0,
        })
      }
    }

    const sorted = Array.from(conversations.values()).sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime())

    return NextResponse.json({ conversations: sorted })
  } catch (error) {
    console.error('Messaging error:', error)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}

// POST /api/parent/messaging - Send message
export async function POST(request: NextRequest) {
  // ─── Auth + CSRF guard (MISSION 4+11: feature isolation) ───
  const auth = await requireApiRole(request, ['parent', 'school_admin', 'super_admin'])
  if (auth instanceof NextResponse) return auth
  const csrfGuard = enforceCsrf(request, auth)
  if (csrfGuard) return csrfGuard
  try {
    const bodyJson = await parseJsonBody(request)
    if ('error' in bodyJson) return bodyJson.error
    const rawBody = bodyJson.data
    const input = validateInput(parentMessagingSchema, rawBody)
    if ('error' in input) return input.error
    const { senderId, recipientId, subject, content, schoolId, attachmentUrl, attachmentName } = input.data

    // Supabase service client (server-side data layer)
    const supabase = createServiceClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
    }

    const { data: messageRow__d, error: messageError } = await supabase
      .from('messages')
      .insert({
        sender_id: senderId,
        recipient_id: recipientId,
        school_id: schoolId ?? null,
        subject: subject ?? null,
        content,
        attachment_url: attachmentUrl ?? null,
        attachment_name: attachmentName ?? null,
      })
      .select(`
        id, sender_id, recipient_id, school_id, subject, content, parent_id, is_read, attachment_url, attachment_name, created_at, updated_at,
        sender:users!messages_sender_id_fkey(id, full_name, role),
        recipient:users!messages_recipient_id_fkey(id, full_name, role)
      `)
      .single()
    const messageRow = messageRow__d as unknown as Row
    if (messageError) throw messageError

    // Normalize to the original (Prisma camelCase) shape
    const message = {
      id: messageRow.id,
      senderId: messageRow.sender_id,
      recipientId: messageRow.recipient_id,
      schoolId: messageRow.school_id,
      subject: messageRow.subject,
      content: messageRow.content,
      parentId: messageRow.parent_id,
      isRead: messageRow.is_read,
      attachmentUrl: messageRow.attachment_url,
      attachmentName: messageRow.attachment_name,
      createdAt: new Date(messageRow.created_at).toISOString(),
      updatedAt: new Date(messageRow.updated_at).toISOString(),
      sender: {
        id: messageRow.sender.id,
        fullName: messageRow.sender.full_name,
        role: messageRow.sender.role,
      },
      recipient: {
        id: messageRow.recipient.id,
        fullName: messageRow.recipient.full_name,
        role: messageRow.recipient.role,
      },
    }

    // Create notification for recipient.
    // NOTE: the Supabase notifications.type column is a notification_type enum
    // (exam | system | result | reminder) — 'system' is the mapping for the
    // original Prisma default 'info'.
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: recipientId,
        title: `New message from ${message.sender.fullName}`,
        message: subject || content.slice(0, 100),
        type: 'system',
      })
    if (notificationError) throw notificationError

    return NextResponse.json(message)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
