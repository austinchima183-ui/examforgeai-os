-- ============================================================================
-- ExamForge AI — Supabase Unification Migration
-- ============================================================================
-- Converts the 29 Prisma/SQLite models to Supabase PostgreSQL.
-- 10 tables already existed; this creates the 19 missing tables and
-- recreates `exam_sessions` as the unified CBT session table
-- (Prisma engine columns + analytics reader columns).
--
-- Applied: 2026-08-25 via Supabase Management API
-- ============================================================================

-- ──────────────────────────────────────────────────────────────
-- 0. Helpers (idempotent)
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ──────────────────────────────────────────────────────────────
-- 1. Recreate exam_sessions (EMPTY table — unified shape)
--    Serves BOTH the CBT integrity engine (status/ends_at/tab_token/
--    is_locked) and the analytics readers (percentage/grade/scores).
-- ──────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS exam_sessions CASCADE;

CREATE TABLE exam_sessions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id             uuid NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status              text NOT NULL DEFAULT 'in_progress',
      -- in_progress | submitted | timed_out | graded
  attempt_number      integer NOT NULL DEFAULT 1,
  started_at          timestamptz NOT NULL DEFAULT now(),
  ends_at             timestamptz NOT NULL,
  submitted_at        timestamptz,
  timed_out_at        timestamptz,
  tab_token           text,
  is_locked           boolean NOT NULL DEFAULT false,
  -- analytics / reader columns
  percentage          double precision,
  grade               text,
  total_score         double precision,
  max_score           double precision,
  answers_completed   integer NOT NULL DEFAULT 0,
  answers_total       integer NOT NULL DEFAULT 0,
  time_spent_seconds  integer,
  submission_type     text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT exam_sessions_unique_attempt UNIQUE (exam_id, student_id, attempt_number)
);

CREATE INDEX idx_exam_sessions_exam ON exam_sessions(exam_id);
CREATE INDEX idx_exam_sessions_student ON exam_sessions(student_id);
CREATE INDEX idx_exam_sessions_status ON exam_sessions(status);

ALTER TABLE exam_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to exam_sessions" ON exam_sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Students can read own exam_sessions" ON exam_sessions
  FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "Students can insert own exam_sessions" ON exam_sessions
  FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());
CREATE POLICY "Students can update own exam_sessions" ON exam_sessions
  FOR UPDATE TO authenticated USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
CREATE POLICY "Teachers can read school exam_sessions" ON exam_sessions
  FOR SELECT TO authenticated USING (
    get_user_role() IN ('teacher','school_admin')
    AND EXISTS (SELECT 1 FROM exams e WHERE e.id = exam_sessions.exam_id AND e.school_id = get_user_school_id())
  );
CREATE POLICY "Super admins can read all exam_sessions" ON exam_sessions
  FOR SELECT TO authenticated USING (is_super_admin());

CREATE TRIGGER trg_exam_sessions_updated_at BEFORE UPDATE ON exam_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────────────────────
-- 2. questions (CBT question bank per exam — API strips correct_answer)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS questions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id         uuid NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  question_text   text NOT NULL,
  question_type   text NOT NULL DEFAULT 'multiple_choice',
      -- multiple_choice | multi_select | true_false | short_answer | essay |
      -- fill_in_blank | matching | numerical
  options         text,
      -- JSON array of {id,label,content} — NEVER include isCorrect to client
  correct_answer  text,
      -- JSON — NEVER sent to client during active exam
  marks           integer NOT NULL DEFAULT 1,
  difficulty      text NOT NULL DEFAULT 'medium',
  is_required     boolean NOT NULL DEFAULT true,
  "order"         integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_questions_exam ON questions(exam_id);

ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to questions" ON questions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "School staff manage their questions" ON questions
  FOR ALL TO authenticated USING (
    get_user_role() IN ('teacher','school_admin')
    AND EXISTS (SELECT 1 FROM exams e WHERE e.id = questions.exam_id
                AND e.school_id = get_user_school_id())
  ) WITH CHECK (
    get_user_role() IN ('teacher','school_admin')
    AND EXISTS (SELECT 1 FROM exams e WHERE e.id = questions.exam_id
                AND e.school_id = get_user_school_id())
  );
CREATE POLICY "Students read questions for exams they are taking" ON questions
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM exam_sessions es
            WHERE es.exam_id = questions.exam_id AND es.student_id = auth.uid())
  );
CREATE POLICY "Super admins can read all questions" ON questions
  FOR SELECT TO authenticated USING (is_super_admin());

CREATE TRIGGER trg_questions_updated_at BEFORE UPDATE ON questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────────────────────
-- 3. exam_session_answers (server-authoritative answer storage)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exam_session_answers (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        uuid NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  question_id       uuid NOT NULL,
  answer            text NOT NULL,
  answer_version    integer NOT NULL DEFAULT 1,
  saved_at          timestamptz NOT NULL DEFAULT now(),
  client_timestamp  text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT exam_session_answers_unique UNIQUE (session_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_esa_session ON exam_session_answers(session_id);

ALTER TABLE exam_session_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to exam_session_answers" ON exam_session_answers
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Students access answers of own sessions" ON exam_session_answers
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM exam_sessions es WHERE es.id = session_id AND es.student_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM exam_sessions es WHERE es.id = session_id AND es.student_id = auth.uid())
  );
CREATE POLICY "School staff read answers for school exams" ON exam_session_answers
  FOR SELECT TO authenticated USING (
    get_user_role() IN ('teacher','school_admin')
    AND EXISTS (SELECT 1 FROM exam_sessions es JOIN exams e ON e.id = es.exam_id
                WHERE es.id = session_id AND e.school_id = get_user_school_id())
  );

CREATE TRIGGER trg_esa_updated_at BEFORE UPDATE ON exam_session_answers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────────────────────
-- 4. exam_audit_events (CBT forensic audit trail)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exam_audit_events (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        uuid REFERENCES exam_sessions(id) ON DELETE SET NULL,
  exam_id           uuid NOT NULL,
  student_id        uuid NOT NULL,
  event_type        text NOT NULL,
      -- answer_save | answer_change | submit | auto_submit | timed_out |
      -- tamper_detected | reconnect | page_refresh | tab_switch | offline |
      -- online | force_submit
  event_data        text,
  server_timestamp  timestamptz NOT NULL DEFAULT now(),
  client_ip         text,
  user_agent        text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_eae_session ON exam_audit_events(session_id);
CREATE INDEX IF NOT EXISTS idx_eae_exam ON exam_audit_events(exam_id);

ALTER TABLE exam_audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to exam_audit_events" ON exam_audit_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Students insert own audit events" ON exam_audit_events
  FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());
CREATE POLICY "Students read own audit events" ON exam_audit_events
  FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "School staff read audit events" ON exam_audit_events
  FOR SELECT TO authenticated USING (
    get_user_role() IN ('teacher','school_admin')
    AND EXISTS (SELECT 1 FROM exams e WHERE e.id = exam_audit_events.exam_id
                AND e.school_id = get_user_school_id())
  );

-- ──────────────────────────────────────────────────────────────
-- 5. tamper_events (CBT anti-cheat detection log)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tamper_events (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        uuid NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  type              text NOT NULL,
      -- time_drift | duplicate_submission | multiple_tabs |
      -- modified_exam_id | modified_student_id
  details           text NOT NULL,
  severity          text NOT NULL DEFAULT 'low',
      -- low | medium | high | critical
  server_timestamp  timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tamper_session ON tamper_events(session_id);

ALTER TABLE tamper_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to tamper_events" ON tamper_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Students read own tamper events" ON tamper_events
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM exam_sessions es WHERE es.id = session_id AND es.student_id = auth.uid())
  );
CREATE POLICY "School staff read tamper events" ON tamper_events
  FOR SELECT TO authenticated USING (
    get_user_role() IN ('teacher','school_admin')
    AND EXISTS (SELECT 1 FROM exam_sessions es JOIN exams e ON e.id = es.exam_id
                WHERE es.id = session_id AND e.school_id = get_user_school_id())
  );

-- ──────────────────────────────────────────────────────────────
-- 6. offline_sync_queue (CBT offline resilience)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS offline_sync_queue (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        uuid NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  type              text NOT NULL,
      -- answer_save | session_submit
  payload           text NOT NULL,
  client_timestamp  text,
  status            text NOT NULL DEFAULT 'pending',
      -- pending | synced | failed | conflict
  retry_count       integer NOT NULL DEFAULT 0,
  synced_at         timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_osq_session ON offline_sync_queue(session_id);
CREATE INDEX IF NOT EXISTS idx_osq_status ON offline_sync_queue(status);

ALTER TABLE offline_sync_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to offline_sync_queue" ON offline_sync_queue
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Students manage own sync queue" ON offline_sync_queue
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM exam_sessions es WHERE es.id = session_id AND es.student_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM exam_sessions es WHERE es.id = session_id AND es.student_id = auth.uid())
  );

CREATE TRIGGER trg_osq_updated_at BEFORE UPDATE ON offline_sync_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────────────────────
-- 7. exam_submissions (manual/AI grading of written answers)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exam_submissions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id       uuid NOT NULL,
  student_id    uuid NOT NULL,
  question_id   uuid NOT NULL,
  answer        text NOT NULL,
  score         double precision,
  max_score     double precision NOT NULL,
  ai_score      double precision,
  ai_feedback   text,
  graded_by     uuid,
  graded_at     timestamptz,
  rubric_id     uuid,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_es_exam ON exam_submissions(exam_id);
CREATE INDEX IF NOT EXISTS idx_es_student ON exam_submissions(student_id);

ALTER TABLE exam_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to exam_submissions" ON exam_submissions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Students read own exam submissions" ON exam_submissions
  FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "Students insert own exam submissions" ON exam_submissions
  FOR INSERT TO authenticated WITH CHECK (student_id = auth.uid());
CREATE POLICY "School staff manage exam submissions" ON exam_submissions
  FOR ALL TO authenticated USING (
    get_user_role() IN ('teacher','school_admin')
    AND EXISTS (SELECT 1 FROM exams e WHERE e.id = exam_submissions.exam_id
                AND e.school_id = get_user_school_id())
  ) WITH CHECK (
    get_user_role() IN ('teacher','school_admin')
    AND EXISTS (SELECT 1 FROM exams e WHERE e.id = exam_submissions.exam_id
                AND e.school_id = get_user_school_id())
  );

CREATE TRIGGER trg_es_updated_at BEFORE UPDATE ON exam_submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────────────────────
-- 8. class_teachers / subject_teachers (junctions)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS class_teachers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id    uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT class_teachers_unique UNIQUE (class_id, teacher_id)
);

CREATE INDEX IF NOT EXISTS idx_ct_teacher ON class_teachers(teacher_id);

ALTER TABLE class_teachers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to class_teachers" ON class_teachers
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "School members read class_teachers" ON class_teachers
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM classes c WHERE c.id = class_id AND is_school_member(c.school_id))
  );
CREATE POLICY "School staff manage class_teachers" ON class_teachers
  FOR ALL TO authenticated USING (
    get_user_role() IN ('teacher','school_admin')
    AND EXISTS (SELECT 1 FROM classes c WHERE c.id = class_id AND is_school_member(c.school_id))
  ) WITH CHECK (
    get_user_role() IN ('teacher','school_admin')
    AND EXISTS (SELECT 1 FROM classes c WHERE c.id = class_id AND is_school_member(c.school_id))
  );

CREATE TABLE IF NOT EXISTS subject_teachers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id  uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id    uuid REFERENCES classes(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_st_teacher ON subject_teachers(teacher_id);
CREATE INDEX IF NOT EXISTS idx_st_subject ON subject_teachers(subject_id);

ALTER TABLE subject_teachers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to subject_teachers" ON subject_teachers
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "School members read subject_teachers" ON subject_teachers
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM subjects s WHERE s.id = subject_id
            AND (s.school_id IS NULL OR is_school_member(s.school_id)))
  );
CREATE POLICY "School staff manage subject_teachers" ON subject_teachers
  FOR ALL TO authenticated USING (
    get_user_role() IN ('teacher','school_admin')
    AND EXISTS (SELECT 1 FROM subjects s WHERE s.id = subject_id
                AND (s.school_id IS NULL OR is_school_member(s.school_id)))
  ) WITH CHECK (
    get_user_role() IN ('teacher','school_admin')
    AND EXISTS (SELECT 1 FROM subjects s WHERE s.id = subject_id
                AND (s.school_id IS NULL OR is_school_member(s.school_id)))
  );

-- ──────────────────────────────────────────────────────────────
-- 9. attendance
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id    uuid NOT NULL,
  date        date NOT NULL,
  status      text NOT NULL DEFAULT 'present',
      -- present | absent | late | excused
  reason      text,
  marked_by   uuid,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT attendance_unique UNIQUE (student_id, class_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON attendance(class_id, date);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to attendance" ON attendance
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Students read own attendance" ON attendance
  FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "Parents read children attendance" ON attendance
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM parent_children pc WHERE pc.parent_id = auth.uid() AND pc.child_id = attendance.student_id)
  );
CREATE POLICY "School staff manage attendance" ON attendance
  FOR ALL TO authenticated USING (
    get_user_role() IN ('teacher','school_admin') AND is_school_member(get_user_school_id())
  ) WITH CHECK (
    get_user_role() IN ('teacher','school_admin') AND is_school_member(get_user_school_id())
  );

-- ──────────────────────────────────────────────────────────────
-- 10. fees / fee_payments
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fees (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id         uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name              text NOT NULL,
  amount            double precision NOT NULL,
  fee_type          text NOT NULL DEFAULT 'tuition',
      -- tuition | exam | library | transport | other
  academic_session  text,
  term              text DEFAULT 'Term 1',
  due_date          timestamptz,
  description       text,
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fees_school ON fees(school_id);

ALTER TABLE fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to fees" ON fees
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "School members read fees" ON fees
  FOR SELECT TO authenticated USING (is_school_member(school_id));
CREATE POLICY "School staff manage fees" ON fees
  FOR ALL TO authenticated USING (
    get_user_role() IN ('teacher','school_admin') AND is_school_member(school_id)
  ) WITH CHECK (
    get_user_role() IN ('teacher','school_admin') AND is_school_member(school_id)
  );

CREATE TRIGGER trg_fees_updated_at BEFORE UPDATE ON fees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS fee_payments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_id          uuid NOT NULL REFERENCES fees(id) ON DELETE CASCADE,
  student_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount          double precision NOT NULL,
  status          text NOT NULL DEFAULT 'pending',
      -- pending | paid | overdue | partial
  payment_method  text,
      -- card | transfer | cash
  reference       text,
  paid_at         timestamptz,
  due_date        timestamptz,
  receipt_url     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fp_student ON fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_fp_fee ON fee_payments(fee_id);

ALTER TABLE fee_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to fee_payments" ON fee_payments
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Students read own fee_payments" ON fee_payments
  FOR SELECT TO authenticated USING (student_id = auth.uid());
CREATE POLICY "Parents read children fee_payments" ON fee_payments
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM parent_children pc WHERE pc.parent_id = auth.uid() AND pc.child_id = fee_payments.student_id)
  );
CREATE POLICY "School staff manage fee_payments" ON fee_payments
  FOR ALL TO authenticated USING (
    get_user_role() IN ('teacher','school_admin') AND is_school_member(get_user_school_id())
  ) WITH CHECK (
    get_user_role() IN ('teacher','school_admin') AND is_school_member(get_user_school_id())
  );

CREATE TRIGGER trg_fp_updated_at BEFORE UPDATE ON fee_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────────────────────
-- 11. audit_logs (application-level audit trail)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid,
  action      text NOT NULL,
  entity      text NOT NULL,
  entity_id   text,
  details     text,
  ip_address  text,
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity, entity_id);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to audit_logs" ON audit_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "School admins read audit_logs" ON audit_logs
  FOR SELECT TO authenticated USING (
    get_user_role() = 'school_admin' AND is_school_member(get_user_school_id())
  );
CREATE POLICY "Super admins read all audit_logs" ON audit_logs
  FOR SELECT TO authenticated USING (is_super_admin());
CREATE POLICY "Authenticated can insert audit_logs" ON audit_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- ──────────────────────────────────────────────────────────────
-- 12. integrations (school third-party connections)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS integrations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name         text NOT NULL,
      -- google_workspace | ms365 | whatsapp | sms | payment_gateway
  type         text NOT NULL,
      -- oauth | api_key | webhook
  status       text NOT NULL DEFAULT 'disconnected',
      -- connected | disconnected | error
  config       text,
  last_sync_at timestamptz,
  error        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_integrations_school ON integrations(school_id);

ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to integrations" ON integrations
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "School admins manage integrations" ON integrations
  FOR ALL TO authenticated USING (
    get_user_role() = 'school_admin' AND is_school_member(school_id)
  ) WITH CHECK (
    get_user_role() = 'school_admin' AND is_school_member(school_id)
  );

CREATE TRIGGER trg_integrations_updated_at BEFORE UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────────────────────
-- 13. school_settings (key/value school configuration)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS school_settings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  key         text NOT NULL,
  value       text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT school_settings_unique UNIQUE (school_id, key)
);

ALTER TABLE school_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to school_settings" ON school_settings
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "School members read school_settings" ON school_settings
  FOR SELECT TO authenticated USING (is_school_member(school_id));
CREATE POLICY "School admins manage school_settings" ON school_settings
  FOR ALL TO authenticated USING (
    get_user_role() = 'school_admin' AND is_school_member(school_id)
  ) WITH CHECK (
    get_user_role() = 'school_admin' AND is_school_member(school_id)
  );

CREATE TRIGGER trg_ss_updated_at BEFORE UPDATE ON school_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────────────────────
-- 14. messages (direct messaging)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id       uuid,
  subject         text,
  content         text NOT NULL,
  parent_id       uuid,
      -- threading: references another message id
  is_read         boolean NOT NULL DEFAULT false,
  attachment_url  text,
  attachment_name text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_parent ON messages(parent_id);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to messages" ON messages
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Users access own messages" ON messages
  FOR ALL TO authenticated USING (sender_id = auth.uid() OR recipient_id = auth.uid())
  WITH CHECK (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE TRIGGER trg_messages_updated_at BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────────────────────
-- 15. role_permissions (RBAC matrix)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS role_permissions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role        text NOT NULL,
      -- student | parent | teacher | school_admin | super_admin
  resource    text NOT NULL,
  action      text NOT NULL,
      -- read | create | update | delete | manage
  is_allowed  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT role_permissions_unique UNIQUE (role, resource, action)
);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to role_permissions" ON role_permissions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated read role_permissions" ON role_permissions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admins manage role_permissions" ON role_permissions
  FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE TRIGGER trg_rp_updated_at BEFORE UPDATE ON role_permissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed sensible RBAC defaults
INSERT INTO role_permissions (role, resource, action, is_allowed) VALUES
  ('super_admin','users','manage',true),
  ('super_admin','schools','manage',true),
  ('super_admin','exams','manage',true),
  ('super_admin','reports','read',true),
  ('super_admin','settings','manage',true),
  ('school_admin','users','read',true),
  ('school_admin','users','create',true),
  ('school_admin','users','update',true),
  ('school_admin','users','delete',true),
  ('school_admin','exams','manage',true),
  ('school_admin','fees','manage',true),
  ('school_admin','reports','read',true),
  ('school_admin','settings','manage',true),
  ('school_admin','audit','read',true),
  ('teacher','exams','create',true),
  ('teacher','exams','update',true),
  ('teacher','exams','read',true),
  ('teacher','questions','create',true),
  ('teacher','grading','manage',true),
  ('teacher','attendance','manage',true),
  ('teacher','students','read',true),
  ('teacher','reports','read',true),
  ('parent','children','read',true),
  ('parent','results','read',true),
  ('parent','attendance','read',true),
  ('parent','fees','read',true),
  ('parent','messages','create',true),
  ('student','exams','read',true),
  ('student','results','read',true),
  ('student','practice','create',true),
  ('student','messages','create',true)
ON CONFLICT (role, resource, action) DO NOTHING;

-- ──────────────────────────────────────────────────────────────
-- 16. lesson_plans / worksheets / rubrics (teacher toolkit)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lesson_plans (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id    uuid,
  subject      text NOT NULL,
  topic        text NOT NULL,
  class_name   text NOT NULL,
  duration     integer NOT NULL DEFAULT 40,
  objectives   text NOT NULL,
      -- JSON array of strings
  materials    text NOT NULL,
      -- JSON array of strings
  activities   text NOT NULL,
      -- JSON array of {name,duration,description}
  assessment   text,
      -- JSON array of strings
  scheduled_at timestamptz,
  status       text NOT NULL DEFAULT 'draft',
      -- draft | scheduled | completed
  notes        text,
  is_shared    boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lp_teacher ON lesson_plans(teacher_id);

ALTER TABLE lesson_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to lesson_plans" ON lesson_plans
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Teachers manage own lesson_plans" ON lesson_plans
  FOR ALL TO authenticated USING (
    teacher_id = auth.uid()
    OR (is_shared AND is_school_member(school_id))
    OR (get_user_role() = 'school_admin' AND is_school_member(school_id))
  ) WITH CHECK (teacher_id = auth.uid());

CREATE TRIGGER trg_lp_updated_at BEFORE UPDATE ON lesson_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS worksheets (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id      uuid,
  title          text NOT NULL,
  subject        text NOT NULL,
  instructions   text,
  questions      text NOT NULL,
      -- JSON array of question objects
  header_config  text,
      -- JSON {schoolName, studentInfoFields[]}
  difficulty     text NOT NULL DEFAULT 'medium',
      -- easy | medium | hard
  spacing        text NOT NULL DEFAULT 'normal',
      -- compact | normal | generous
  is_template    boolean NOT NULL DEFAULT false,
  template_name  text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ws_teacher ON worksheets(teacher_id);

ALTER TABLE worksheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to worksheets" ON worksheets
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Teachers manage own worksheets" ON worksheets
  FOR ALL TO authenticated USING (
    teacher_id = auth.uid()
    OR (get_user_role() = 'school_admin' AND is_school_member(school_id))
  ) WITH CHECK (teacher_id = auth.uid());

CREATE TRIGGER trg_ws_updated_at BEFORE UPDATE ON worksheets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS rubrics (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school_id          uuid,
  title              text NOT NULL,
  subject            text,
  topic              text,
  assessment_type    text NOT NULL DEFAULT 'essay',
      -- essay | project | presentation | lab_report | group_work
  criteria           text NOT NULL,
      -- JSON array of {id,name,description}
  performance_levels text NOT NULL,
      -- JSON array of {id,name,points}
  cells              text NOT NULL,
      -- JSON 2D array of {criteriaId,levelId,description,points}
  total_points       integer NOT NULL DEFAULT 0,
  is_template        boolean NOT NULL DEFAULT false,
  exam_id            uuid,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rubrics_teacher ON rubrics(teacher_id);

ALTER TABLE rubrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to rubrics" ON rubrics
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Teachers manage own rubrics" ON rubrics
  FOR ALL TO authenticated USING (
    teacher_id = auth.uid()
    OR (get_user_role() = 'school_admin' AND is_school_member(school_id))
  ) WITH CHECK (teacher_id = auth.uid());

CREATE TRIGGER trg_rubrics_updated_at BEFORE UPDATE ON rubrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────────────────────────────
-- 17. Rebuild PostgREST schema cache
-- ──────────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
