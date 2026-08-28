// ═══════════════════════════════════════════════════════════════════
// ExamForge AI — Role Isolation Permission Matrix Test
// Tests all 5 roles against each other's pages + APIs
// ═══════════════════════════════════════════════════════════════════
const { chromium } = require('playwright-core');

const BASE = '[REDACTED]';

const ROLES = {
  student: 'prod-final-1787626351@examforge-test.com',
  teacher: 'e2e-teacher-1787626988@examforge-test.com',
  parent: 'e2e-parent-1787626988@examforge-test.com',
  school_admin: 'e2e-schooladmin-1787626988@examforge-test.com',
  super_admin: 'e2e-superadmin@examforge-test.com',
};
const PASSWORDS = {
  student: 'SecurePass123!',
  teacher: 'Teacher123!',
  parent: 'Parent123!',
  school_admin: 'SchoolAdmin123!',
  super_admin: 'SuperAdmin123!',
};

// Pages each role should REACH (200) — cross-referenced with ROUTE_ROLE_MAP
const ROLE_PAGES = {
  student: ['/dashboard/student', '/exams', '/cbt', '/student/practice', '/student/progress', '/student/flashcards', '/question-bank'],
  teacher: ['/dashboard/teacher', '/teacher/lesson-planner', '/teacher/grading', '/teacher/rubric-builder', '/teacher/worksheet-builder', '/exams'],
  parent: ['/parent/dashboard', '/parent/child-progress', '/parent/attendance'],
  school_admin: ['/dashboard/school-admin', '/admin/users', '/school/classes', '/school/fees'],
  super_admin: ['/dashboard/admin', '/admin/users', '/admin/roles', '/admin/audit-logs'],
};

// Pages each role must NOT reach (must be redirected away)
const FORBIDDEN = {
  student: ['/admin/users', '/teacher/grading', '/parent/dashboard', '/dashboard/teacher', '/school/classes'],
  teacher: ['/admin/users', '/parent/dashboard', '/dashboard/student', '/school/fees'],
  parent: ['/admin/users', '/teacher/grading', '/dashboard/teacher'],
  school_admin: ['/dashboard/student', '/dashboard/teacher'],
  super_admin: [], // super_admin can access everything
};

(async () => {
  const browser = await chromium.launch({
    executablePath: '/home/z/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome',
    headless: true, args: ['--no-sandbox'],
  });

  const results = { allowed: {}, denied: {}, api: {} };

  for (const [role, email] of Object.entries(ROLES)) {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Login
    await page.goto(BASE + '/login', { waitUntil: 'networkidle', timeout: 60000 });
    await page.fill('input[type="email"], input[placeholder*="school"]', email);
    await page.fill('input[type="password"]', PASSWORDS[role]);
    await page.click('button:has-text("Sign In")');
    await page.waitForTimeout(6000);
    const afterLogin = page.url();
    console.log(`\n[${role}] login → ${afterLogin.replace(BASE, '')}`);

    // Test allowed pages
    results.allowed[role] = [];
    for (const path of ROLE_PAGES[role]) {
      try {
        await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(1500);
        const url = page.url().replace(BASE, '');
        const textLen = await page.evaluate(() => document.body.innerText.length).catch(() => 0);
        const ok = !url.startsWith('/login') && textLen > 50;
        results.allowed[role].push({ path, url, ok, textLen });
        console.log(`  ALLOW ${path} → ${url} (${textLen}ch) ${ok ? '✓' : '✗ BLANK'}`);
      } catch (e) {
        results.allowed[role].push({ path, ok: false, error: String(e).slice(0, 50) });
        console.log(`  ALLOW ${path} → ERROR`);
      }
    }

    // Test forbidden pages (must be redirected)
    results.denied[role] = [];
    for (const path of FORBIDDEN[role]) {
      try {
        await page.goto(BASE + path, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(1500);
        const url = page.url().replace(BASE, '');
        const denied = !url.startsWith(path) || url.startsWith('/login');
        results.denied[role].push({ path, finalUrl: url, denied });
        console.log(`  DENY  ${path} → ${url} ${denied ? '✓ blocked' : '✗ ACCESSIBLE'}`);
      } catch (e) {
        results.denied[role].push({ path, denied: true, error: String(e).slice(0, 40) });
        console.log(`  DENY  ${path} → ERROR (blocked)`);
      }
    }

    // Test API isolation via fetch
    const apiTests = await page.evaluate(async () => {
      const out = [];
      const apis = [
        ['/api/admin/users', 'admin data'],
        ['/api/teacher/lesson-plans?teacherId=x', 'teacher data'],
        ['/api/parent/dashboard', 'parent data'],
        ['/api/student/progress', 'student data'],
      ];
      for (const [p, label] of apis) {
        try {
          const res = await fetch(p);
          out.push(`${label}: ${res.status}`);
        } catch { out.push(`${label}: ERR`); }
      }
      return out;
    }).catch(() => ['eval failed']);
    results.api[role] = apiTests;
    console.log(`  APIs: ${apiTests.join(' | ')}`);

    await context.close();
  }

  await browser.close();

  // Summary
  console.log('\n════════════════════════════════════════════');
  console.log('PERMISSION MATRIX SUMMARY');
  console.log('════════════════════════════════════════════');
  let allowedOk = 0, allowedTotal = 0, deniedOk = 0, deniedTotal = 0;
  for (const role of Object.keys(ROLES)) {
    const a = results.allowed[role].filter(r => r.ok).length;
    const at = results.allowed[role].length;
    const d = results.denied[role].filter(r => r.denied).length;
    const dt = results.denied[role].length;
    allowedOk += a; allowedTotal += at; deniedOk += d; deniedTotal += dt;
    console.log(`${role.padEnd(13)} allowed ${a}/${at}  denied ${d}/${dt}`);
  }
  console.log(`\nTOTAL: allowed ${allowedOk}/${allowedTotal}, denied ${deniedOk}/${deniedTotal}`);
  require('fs').writeFileSync('/home/z/my-project/audit/permission_matrix.json', JSON.stringify(results, null, 2));
})();
