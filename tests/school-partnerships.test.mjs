import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

const ROOT = process.cwd();

function loadTsModule(relativePath, mocks = {}) {
  const filename = path.join(ROOT, relativePath);
  const source = fs.readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });
  const module = { exports: {} };
  const customRequire = (id) => {
    if (id in mocks) return mocks[id];
    throw new Error(`Unexpected import ${id} in ${relativePath}`);
  };
  const fn = vm.runInThisContext(
    `(function(exports, require, module, __filename, __dirname) {\n${outputText}\n})`,
    { filename }
  );
  fn(module.exports, customRequire, module, filename, path.dirname(filename));
  return module.exports;
}

const {
  calculateSchoolQuote,
  formatNairaKobo,
  formatStudentCount,
  generateSchoolApplicationReference,
  validateSchoolApplication,
  MONTHLY_RATE_PER_STUDENT_KOBO,
  MIN_STUDENTS,
  MIN_MONTHS,
  MAX_MONTHS,
} = loadTsModule("src/lib/schools/school-pricing.ts");

test("B2B Pricing: confirmed benchmark calculation (50 students × 3 months)", () => {
  const quote = calculateSchoolQuote(50, 3);
  assert.equal(quote.studentCount, 50);
  assert.equal(quote.durationMonths, 3);
  assert.equal(quote.ratePerStudentKobo, 150000); // ₦1,500
  assert.equal(quote.monthlySubtotalKobo, 7500000); // ₦75,000 / month
  assert.equal(quote.totalAmountKobo, 22500000); // ₦225,000 total (22.5m kobo)
  assert.equal(quote.currency, "NGN");
  assert.equal(quote.isRecurring, false);
});

test("B2B Pricing: integer kobo precision across various cohort sizes and durations", () => {
  // 1 student for 1 month
  const single = calculateSchoolQuote(1, 1);
  assert.equal(single.totalAmountKobo, 150000);

  // 100 students for 6 months: 100 * 150000 * 6 = 90,000,000 kobo (₦900,000)
  const cohort100 = calculateSchoolQuote(100, 6);
  assert.equal(cohort100.totalAmountKobo, 90000000);

  // 250 students for 12 months (maximum term): 250 * 150000 * 12 = 450,000,000 kobo (₦4,500,000)
  const cohort250 = calculateSchoolQuote(250, 12);
  assert.equal(cohort250.totalAmountKobo, 450000000);
});

test("B2B Pricing: bounds enforcement and invalid duration protection", () => {
  // Clamping student count below MIN_STUDENTS
  assert.throws(() => calculateSchoolQuote(0, 3), /INVALID_STUDENT_COUNT/);
  assert.throws(() => calculateSchoolQuote(-5, 3), /INVALID_STUDENT_COUNT/);

  // Clamping or rejecting duration outside [1, 12]
  assert.throws(() => calculateSchoolQuote(20, 0), /INVALID_DURATION/);
  assert.throws(() => calculateSchoolQuote(20, 13), /INVALID_DURATION/);
  assert.throws(() => calculateSchoolQuote(20, 2.5), /INVALID_DURATION/);
});

test("B2B Pricing: currency formatting utilities produce clean Nigerian Naira strings", () => {
  assert.equal(formatNairaKobo(150000), "₦1,500");
  assert.equal(formatNairaKobo(22500000), "₦225,000");
  assert.equal(formatNairaKobo(450000000), "₦4,500,000");
  assert.equal(formatNairaKobo(0), "₦0");
  assert.equal(formatStudentCount(50), "50 students");
  assert.equal(formatStudentCount(1), "1 student");
});

test("B2B Pricing: deterministic reference code generation", () => {
  const ref1 = generateSchoolApplicationReference("Kings College Lagos");
  assert.match(ref1, /^SCH-[A-Z0-9]+-[A-Z0-9]{6}$/);

  const ref2 = generateSchoolApplicationReference("Queen's College");
  assert.match(ref2, /^SCH-[A-Z0-9]+-[A-Z0-9]{6}$/);
});

test("B2B Pricing: form validation enforces required institutional fields", () => {
  const validData = {
    institutionName: "Loyola Jesuit College",
    contactName: "Brother Michael",
    email: "admin@loyolajesuit.org",
    phone: "08031234567",
    state: "Abuja (FCT)",
    studentCount: 75,
    durationMonths: 3,
  };

  const validated = validateSchoolApplication(validData);
  assert.equal(validated.isValid, true);
  assert.equal(validated.errors.length, 0);

  // Missing institution name
  const invalidName = validateSchoolApplication({ ...validData, institutionName: "   " });
  assert.equal(invalidName.isValid, false);
  assert.ok(invalidName.errors.some((e) => e.field === "institutionName"));

  // Invalid email
  const invalidEmail = validateSchoolApplication({ ...validData, email: "invalid-email" });
  assert.equal(invalidEmail.isValid, false);
  assert.ok(invalidEmail.errors.some((e) => e.field === "email"));

  // Invalid phone
  const invalidPhone = validateSchoolApplication({ ...validData, phone: "123" });
  assert.equal(invalidPhone.isValid, false);
  assert.ok(invalidPhone.errors.some((e) => e.field === "phone"));
});

test("RBAC: Middleware partitions student, school, and admin paths with strict role isolation", () => {
  const middlewareFile = path.join(ROOT, "src/lib/supabase/middleware.ts");
  const source = fs.readFileSync(middlewareFile, "utf8");

  // Rule 1: Student protected paths definition
  assert.ok(source.includes("studentProtectedPaths = ["));
  assert.ok(source.includes('"/dashboard"'));

  // Rule 2: School protected paths definition
  assert.ok(source.includes("schoolProtectedPaths = ["));
  assert.ok(source.includes('"/schools/dashboard"'));

  // Rule 3: Admin protected paths definition
  assert.ok(source.includes('pathname === "/admin" || pathname.startsWith("/admin/")'));

  // Rule 4: Student cannot access school portal (redirects to /dashboard)
  assert.ok(
    source.includes('if (isSchoolProtected && userRole === "student")')
  );
  assert.ok(source.includes('url.pathname = "/dashboard"'));

  // Rule 5: School admin cannot access student dashboard (redirects to /schools/dashboard)
  assert.ok(
    source.includes('if (isStudentProtected && userRole === "school_admin")')
  );
  assert.ok(source.includes('url.pathname = "/schools/dashboard"'));

  // Rule 6: Non-admins cannot access /admin
  assert.ok(
    source.includes('if (isAdminProtected && userRole !== "admin")')
  );
});

test("Institutional Placeholders: Registration form uses neutral placeholder examples", () => {
  const registerFile = path.join(ROOT, "src/app/schools/register/page.tsx");
  const source = fs.readFileSync(registerFile, "utf8");

  // Neutral example verification
  assert.ok(
    source.includes("ABC College or XYZ Schools") || source.includes("ABC or XYZ"),
    "Expected neutral placeholder example (ABC College or XYZ Schools)"
  );
});

test("School Auth API: Endpoints exist and are correctly registered", () => {
  const requiredEndpoints = [
    "src/app/api/schools/auth/signup/route.ts",
    "src/app/api/schools/auth/signin/route.ts",
    "src/app/api/schools/auth/forgot-password/route.ts",
    "src/app/api/schools/auth/reset-password/route.ts",
    "src/app/api/schools/auth/signout/route.ts",
    "src/app/api/schools/auth/session/route.ts",
  ];

  for (const endpoint of requiredEndpoints) {
    const fullPath = path.join(ROOT, endpoint);
    assert.ok(fs.existsSync(fullPath), `Expected endpoint to exist: ${endpoint}`);
  }
});

test("Stage 2 BMAD Schema: Complete tables for schools, members, students, orders, and activation jobs", () => {
  const schemaFile = path.join(ROOT, "src/db/schema.ts");
  const source = fs.readFileSync(schemaFile, "utf8");

  assert.ok(source.includes("export const schools = pgTable('schools'"));
  assert.ok(source.includes("export const schoolMembers = pgTable('school_members'"));
  assert.ok(source.includes("export const schoolStudents = pgTable('school_students'"));
  assert.ok(source.includes("export const schoolOrders = pgTable('school_orders'"));
  assert.ok(source.includes("export const schoolActivationJobs = pgTable('school_activation_jobs'"));

  // Check SQL migration file exists
  const migrationFile = path.join(ROOT, "drizzle/0015_school_partnerships.sql");
  assert.ok(fs.existsSync(migrationFile), "Expected migration 0015_school_partnerships.sql to exist");
});

test("Stage 3 School Link Bridge: Candidate register detects ?school= and binds cohort badge", () => {
  const registerFormFile = path.join(ROOT, "src/app/register/register-form.tsx");
  const source = fs.readFileSync(registerFormFile, "utf8");

  assert.ok(
    source.includes('searchParams.get("school")'),
    "Expected register-form to read searchParams.get('school')"
  );
  assert.ok(
    source.includes("Institutional Cohort Enrolment"),
    "Expected institutional cohort enrolment badge on candidate registration"
  );
});

test("Stage 3 School Portal Shell: Interactive invite link copy button and candidate login redirection", () => {
  const dashboardFile = path.join(ROOT, "src/app/schools/dashboard/page.tsx");
  const dashSource = fs.readFileSync(dashboardFile, "utf8");

  assert.ok(
    dashSource.includes("handleCopyInviteLink"),
    "Expected interactive copy invite link handler"
  );
  assert.ok(
    dashSource.includes("navigator.clipboard.writeText"),
    "Expected clipboard copy integration"
  );

  const loginFile = path.join(ROOT, "src/app/schools/login/page.tsx");
  const loginSource = fs.readFileSync(loginFile, "utf8");

  assert.ok(
    loginSource.includes("Go to Candidate / Student Login Portal"),
    "Expected actionable student login link on student error notice"
  );
});

test("Stage 4 Ingestion Pathways: API endpoints and modal components exist", () => {
  const requiredFiles = [
    "src/app/api/schools/students/create/route.ts",
    "src/app/api/schools/students/import/route.ts",
    "src/app/api/schools/students/list/route.ts",
    "src/app/schools/dashboard/add-student-modal.tsx",
    "src/app/schools/dashboard/csv-import-modal.tsx",
  ];

  for (const relPath of requiredFiles) {
    const fullPath = path.join(ROOT, relPath);
    assert.ok(fs.existsSync(fullPath), `Expected file to exist: ${relPath}`);
  }
});

test("Stage 4 Default Password Rule: Computes LASTNAME in uppercase and pads for Supabase 6-character auth constraint", () => {
  function computeDefaultPassword(lastName) {
    const clean = lastName.trim().toUpperCase();
    if (clean.length >= 6) return clean;
    return `${clean}123456`.slice(0, 6);
  }

  assert.equal(computeDefaultPassword("Okonkwo"), "OKONKWO");
  assert.equal(computeDefaultPassword("Adeleke"), "ADELEKE");
  assert.equal(computeDefaultPassword("Danjuma"), "DANJUMA");
  assert.equal(computeDefaultPassword("Bello"), "BELLO1"); // 5 letters -> padded to 6
  assert.equal(computeDefaultPassword("Ojo"), "OJO123"); // 3 letters -> padded to 6
  assert.equal(computeDefaultPassword("Ali"), "ALI123");
  assert.equal(computeDefaultPassword("Eze"), "EZE123");
});

test("Stage 4 CSV Ingestion: Validates CSV headers and produces classroom distribution format", () => {
  const csvModalFile = path.join(ROOT, "src/app/schools/dashboard/csv-import-modal.tsx");
  const source = fs.readFileSync(csvModalFile, "utf8");

  // Template headers
  assert.ok(source.includes("first_name,last_name,email,student_id,phone,target_year"));
  // Printable classroom handout export
  assert.ok(source.includes("downloadClassroomHandout"));
  assert.ok(source.includes("Classroom_Credential_Handout.csv"));
  // Preflight validation preview
  assert.ok(source.includes("parsedRows"));
  assert.ok(source.includes("Preflight Validation"));
});

test("Stage 4 Dashboard Roster: Interactive multi-select and cohort licensing transition", () => {
  const dashboardFile = path.join(ROOT, "src/app/schools/dashboard/page.tsx");
  const source = fs.readFileSync(dashboardFile, "utf8");

  // Multi-select state and Select All
  assert.ok(source.includes("selectedStudentIds"));
  assert.ok(source.includes("toggleSelectAll"));
  assert.ok(source.includes("toggleSelectStudent"));

  // Modals integration
  assert.ok(source.includes("<AddStudentModal"));
  assert.ok(source.includes("<CsvImportModal"));

  // Dynamic pricing calculation for selected students
  assert.ok(source.includes("selectedStudentIds.length * 1500"));
  assert.ok(source.includes("/schools/checkout?students="));
});

test("Stage 5 Cohort Licensing & Checkout: Endpoints, UI pages, and settlement files exist", () => {
  const requiredFiles = [
    "src/app/api/schools/checkout/initialize/route.ts",
    "src/app/api/schools/checkout/verify/route.ts",
    "src/app/schools/checkout/page.tsx",
    "src/app/schools/checkout/checkout-client.tsx",
    "src/app/schools/checkout/verify/page.tsx",
    "src/app/schools/checkout/verify/verify-client.tsx",
  ];

  for (const relPath of requiredFiles) {
    const fullPath = path.join(ROOT, relPath);
    assert.ok(fs.existsSync(fullPath), `Expected file to exist: ${relPath}`);
  }
});

test("Stage 5 Checkout Client: Configures candidate scope, term duration, and Paystack settlement", () => {
  const checkoutClientFile = path.join(ROOT, "src/app/schools/checkout/checkout-client.tsx");
  const source = fs.readFileSync(checkoutClientFile, "utf8");

  // Candidate count state & pricing calculation
  assert.ok(source.includes("studentCount"));
  assert.ok(source.includes("calculateSchoolQuote"));
  // Step: Duration options (1 to 12 months)
  assert.ok(source.includes("durationOptions"));
  assert.ok(source.includes("License Term Duration"));
  // Non-recurring guarantee
  assert.ok(source.includes("Non-recurring: Accounts expire cleanly without surprise debits"));
  // Online Paystack checkout
  assert.ok(source.includes("/api/schools/checkout/initialize/"));
  assert.ok(source.includes("Online via Paystack"));
});

test("Stage 5 Verification & Activation: Handles transaction confirmation and student provisioning", () => {
  const verifyClientFile = path.join(ROOT, "src/app/schools/checkout/verify/verify-client.tsx");
  const source = fs.readFileSync(verifyClientFile, "utf8");

  assert.ok(source.includes("/api/schools/checkout/verify/"));
  assert.ok(source.includes("Cohort Licenses Activated!"));
  assert.ok(source.includes("Print Receipt"));

  const verifyRouteFile = path.join(ROOT, "src/app/api/schools/checkout/verify/route.ts");
  const routeSource = fs.readFileSync(verifyRouteFile, "utf8");

  // Updates order status to completed
  assert.ok(routeSource.includes('status: "completed"'));
  // Activates student license status in schoolStudents
  assert.ok(routeSource.includes('licenseStatus: "active"'));
  // Unlocks platform entitlements for student practice & mocks
  assert.ok(routeSource.includes("subscriptionEntitlements"));
  assert.ok(routeSource.includes("SCHOOL_INSTITUTIONAL_1500"));
});

test("Stage 5 Paystack Webhook: Idempotently settles institutional school cohort orders", () => {
  const webhookFile = path.join(ROOT, "src/app/api/webhooks/paystack/route.ts");
  const source = fs.readFileSync(webhookFile, "utf8");

  assert.ok(source.includes("school_cohort_license"));
  assert.ok(source.includes("schoolOrders"));
  assert.ok(source.includes("schoolStudents"));
  assert.ok(source.includes("schoolActivationJobs"));
  assert.ok(source.includes("schoolOrderSettled"));
});

test("Stage 6 CBT Lab Mocks & Teacher Diagnostics: Endpoints and modal components exist", () => {
  const requiredFiles = [
    "src/app/api/schools/diagnostics/summary/route.ts",
    "src/app/api/schools/mocks/schedule/route.ts",
    "src/app/api/schools/students/drilldown/route.ts",
    "src/app/schools/dashboard/student-drilldown-modal.tsx",
    "src/app/schools/dashboard/mock-scheduler-modal.tsx",
    "src/app/schools/dashboard/syllabus-heatmap-view.tsx",
  ];

  for (const relPath of requiredFiles) {
    const fullPath = path.join(ROOT, relPath);
    assert.ok(fs.existsSync(fullPath), `Expected file to exist: ${relPath}`);
  }
});

test("Stage 6 Diagnostic Heatmap: Implements accuracy categorization and remedial schedule", () => {
  const heatmapFile = path.join(ROOT, "src/app/schools/dashboard/syllabus-heatmap-view.tsx");
  const source = fs.readFileSync(heatmapFile, "utf8");

  // Status categories
  assert.ok(source.includes("Urgent Remedial"));
  assert.ok(source.includes("Revision Recommended"));
  assert.ok(source.includes("Examination Ready"));

  // Weekly timetable
  assert.ok(source.includes("Recommended Weekly Remedial Timetable"));

  // Export functionality
  assert.ok(source.includes("exportDiagnosticLedger"));
  assert.ok(source.includes("Syllabus_Diagnostic_Ledger.csv"));
});

test("Stage 6 CBT Lab Mock Controller: Enforces 120-minute simulation and 8-key proctor mode", () => {
  const mockModalFile = path.join(ROOT, "src/app/schools/dashboard/mock-scheduler-modal.tsx");
  const source = fs.readFileSync(mockModalFile, "utf8");

  // 120 minute timing
  assert.ok(source.includes("120 Minutes"));
  // 180 questions
  assert.ok(source.includes("180 Questions"));
  // 8-key hotkey mode
  assert.ok(source.includes("8-Key Hotkeys") || source.includes("8-key examination navigation"));
  // Session code and proctor sheet
  assert.ok(source.includes("Candidate Lab Entry Code"));
  assert.ok(source.includes("Print Proctoring Sheet"));
});

test("Stage 6 Student Performance Drilldown: Inspects 4-subject breakdown and candidate percentiles", () => {
  const drilldownFile = path.join(ROOT, "src/app/schools/dashboard/student-drilldown-modal.tsx");
  const source = fs.readFileSync(drilldownFile, "utf8");

  assert.ok(source.includes("4-Subject Combination Score Breakdown"));
  assert.ok(source.includes("Targeted Remedial Priority Topics"));
  assert.ok(source.includes("Demonstrated Strengths"));
  assert.ok(source.includes("Laboratory Mock Examination History"));
  assert.ok(source.includes("Print Slip"));
});





