import { createServiceClient } from '@/lib/supabase/service'
import { NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/require-auth'

// ============================================================================
// ExamForge AI — Database Seed (Demo Data)
// ============================================================================
// Supabase-only version (2026-08-25). Populates demo data for all modules.
// SECURITY: Requires super_admin auth; disabled in production.
// ============================================================================

export async function GET() {
  // SECURITY: Block seed endpoint in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Seed endpoint disabled in production' }, { status: 403 })
  }

  // SECURITY: Require super_admin authentication
  const authResult = await getAuthUser()
  if (!authResult) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (authResult.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden — super_admin only' }, { status: 403 })
  }

  const supabase = createServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  try {
    // Check if already seeded
    const { count: existingSchools } = await supabase
      .from('schools')
      .select('id', { count: 'exact', head: true })
    if ((existingSchools ?? 0) > 0) {
      return NextResponse.json({ message: 'Database already seeded', skipped: true })
    }

    // ── 1. Create Schools ──
    const { data: schools, error: schoolsError } = await supabase
      .from('schools')
      .insert([
        {
          name: 'Greenfield International School', code: 'GIS-001', motto: 'Excellence in Education',
          primary_color: '#10b981', secondary_color: '#059669', address: '123 Education Lane',
          city: 'Lagos', country: 'Nigeria', phone: '+234-801-234-5678', email: 'info@greenfield.edu',
          is_active: true,
        },
        {
          name: 'Sunrise Academy', code: 'SUN-002', motto: "Building Tomorrow's Leaders",
          primary_color: '#f59e0b', secondary_color: '#d97706', address: '456 Learning Drive',
          city: 'Abuja', country: 'Nigeria', phone: '+234-802-345-6789', email: 'info@sunriseacademy.edu',
          is_active: true,
        },
      ])
      .select('id, name')
    if (schoolsError) throw new Error(schoolsError.message)

    const school1 = schools[0]
    const school2 = schools[1]

    // ── 2. Create Users ──
    // public.users.id is a FK to auth.users.id — each user needs a matching
    // auth user created via the admin API first, then the profile upsert.
    const insertedUsers: Array<{ id: string; email: string; role: string }> = []
    const createdAuthIds: string[] = []

    const makeUser = async (row: Record<string, unknown>) => {
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: row.email as string,
        password: `Ef-Seed-${crypto.randomUUID()}!`,
        email_confirm: true,
        user_metadata: { full_name: row.full_name, role: row.role },
      })
      if (authError || !authUser.user) {
        throw new Error(`Auth user creation failed for ${row.email}: ${authError?.message}`)
      }
      createdAuthIds.push(authUser.user.id)

      const { data, error } = await supabase
        .from('users')
        .upsert(
          { id: authUser.user.id, ...row },
          { onConflict: 'id' }
        )
        .select('id, email, role')
        .single()
      if (error) throw new Error(`Profile upsert failed for ${row.email}: ${error.message}`)
      insertedUsers.push(data)
    }

    const userSpecs: Array<Record<string, unknown>> = [
      { email: 'superadmin@examforge.ai', full_name: 'Platform Admin', role: 'super_admin', is_active: true, is_email_verified: true },
      { email: 'admin@greenfield.edu', full_name: 'Grace Okonkwo', role: 'school_admin', school_id: school1.id, is_active: true, is_email_verified: true, phone: '+234-803-111-2222' },
      { email: 'admin@sunriseacademy.edu', full_name: 'David Adebayo', role: 'school_admin', school_id: school2.id, is_active: true, is_email_verified: true },
    ]
    const teacherNames = ['Chidinma Okafor', 'Emeka Nwosu', 'Fatima Bello', 'Tunde Bakare', 'Amina Yusuf']
    teacherNames.forEach((name, i) => {
      userSpecs.push({
        email: `teacher${i + 1}@greenfield.edu`, full_name: `${i % 2 === 0 ? 'Mrs.' : 'Mr.'} ${name}`,
        role: 'teacher', school_id: school1.id, is_active: true, is_email_verified: true,
      })
    })
    const parentNames = ['Chief Obi Nwankwo', 'Halima Sani', 'Kunle Adeyemi', 'Ngozi Eze', 'Bola Tinubu']
    parentNames.forEach((name, i) => {
      userSpecs.push({
        email: `parent${i + 1}@greenfield.edu`, full_name: i === 0 ? name : `Mrs. ${name}`,
        role: 'parent', school_id: school1.id, is_active: true, is_email_verified: true,
        phone: `+234-80${4 + i}-555-${1000 + i}`,
      })
    })
    const studentNames = ['Ada Nwankwo', 'Ahmad Sani', 'Femi Adeyemi', 'Chidera Eze', 'Zainab Tinubu', 'Emeka Obi', 'Aisha Bello', 'Chidi Okafor', 'Nneka Ibe', 'Tobi Bakare']
    studentNames.forEach((name, i) => {
      userSpecs.push({
        email: `student${i + 1}@greenfield.edu`, full_name: name,
        role: 'student', school_id: school1.id, is_active: true, is_email_verified: true,
      })
    })
    userSpecs.push({ email: 'inactive@greenfield.edu', full_name: 'Deactivated User', role: 'teacher', school_id: school1.id, is_active: false })

    for (const spec of userSpecs) {
      await makeUser(spec)
    }

    const byEmail = new Map(insertedUsers.map(u => [u.email as string, u]))
    const teachers = insertedUsers.filter(u => (u.role as string) === 'teacher' && (u.email as string).startsWith('teacher'))
    const parents = insertedUsers.filter(u => (u.role as string) === 'parent')
    const students = insertedUsers.filter(u => (u.role as string) === 'student')
    const admin1 = byEmail.get('admin@greenfield.edu')!
    const superAdmin = byEmail.get('superadmin@examforge.ai')!

    // ── 3. Create Classes ──
    const classData = [
      { name: 'JSS 1A', grade_level: 'JSS 1' }, { name: 'JSS 1B', grade_level: 'JSS 1' },
      { name: 'JSS 2A', grade_level: 'JSS 2' }, { name: 'SS 1A', grade_level: 'SS 1' },
      { name: 'SS 2A', grade_level: 'SS 2' },
    ]
    const { data: classes, error: classesError } = await supabase
      .from('classes')
      .insert(classData.map(cd => ({ ...cd, school_id: school1.id, academic_year: '2024/2025', capacity: 40 })))
      .select('id, name')
    if (classesError) throw new Error(classesError.message)

    // ── 4. Create Subjects ──
    const subjectData = [
      { name: 'Mathematics', code: 'MTH', category: 'Science' },
      { name: 'English Language', code: 'ENG', category: 'Arts' },
      { name: 'Basic Science', code: 'BSC', category: 'Science' },
      { name: 'Social Studies', code: 'SST', category: 'Arts' },
      { name: 'Physics', code: 'PHY', category: 'Science' },
      { name: 'Chemistry', code: 'CHM', category: 'Science' },
      { name: 'Biology', code: 'BIO', category: 'Science' },
      { name: 'Computer Studies', code: 'CST', category: 'Science' },
    ]
    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .insert(subjectData.map(sd => ({ ...sd, school_id: school1.id, is_active: true })))
      .select('id, name')
    if (subjectsError) throw new Error(subjectsError.message)

    // ── 5. Enroll students in classes ──
    const enrollments: Array<Record<string, unknown>> = []
    for (let i = 0; i < Math.min(students.length, classes.length); i++) {
      enrollments.push({ class_id: classes[i % classes.length].id, student_id: students[i].id })
      if (i + 5 < students.length) {
        enrollments.push({ class_id: classes[i % classes.length].id, student_id: students[i + 5].id })
      }
    }
    const { error: enrollError } = await supabase.from('class_students').insert(enrollments)
    if (enrollError) throw new Error(enrollError.message)

    // ── 6. Assign teachers to classes and subjects ──
    const classTeacherRows: Array<Record<string, unknown>> = []
    const subjectTeacherRows: Array<Record<string, unknown>> = []
    for (let i = 0; i < Math.min(teachers.length, subjects.length); i++) {
      classTeacherRows.push({ class_id: classes[i % classes.length].id, teacher_id: teachers[i].id })
      subjectTeacherRows.push({ subject_id: subjects[i].id, teacher_id: teachers[i].id, class_id: classes[i % classes.length].id })
    }
    await supabase.from('class_teachers').insert(classTeacherRows)
    await supabase.from('subject_teachers').insert(subjectTeacherRows)

    // ── 7. Parent-Child relationships ──
    const parentChildRows: Array<Record<string, unknown>> = []
    for (let i = 0; i < Math.min(parents.length, students.length); i++) {
      parentChildRows.push({ parent_id: parents[i].id, child_id: students[i].id, relationship: i === 2 ? 'guardian' : 'parent' })
    }
    if (parents[0] && students[5]) {
      parentChildRows.push({ parent_id: parents[0].id, child_id: students[5].id, relationship: 'parent' })
    }
    await supabase.from('parent_children').insert(parentChildRows)

    // ── 8. Create Exams ──
    const now = new Date()
    const day = 24 * 60 * 60 * 1000
    const examData = [
      { title: 'Mathematics Mid-Term Test', subject_idx: 0, class_idx: 0, total_marks: 50, time_limit: 60, status: 'completed', start_offset: -14 },
      { title: 'English Continuous Assessment', subject_idx: 1, class_idx: 0, total_marks: 40, time_limit: 45, status: 'completed', start_offset: -10 },
      { title: 'Basic Science Quiz', subject_idx: 2, class_idx: 1, total_marks: 30, time_limit: 30, status: 'completed', start_offset: -7 },
      { title: 'Mathematics Final Exam', subject_idx: 0, class_idx: 0, total_marks: 100, time_limit: 120, status: 'published', start_offset: 7 },
      { title: 'Physics Mid-Term', subject_idx: 4, class_idx: 3, total_marks: 60, time_limit: 90, status: 'draft', start_offset: 14 },
    ]
    const examInserts = examData.map(ed => ({
      title: ed.title,
      subject_id: subjects[ed.subject_idx].id,
      class_id: classes[ed.class_idx].id,
      school_id: school1.id,
      created_by: admin1.id,
      exam_type: 'school_exam',
      total_marks: ed.total_marks,
      time_limit_minutes: ed.time_limit,
      status: ed.status,
      allowed_attempts: 1,
      start_time: new Date(now.getTime() + ed.start_offset * day).toISOString(),
      end_time: new Date(now.getTime() + (ed.start_offset + 1) * day).toISOString(),
      pass_mark: Math.round(ed.total_marks * 0.5),
    }))
    const { data: exams, error: examsError } = await supabase
      .from('exams')
      .insert(examInserts)
      .select('id, title, total_marks')
    if (examsError) throw new Error(examsError.message)

    // ── 9. Exam results (for completed exams) ──
    const completedExams = exams.filter((_, i) => examData[i].status === 'completed')
    const resultRows: Array<Record<string, unknown>> = []
    for (const exam of completedExams) {
      for (let i = 0; i < Math.min(students.length, 6); i++) {
        const percentage = 45 + ((i * 13 + exam.title.length) % 50)
        const totalMarks = exam.total_marks as number
        resultRows.push({
          exam_id: exam.id,
          student_id: students[i].id,
          total_marks: Math.round((percentage / 100) * totalMarks * 10) / 10,
          total_possible: totalMarks,
          score_percentage: percentage,
          grade: percentage >= 80 ? 'A' : percentage >= 70 ? 'B' : percentage >= 60 ? 'C' : percentage >= 50 ? 'D' : 'F',
          is_passed: percentage >= 50,
          grading_status: 'graded',
        })
      }
    }
    await supabase.from('exam_results').insert(resultRows)

    // ── 10. Fees and payments ──
    const { data: fees, error: feesError } = await supabase
      .from('fees')
      .insert([
        { school_id: school1.id, name: 'Tuition Fee', amount: 150000, fee_type: 'tuition', term: 'Term 1', academic_session: '2024/2025', is_active: true },
        { school_id: school1.id, name: 'Exam Fee', amount: 15000, fee_type: 'exam', term: 'Term 1', academic_session: '2024/2025', is_active: true },
        { school_id: school2.id, name: 'Tuition Fee', amount: 120000, fee_type: 'tuition', term: 'Term 1', academic_session: '2024/2025', is_active: true },
      ])
      .select('id, name')
    if (feesError) throw new Error(feesError.message)

    const tuitionFee = fees[0]
    const paymentRows: Array<Record<string, unknown>> = []
    for (let i = 0; i < students.length; i++) {
      paymentRows.push({
        fee_id: tuitionFee.id,
        student_id: students[i].id,
        amount: 150000,
        status: i < 6 ? 'paid' : i < 8 ? 'pending' : 'overdue',
        payment_method: i < 6 ? 'transfer' : null,
        paid_at: i < 6 ? new Date(now.getTime() - 2 * day).toISOString() : null,
        due_date: new Date(now.getTime() + 7 * day).toISOString(),
      })
    }
    await supabase.from('fee_payments').insert(paymentRows)

    // ── 11. Attendance (last 10 school days) ──
    const attendanceRows: Array<Record<string, unknown>> = []
    for (let d = 0; d < 10; d++) {
      const date = new Date(now.getTime() - d * day)
      if (date.getDay() === 0 || date.getDay() === 6) continue // skip weekends
      for (let i = 0; i < Math.min(students.length, 8); i++) {
        const statusRoll = (i + d) % 10
        attendanceRows.push({
          student_id: students[i].id,
          class_id: classes[0].id,
          date: date.toISOString().split('T')[0],
          status: statusRoll === 3 ? 'absent' : statusRoll === 7 ? 'late' : 'present',
          marked_by: teachers[i % teachers.length].id,
        })
      }
    }
    await supabase.from('attendance').insert(attendanceRows)

    // ── 12. Messages ──
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .insert([
        { sender_id: admin1.id, recipient_id: parents[0].id, school_id: school1.id, subject: 'Welcome to ExamForge', content: 'Welcome to ExamForge AI! We are excited to have your child at Greenfield International School.', is_read: false },
        { sender_id: teachers[0].id, recipient_id: parents[1].id, school_id: school1.id, subject: 'Mathematics Update', content: 'Your child is making great progress in Mathematics. Keep encouraging practice at home.', is_read: false },
        { sender_id: admin1.id, recipient_id: teachers[0].id, school_id: school1.id, subject: 'Staff Meeting', content: 'Reminder: Staff meeting every Monday at 8:00 AM in the conference room.', is_read: true },
      ])
      .select('id')
    if (messagesError) throw new Error(messagesError.message)

    // ── 13. Notifications ──
    const notificationRows: Array<Record<string, unknown>> = []
    for (const student of students.slice(0, 5)) {
      notificationRows.push({
        user_id: student.id,
        type: 'exam',
        title: 'Exam Published',
        message: 'Mathematics Final Exam is now available. Check your exam schedule.',
        is_read: false,
        category: 'exam',
        priority: 'normal',
        body: 'Mathematics Final Exam is now available.',
        delivery_status: 'delivered',
      })
    }
    notificationRows.push({
      user_id: admin1.id,
      type: 'system',
      title: 'Welcome to ExamForge AI',
      message: 'Your school workspace is ready. Explore the dashboard to get started.',
      is_read: false,
      category: 'system',
      priority: 'normal',
      body: 'Your school workspace is ready.',
      delivery_status: 'delivered',
    })
    await supabase.from('notifications').insert(notificationRows)

    // ── 14. Integrations ──
    await supabase.from('integrations').insert([
      { school_id: school1.id, name: 'google_workspace', type: 'oauth', status: 'disconnected' },
      { school_id: school1.id, name: 'payment_gateway', type: 'api_key', status: 'connected', config: JSON.stringify({ provider: 'flutterwave' }), last_sync_at: new Date(now.getTime() - day).toISOString() },
      { school_id: school2.id, name: 'whatsapp', type: 'webhook', status: 'disconnected' },
    ])

    // ── 15. School settings ──
    await supabase.from('school_settings').insert([
      { school_id: school1.id, key: 'logo_url', value: '' },
      { school_id: school1.id, key: 'email_template_welcome', value: 'Welcome to Greenfield International School!' },
      { school_id: school1.id, key: 'grading_scale', value: JSON.stringify({ A: 80, B: 70, C: 60, D: 50, F: 0 }) },
    ])

    // ── 16. Audit logs ──
    await supabase.from('audit_logs').insert([
      { user_id: superAdmin.id, action: 'seed', entity: 'database', entity_id: school1.id, details: JSON.stringify({ action: 'seed_database' }), ip_address: '127.0.0.1', user_agent: 'seed-script' },
      { user_id: admin1.id, action: 'create', entity: 'school', entity_id: school1.id, details: JSON.stringify({ name: 'Greenfield International School' }), ip_address: '127.0.0.1', user_agent: 'seed-script' },
    ])

    return NextResponse.json({
      message: 'Database seeded successfully',
      summary: {
        schools: 2,
        users: insertedUsers.length,
        classes: classes.length,
        subjects: subjects.length,
        exams: exams.length,
        results: resultRows.length,
        fees: fees.length,
        feePayments: paymentRows.length,
        attendanceRecords: attendanceRows.length,
        messages: messages?.length ?? 0,
        notifications: notificationRows.length,
      },
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Seeding failed' },
      { status: 500 }
    )
  }
}
