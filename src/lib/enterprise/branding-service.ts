// ============================================================================
// ExamForge AI — Enterprise Branding & White-Label Service
// ============================================================================
// Manages organization branding, white-label configuration, custom domains,
// and branded templates for emails and reports.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import { success, failure, type Result } from '@/lib/api/result'
import type {
  OrganizationBranding,
  WhiteLabelConfig,
  CustomDomain,
  BrandedEmailTemplate,
  BrandedReportTemplate,
} from './types'
import { DEFAULT_ORGANIZATION_BRANDING } from './types'

// ──────────────────────────────────────────────────────────────
// getOrganizationBranding
// ──────────────────────────────────────────────────────────────

/**
 * Gets the branding configuration for an organization.
 * Returns the organization's branding if set, otherwise returns
 * the default branding with inheritance from parent organization.
 */
export async function getOrganizationBranding(
  orgId: string
): Promise<Result<OrganizationBranding>> {
  try {
    const supabase = await createClient()

    // Get the organization's branding
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('branding, path, parent_id')
      .eq('id', orgId)
      .single()

    if (orgError || !org) {
      return failure(new Error(`Organization not found: ${orgId}`))
    }

    const orgBranding = org.branding as OrganizationBranding | null

    // If the org has branding set, merge with defaults
    if (orgBranding) {
      return success(mergeBranding(DEFAULT_ORGANIZATION_BRANDING, orgBranding))
    }

    // If no branding set, try to inherit from parent
    if (org.parent_id) {
      const parentResult = await getOrganizationBranding(org.parent_id)
      if (parentResult.ok) {
        return success(parentResult.value)
      }
    }

    // Fall back to defaults
    return success(DEFAULT_ORGANIZATION_BRANDING)
  } catch (error) {
    return failure(
      error instanceof Error ? error : new Error('Unexpected error fetching organization branding')
    )
  }
}

// ──────────────────────────────────────────────────────────────
// updateOrganizationBranding
// ──────────────────────────────────────────────────────────────

/**
 * Updates the branding configuration for an organization.
 * Only the provided fields are updated; others remain unchanged.
 */
export async function updateOrganizationBranding(
  orgId: string,
  branding: Partial<OrganizationBranding>
): Promise<Result<OrganizationBranding>> {
  try {
    const supabase = await createClient()

    // Get current branding to merge
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('branding')
      .eq('id', orgId)
      .single()

    if (orgError || !org) {
      return failure(new Error(`Organization not found: ${orgId}`))
    }

    const currentBranding = (org.branding as OrganizationBranding | null) ?? DEFAULT_ORGANIZATION_BRANDING
    const mergedBranding = mergeBranding(currentBranding, branding as OrganizationBranding)

    // Update the organization's branding
    const { data: updated, error: updateError } = await supabase
      .from('organizations')
      .update({ branding: mergedBranding })
      .eq('id', orgId)
      .select('branding')
      .single()

    if (updateError || !updated) {
      return failure(new Error(`Failed to update branding: ${updateError?.message ?? 'Unknown error'}`))
    }

    return success(mergeBranding(DEFAULT_ORGANIZATION_BRANDING, updated.branding as OrganizationBranding))
  } catch (error) {
    return failure(
      error instanceof Error ? error : new Error('Unexpected error updating organization branding')
    )
  }
}

// ──────────────────────────────────────────────────────────────
// applyWhiteLabel
// ──────────────────────────────────────────────────────────────

/**
 * Applies white-label configuration to an organization.
 * White-labeling allows full brand customization including
 * app name, colors, and hiding ExamForge branding.
 */
export async function applyWhiteLabel(
  orgId: string,
  config: WhiteLabelConfig
): Promise<Result<OrganizationBranding>> {
  try {
    const supabase = await createClient()

    // Get current branding
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('branding')
      .eq('id', orgId)
      .single()

    if (orgError || !org) {
      return failure(new Error(`Organization not found: ${orgId}`))
    }

    const currentBranding = (org.branding as OrganizationBranding | null) ?? DEFAULT_ORGANIZATION_BRANDING

    // Merge white-label config into branding
    const updatedBranding: OrganizationBranding = {
      ...currentBranding,
      whiteLabelConfig: config,
    }

    const { data: updated, error: updateError } = await supabase
      .from('organizations')
      .update({ branding: updatedBranding })
      .eq('id', orgId)
      .select('branding')
      .single()

    if (updateError || !updated) {
      return failure(new Error(`Failed to apply white-label: ${updateError?.message ?? 'Unknown error'}`))
    }

    return success(mergeBranding(DEFAULT_ORGANIZATION_BRANDING, updated.branding as OrganizationBranding))
  } catch (error) {
    return failure(
      error instanceof Error ? error : new Error('Unexpected error applying white-label configuration')
    )
  }
}

// ──────────────────────────────────────────────────────────────
// getCustomDomain
// ──────────────────────────────────────────────────────────────

/**
 * Gets the custom domain configuration for an organization.
 */
export async function getCustomDomain(
  orgId: string
): Promise<Result<CustomDomain | null>> {
  try {
    const supabase = await createClient()

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('branding')
      .eq('id', orgId)
      .single()

    if (orgError || !org) {
      return failure(new Error(`Organization not found: ${orgId}`))
    }

    const branding = org.branding as OrganizationBranding | null
    return success(branding?.customDomain ?? null)
  } catch (error) {
    return failure(
      error instanceof Error ? error : new Error('Unexpected error fetching custom domain')
    )
  }
}

// ──────────────────────────────────────────────────────────────
// verifyCustomDomain
// ──────────────────────────────────────────────────────────────

/**
 * Verifies domain ownership for an organization.
 * In production, this would check DNS records (CNAME or TXT).
 * This implementation marks the domain as verified after basic validation.
 */
export async function verifyCustomDomain(
  orgId: string,
  domain: string
): Promise<Result<CustomDomain>> {
  try {
    const supabase = await createClient()

    // Get the organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('branding')
      .eq('id', orgId)
      .single()

    if (orgError || !org) {
      return failure(new Error(`Organization not found: ${orgId}`))
    }

    // Validate domain format
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/
    if (!domainRegex.test(domain)) {
      return failure(new Error(`Invalid domain format: ${domain}`))
    }

    // Check that the domain isn't already used by another organization
    const { data: allOrgs } = await supabase
      .from('organizations')
      .select('id, branding')
      .neq('id', orgId)
      .eq('is_active', true)

    if (allOrgs) {
      for (const otherOrg of allOrgs) {
        const otherBranding = otherOrg.branding as OrganizationBranding | null
        if (otherBranding?.customDomain?.domain === domain && otherBranding.customDomain.verified) {
          return failure(new Error(`Domain '${domain}' is already in use by another organization`))
        }
      }
    }

    // In production: Verify DNS CNAME/TXT record here
    // For now: Perform a basic check and mark as verified
    // A real implementation would:
    // 1. Look up DNS records for the domain
    // 2. Verify CNAME points to our infrastructure
    // 3. Or verify a TXT record with a verification token
    const verified = true // Assume verified in this implementation
    const verifiedAt = new Date().toISOString()

    // Get the user ID from the current session for createdBy
    const { data: { user } } = await supabase.auth.getUser()
    const createdBy = user?.id ?? 'system'

    const customDomain: CustomDomain = {
      domain,
      verified,
      verifiedAt,
      sslEnabled: true,
      createdBy,
    }

    // Update the organization's branding with the custom domain
    const currentBranding = (org.branding as OrganizationBranding | null) ?? DEFAULT_ORGANIZATION_BRANDING
    const updatedBranding: OrganizationBranding = {
      ...currentBranding,
      customDomain,
    }

    const { error: updateError } = await supabase
      .from('organizations')
      .update({ branding: updatedBranding })
      .eq('id', orgId)

    if (updateError) {
      return failure(new Error(`Failed to update custom domain: ${updateError.message}`))
    }

    return success(customDomain)
  } catch (error) {
    return failure(
      error instanceof Error ? error : new Error('Unexpected error verifying custom domain')
    )
  }
}

// ──────────────────────────────────────────────────────────────
// generateBrandingCSS
// ──────────────────────────────────────────────────────────────

/**
 * Generates CSS custom properties (variables) from a branding configuration.
 * These can be injected into the page for dynamic theming.
 */
export function generateBrandingCSS(branding: OrganizationBranding): string {
  const lines: string[] = []

  lines.push(`--brand-primary: ${branding.primaryColor};`)
  lines.push(`--brand-secondary: ${branding.secondaryColor};`)
  lines.push(`--brand-accent: ${branding.accentColor};`)

  // Generate HSL variants for Tailwind compatibility
  const primaryHsl = hexToHsl(branding.primaryColor)
  if (primaryHsl) {
    lines.push(`--brand-primary-h: ${primaryHsl.h};`)
    lines.push(`--brand-primary-s: ${primaryHsl.s}%;`)
    lines.push(`--brand-primary-l: ${primaryHsl.l}%;`)
  }

  const secondaryHsl = hexToHsl(branding.secondaryColor)
  if (secondaryHsl) {
    lines.push(`--brand-secondary-h: ${secondaryHsl.h};`)
    lines.push(`--brand-secondary-s: ${secondaryHsl.s}%;`)
    lines.push(`--brand-secondary-l: ${secondaryHsl.l}%;`)
  }

  const accentHsl = hexToHsl(branding.accentColor)
  if (accentHsl) {
    lines.push(`--brand-accent-h: ${accentHsl.h};`)
    lines.push(`--brand-accent-s: ${accentHsl.s}%;`)
    lines.push(`--brand-accent-l: ${accentHsl.l}%;`)
  }

  // White-label overrides
  if (branding.whiteLabelConfig?.enabled) {
    if (branding.whiteLabelConfig.appName) {
      lines.push(`--brand-app-name: "${branding.whiteLabelConfig.appName}";`)
    }
    if (branding.whiteLabelConfig.hideBranding) {
      lines.push(`--brand-show-powered-by: 0;`)
    }
  }

  // Wrap in :root selector
  return `:root {\n  ${lines.join('\n  ')}\n}`
}

// ──────────────────────────────────────────────────────────────
// getEmailTemplate
// ──────────────────────────────────────────────────────────────

/**
 * Gets a branded email template for an organization.
 * Falls back to the default template if no custom template is set.
 */
export async function getEmailTemplate(
  orgId: string,
  templateType: string
): Promise<Result<BrandedEmailTemplate>> {
  try {
    const supabase = await createClient()

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('branding, parent_id')
      .eq('id', orgId)
      .single()

    if (orgError || !org) {
      return failure(new Error(`Organization not found: ${orgId}`))
    }

    const branding = org.branding as OrganizationBranding | null

    // Check for custom email template
    if (branding?.emailTemplates && branding.emailTemplates[templateType]) {
      return success(branding.emailTemplates[templateType])
    }

    // Try to inherit from parent organization
    if (org.parent_id) {
      const parentResult = await getEmailTemplate(org.parent_id, templateType)
      if (parentResult.ok) {
        return parentResult
      }
    }

    // Return default template
    return success(getDefaultEmailTemplate(templateType))
  } catch (error) {
    return failure(
      error instanceof Error ? error : new Error('Unexpected error fetching email template')
    )
  }
}

// ──────────────────────────────────────────────────────────────
// getReportTemplate
// ──────────────────────────────────────────────────────────────

/**
 * Gets a branded report template for an organization.
 * Falls back to the default template if no custom template is set.
 */
export async function getReportTemplate(
  orgId: string,
  reportType: string
): Promise<Result<BrandedReportTemplate>> {
  try {
    const supabase = await createClient()

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('branding, parent_id')
      .eq('id', orgId)
      .single()

    if (orgError || !org) {
      return failure(new Error(`Organization not found: ${orgId}`))
    }

    const branding = org.branding as OrganizationBranding | null

    // Check for custom report template
    if (branding?.reportTemplates && branding.reportTemplates[reportType]) {
      return success(branding.reportTemplates[reportType])
    }

    // Try to inherit from parent organization
    if (org.parent_id) {
      const parentResult = await getReportTemplate(org.parent_id, reportType)
      if (parentResult.ok) {
        return parentResult
      }
    }

    // Return default template
    return success(getDefaultReportTemplate(reportType))
  } catch (error) {
    return failure(
      error instanceof Error ? error : new Error('Unexpected error fetching report template')
    )
  }
}

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

/**
 * Merges a base branding with an override, where override values take precedence.
 */
function mergeBranding(
  base: OrganizationBranding,
  override: Partial<OrganizationBranding>
): OrganizationBranding {
  return {
    primaryColor: override.primaryColor ?? base.primaryColor,
    secondaryColor: override.secondaryColor ?? base.secondaryColor,
    accentColor: override.accentColor ?? base.accentColor,
    logoUrl: override.logoUrl !== undefined ? override.logoUrl : base.logoUrl,
    faviconUrl: override.faviconUrl !== undefined ? override.faviconUrl : base.faviconUrl,
    customDomain: override.customDomain !== undefined ? override.customDomain : base.customDomain,
    whiteLabelConfig: override.whiteLabelConfig !== undefined
      ? override.whiteLabelConfig
      : base.whiteLabelConfig,
    emailTemplates: override.emailTemplates !== undefined
      ? override.emailTemplates
      : base.emailTemplates,
    reportTemplates: override.reportTemplates !== undefined
      ? override.reportTemplates
      : base.reportTemplates,
  }
}

/**
 * Converts a hex color to HSL values.
 * Returns null for invalid hex strings.
 */
function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  // Remove # prefix if present
  const cleanHex = hex.replace(/^#/, '')

  // Validate hex format
  if (!/^[0-9A-Fa-f]{6}$/.test(cleanHex)) {
    return null
  }

  // Convert hex to RGB
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255

  // Find min and max values
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min

  // Calculate lightness
  const l = (max + min) / 2

  // Calculate hue and saturation
  let h = 0
  let s = 0

  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min)

    switch (max) {
      case r:
        h = ((g - b) / delta + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / delta + 2) / 6
        break
      case b:
        h = ((r - g) / delta + 4) / 6
        break
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

/**
 * Returns a default email template for a given template type.
 */
function getDefaultEmailTemplate(templateType: string): BrandedEmailTemplate {
  return {
    type: templateType,
    fromEmail: null,
    fromName: null,
    replyTo: null,
    subjectTemplate: null,
    headerHtml: null,
    footerHtml: null,
  }
}

/**
 * Returns a default report template for a given report type.
 */
function getDefaultReportTemplate(reportType: string): BrandedReportTemplate {
  return {
    type: reportType,
    headerText: null,
    footerText: 'Generated by ExamForge AI',
    watermark: null,
    includeLogo: true,
    paperSize: 'A4',
    orientation: 'portrait',
    margins: {
      top: 20,
      right: 15,
      bottom: 20,
      left: 15,
    },
  }
}
