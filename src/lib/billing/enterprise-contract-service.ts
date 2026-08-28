// ============================================================================
// ExamForge AI — Enterprise Contract Service
// ============================================================================
// Enterprise contract lifecycle: creation, signing, termination, renewal,
// and revenue forecasting.
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import type {
  EnterpriseContract,
  CreateContractInput,
  ContractStatus,
  RevenueForecast,
} from './types'

// ──────────────────────────────────────────────────────────────
// createContract
// ──────────────────────────────────────────────────────────────

export async function createContract(input: CreateContractInput): Promise<EnterpriseContract> {
  const supabase = await createClient()

  // Validate dates
  const startDate = new Date(input.startDate)
  const endDate = new Date(input.endDate)

  if (endDate <= startDate) {
    throw new Error('Contract end date must be after start date')
  }

  if (input.value <= 0) {
    throw new Error('Contract value must be positive')
  }

  // Check for overlapping active contracts
  const { data: overlapping } = await supabase
    .from('enterprise_contracts')
    .select('id')
    .eq('org_id', input.orgId)
    .in('status', ['active', 'pending_signature'])
    .lte('start_date', input.endDate)
    .gte('end_date', input.startDate)
    .maybeSingle()

  if (overlapping) {
    throw new Error('An active or pending contract already exists for this organization in the specified date range')
  }

  const { data: contract, error } = await supabase
    .from('enterprise_contracts')
    .insert({
      org_id: input.orgId,
      start_date: input.startDate,
      end_date: input.endDate,
      value: input.value,
      currency: input.currency,
      terms: input.terms,
      status: 'draft',
      notes: input.notes,
    })
    .select('*')
    .single()

  if (error || !contract) {
    throw new Error(`Failed to create contract: ${error?.message ?? 'Unknown error'}`)
  }

  return mapContractFromDb(contract)
}

// ──────────────────────────────────────────────────────────────
// getContract
// ──────────────────────────────────────────────────────────────

export async function getContract(id: string): Promise<EnterpriseContract | null> {
  const supabase = await createClient()

  const { data: contract } = await supabase
    .from('enterprise_contracts')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!contract) return null
  return mapContractFromDb(contract)
}

// ──────────────────────────────────────────────────────────────
// updateContract
// ──────────────────────────────────────────────────────────────

export async function updateContract(
  id: string,
  changes: Partial<Pick<EnterpriseContract, 'value' | 'currency' | 'terms' | 'endDate' | 'notes'>>
): Promise<EnterpriseContract> {
  const supabase = await createClient()
  const current = await getContract(id)

  if (!current) {
    throw new Error(`Contract not found: ${id}`)
  }

  if (current.status !== 'draft' && current.status !== 'pending_signature') {
    throw new Error(`Cannot modify contract in ${current.status} status`)
  }

  const updates: Record<string, unknown> = {}
  if (changes.value !== undefined) updates.value = changes.value
  if (changes.currency !== undefined) updates.currency = changes.currency
  if (changes.terms !== undefined) updates.terms = changes.terms
  if (changes.endDate !== undefined) updates.end_date = changes.endDate
  if (changes.notes !== undefined) updates.notes = changes.notes

  const { error } = await supabase
    .from('enterprise_contracts')
    .update(updates)
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to update contract: ${error.message}`)
  }

  const updated = await getContract(id)
  if (!updated) throw new Error('Contract not found after update')
  return updated
}

// ──────────────────────────────────────────────────────────────
// signContract
// ──────────────────────────────────────────────────────────────

export async function signContract(
  id: string,
  signedBy: string,
  signatureData: string
): Promise<EnterpriseContract> {
  const supabase = await createClient()
  const current = await getContract(id)

  if (!current) {
    throw new Error(`Contract not found: ${id}`)
  }

  if (current.status !== 'draft' && current.status !== 'pending_signature') {
    throw new Error(`Cannot sign contract in ${current.status} status`)
  }

  const now = new Date().toISOString()

  const { error } = await supabase
    .from('enterprise_contracts')
    .update({
      status: 'active',
      signed_by: signedBy,
      signed_at: now,
      terms: {
        ...current.terms,
        signatureData,
        signedAt: now,
      },
    })
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to sign contract: ${error.message}`)
  }

  // Update organization's subscription to enterprise
  await supabase
    .from('subscriptions')
    .update({
      plan_tier: 'enterprise',
      status: 'active',
    })
    .eq('org_id', current.orgId)
    .in('status', ['active', 'trial', 'past_due'])

  const updated = await getContract(id)
  if (!updated) throw new Error('Contract not found after signing')
  return updated
}

// ──────────────────────────────────────────────────────────────
// terminateContract
// ──────────────────────────────────────────────────────────────

export async function terminateContract(
  id: string,
  reason: string
): Promise<EnterpriseContract> {
  const supabase = await createClient()
  const current = await getContract(id)

  if (!current) {
    throw new Error(`Contract not found: ${id}`)
  }

  if (current.status !== 'active') {
    throw new Error(`Cannot terminate contract in ${current.status} status`)
  }

  const { error } = await supabase
    .from('enterprise_contracts')
    .update({
      status: 'terminated',
      terms: {
        ...current.terms,
        terminationReason: reason,
        terminatedAt: new Date().toISOString(),
      },
    })
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to terminate contract: ${error.message}`)
  }

  const updated = await getContract(id)
  if (!updated) throw new Error('Contract not found after termination')
  return updated
}

// ──────────────────────────────────────────────────────────────
// renewContract
// ──────────────────────────────────────────────────────────────

export async function renewContract(
  id: string,
  newTerms: {
    endDate: string
    value: number
    currency?: string
    terms?: Record<string, unknown>
  }
): Promise<EnterpriseContract> {
  const supabase = await createClient()
  const current = await getContract(id)

  if (!current) {
    throw new Error(`Contract not found: ${id}`)
  }

  if (current.status !== 'active' && current.status !== 'expired') {
    throw new Error(`Cannot renew contract in ${current.status} status`)
  }

  // Mark current contract as renewed
  await supabase
    .from('enterprise_contracts')
    .update({
      status: 'renewed',
      terms: {
        ...current.terms,
        renewedAt: new Date().toISOString(),
        renewedInto: 'pending',
      },
    })
    .eq('id', id)

  // Create new contract
  const newContract = await createContract({
    orgId: current.orgId,
    startDate: current.endDate,
    endDate: newTerms.endDate,
    value: newTerms.value,
    currency: newTerms.currency ?? current.currency,
    terms: newTerms.terms ?? current.terms,
  })

  // Move new contract to pending_signature (since it's a renewal)
  await supabase
    .from('enterprise_contracts')
    .update({ status: 'pending_signature' })
    .eq('id', newContract.id)

  // Link the old contract to the new one
  await supabase
    .from('enterprise_contracts')
    .update({
      terms: {
        ...current.terms,
        renewedAt: new Date().toISOString(),
        renewedInto: newContract.id,
      },
    })
    .eq('id', id)

  return newContract
}

// ──────────────────────────────────────────────────────────────
// getActiveContracts
// ──────────────────────────────────────────────────────────────

export async function getActiveContracts(orgId: string): Promise<EnterpriseContract[]> {
  const supabase = await createClient()

  const { data: contracts } = await supabase
    .from('enterprise_contracts')
    .select('*')
    .eq('org_id', orgId)
    .in('status', ['active', 'pending_signature'])
    .order('start_date', { ascending: false })

  return (contracts ?? []).map(mapContractFromDb)
}

// ──────────────────────────────────────────────────────────────
// getContractRevenueForecast
// ──────────────────────────────────────────────────────────────

export async function getContractRevenueForecast(orgId: string): Promise<RevenueForecast[]> {
  const supabase = await createClient()

  // Get active contracts
  const contracts = await getActiveContracts(orgId)

  if (contracts.length === 0) return []

  const forecasts: RevenueForecast[] = []
  const now = new Date()

  // Generate monthly forecasts for the next 12 months
  for (let i = 0; i < 12; i++) {
    const forecastDate = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + i + 1, 0)
    const monthStr = forecastDate.toISOString().slice(0, 7)

    let projectedMrr = 0

    for (const contract of contracts) {
      const contractStart = new Date(contract.startDate)
      const contractEnd = new Date(contract.endDate)

      // Check if contract is active in this forecast month
      if (contractStart <= monthEnd && contractEnd >= forecastDate) {
        // Calculate monthly revenue from contract value
        const contractMonths = Math.max(1, Math.ceil(
          (contractEnd.getTime() - contractStart.getTime()) / (1000 * 60 * 60 * 24 * 30)
        ))
        const monthlyValue = contract.value / contractMonths

        // Calculate how much of the month is covered
        const coverageStart = contractStart > forecastDate ? contractStart : forecastDate
        const coverageEnd = contractEnd < monthEnd ? contractEnd : monthEnd
        const coverageDays = Math.max(0, Math.ceil(
          (coverageEnd.getTime() - coverageStart.getTime()) / (1000 * 60 * 60 * 24)
        ))
        const daysInMonth = monthEnd.getDate()

        projectedMrr += monthlyValue * (coverageDays / daysInMonth)
      }
    }

    forecasts.push({
      month: monthStr,
      projectedMrr: Math.round(projectedMrr * 100) / 100,
      projectedArr: Math.round(projectedMrr * 12 * 100) / 100,
      confidence: i < 3 ? 0.9 : i < 6 ? 0.75 : 0.6,
      assumptions: contracts.length > 0
        ? [`Based on ${contracts.length} active contract(s)`, 'No new contracts assumed', 'Existing contracts at current terms']
        : ['No active contracts'],
    })
  }

  return forecasts
}

// ──────────────────────────────────────────────────────────────
// Helper: Map DB row to EnterpriseContract
// ──────────────────────────────────────────────────────────────

function mapContractFromDb(data: Record<string, unknown>): EnterpriseContract {
  return {
    id: data.id as string,
    orgId: (data.org_id as string) ?? '',
    startDate: (data.start_date as string) ?? '',
    endDate: (data.end_date as string) ?? '',
    value: (data.value as number) ?? 0,
    currency: (data.currency as string) ?? 'NGN',
    terms: (data.terms as Record<string, unknown>) ?? {},
    signedBy: (data.signed_by as string) ?? null,
    signedAt: (data.signed_at as string) ?? null,
    status: (data.status as ContractStatus) ?? 'draft',
    createdAt: (data.created_at as string) ?? '',
    updatedAt: (data.updated_at as string) ?? '',
    notes: (data.notes as string) ?? undefined,
  }
}
