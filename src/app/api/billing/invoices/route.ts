// ============================================================================
// ExamForge AI — Invoice API
// ============================================================================
// GET /api/billing/invoices — List invoices for an organization
// POST /api/billing/invoices — Generate an invoice for a subscription
// ============================================================================
// SECURITY: All handlers require authentication. organizationId is derived
// from the authenticated user's tenant context — client-supplied values
// are ignored to prevent IDOR / tenant isolation bypass.
// ============================================================================

import { NextResponse, type NextRequest } from 'next/server'
import { createLogger } from '@/lib/observability/logger'
import {
  generateInvoice,
  getInvoice,
  listInvoices,
  markInvoicePaid,
} from '@/lib/billing/invoice-service-extended'
import { getAuthUser } from '@/lib/auth/require-auth'
import { resolveTenantForAPI } from '@/lib/enterprise/tenant-middleware'
import { enforceCsrf } from '@/lib/api/csrf-guard'

const log = createLogger('api:billing:invoices')

// ──────────────────────────────────────────────────────────────
// GET — List Invoices
// ──────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // ─── Auth Guard ─────────────────────────────────────────────
  const authResult = await getAuthUser()
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // ─── Derive organizationId from tenant context ────────────
    // SECURITY: Never trust client-supplied organizationId.
    // Resolve from authenticated tenant context instead.
    const tenantResult = await resolveTenantForAPI(request)

    if (!tenantResult.ok || !tenantResult.value) {
      return NextResponse.json(
        { error: 'Organization context not found' },
        { status: 400 }
      )
    }

    const organizationId = tenantResult.value.organizationId

    const url = new URL(request.url)
    const invoiceId = url.searchParams.get('invoiceId')

    // Get a single invoice by ID
    if (invoiceId) {
      const invoice = await getInvoice(invoiceId)

      if (!invoice) {
        return NextResponse.json(
          { error: 'Invoice not found' },
          { status: 404 }
        )
      }

      // SECURITY: Verify the invoice belongs to the derived organization
      if (invoice.orgId !== organizationId) {
        log.security('Invoice access denied — tenant isolation violation', {
          userId: authResult.user.id,
          invoiceOrgId: invoice.orgId,
          tenantOrgId: organizationId,
        })
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        )
      }

      return NextResponse.json({ success: true, invoice })
    }

    // List invoices for the server-derived organization
    const filters = {
      status: url.searchParams.get('status') ?? undefined,
      from: url.searchParams.get('from') ?? undefined,
      to: url.searchParams.get('to') ?? undefined,
      page: url.searchParams.get('page') ? parseInt(url.searchParams.get('page')!) : undefined,
      limit: url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : undefined,
    }

    const invoices = await listInvoices(organizationId, filters)

    return NextResponse.json({ success: true, invoices })
  } catch (error) {
    log.error('Invoice list API error', error)
    return NextResponse.json(
      { error: 'Failed to list invoices' },
      { status: 500 }
    )
  }
}

// ──────────────────────────────────────────────────────────────
// POST — Generate Invoice
// ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // ─── Auth Guard ─────────────────────────────────────────────
  const authResult = await getAuthUser()
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ─── CSRF guard (auto-added: MISSION 11) ───
  const csrfResult = enforceCsrf(request, authResult)
  if (csrfResult) return csrfResult

  try {
    // ─── Derive tenant context for audit logging ──────────────
    const tenantResult = await resolveTenantForAPI(request)
    if (!tenantResult.ok || !tenantResult.value) {
      return NextResponse.json(
        { error: 'Organization context not found' },
        { status: 400 }
      )
    }

    const organizationId = tenantResult.value.organizationId

    const body = await request.json()
    const { action } = body as { action?: string }

    switch (action) {
      case 'generate': {
        const { subscriptionId, periodStart, periodEnd } = body as {
          subscriptionId?: string
          periodStart?: string
          periodEnd?: string
        }

        if (!subscriptionId || !periodStart || !periodEnd) {
          return NextResponse.json(
            { error: 'subscriptionId, periodStart, and periodEnd are required' },
            { status: 400 }
          )
        }

        log.info('Invoice generation requested', {
          userId: authResult.user.id,
          organizationId,
          subscriptionId,
        })

        const invoice = await generateInvoice(subscriptionId, periodStart, periodEnd)

        // SECURITY: Verify the generated invoice belongs to the requesting tenant
        if (invoice.orgId !== organizationId) {
          log.security('Invoice generation denied — tenant isolation violation', {
            userId: authResult.user.id,
            invoiceOrgId: invoice.orgId,
            tenantOrgId: organizationId,
          })
          return NextResponse.json(
            { error: 'Forbidden' },
            { status: 403 }
          )
        }

        return NextResponse.json({ success: true, invoice })
      }

      case 'markPaid': {
        const { invoiceId, paymentReference } = body as {
          invoiceId?: string
          paymentReference?: string
        }

        if (!invoiceId || !paymentReference) {
          return NextResponse.json(
            { error: 'invoiceId and paymentReference are required' },
            { status: 400 }
          )
        }

        // SECURITY: Verify the invoice belongs to the requesting tenant before marking paid
        const invoice = await getInvoice(invoiceId)
        if (!invoice || invoice.orgId !== organizationId) {
          log.security('Invoice mark-paid denied — tenant isolation violation', {
            userId: authResult.user.id,
            invoiceId,
            tenantOrgId: organizationId,
          })
          return NextResponse.json(
            { error: 'Forbidden' },
            { status: 403 }
          )
        }

        await markInvoicePaid(invoiceId, paymentReference)

        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: generate, markPaid' },
          { status: 400 }
        )
    }
  } catch (error) {
    log.error('Invoice generation API error', error)

    const message = error instanceof Error ? error.message : 'Failed to generate invoice'

    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
