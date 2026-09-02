// ============================================================================
// ExamForge AI — Shared JWT Authentication & Authorization
// ============================================================================
// Centralized JWT validation for all Edge Functions.
// Verifies the Supabase JWT and extracts user claims.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface AuthResult {
  user: {
    id: string;
    email: string;
    role: string;
    school_id: string | null;
  } | null;
  error: string | null;
  status: number;
}

/**
 * Validate the Authorization header and extract user information.
 * Uses the Supabase client's getUser() method for JWT verification.
 */
export async function validateAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, error: 'Missing or invalid Authorization header', status: 401 };
  }

  const token = authHeader.replace('Bearer ', '');
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) {
    return { user: null, error: 'Invalid or expired token', status: 401 };
  }

  // Fetch user role from the public.users table (server-authoritative)
  const serviceClient = createClient(
    supabaseUrl,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: userProfile } = await serviceClient
    .from('users')
    .select('role, school_id')
    .eq('id', user.id)
    .maybeSingle();

  return {
    user: {
      id: user.id,
      email: user.email || '',
      role: userProfile?.role || 'student',
      school_id: userProfile?.school_id || null,
    },
    error: null,
    status: 200,
  };
}

/**
 * Check if the user has one of the required roles.
 */
export function hasRole(authResult: AuthResult, ...roles: string[]): boolean {
  if (!authResult.user) return false;
  return roles.includes(authResult.user.role);
}

/**
 * Check if the user is a super_admin.
 */
export function isSuperAdmin(authResult: AuthResult): boolean {
  return hasRole(authResult, 'super_admin');
}

/**
 * Check if the user is an admin (super_admin or school_admin).
 */
export function isAdmin(authResult: AuthResult): boolean {
  return hasRole(authResult, 'super_admin', 'school_admin');
}
