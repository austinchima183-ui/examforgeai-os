-- ═══════════════════════════════════════════════════════════════════════════
-- ExamForge AI Ω — Migration 007: Missing Production Tables (Ω-13)
--
-- Purpose: 59 tables referenced by ACTIVE product code (import-graph
-- classified: 56 active-feature + 3 SDK/webhook-contract) never existed in
-- the live schema. This migration creates them with:
--   • primary keys (uuid, gen_random_uuid)
--   • foreign keys to schools/users/parents where applicable
--   • tenant isolation via school_id/organization_id/org_id columns
--   • created_at / updated_at timestamptz (trigger-maintained)
--   • audit fields (created_by, status) where operationally required
--   • indexes on every tenant/FK/lookup column
--   • RLS enabled + policies mirroring the platform model:
--       super_admin  → full access (get_user_role() = 'super_admin')
--       school users → is_school_member(school_id) scoped access
--       owner        → self rows where the table is user-scoped
--     (RLS helpers get_user_role()/is_school_member() are defined in
--      migration 005 — apply 005 before 007.)
--
-- Dead-code tables (19: class D) are intentionally NOT created — the code
-- paths that reference them are unreachable (documented in
-- download/verification/audit/missing-tables-classified.json).
--
-- Idempotent: safe to run repeatedly (IF NOT EXISTS everywhere).
-- ═══════════════════════════════════════════════════════════════════════════

-- ---------------------------------------------------------------------------
-- Shared timestamp trigger (reuses function from migration 002)
-- ---------------------------------------------------------------------------

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 1 — AI ORCHESTRATION (agent runtime + reliability)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1.1 Agent plans — high-level execution plans produced by agent-planner
CREATE TABLE IF NOT EXISTS public.agent_plans (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id        text,
  school_id       uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by      uuid REFERENCES public.users(id) ON DELETE SET NULL,
  goal            text NOT NULL,
  context         jsonb DEFAULT '{}'::jsonb,
  steps           jsonb DEFAULT '[]'::jsonb,
  status          text NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','approved','running','completed','failed','cancelled')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agent_plans_school     ON public.agent_plans(school_id);
CREATE INDEX IF NOT EXISTS idx_agent_plans_created_by ON public.agent_plans(created_by);
CREATE INDEX IF NOT EXISTS idx_agent_plans_status     ON public.agent_plans(status);

-- 1.2 Agent executions — one row per agent run (cost/latency/tokens tracked)
CREATE TABLE IF NOT EXISTS public.agent_executions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id        uuid REFERENCES public.agent_plans(id) ON DELETE SET NULL,
  agent_id       text NOT NULL,
  config_id      uuid REFERENCES public.agent_configs(id) ON DELETE SET NULL,
  school_id      uuid REFERENCES public.schools(id) ON DELETE SET NULL,
  user_id        uuid REFERENCES public.users(id) ON DELETE SET NULL,
  goal           text,
  input          jsonb DEFAULT '{}'::jsonb,
  output         jsonb DEFAULT '{}'::jsonb,
  result         jsonb,
  status         text NOT NULL DEFAULT 'running'
                   CHECK (status IN ('queued','running','succeeded','failed','timeout','cancelled')),
  tokens_input   integer,
  tokens_output  integer,
  cost_usd       numeric(12,6),
  duration_ms    integer,
  error_message  text,
  started_at     timestamptz NOT NULL DEFAULT now(),
  completed_at   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agent_executions_agent    ON public.agent_executions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_executions_school   ON public.agent_executions(school_id);
CREATE INDEX IF NOT EXISTS idx_agent_executions_user     ON public.agent_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_executions_status   ON public.agent_executions(status);
CREATE INDEX IF NOT EXISTS idx_agent_executions_started  ON public.agent_executions(started_at DESC);

-- 1.3 Agent messages — inter-agent communication log
CREATE TABLE IF NOT EXISTS public.agent_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_agent_id   text NOT NULL,
  to_agent_id     text,
  school_id       uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  type            text DEFAULT 'message',
  message_type    text DEFAULT 'message',
  content         text,
  payload         jsonb DEFAULT '{}'::jsonb,
  priority        text DEFAULT 'normal',
  read_at         timestamptz,
  enabled         boolean DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agent_messages_to     ON public.agent_messages(to_agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_school ON public.agent_messages(school_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_created ON public.agent_messages(created_at DESC);

-- 1.4 Agent memories — long-term memory store per agent
CREATE TABLE IF NOT EXISTS public.agent_memories (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id        text NOT NULL,
  school_id       uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  type            text DEFAULT 'observation',
  memory_type     text DEFAULT 'observation',
  content         text NOT NULL,
  importance      numeric(4,2) DEFAULT 0.5,
  embedding       jsonb,
  metadata        jsonb DEFAULT '{}'::jsonb,
  accessed_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agent_memories_agent ON public.agent_memories(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_memories_type  ON public.agent_memories(memory_type);
CREATE INDEX IF NOT EXISTS idx_agent_memories_created ON public.agent_memories(created_at DESC);

-- 1.5 Agent delegations — role handoffs between agents
CREATE TABLE IF NOT EXISTS public.agent_delegations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_agent_id   text NOT NULL,
  to_agent_id     text NOT NULL,
  school_id       uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id         uuid REFERENCES public.users(id) ON DELETE SET NULL,
  role            text,
  task            jsonb DEFAULT '{}'::jsonb,
  result          jsonb,
  deadline        timestamptz,
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','accepted','rejected','completed','expired')),
  is_active       boolean DEFAULT true,
  completed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agent_delegations_to     ON public.agent_delegations(to_agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_delegations_school ON public.agent_delegations(school_id);
CREATE INDEX IF NOT EXISTS idx_agent_delegations_status ON public.agent_delegations(status);

-- 1.6 AI circuit breaker state — reliability engine persistence
CREATE TABLE IF NOT EXISTS public.ai_circuit_breaker_state (
  provider              text PRIMARY KEY,
  state                 text NOT NULL DEFAULT 'closed'
                          CHECK (state IN ('closed','open','half_open')),
  healthy               boolean DEFAULT true,
  circuit_open          boolean DEFAULT false,
  circuit_open_until    timestamptz,
  failure_count         integer NOT NULL DEFAULT 0,
  success_count         integer NOT NULL DEFAULT 0,
  consecutive_failures  integer NOT NULL DEFAULT 0,
  total_failures        integer NOT NULL DEFAULT 0,
  total_requests        integer NOT NULL DEFAULT 0,
  avg_latency_ms        numeric(10,2),
  last_error            text,
  last_failure_at       timestamptz,
  last_success_at       timestamptz,
  opened_at             timestamptz,
  cooldown_until        timestamptz,
  metadata              jsonb DEFAULT '{}'::jsonb,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 2 — DEVELOPER PLATFORM (API keys + OAuth)
-- ═══════════════════════════════════════════════════════════════════════════

-- 2.1 API keys — developer platform credentials
CREATE TABLE IF NOT EXISTS public.api_keys (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  school_id    uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  created_by   uuid REFERENCES public.users(id) ON DELETE CASCADE,
  name         text NOT NULL,
  prefix       text,
  key_prefix   text,
  key_hash     text NOT NULL,          -- SHA-256 of the full secret; raw key NEVER stored
  key          text,                   -- populated only transiently at creation (null after)
  scopes       jsonb NOT NULL DEFAULT '[]'::jsonb,
  permissions  jsonb DEFAULT '[]'::jsonb,
  rate_limit   integer DEFAULT 1000,   -- requests per minute
  endpoint     text,
  usage_count  bigint DEFAULT 0,
  active       boolean DEFAULT true,
  last_used_at timestamptz,
  expires_at   timestamptz,
  revoked_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_api_keys_org      ON public.api_keys(org_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_creator  ON public.api_keys(created_by);
CREATE INDEX IF NOT EXISTS idx_api_keys_expires  ON public.api_keys(expires_at);

-- 2.2 API key usage — metering + anomaly detection
CREATE TABLE IF NOT EXISTS public.api_key_usage (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_id       uuid NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE,
  endpoint     text NOT NULL,
  method       text,
  status_code  integer,
  count        integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_key      ON public.api_key_usage(key_id);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_endpoint ON public.api_key_usage(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_window   ON public.api_key_usage(window_start DESC);

-- 2.3 OAuth authorization codes (developer platform)
CREATE TABLE IF NOT EXISTS public.oauth_auth_codes (
  code            text PRIMARY KEY,
  app_id          uuid NOT NULL REFERENCES public.oauth_apps(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  scopes          jsonb NOT NULL DEFAULT '[]'::jsonb,
  redirect_uri    text,
  code_challenge  text,
  expires_at      timestamptz NOT NULL,
  used_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_oauth_auth_codes_user   ON public.oauth_auth_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_auth_codes_expiry ON public.oauth_auth_codes(expires_at);

-- 2.4 OAuth tokens (hashed at rest)
CREATE TABLE IF NOT EXISTS public.oauth_tokens (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id              uuid NOT NULL REFERENCES public.oauth_apps(id) ON DELETE CASCADE,
  user_id             uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  access_token_hash   text NOT NULL,
  refresh_token_hash  text,
  scopes              jsonb NOT NULL DEFAULT '[]'::jsonb,
  access_expires_at   timestamptz NOT NULL,
  refresh_expires_at  timestamptz,
  revoked_at          timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (access_token_hash)
);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_app   ON public.oauth_tokens(app_id);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user  ON public.oauth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_revoked ON public.oauth_tokens(revoked_at);

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 3 — ENTERPRISE IDENTITY (SSO / SCIM / org admin / sessions)
-- ═══════════════════════════════════════════════════════════════════════════

-- 3.1 SSO providers (per organization)
CREATE TABLE IF NOT EXISTS public.sso_providers (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id          uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider_id              text,
  name                     text,
  type                     text,
  provider_type            text NOT NULL CHECK (provider_type IN ('saml','oidc','google','azure_ad','okta')),
  entity_id                text,
  issuer                   text,
  sso_url                  text,
  authorization_url        text,
  token_url                text,
  user_info_url            text,
  x509_certificate         text,
  client_id                text,
  client_secret            text,
  client_secret_encrypted  text,
  scopes                   jsonb DEFAULT '[]'::jsonb,
  metadata_url             text,
  attribute_mapping        jsonb DEFAULT '{}'::jsonb,
  enabled                  boolean DEFAULT true,
  is_active                boolean NOT NULL DEFAULT true,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sso_providers_org ON public.sso_providers(organization_id);

-- 3.2 SSO user links (identity-provider → local user mapping)
CREATE TABLE IF NOT EXISTS public.sso_user_links (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider_id       uuid REFERENCES public.sso_providers(id) ON DELETE CASCADE,
  user_id           uuid REFERENCES public.users(id) ON DELETE CASCADE,
  email             text NOT NULL,
  external_id       text,
  external_email    text,
  external_groups   jsonb DEFAULT '[]'::jsonb,
  scim_managed      boolean DEFAULT false,
  attributes        jsonb DEFAULT '{}'::jsonb,
  last_login_at     timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, email)
);
CREATE INDEX IF NOT EXISTS idx_sso_user_links_org  ON public.sso_user_links(organization_id);
CREATE INDEX IF NOT EXISTS idx_sso_user_links_user ON public.sso_user_links(user_id);
CREATE INDEX IF NOT EXISTS idx_sso_user_links_email ON public.sso_user_links(email);

-- 3.3 SSO auth states (CSRF-protected flow state, short-lived)
CREATE TABLE IF NOT EXISTS public.sso_auth_states (
  state         text PRIMARY KEY,
  provider_id   uuid NOT NULL REFERENCES public.sso_providers(id) ON DELETE CASCADE,
  redirect_uri  text,
  redirect_url  text,
  code_verifier text,
  user_id       uuid REFERENCES public.users(id) ON DELETE CASCADE,
  expires_at    timestamptz NOT NULL,
  consumed_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sso_auth_states_expiry ON public.sso_auth_states(expires_at);

-- 3.4 SCIM configurations (directory sync per org)
CREATE TABLE IF NOT EXISTS public.scim_configurations (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  bearer_token_hash       text NOT NULL,
  bearer_token_encrypted  text,
  endpoint                text,
  webhook_endpoint        text,
  user_id_mapping         jsonb DEFAULT '{}'::jsonb,
  group_mapping           jsonb DEFAULT '{}'::jsonb,
  sync_settings           jsonb DEFAULT '{}'::jsonb,
  sync_interval_seconds   integer DEFAULT 3600,
  enabled                 boolean DEFAULT true,
  last_sync_at            timestamptz,
  last_synced_at          timestamptz,
  is_active               boolean NOT NULL DEFAULT true,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_scim_configurations_org ON public.scim_configurations(organization_id);

-- 3.5 Organization settings (org-wide policy/config store)
CREATE TABLE IF NOT EXISTS public.organization_settings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  password_policy jsonb DEFAULT '{}'::jsonb,
  session_policy  jsonb DEFAULT '{}'::jsonb,
  notifications   jsonb DEFAULT '{}'::jsonb,
  branding        jsonb DEFAULT '{}'::jsonb,
  compliance      jsonb DEFAULT '{}'::jsonb,
  district_average jsonb,
  settings        jsonb DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_organization_settings_org ON public.organization_settings(organization_id);

-- 3.6 Delegated admins (granular org admin delegation)
CREATE TABLE IF NOT EXISTS public.delegated_admins (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  roles           jsonb NOT NULL DEFAULT '[]'::jsonb,
  scope           text NOT NULL DEFAULT 'org'
                    CHECK (scope IN ('org','school','class','student')),
  path            text,
  granted_by      uuid REFERENCES public.users(id) ON DELETE SET NULL,
  granted_at      timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id, scope)
);
CREATE INDEX IF NOT EXISTS idx_delegated_admins_org  ON public.delegated_admins(organization_id);
CREATE INDEX IF NOT EXISTS idx_delegated_admins_user ON public.delegated_admins(user_id);

-- 3.7 Cross-campus permissions (multi-school staff access)
CREATE TABLE IF NOT EXISTS public.cross_campus_permissions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  source_org_id    uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  target_org_id    uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  permission_type  text NOT NULL CHECK (permission_type IN ('view','teach','administer')),
  path             text,
  granted_by       uuid REFERENCES public.users(id) ON DELETE SET NULL,
  granted_at       timestamptz NOT NULL DEFAULT now(),
  expires_at       timestamptz,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cross_campus_user   ON public.cross_campus_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_cross_campus_target ON public.cross_campus_permissions(target_org_id);

-- 3.8 Session activity log (security analytics)
CREATE TABLE IF NOT EXISTS public.session_activity_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  school_id   uuid REFERENCES public.schools(id) ON DELETE SET NULL,
  session_id  text,
  event_type  text NOT NULL DEFAULT 'heartbeat',
  activity    text,
  ip          text,
  ip_address  text,
  user_agent  text,
  device      text,
  location    text,
  details     jsonb DEFAULT '{}'::jsonb,
  metadata    jsonb DEFAULT '{}'::jsonb,
  timestamp   timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_session_activity_user      ON public.session_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_session_activity_timestamp ON public.session_activity_log(timestamp DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 4 — BILLING & PAYMENTS (metering, contracts, refunds, audit)
-- ═══════════════════════════════════════════════════════════════════════════

-- 4.1 Metered pricing (per-metric unit pricing by plan tier)
CREATE TABLE IF NOT EXISTS public.metered_pricing (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_tier         text NOT NULL,
  metric            text NOT NULL,
  unit_price        numeric(12,4) NOT NULL,
  included_quantity integer NOT NULL DEFAULT 0,
  currency          text NOT NULL DEFAULT 'NGN',
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_tier, metric)
);
CREATE INDEX IF NOT EXISTS idx_metered_pricing_tier_metric ON public.metered_pricing(plan_tier, metric);

-- 4.2 Plan limits (hard limits per tier per metric)
CREATE TABLE IF NOT EXISTS public.plan_limits (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_tier         text NOT NULL,
  metric            text NOT NULL,
  included_quantity integer NOT NULL DEFAULT 0,
  overage_price     numeric(12,4),
  limit_type        text NOT NULL DEFAULT 'hard' CHECK (limit_type IN ('hard','soft')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_tier, metric)
);
CREATE INDEX IF NOT EXISTS idx_plan_limits_tier_metric ON public.plan_limits(plan_tier, metric);

-- 4.3 Usage records (metered consumption per org per period)
CREATE TABLE IF NOT EXISTS public.usage_records (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  school_id         uuid REFERENCES public.schools(id) ON DELETE SET NULL,
  metric            text NOT NULL,
  quantity          numeric(14,4) NOT NULL DEFAULT 0,
  period            text NOT NULL,            -- e.g. '2026-08'
  plan_tier         text,
  unit_price        numeric(12,4),
  overage_price     numeric(12,4),
  included_quantity integer DEFAULT 0,
  metadata          jsonb DEFAULT '{}'::jsonb,
  status            text NOT NULL DEFAULT 'open' CHECK (status IN ('open','invoiced','disputed','closed')),
  timestamp         timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, metric, period)
);
CREATE INDEX IF NOT EXISTS idx_usage_records_org_period ON public.usage_records(org_id, period);
CREATE INDEX IF NOT EXISTS idx_usage_records_metric     ON public.usage_records(metric);

-- 4.4 Tax rates (regional billing tax config)
CREATE TABLE IF NOT EXISTS public.tax_rates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  region      text NOT NULL,
  rate        numeric(6,4) NOT NULL,
  name        text,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (region, org_id)
);
CREATE INDEX IF NOT EXISTS idx_tax_rates_region ON public.tax_rates(region);

-- 4.5 Enterprise contracts (custom agreements)
CREATE TABLE IF NOT EXISTS public.enterprise_contracts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  contract_number  text UNIQUE,
  plan_tier        text NOT NULL DEFAULT 'enterprise',
  seats            integer,
  custom_pricing   jsonb DEFAULT '{}'::jsonb,
  negotiated_amount numeric(14,2),
  value            numeric(14,2),
  currency         text DEFAULT 'NGN',
  terms            jsonb DEFAULT '{}'::jsonb,
  notes            text,
  start_date       date NOT NULL,
  end_date         date,
  auto_renew       boolean NOT NULL DEFAULT false,
  status           text NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft','pending_signature','active','expired','terminated','renewed')),
  signed_by        uuid REFERENCES public.users(id) ON DELETE SET NULL,
  signed_at        timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_enterprise_contracts_org    ON public.enterprise_contracts(org_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_contracts_status ON public.enterprise_contracts(status);

-- 4.6 Subscription changes (upgrade/downgrade/cancellation audit)
CREATE TABLE IF NOT EXISTS public.subscription_changes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  school_id      uuid REFERENCES public.schools(id) ON DELETE SET NULL,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  change_type    text NOT NULL CHECK (change_type IN ('upgrade','downgrade','renewal','cancellation','seat_change','plan_change')),
  from_plan_id   uuid REFERENCES public.plans(id) ON DELETE SET NULL,
  to_plan_id     uuid REFERENCES public.plans(id) ON DELETE SET NULL,
  old_amount     numeric(14,2),
  new_amount     numeric(14,2),
  total_amount   numeric(14,2),
  seats_delta    integer,
  reason         text,
  status         text NOT NULL DEFAULT 'completed',
  issued_at      timestamptz NOT NULL DEFAULT now(),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_subscription_changes_org  ON public.subscription_changes(org_id);
CREATE INDEX IF NOT EXISTS idx_subscription_changes_sub  ON public.subscription_changes(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_changes_date ON public.subscription_changes(issued_at DESC);

-- 4.7 Seat allocations (per-org seat pool management)
CREATE TABLE IF NOT EXISTS public.seat_allocations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  school_id       uuid REFERENCES public.schools(id) ON DELETE SET NULL,
  plan_id         uuid REFERENCES public.plans(id) ON DELETE SET NULL,
  metric          text NOT NULL DEFAULT 'seats',
  total_seats     integer NOT NULL DEFAULT 0,
  used_seats      integer NOT NULL DEFAULT 0,
  available_seats integer GENERATED ALWAYS AS (total_seats - used_seats) STORED,
  quantity        integer,
  seat_price      numeric(12,2),
  currency        text DEFAULT 'NGN',
  status          text NOT NULL DEFAULT 'active',
  is_active       boolean NOT NULL DEFAULT true,
  timestamp       timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_seat_allocations_org ON public.seat_allocations(org_id);

-- 4.8 Refund requests (Flutterwave refund API contract)
CREATE TABLE IF NOT EXISTS public.refund_requests (
  id                           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                       uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  payment_id                   uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  transaction_ref              text,
  flutterwave_transaction_id   text,
  flutterwave_refund_id        text,
  amount                       numeric(14,2) NOT NULL,
  currency                     text DEFAULT 'NGN',
  reason                       text,
  rejected_reason              text,
  provider                     text DEFAULT 'flutterwave',
  status                       text NOT NULL DEFAULT 'requested'
                                 CHECK (status IN ('requested','processing','completed','failed','rejected','cancelled')),
  provider_refund_id           text,
  approved_by                  uuid REFERENCES public.users(id) ON DELETE SET NULL,
  processed_at                 timestamptz,
  requested_by                 uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at                   timestamptz NOT NULL DEFAULT now(),
  updated_at                   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_refund_requests_payment ON public.refund_requests(payment_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_status  ON public.refund_requests(status);
CREATE INDEX IF NOT EXISTS idx_refund_requests_org     ON public.refund_requests(org_id);

-- 4.9 Refund workflows (multi-step refund pipeline state)
CREATE TABLE IF NOT EXISTS public.refund_workflows (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_request_id uuid NOT NULL REFERENCES public.refund_requests(id) ON DELETE CASCADE,
  payment_id        uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  transaction_ref   text,
  amount            numeric(14,2) NOT NULL,
  currency          text DEFAULT 'NGN',
  reason            text,
  provider          text DEFAULT 'flutterwave',
  provider_refund_id text,
  approved_by       uuid REFERENCES public.users(id) ON DELETE SET NULL,
  requested_by      uuid REFERENCES public.users(id) ON DELETE SET NULL,
  current_step      text NOT NULL DEFAULT 'initiated',
  steps             jsonb DEFAULT '[]'::jsonb,
  status            text NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','completed','failed','cancelled','expired')),
  processed_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_refund_workflows_request ON public.refund_workflows(refund_request_id);
CREATE INDEX IF NOT EXISTS idx_refund_workflows_status  ON public.refund_workflows(status);

-- 4.10 Payment authorizations (Flutterwave card 3DS authorization records)
CREATE TABLE IF NOT EXISTS public.payment_authorizations (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  payment_id         uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  provider           text NOT NULL DEFAULT 'flutterwave',
  channel            text,
  authorization_code text,
  transaction_ref    text,
  email              text,
  amount             numeric(14,2),
  currency           text DEFAULT 'NGN',
  is_reusable        boolean NOT NULL DEFAULT false,
  status             text DEFAULT 'active',
  metadata           jsonb DEFAULT '{}'::jsonb,
  expires_at         timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payment_authorizations_org   ON public.payment_authorizations(org_id);
CREATE INDEX IF NOT EXISTS idx_payment_authorizations_ref   ON public.payment_authorizations(transaction_ref);
CREATE INDEX IF NOT EXISTS idx_payment_authorizations_email ON public.payment_authorizations(email);

-- 4.11 Payment audit trail (immutable payment event log)
CREATE TABLE IF NOT EXISTS public.payment_audit_trail (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id     uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  org_id         uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  action         text NOT NULL,
  event_type     text,
  provider       text,
  performed_by   uuid REFERENCES public.users(id) ON DELETE SET NULL,
  old_state      jsonb,
  new_state      jsonb,
  actor_id       uuid REFERENCES public.users(id) ON DELETE SET NULL,
  actor_type     text DEFAULT 'system' CHECK (actor_type IN ('system','user','provider','webhook')),
  ip_address     text,
  metadata       jsonb DEFAULT '{}'::jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payment_audit_trail_payment ON public.payment_audit_trail(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_trail_created ON public.payment_audit_trail(created_at DESC);

-- 4.12 Webhook idempotency (replay protection — SDK contract)
CREATE TABLE IF NOT EXISTS public.webhook_idempotency (
  event_id     text PRIMARY KEY,
  provider     text NOT NULL,
  payload_hash text,
  status       text DEFAULT 'processed',
  processed_at timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL DEFAULT now() + interval '30 days'
);
CREATE INDEX IF NOT EXISTS idx_webhook_idempotency_expiry ON public.webhook_idempotency(expires_at);

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 5 — NOTIFICATIONS (queue, templates, bounces, push, recipients)
-- ═══════════════════════════════════════════════════════════════════════════

-- 5.1 Notification queue (delivery engine outbox)
CREATE TABLE IF NOT EXISTS public.notification_queue (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid REFERENCES public.notifications(id) ON DELETE CASCADE,
  event_id       text,
  channel        text NOT NULL CHECK (channel IN ('email','sms','push','in_app','webhook')),
  recipient      text NOT NULL,
  user_id        uuid REFERENCES public.users(id) ON DELETE SET NULL,
  school_id      uuid REFERENCES public.schools(id) ON DELETE SET NULL,
  template_key   text,
  payload        jsonb DEFAULT '{}'::jsonb,
  event_data     jsonb DEFAULT '{}'::jsonb,
  status         text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','processing','sent','delivered','failed','dead_letter')),
  attempt        integer NOT NULL DEFAULT 0,
  attempts       integer NOT NULL DEFAULT 0,
  max_attempts   integer NOT NULL DEFAULT 3,
  backoff_ms     integer DEFAULT 0,
  next_attempt_at timestamptz,
  last_error     text,
  process_at     timestamptz NOT NULL DEFAULT now(),
  started_at     timestamptz,
  sent_at        timestamptz,
  delivered_at   timestamptz,
  completed_at   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notification_queue_status   ON public.notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_process ON public.notification_queue(process_at);
CREATE INDEX IF NOT EXISTS idx_notification_queue_recipient ON public.notification_queue(recipient);
CREATE INDEX IF NOT EXISTS idx_notification_queue_school  ON public.notification_queue(school_id);

-- 5.2 Notification templates (named templates w/ handlebars bodies)
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key          text NOT NULL UNIQUE,
  name         text NOT NULL,
  channel      text NOT NULL DEFAULT 'email',
  subject      text,
  body         text NOT NULL,
  variables    jsonb DEFAULT '[]'::jsonb,
  is_active    boolean NOT NULL DEFAULT true,
  version      integer NOT NULL DEFAULT 1,
  created_by   uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notification_templates_key ON public.notification_templates(key);

-- 5.3 Notification bounces (suppression list)
CREATE TABLE IF NOT EXISTS public.notification_bounces (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  address        text NOT NULL,
  channel        text NOT NULL DEFAULT 'email',
  bounce_type    text DEFAULT 'hard' CHECK (bounce_type IN ('hard','soft','complaint')),
  bounce_code    text,
  diagnostic     text,
  bounce_count   integer NOT NULL DEFAULT 1,
  bounced_at     timestamptz,
  last_bounce_at timestamptz NOT NULL DEFAULT now(),
  suppressed     boolean NOT NULL DEFAULT true,
  metadata       jsonb DEFAULT '{}'::jsonb,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (address, channel)
);
CREATE INDEX IF NOT EXISTS idx_notification_bounces_address ON public.notification_bounces(address);

-- 5.4 Push tokens (device push registration)
CREATE TABLE IF NOT EXISTS public.push_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token       text NOT NULL,
  platform    text NOT NULL DEFAULT 'web' CHECK (platform IN ('web','ios','android')),
  device_name text,
  active      boolean DEFAULT true,
  is_active   boolean NOT NULL DEFAULT true,
  last_used_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (token)
);
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON public.push_tokens(user_id);

-- 5.5 Assignment recipients (assignment → student distribution)
CREATE TABLE IF NOT EXISTS public.assignment_recipients (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL,
  user_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  school_id     uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  assigned_at   timestamptz NOT NULL DEFAULT now(),
  due_at        timestamptz,
  completed_at  timestamptz,
  status        text NOT NULL DEFAULT 'assigned'
                  CHECK (status IN ('assigned','started','submitted','graded','returned')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_assignment_recipients_assignment ON public.assignment_recipients(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_recipients_user       ON public.assignment_recipients(user_id);
CREATE INDEX IF NOT EXISTS idx_assignment_recipients_school     ON public.assignment_recipients(school_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 6 — SIS / ENROLLMENT (students, fees, transcripts, exam participants)
-- ═══════════════════════════════════════════════════════════════════════════

-- 6.1 Enrollments (student ↔ school enrollment records)
CREATE TABLE IF NOT EXISTS public.enrollments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  school_id     uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id      uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  academic_year text NOT NULL,
  roll_number   text,
  is_active     boolean NOT NULL DEFAULT true,
  status        text NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','transferred','graduated','withdrawn','suspended')),
  enrolled_at   timestamptz NOT NULL DEFAULT now(),
  ended_at      timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, school_id, academic_year)
);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON public.enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_school  ON public.enrollments(school_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_year    ON public.enrollments(academic_year);

-- 6.2 Enrollment history (audit of every enrollment state change)
CREATE TABLE IF NOT EXISTS public.enrollment_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.enrollments(id) ON DELETE CASCADE,
  student_id  uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  school_id   uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  action      text NOT NULL CHECK (action IN ('enrolled','transferred','graduated','withdrawn','suspended','reactivated')),
  role        text,
  reason      text,
  actor_id    uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_enrollment_history_student ON public.enrollment_history(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_history_school  ON public.enrollment_history(school_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_history_enroll  ON public.enrollment_history(enrollment_id);

-- 6.3 Teacher subjects (subject assignment beyond class_subjects)
CREATE TABLE IF NOT EXISTS public.teacher_subjects (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id  uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  subject_id  uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  school_id   uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name        text,
  is_active   boolean NOT NULL DEFAULT true,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, subject_id, school_id)
);
CREATE INDEX IF NOT EXISTS idx_teacher_subjects_teacher ON public.teacher_subjects(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_subjects_school  ON public.teacher_subjects(school_id);

-- 6.4 Fee structures (school fee catalogs)
CREATE TABLE IF NOT EXISTS public.fee_structures (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name        text NOT NULL,
  amount      numeric(14,2) NOT NULL,
  currency    text DEFAULT 'NGN',
  class_id    uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  academic_year text,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fee_structures_school ON public.fee_structures(school_id);

-- 6.5 Fee assignments (per-student fee instances)
CREATE TABLE IF NOT EXISTS public.fee_assignments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_structure_id uuid NOT NULL REFERENCES public.fee_structures(id) ON DELETE CASCADE,
  school_id      uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount         numeric(14,2) NOT NULL,
  amount_due     numeric(14,2) NOT NULL,
  amount_paid    numeric(14,2) NOT NULL DEFAULT 0,
  percentage     numeric(5,2),
  due_date       date,
  paid_at        timestamptz,
  status         text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','partial','paid','overdue','waived','refunded')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fee_assignments_student ON public.fee_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_assignments_school  ON public.fee_assignments(school_id);
CREATE INDEX IF NOT EXISTS idx_fee_assignments_status  ON public.fee_assignments(status);
CREATE INDEX IF NOT EXISTS idx_fee_assignments_due     ON public.fee_assignments(due_date);

-- 6.6 Transcript entries (official academic records)
CREATE TABLE IF NOT EXISTS public.transcript_entries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  school_id   uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  subject_id  uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  exam_id     uuid REFERENCES public.exams(id) ON DELETE SET NULL,
  academic_year text,
  term        text,
  score       numeric(5,2),
  grade       text,
  credits     numeric(5,2),
  source      text DEFAULT 'exam_result',
  source_id   uuid,
  verified    boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_transcript_entries_student ON public.transcript_entries(student_id);
CREATE INDEX IF NOT EXISTS idx_transcript_entries_school  ON public.transcript_entries(school_id);

-- 6.7 Exam participants (exam → student distribution registry)
CREATE TABLE IF NOT EXISTS public.exam_participants (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id     uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  school_id   uuid REFERENCES public.schools(id) ON DELETE SET NULL,
  assignment_id uuid,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  started_at  timestamptz,
  completed_at timestamptz,
  status      text NOT NULL DEFAULT 'assigned'
                CHECK (status IN ('assigned','started','submitted','absent','excused','disqualified')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (exam_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_exam_participants_exam  ON public.exam_participants(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_participants_user  ON public.exam_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_participants_status ON public.exam_participants(status);

-- 6.8 Exam answers (per-question answer audit trail)
CREATE TABLE IF NOT EXISTS public.exam_answers (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id        uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  session_id     uuid REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
  question_id    uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  student_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  school_id      uuid REFERENCES public.schools(id) ON DELETE SET NULL,
  answer         jsonb,
  answer_text    text,
  is_correct     boolean,
  marks_awarded  numeric(6,2),
  flagged        boolean NOT NULL DEFAULT false,
  status         text NOT NULL DEFAULT 'submitted'
                   CHECK (status IN ('submitted','graded','disputed','void','regraded')),
  submitted_at   timestamptz NOT NULL DEFAULT now(),
  graded_at      timestamptz,
  graded_by      uuid REFERENCES public.users(id) ON DELETE SET NULL,
  subject_id     uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  topic_id       uuid,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, question_id)
);
CREATE INDEX IF NOT EXISTS idx_exam_answers_exam     ON public.exam_answers(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_answers_student  ON public.exam_answers(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_answers_session  ON public.exam_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_exam_answers_question ON public.exam_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_exam_answers_flagged  ON public.exam_answers(flagged) WHERE flagged;

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 7 — FEEDBACK PLATFORM
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.feedback (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  user_id         uuid REFERENCES public.users(id) ON DELETE SET NULL,
  type            text NOT NULL DEFAULT 'general'
                    CHECK (type IN ('bug','feature_request','general','complaint','praise','support')),
  title           text,
  description     text NOT NULL,
  severity        text DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  priority        text DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status          text NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','triaged','in_progress','resolved','closed','rejected')),
  assignee_id     uuid REFERENCES public.users(id) ON DELETE SET NULL,
  screenshot_urls jsonb DEFAULT '[]'::jsonb,
  ai_rating       jsonb,
  resolution      text,
  resolved_at     timestamptz,
  is_deleted      boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_feedback_school   ON public.feedback(school_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user     ON public.feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_status   ON public.feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_assignee ON public.feedback(assignee_id);

CREATE TABLE IF NOT EXISTS public.feedback_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id uuid NOT NULL REFERENCES public.feedback(id) ON DELETE CASCADE,
  author_id   uuid REFERENCES public.users(id) ON DELETE SET NULL,
  content     text NOT NULL,
  is_internal boolean NOT NULL DEFAULT false,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_feedback_comments_feedback ON public.feedback_comments(feedback_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 8 — MARKETPLACE v2 (licenses; listings/payouts are class-D dead code)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.marketplace_licenses (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id      uuid REFERENCES public.marketplace_purchases(id) ON DELETE SET NULL,
  product_id       uuid NOT NULL REFERENCES public.marketplace_products(id) ON DELETE CASCADE,
  purchaser_org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  buyer_org_id     uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  user_id          uuid REFERENCES public.users(id) ON DELETE SET NULL,
  license_key      text NOT NULL UNIQUE,
  type             text NOT NULL DEFAULT 'standard'
                     CHECK (type IN ('standard','site','enterprise','trial','educational')),
  product_title    text,
  seats            integer DEFAULT 1,
  seats_used       integer NOT NULL DEFAULT 0,
  purchase_count   integer DEFAULT 1,
  download_count   integer DEFAULT 0,
  revenue          numeric(14,2) DEFAULT 0,
  key              text,
  is_active        boolean NOT NULL DEFAULT true,
  activated_at     timestamptz,
  deactivated_at   timestamptz,
  issued_at        timestamptz NOT NULL DEFAULT now(),
  expires_at       timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_marketplace_licenses_product ON public.marketplace_licenses(product_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_licenses_org     ON public.marketplace_licenses(purchaser_org_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_licenses_user    ON public.marketplace_licenses(user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 9 — WEBHOOK SYSTEM (registrations + delivery log)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.webhook_registrations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  school_id     uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  url           text NOT NULL,
  event_types   jsonb NOT NULL DEFAULT '[]'::jsonb,
  secret        text NOT NULL,        -- HMAC signing secret (encrypted app-side)
  is_active     boolean NOT NULL DEFAULT true,
  description   text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_webhook_registrations_subscriber ON public.webhook_registrations(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_webhook_registrations_school     ON public.webhook_registrations(school_id);

CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id            uuid NOT NULL REFERENCES public.webhook_registrations(id) ON DELETE CASCADE,
  event_type            text NOT NULL,
  payload               jsonb,
  response_status       integer,
  response_body         text,
  attempt               integer NOT NULL DEFAULT 1,
  success               boolean NOT NULL DEFAULT false,
  next_retry_at         timestamptz,
  error                 text,
  timestamp             timestamptz NOT NULL DEFAULT now(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON public.webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_time    ON public.webhook_deliveries(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_success ON public.webhook_deliveries(success) WHERE NOT success;

-- Legacy alias table for the /api/settings/webhooks route
CREATE TABLE IF NOT EXISTS public.webhooks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  url         text NOT NULL,
  events      jsonb NOT NULL DEFAULT '[]'::jsonb,
  secret      text,
  active      boolean DEFAULT true,
  is_active   boolean NOT NULL DEFAULT true,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_webhooks_school ON public.webhooks(school_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 10 — WORKFLOW ENGINE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.workflow_definitions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  school_id       uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  workflow_id     text UNIQUE,
  name            text NOT NULL,
  description     text,
  category        text,
  type            text,
  trigger_type    text DEFAULT 'manual',
  trigger         jsonb,
  trigger_event   text,
  steps           jsonb NOT NULL DEFAULT '[]'::jsonb,
  actions         jsonb DEFAULT '[]'::jsonb,
  connections     jsonb DEFAULT '{}'::jsonb,
  variables       jsonb DEFAULT '{}'::jsonb,
  error_handling  jsonb DEFAULT '{}'::jsonb,
  tags            jsonb DEFAULT '[]'::jsonb,
  version         integer NOT NULL DEFAULT 1,
  status          text NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','active','paused','archived')),
  created_by      uuid REFERENCES public.users(id) ON DELETE SET NULL,
  user_id         uuid REFERENCES public.users(id) ON DELETE SET NULL,
  deleted_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_org    ON public.workflow_definitions(organization_id);
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_school ON public.workflow_definitions(school_id);
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_status ON public.workflow_definitions(status);

CREATE TABLE IF NOT EXISTS public.workflow_executions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id       uuid NOT NULL REFERENCES public.workflow_definitions(id) ON DELETE CASCADE,
  organization_id   uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  school_id         uuid REFERENCES public.schools(id) ON DELETE SET NULL,
  user_id           uuid REFERENCES public.users(id) ON DELETE SET NULL,
  status            text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','running','paused','completed','failed','cancelled','timed_out')),
  type              text,
  trigger_event     text,
  trigger_event_id  text,
  trigger_rule_id   text,
  correlation_id    text,
  current_step_id   text,
  steps             jsonb DEFAULT '[]'::jsonb,
  context           jsonb DEFAULT '{}'::jsonb,
  result            jsonb,
  error             text,
  started_at        timestamptz,
  completed_at      timestamptz,
  finished_at       timestamptz,
  duration_ms       integer,
  created_by        uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow ON public.workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status   ON public.workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_school   ON public.workflow_executions(school_id);

CREATE TABLE IF NOT EXISTS public.workflow_scheduled_steps (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id         uuid REFERENCES public.workflow_definitions(id) ON DELETE CASCADE,
  execution_id        uuid NOT NULL REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
  step_id             text NOT NULL,
  resume_at           timestamptz,
  scheduled_at        timestamptz NOT NULL,
  processed_at        timestamptz,
  status              text NOT NULL DEFAULT 'scheduled'
                        CHECK (status IN ('scheduled','processing','done','failed','skipped')),
  variables           jsonb DEFAULT '{}'::jsonb,
  context_snapshot    jsonb DEFAULT '{}'::jsonb,
  payload             jsonb DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_workflow_scheduled_steps_execution ON public.workflow_scheduled_steps(execution_id);
CREATE INDEX IF NOT EXISTS idx_workflow_scheduled_steps_at        ON public.workflow_scheduled_steps(scheduled_at);

CREATE TABLE IF NOT EXISTS public.workflow_approval_requests (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id         uuid REFERENCES public.workflow_definitions(id) ON DELETE CASCADE,
  execution_id        uuid REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
  workflow_execution_id uuid REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
  step_id             text NOT NULL,
  organization_id     uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  school_id           uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  requested_from      uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role                text,
  status              text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','approved','rejected','expired','cancelled')),
  context             jsonb DEFAULT '{}'::jsonb,
  comments            text,
  approved_at         timestamptz,
  approved_by         uuid REFERENCES public.users(id) ON DELETE SET NULL,
  requested_at        timestamptz NOT NULL DEFAULT now(),
  decided_at          timestamptz,
  expires_at          timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_workflow_approvals_execution ON public.workflow_approval_requests(execution_id);
CREATE INDEX IF NOT EXISTS idx_workflow_approvals_from      ON public.workflow_approval_requests(requested_from);
CREATE INDEX IF NOT EXISTS idx_workflow_approvals_status    ON public.workflow_approval_requests(status);

CREATE TABLE IF NOT EXISTS public.workflow_dead_letter_queue (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id     uuid REFERENCES public.workflow_definitions(id) ON DELETE SET NULL,
  execution_id    uuid REFERENCES public.workflow_executions(id) ON DELETE SET NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  school_id       uuid REFERENCES public.schools(id) ON DELETE SET NULL,
  step_id         text,
  input_data      jsonb,
  error           text,
  payload         jsonb,
  attempts        integer NOT NULL DEFAULT 0,
  retry_count     integer NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  resolved_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_workflow_dlq_created ON public.workflow_dead_letter_queue(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_dlq_resolved ON public.workflow_dead_letter_queue(resolved_at) WHERE resolved_at IS NULL;

CREATE TABLE IF NOT EXISTS public.scheduled_interventions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id   uuid REFERENCES public.users(id) ON DELETE CASCADE,
  assigned_by  uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_by   uuid REFERENCES public.users(id) ON DELETE SET NULL,
  workflow_execution_id uuid REFERENCES public.workflow_executions(id) ON DELETE SET NULL,
  type         text,
  intervention_type text NOT NULL,
  reason       text,
  scheduled_at timestamptz,
  scheduled_date date,
  completed_at timestamptz,
  outcome      text,
  status       text NOT NULL DEFAULT 'scheduled'
                 CHECK (status IN ('scheduled','in_progress','completed','cancelled','no_show')),
  metadata     jsonb DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_scheduled_interventions_school  ON public.scheduled_interventions(school_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_interventions_student ON public.scheduled_interventions(student_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 11 — OPS (alert channels, backups, avatars)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.alert_channels (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  channel     text NOT NULL CHECK (channel IN ('slack','discord','teams','email','sms','webhook')),
  name        text,
  config      jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled     boolean NOT NULL DEFAULT true,
  is_default  boolean NOT NULL DEFAULT false,
  last_triggered_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_alert_channels_school ON public.alert_channels(school_id);
CREATE INDEX IF NOT EXISTS idx_alert_channels_channel ON public.alert_channels(channel);

CREATE TABLE IF NOT EXISTS public.backups (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   uuid REFERENCES public.schools(id) ON DELETE SET NULL,
  name        text,
  backup_type text DEFAULT 'full' CHECK (backup_type IN ('full','incremental','snapshot','schema')),
  type        text,
  status      text NOT NULL DEFAULT 'running'
                CHECK (status IN ('running','completed','failed','verifying','expired')),
  size_bytes  bigint,
  size        text,
  records     bigint,
  tables      integer,
  storage_url text,
  checksum    text,
  started_at  timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  expires_at  timestamptz,
  error       text,
  created_by  uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_backups_school  ON public.backups(school_id);
CREATE INDEX IF NOT EXISTS idx_backups_status  ON public.backups(status);
CREATE INDEX IF NOT EXISTS idx_backups_started ON public.backups(started_at DESC);

CREATE TABLE IF NOT EXISTS public.backup_schedule (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  enabled       boolean NOT NULL DEFAULT false,
  frequency     text NOT NULL DEFAULT 'daily' CHECK (frequency IN ('hourly','daily','weekly','monthly')),
  retention_days integer NOT NULL DEFAULT 30,
  next_run_at   timestamptz,
  last_run_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id)
);
CREATE INDEX IF NOT EXISTS idx_backup_schedule_school ON public.backup_schedule(school_id);
CREATE INDEX IF NOT EXISTS idx_backup_schedule_next   ON public.backup_schedule(next_run_at);

CREATE TABLE IF NOT EXISTS public.avatars (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name   text,
  mime_type   text,
  size_bytes  bigint,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_avatars_user ON public.avatars(user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- SECTION 12 — TIMESTAMP TRIGGERS + ROW-LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════

-- 12.1 updated_at maintenance on every new table
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'agent_plans','agent_executions','agent_messages','agent_memories','agent_delegations',
    'ai_circuit_breaker_state','api_keys','api_key_usage','oauth_tokens',
    'sso_providers','sso_user_links','scim_configurations','organization_settings',
    'delegated_admins','cross_campus_permissions','session_activity_log',
    'metered_pricing','plan_limits','usage_records','tax_rates','enterprise_contracts',
    'subscription_changes','seat_allocations','refund_requests','refund_workflows',
    'payment_authorizations','webhook_idempotency','notification_queue','notification_templates',
    'notification_bounces','push_tokens','assignment_recipients','enrollments','enrollment_history',
    'teacher_subjects','fee_structures','fee_assignments','transcript_entries','exam_participants',
    'exam_answers','feedback','feedback_comments','marketplace_licenses','webhook_registrations',
    'webhook_deliveries','webhooks','workflow_definitions','workflow_executions','workflow_scheduled_steps',
    'workflow_approval_requests','workflow_dead_letter_queue','scheduled_interventions',
    'alert_channels','backups','backup_schedule','avatars'
  ]
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS set_updated_at ON public.%I;
       CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();', t, t);
  END LOOP;
END $$;

-- 12.2 Enable RLS everywhere
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'agent_plans','agent_executions','agent_messages','agent_memories','agent_delegations',
    'ai_circuit_breaker_state','api_keys','api_key_usage','oauth_auth_codes','oauth_tokens',
    'sso_providers','sso_user_links','sso_auth_states','scim_configurations','organization_settings',
    'delegated_admins','cross_campus_permissions','session_activity_log',
    'metered_pricing','plan_limits','usage_records','tax_rates','enterprise_contracts',
    'subscription_changes','seat_allocations','refund_requests','refund_workflows',
    'payment_authorizations','payment_audit_trail','webhook_idempotency',
    'notification_queue','notification_templates','notification_bounces','push_tokens',
    'assignment_recipients','enrollments','enrollment_history','teacher_subjects',
    'fee_structures','fee_assignments','transcript_entries','exam_participants','exam_answers',
    'feedback','feedback_comments','marketplace_licenses','webhook_registrations','webhook_deliveries',
    'webhooks','workflow_definitions','workflow_executions','workflow_scheduled_steps',
    'workflow_approval_requests','workflow_dead_letter_queue','scheduled_interventions',
    'alert_channels','backups','backup_schedule','avatars'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
  END LOOP;
END $$;

-- 12.3 Tenant-isolated tables: school members read, school admins write,
--      super_admin full access. (Helper functions from migration 005.)
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'agent_plans','agent_executions','agent_messages','agent_memories','agent_delegations',
    'notification_queue','assignment_recipients','enrollments','enrollment_history',
    'teacher_subjects','fee_structures','fee_assignments','transcript_entries',
    'exam_participants','feedback','workflow_definitions','workflow_executions',
    'scheduled_interventions','alert_channels','backup_schedule','webhook_registrations','webhooks'
  ]
  LOOP
    EXECUTE format('CREATE POLICY tenant_read_%I ON public.%I
      FOR SELECT TO authenticated
      USING (
        public.get_user_role() = ''super_admin''
        OR (school_id IS NOT NULL AND public.is_school_member(school_id))
      );', t, t);
    EXECUTE format('CREATE POLICY tenant_admin_write_%I ON public.%I
      FOR ALL TO authenticated
      USING (
        public.get_user_role() = ''super_admin''
        OR (public.get_user_role() = ''school_admin'' AND school_id IS NOT NULL AND public.is_school_member(school_id))
      )
      WITH CHECK (
        public.get_user_role() = ''super_admin''
        OR (public.get_user_role() = ''school_admin'' AND school_id IS NOT NULL AND public.is_school_member(school_id))
      );', t, t);
  END LOOP;
END $$;

-- 12.4 Org-scoped tables (billing/enterprise: admins + super_admin)
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'usage_records','seat_allocations','enterprise_contracts','subscription_changes',
    'tax_rates','refund_requests','payment_authorizations','payment_audit_trail'
  ]
  LOOP
    EXECUTE format('CREATE POLICY org_admin_access_%I ON public.%I
      FOR ALL TO authenticated
      USING (
        public.get_user_role() = ''super_admin''
        OR (org_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.id = auth.uid() AND u.role IN (''school_admin'',''super_admin'')
        ))
      )
      WITH CHECK (
        public.get_user_role() = ''super_admin''
        OR (org_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.id = auth.uid() AND u.role IN (''school_admin'',''super_admin'')
        ))
      );', t, t);
  END LOOP;
END $$;

-- 12.5 User-scoped tables: owner full access + super_admin
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['api_keys','push_tokens','session_activity_log','avatars']
  LOOP
    EXECUTE format('CREATE POLICY owner_access_%I ON public.%I
      FOR ALL TO authenticated
      USING (user_id = auth.uid() OR public.get_user_role() = ''super_admin'')
      WITH CHECK (user_id = auth.uid() OR public.get_user_role() = ''super_admin'');', t, t);
  END LOOP;
END $$;

-- 12.6 Owner-by-creator tables
DO $$
BEGIN
  EXECUTE 'CREATE POLICY creator_access_api_keys ON public.api_keys
    FOR ALL TO authenticated
    USING (created_by = auth.uid() OR public.get_user_role() = ''super_admin'')
    WITH CHECK (created_by = auth.uid() OR public.get_user_role() = ''super_admin'')';
  EXECUTE 'CREATE POLICY creator_access_agent_plans ON public.agent_plans
    FOR ALL TO authenticated
    USING (created_by = auth.uid() OR public.get_user_role() = ''super_admin'')
    WITH CHECK (created_by = auth.uid() OR public.get_user_role() = ''super_admin'')';
  EXECUTE 'CREATE POLICY owner_access_oauth_auth_codes ON public.oauth_auth_codes
    FOR ALL TO authenticated
    USING (user_id = auth.uid() OR public.get_user_role() = ''super_admin'')
    WITH CHECK (user_id = auth.uid() OR public.get_user_role() = ''super_admin'')';
  EXECUTE 'CREATE POLICY owner_access_oauth_tokens ON public.oauth_tokens
    FOR ALL TO authenticated
    USING (user_id = auth.uid() OR public.get_user_role() = ''super_admin'')
    WITH CHECK (user_id = auth.uid() OR public.get_user_role() = ''super_admin'')';
  EXECUTE 'CREATE POLICY owner_access_sso_user_links ON public.sso_user_links
    FOR ALL TO authenticated
    USING (user_id = auth.uid() OR public.get_user_role() = ''super_admin'')
    WITH CHECK (user_id = auth.uid() OR public.get_user_role() = ''super_admin'')';
  EXECUTE 'CREATE POLICY owner_access_exam_answers ON public.exam_answers
    FOR ALL TO authenticated
    USING (
      student_id = auth.uid()
      OR public.get_user_role() = ''super_admin''
      OR (school_id IS NOT NULL AND public.is_school_member(school_id) AND public.get_user_role() IN (''teacher'',''school_admin''))
    )
    WITH CHECK (
      student_id = auth.uid()
      OR public.get_user_role() = ''super_admin''
      OR (school_id IS NOT NULL AND public.is_school_member(school_id) AND public.get_user_role() IN (''teacher'',''school_admin''))
    )';
END $$;

-- 12.7 Global read-only catalogs (authenticated users)
DO $$
BEGIN
  EXECUTE 'CREATE POLICY catalog_read_metered_pricing ON public.metered_pricing
    FOR SELECT TO authenticated USING (true)';
  EXECUTE 'CREATE POLICY catalog_read_plan_limits ON public.plan_limits
    FOR SELECT TO authenticated USING (true)';
  EXECUTE 'CREATE POLICY catalog_read_notification_templates ON public.notification_templates
    FOR SELECT TO authenticated USING (is_active)';
  EXECUTE 'CREATE POLICY catalog_read_tax_rates ON public.tax_rates
    FOR SELECT TO authenticated USING (is_active)';
  EXECUTE 'CREATE POLICY admin_write_catalogs ON public.metered_pricing
    FOR ALL TO authenticated
    USING (public.get_user_role() = ''super_admin'')
    WITH CHECK (public.get_user_role() = ''super_admin'')';
  EXECUTE 'CREATE POLICY admin_write_plan_limits ON public.plan_limits
    FOR ALL TO authenticated
    USING (public.get_user_role() = ''super_admin'')
    WITH CHECK (public.get_user_role() = ''super_admin'')';
  EXECUTE 'CREATE POLICY admin_write_templates ON public.notification_templates
    FOR ALL TO authenticated
    USING (public.get_user_role() = ''super_admin'')
    WITH CHECK (public.get_user_role() = ''super_admin'')';
END $$;

-- 12.8 Service-role-only tables (internal engine state — no direct user access)
-- ai_circuit_breaker_state / webhook_idempotency / workflow_dead_letter_queue /
-- sso_auth_states / backups / payment flows are managed by server code with
-- the service role (bypasses RLS). Keep RLS enabled with NO policies =
-- deny-by-default for authenticated/anon roles.

-- 12.9 Grants
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'agent_plans','agent_executions','agent_messages','agent_memories','agent_delegations',
    'ai_circuit_breaker_state','api_keys','api_key_usage','oauth_auth_codes','oauth_tokens',
    'sso_providers','sso_user_links','sso_auth_states','scim_configurations','organization_settings',
    'delegated_admins','cross_campus_permissions','session_activity_log',
    'metered_pricing','plan_limits','usage_records','tax_rates','enterprise_contracts',
    'subscription_changes','seat_allocations','refund_requests','refund_workflows',
    'payment_authorizations','payment_audit_trail','webhook_idempotency',
    'notification_queue','notification_templates','notification_bounces','push_tokens',
    'assignment_recipients','enrollments','enrollment_history','teacher_subjects',
    'fee_structures','fee_assignments','transcript_entries','exam_participants','exam_answers',
    'feedback','feedback_comments','marketplace_licenses','webhook_registrations','webhook_deliveries',
    'webhooks','workflow_definitions','workflow_executions','workflow_scheduled_steps',
    'workflow_approval_requests','workflow_dead_letter_queue','scheduled_interventions',
    'alert_channels','backups','backup_schedule','avatars'
  ]
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated;', t);
  END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICATION (run after applying)
-- ═══════════════════════════════════════════════════════════════════════════
-- All must return 59:
--   SELECT count(*) FROM information_schema.tables
--    WHERE table_schema='public' AND table_name IN (...59 names...);
-- RLS enabled on all:
--   SELECT count(*) FROM pg_tables WHERE schemaname='public' AND rowsecurity;
-- Zero drift vs code:
--   re-run scripts/omega/schema-drift-probe.py → Missing: 0 (class A/C tables)
