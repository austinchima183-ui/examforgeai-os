-- ============================================================================
-- ExamForge AI — Verification Round 1 Fixes
-- ============================================================================
-- 1. Create missing `sessions` table (security settings: "where you're logged in")
-- 2. Create missing `passkey_registrations` table (WebAuthn passkeys)
-- 3. Add `owner_id` to oauth_apps (developer OAuth apps are per-user)
-- ============================================================================

-- ── 1. sessions ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id           text,
  is_active           boolean NOT NULL DEFAULT true,
  expires_at          timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  last_active_at      timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  terminated_at       timestamptz,
  termination_reason  text,
  ip_address          text,
  user_agent          text
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(is_active) WHERE is_active;

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to sessions" ON sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Users access own sessions" ON sessions
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── 2. passkey_registrations ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS passkey_registrations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credential_id   text NOT NULL UNIQUE,
  public_key      text NOT NULL,
  counter         integer NOT NULL DEFAULT 0,
  device_type     text,
  transports      jsonb DEFAULT '[]'::jsonb,
  name            text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  last_used_at    timestamptz
);

CREATE INDEX IF NOT EXISTS idx_passkeys_user ON passkey_registrations(user_id);

ALTER TABLE passkey_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to passkey_registrations" ON passkey_registrations
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Users access own passkeys" ON passkey_registrations
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── 3. oauth_apps.owner_id ──────────────────────────────────────────────
ALTER TABLE oauth_apps ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_oauth_apps_owner ON oauth_apps(owner_id);

-- scope existing RLS by owner
DROP POLICY IF EXISTS "oauth_apps_owner_all" ON oauth_apps;
CREATE POLICY "oauth_apps_owner_all" ON oauth_apps
  FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

NOTIFY pgrst, 'reload schema';
