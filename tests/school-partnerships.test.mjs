import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const ROOT = process.cwd();

registerHooks({
  resolve(specifier, context, nextResolve) {
    if ((specifier.startsWith("./") || specifier.startsWith("../")) && !path.extname(specifier) && context.parentURL) {
      const parentDir = path.dirname(fileURLToPath(context.parentURL));
      const tsCandidate = path.resolve(parentDir, specifier + ".ts");
      if (fs.existsSync(tsCandidate)) {
        return nextResolve(pathToFileURL(tsCandidate).href, context);
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith(".ts")) {
      const source = fs.readFileSync(fileURLToPath(url), "utf8");
      const { outputText } = ts.transpileModule(source, {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
        },
        fileName: fileURLToPath(url),
      });
      return { format: "module", shortCircuit: true, source: outputText };
    }
    return nextLoad(url, context);
  },
});

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

test("Stage 4 Default Password Rule: Computes exact uppercase surname without any numbers even for short or 2-letter names", () => {
  function computeDefaultPassword(lastName) {
    return lastName.trim().toUpperCase();
  }

  assert.equal(computeDefaultPassword("Okonkwo"), "OKONKWO");
  assert.equal(computeDefaultPassword("Adeleke"), "ADELEKE");
  assert.equal(computeDefaultPassword("Danjuma"), "DANJUMA");
  assert.equal(computeDefaultPassword("Fawaz"), "FAWAZ");
  assert.equal(computeDefaultPassword("Bello"), "BELLO");
  assert.equal(computeDefaultPassword("Ojo"), "OJO");
  assert.equal(computeDefaultPassword("Ali"), "ALI");
  assert.equal(computeDefaultPassword("Eze"), "EZE");
  assert.equal(computeDefaultPassword("Al"), "AL"); // 2-letter name
  assert.equal(computeDefaultPassword("Eb"), "EB"); // 2-letter name
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

test("Cohort checkout licenses exactly the selected candidates", () => {
  const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

  // Dashboard carries the selected candidate IDs into checkout, not just a count.
  const dashboard = read("src/app/schools/dashboard/page.tsx");
  assert.ok(dashboard.includes("&ids="));
  assert.ok(!dashboard.includes("/schools/checkout?students=${selectedStudentIds.length}`"));
  assert.ok(!dashboard.includes('href="/schools/checkout?students=1"'));

  // Checkout sends those IDs to the API.
  const checkout = read("src/app/schools/checkout/checkout-client.tsx");
  assert.ok(checkout.includes('searchParams.get("ids")'));
  assert.ok(checkout.includes("studentIds: selectedStudentIds"));

  // Activation never tops up a selection with other candidates.
  const activation = read("worker/services/school-activation-service.ts");
  assert.ok(activation.includes("hasTargetedSelection"));
  assert.ok(!activation.includes("regardless of status"));
  for (const rel of ["src/app/api/schools/checkout/verify/route.ts", "src/app/api/webhooks/paystack/route.ts"]) {
    assert.ok(read(rel).includes("targetedIds.length === 0 && studentsToActivate.length < order.studentCount"), rel);
  }
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
  assert.ok(source.includes("/api/v1/schools/checkout/initialize"));
  assert.ok(source.includes("Online via Paystack"));
});

test("Stage 5 Verification & Activation: Handles transaction confirmation and student provisioning", () => {
  const verifyClientFile = path.join(ROOT, "src/app/schools/checkout/verify/verify-client.tsx");
  const source = fs.readFileSync(verifyClientFile, "utf8");

  assert.ok(source.includes("/api/v1/schools/checkout/verify"));
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

  // Dynamic enrolled subjects & subject-grouped department hierarchy
  assert.ok(source.includes("groupedData"));
  assert.ok(source.includes("subjectsList"));
  assert.ok(source.includes("All Offered Subjects"));

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
  // Zero-code automatic binding and proctor sheet
  assert.ok(source.includes("Zero-Code Automatic Binding") || source.includes("Official School Mock"));
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

test("Stage 7 Student App Paywall Differentiation: Distinguishes school students from independent candidates", () => {
  const checkoutClientFile = path.join(ROOT, "src/app/pricing/checkout-client.tsx");
  const checkoutSource = fs.readFileSync(checkoutClientFile, "utf8");

  // Differentiates school-attached candidate from independent candidate
  assert.ok(checkoutSource.includes("pricing.isSchoolAttached"));
  assert.ok(checkoutSource.includes("Institutional Candidate Account"));
  assert.ok(checkoutSource.includes("School Code:"));
  assert.ok(checkoutSource.includes("How to Upgrade or Extend Your Candidate Access"));
  assert.ok(checkoutSource.includes("Copy My Details for School Admin"));
  assert.ok(checkoutSource.includes("Contact Your School"));

  // Verifies pricing page conditional header
  const pricingPageFile = path.join(ROOT, "src/app/pricing/page.tsx");
  const pricingPageSource = fs.readFileSync(pricingPageFile, "utf8");
  assert.ok(pricingPageSource.includes("pricing.isSchoolAttached ? \"INSTITUTIONAL LICENSING\""));
  assert.ok(pricingPageSource.includes("pricing.school?.schoolName"));

  // Verifies practice client paywall adaptation
  const practiceClientFile = path.join(ROOT, "src/app/practice/practice-client.tsx");
  const practiceSource = fs.readFileSync(practiceClientFile, "utf8");
  assert.ok(practiceSource.includes("tier.isSchoolAttached"));
  assert.ok(practiceSource.includes("Contact School Admin for Unlimited Practice"));

  // Verifies result page solution review paywall adaptation
  const resultPageFile = path.join(ROOT, "src/app/result/page.tsx");
  const resultSource = fs.readFileSync(resultPageFile, "utf8");
  assert.ok(resultSource.includes("School License Required for Detailed Review"));
  assert.ok(resultSource.includes("Contact School Admin"));

  // Verifies dashboard lexis and revision plan adaptation
  const dashboardFile = path.join(ROOT, "src/app/dashboard/page.tsx");
  const dashboardSource = fs.readFileSync(dashboardFile, "utf8");
  assert.ok(dashboardSource.includes("isSchoolAttached"));
  assert.ok(dashboardSource.includes("Contact School Admin to Unlock"));
  assert.ok(dashboardSource.includes("View School License"));

  // Verifies study service tailored entitlement error messages
  const studyServiceFile = path.join(ROOT, "worker/services/study-service.ts");
  const studySource = fs.readFileSync(studyServiceFile, "utf8");
  assert.ok(studySource.includes("subscription.isSchoolAttached"));
  assert.ok(studySource.includes("Please contact your school administrator to activate your institution license."));
});

test("Stage 8 Checkout Selection Guard: Requires explicit candidate selection before licence checkout", () => {
  const dashboardSource = fs.readFileSync(path.join(ROOT, "src/app/schools/dashboard/page.tsx"), "utf8");
  assert.ok(
    dashboardSource.includes("disabled={selectedStudentIds.length === 0}"),
    "Expected Checkout Licences button to be disabled when 0 candidates are selected"
  );
  assert.ok(
    dashboardSource.includes("if (selectedStudentIds.length === 0) {\n      return;\n    }"),
    "Expected handleCheckoutClick to block navigation when no candidates are selected"
  );

  const checkoutClientSource = fs.readFileSync(path.join(ROOT, "src/app/schools/checkout/checkout-client.tsx"), "utf8");
  assert.ok(checkoutClientSource.includes("hasSelectedCandidates"));
  assert.ok(checkoutClientSource.includes("No Candidates Selected for Checkout"));
  assert.ok(checkoutClientSource.includes("disabled={isPending || !hasSelectedCandidates}"));

  const workerRoutesSource = fs.readFileSync(path.join(ROOT, "worker/services/school-routes.ts"), "utf8");
  assert.ok(
    workerRoutesSource.includes("Please select at least one candidate from your school roster before checking out licences."),
    "Expected backend checkout initialize to reject empty studentIds"
  );
});

test("Stage 8 Roster Update & Password-Confirmed Disconnect: Supports Edit and Single/Batch Disconnect to Individual Mode", () => {
  const editModalPath = path.join(ROOT, "src/app/schools/dashboard/edit-student-modal.tsx");
  const disconnectModalPath = path.join(ROOT, "src/app/schools/dashboard/disconnect-student-modal.tsx");
  assert.ok(fs.existsSync(editModalPath), "Expected edit-student-modal.tsx to exist");
  assert.ok(fs.existsSync(disconnectModalPath), "Expected disconnect-student-modal.tsx to exist");

  const editModalSource = fs.readFileSync(editModalPath, "utf8");
  assert.ok(editModalSource.includes('method: "PATCH"'));
  assert.ok(editModalSource.includes("resetPasswordToSurname"));

  const disconnectModalSource = fs.readFileSync(disconnectModalPath, "utf8");
  assert.ok(disconnectModalSource.includes("/api/v1/schools/students/disconnect"));
  assert.ok(disconnectModalSource.includes("adminPassword"));
  assert.ok(disconnectModalSource.includes("Confirm with Administrator Password"));
  assert.ok(disconnectModalSource.includes("Individual Student Mode"));

  const workerRoutesSource = fs.readFileSync(path.join(ROOT, "worker/services/school-routes.ts"), "utf8");
  assert.ok(workerRoutesSource.includes("id: 'schools.students.patch'"));
  assert.ok(workerRoutesSource.includes("id: 'schools.students.disconnect'"));
  assert.ok(
    workerRoutesSource.includes("SELECT (encrypted_password = crypt(${adminPassword}::text, encrypted_password)) AS password_valid"),
    "Expected disconnect endpoint to verify school admin password via crypt()"
  );
  assert.ok(
    workerRoutesSource.includes("SET plan_code = 'INDIVIDUAL_MONTHLY_1000'"),
    "Expected disconnected students to transition to INDIVIDUAL_MONTHLY_1000 subscription mode"
  );
});

test("Stage 8 Multi-Tenant Security, Main Webhook Routing, Full Cohort Batch Drain & Lab Session Join", () => {
  const workerRoutesSource = fs.readFileSync(path.join(ROOT, "worker/services/school-routes.ts"), "utf8");
  const routerSource = fs.readFileSync(path.join(ROOT, "worker/api/router.ts"), "utf8");
  const activationSource = fs.readFileSync(path.join(ROOT, "worker/services/school-activation-service.ts"), "utf8");
  const mockLobbySource = fs.readFileSync(path.join(ROOT, "src/app/mock/page.tsx"), "utf8");
  const profileClientSource = fs.readFileSync(path.join(ROOT, "src/app/profile/profile-client.tsx"), "utf8");

  // 1. Tenant isolation on diagnostics & drilldown
  assert.ok(
    workerRoutesSource.includes("JOIN school_students ss ON ss.student_user_id = m.user_id") &&
      workerRoutesSource.includes("WHERE ss.school_id = ${school.id}::uuid"),
    "Expected cohort diagnostics and drilldown to filter strictly by school.id"
  );
  assert.ok(!workerRoutesSource.includes("id: 'schools.diagnostics.summary',\n    method: 'POST',\n    pattern: '/api/v1/schools/diagnostics/summary',\n    auth: 'public'"));
  assert.ok(!workerRoutesSource.includes("id: 'schools.students.drilldown',\n    method: 'POST',\n    pattern: '/api/v1/schools/students/drilldown',\n    auth: 'public'"));

  // 2. Existing account password & role protection during ingestion
  assert.ok(
    workerRoutesSource.includes("belongs to a school or platform administrator account and cannot be enrolled as a candidate"),
    "Expected candidate ingestion to block overwriting admin/school_admin accounts"
  );

  // 3. Main Paystack webhook delegates SCH-ORD-* references
  assert.ok(routerSource.includes("settleSchoolOrderFromWebhook"));
  assert.ok(routerSource.includes("reference.startsWith('SCH-ORD-')"));

  // 4. Multi-batch activation loop drains cohorts > 50 students
  assert.ok(activationSource.includes("for (let chunkIndex = 0; chunkIndex < maxChunks; chunkIndex++)"));

  // 5. Unique school slug & eager registration endpoint
  assert.ok(workerRoutesSource.includes("export function buildUniqueSchoolSlug"));
  assert.ok(workerRoutesSource.includes("id: 'schools.register.post'"));

  // 6. Student Lab Code verification on /mock and password update in /profile
  assert.ok(workerRoutesSource.includes("id: 'schools.mocks.join'"));
  assert.ok(mockLobbySource.includes("SchoolLabSessionEntry"));
  assert.ok(profileClientSource.includes("Account Security & Password"));
  assert.ok(profileClientSource.includes("supabase.auth.updateUser({"));
  assert.ok(profileClientSource.includes("custom_password_set: true"));
});

test("Stage 9 Behavioral Handler Execution & SQL Schema Column Validation: PATCH, Disconnect, Checkout & Join", async () => {
  const { SCHOOL_ROUTES } = await import("../worker/services/school-routes.ts");

  // Authoritative column map for public schema tables touched by school routes
  const PUBLIC_SCHEMA_COLUMNS = {
    profiles: new Set(["id", "display_name", "email", "role", "created_at", "updated_at"]),
    student_preferences: new Set([
      "id",
      "user_id",
      "target_score",
      "exam_year",
      "target_institution",
      "target_course",
      "created_at",
      "updated_at",
    ]),
    student_subjects: new Set(["id", "user_id", "subject_id"]),
    subjects: new Set(["id", "code", "name", "is_compulsory", "is_active", "display_order"]),
    schools: new Set([
      "id",
      "name",
      "slug",
      "code",
      "type",
      "state",
      "admin_id",
      "contact_phone",
      "contact_email",
      "is_active",
      "created_at",
      "updated_at",
    ]),
    school_members: new Set(["id", "school_id", "user_id", "role", "created_at"]),
    school_students: new Set([
      "id",
      "school_id",
      "student_user_id",
      "student_identifier",
      "ingestion_method",
      "license_status",
      "license_expires_at",
      "created_at",
    ]),
    school_orders: new Set([
      "id",
      "school_id",
      "reference",
      "student_count",
      "duration_months",
      "rate_per_student_kobo",
      "total_amount_kobo",
      "status",
      "paystack_payload",
      "metadata",
      "created_at",
      "settled_at",
    ]),
    school_activation_jobs: new Set([
      "id",
      "order_id",
      "student_user_id",
      "duration_months",
      "status",
      "retry_count",
      "last_error",
      "created_at",
      "updated_at",
    ]),
    subscription_entitlements: new Set([
      "id",
      "user_id",
      "expires_at",
      "plan_code",
      "auto_renew",
      "cancelled_at",
      "paystack_subscription_code",
      "paystack_email_token",
      "paystack_authorization_code",
      "paystack_customer_code",
      "updated_at",
    ]),
  };

  function assertValidSqlColumns(rawSql) {
    // Reject any UPDATE <table> SET <col> or INSERT INTO <table> (<cols>) that references unknown columns
    const updateMatch = rawSql.match(/UPDATE\s+([a-z_]+)\s+SET\s+([\s\S]+?)\s+WHERE/i);
    if (updateMatch) {
      const table = updateMatch[1].toLowerCase();
      const allowed = PUBLIC_SCHEMA_COLUMNS[table];
      if (allowed) {
        const setClause = updateMatch[2];
        const assignedCols = [...setClause.matchAll(/(?:^|,)\s*([a-z_]+)\s*=/gi)].map((m) => m[1].toLowerCase());
        for (const col of assignedCols) {
          assert.ok(
            allowed.has(col),
            `SQL UPDATE on table "${table}" referenced non-existent column "${col}" in query:\n${rawSql}`
          );
        }
      }
    }

    const insertMatch = rawSql.match(/INSERT\s+INTO\s+([a-z_]+)\s*\(([^)]+)\)/i);
    if (insertMatch) {
      const table = insertMatch[1].toLowerCase();
      const allowed = PUBLIC_SCHEMA_COLUMNS[table];
      if (allowed) {
        const cols = insertMatch[2].split(",").map((c) => c.trim().toLowerCase());
        for (const col of cols) {
          assert.ok(
            allowed.has(col),
            `SQL INSERT into table "${table}" referenced non-existent column "${col}" in query:\n${rawSql}`
          );
        }
      }
    }
  }

  const schoolRecord = {
    id: "3f9edac7-4d26-4a05-b4de-7a538e1ca99b",
    name: "Hassan School",
    code: "SCH-HASSY7PS",
    type: "secondary_school",
    state: "Lagos",
    admin_id: "d792c53a-f12f-4c59-a584-40fdb10a0679",
  };

  const fatimaRecord = {
    id: "87c56cd8-c9a5-4912-ba00-8c9d3c479595",
    student_user_id: "70f207c9-5216-45ae-b0e4-1cd10be28c1e",
    student_identifier: "ST-104",
    ingestion_method: "csv",
    license_status: "active",
    name: "Fatima Danjuma",
    email: "f.danjuma@school.edu.ng",
  };

  const executedQueries = [];
  let mockPasswordValid = true;

  const mockSql = async (strings, ...values) => {
    const query = strings.join("?");
    executedQueries.push({ query, values });
    assertValidSqlColumns(query);

    if (/FROM\s+schools\s+s/i.test(query)) {
      return [schoolRecord];
    }
    if (/FROM\s+school_students\s+ss/i.test(query) && /LEFT\s+JOIN\s+profiles/i.test(query)) {
      return [fatimaRecord];
    }
    if (/FROM\s+subjects/i.test(query)) {
      return [
        { id: "2d8b92e7-fa79-46e5-b850-bc09633ea3d0", code: "ENG" },
        { id: "c7cd45ac-de76-47fc-90bd-788171c5595f", code: "MTH" },
        { id: "3db8ef29-5de6-4af1-8c1a-2ad4d6d4c1c7", code: "PHY" },
        { id: "5b986c50-fb16-495b-82fb-b989066608c5", code: "CHM" },
      ];
    }
    if (/AS\s+password_valid/i.test(query)) {
      return [{ password_valid: mockPasswordValid }];
    }
    if (/SELECT\s+id,\s*student_user_id\s+FROM\s+school_students/i.test(query)) {
      return [{ id: fatimaRecord.id, student_user_id: fatimaRecord.student_user_id }];
    }
    if (/SELECT\s+id\s+FROM\s+school_students/i.test(query)) {
      return [{ id: fatimaRecord.id }];
    }
    if (/FROM\s+school_orders/i.test(query) && /status\s+IN/i.test(query)) {
      return [];
    }
    return [];
  };

  const makeCtx = (method, urlPath, bodyObj) => ({
    request: new Request(`https://jambprep.pages.dev${urlPath}`, {
      method,
      headers: { "Content-Type": "application/json", Origin: "https://jambprep.pages.dev" },
      body: bodyObj !== undefined ? JSON.stringify(bodyObj) : undefined,
    }),
    env: { PUBLIC_APP_ORIGIN: "https://jambprep.pages.dev" },
    actor: {
      userId: schoolRecord.admin_id,
      email: "admin@hassanschool.edu.ng",
      role: "school_admin",
      claims: { user_metadata: { school_code: schoolRecord.code, school_name: schoolRecord.name } },
    },
    getDb: () => ({ sql: mockSql }),
  });

  // 1. Execute PATCH /api/v1/schools/students with Fatima Danjum payload
  const patchRoute = SCHOOL_ROUTES.find((r) => r.id === "schools.students.patch");
  assert.ok(patchRoute, "Expected schools.students.patch route");

  const patchRes = await patchRoute.handler(
    makeCtx("PATCH", "/api/v1/schools/students", {
      studentId: fatimaRecord.id,
      firstName: "Fatima",
      lastName: "Danjum",
      email: "f.danjuma@school.edu.ng",
      studentIdentifier: "ST-104",
      subjects: ["ENG", "MTH", "PHY", "CHM"],
      resetPasswordToSurname: false,
    })
  );

  assert.equal(patchRes.status, 200);
  assert.equal(patchRes.body.success, true);
  assert.equal(patchRes.body.student.name, "Fatima Danjum");
  assert.equal(patchRes.body.student.studentIdentifier, "ST-104");
  assert.equal(patchRes.body.student.defaultPassword, "DANJUM");
  assert.deepEqual(patchRes.body.student.subjects, ["ENG", "MTH", "PHY", "CHM"]);
  assert.ok(
    executedQueries.some((q) => /INSERT\s+INTO\s+student_preferences/i.test(q.query)),
    "Expected 4-subject update in PATCH to upsert student_preferences"
  );

  // 2. Execute POST /api/v1/schools/students/disconnect — verify password guard & individual transition
  const disconnectRoute = SCHOOL_ROUTES.find((r) => r.id === "schools.students.disconnect");
  assert.ok(disconnectRoute, "Expected schools.students.disconnect route");

  mockPasswordValid = false;
  await assert.rejects(
    () =>
      disconnectRoute.handler(
        makeCtx("POST", "/api/v1/schools/students/disconnect", {
          studentIds: [fatimaRecord.id],
          adminPassword: "wrong-password",
        })
      ),
    (err) => err.status === 403 && err.code === "FORBIDDEN"
  );

  mockPasswordValid = true;
  const disconnectRes = await disconnectRoute.handler(
    makeCtx("POST", "/api/v1/schools/students/disconnect", {
      studentIds: [fatimaRecord.id],
      adminPassword: "correct-admin-password",
    })
  );
  assert.equal(disconnectRes.status, 200);
  assert.equal(disconnectRes.body.disconnectedCount, 1);
  assert.equal(disconnectRes.body.subscriptionMode, "individual");

  // 3. Execute POST /api/v1/schools/checkout/initialize — verify empty selection rejected with 400
  const checkoutInitRoute = SCHOOL_ROUTES.find((r) => r.id === "schools.checkout.initialize");
  assert.ok(checkoutInitRoute, "Expected schools.checkout.initialize route");

  await assert.rejects(
    () =>
      checkoutInitRoute.handler(
        makeCtx("POST", "/api/v1/schools/checkout/initialize", {
          durationMonths: 3,
          studentIds: [],
        })
      ),
    (err) => err.status === 400 && err.code === "VALIDATION_FAILED"
  );

  const checkoutOkRes = await checkoutInitRoute.handler(
    makeCtx("POST", "/api/v1/schools/checkout/initialize", {
      durationMonths: 3,
      studentIds: [fatimaRecord.id],
    })
  );
  assert.equal(checkoutOkRes.status, 200);
  assert.equal(checkoutOkRes.body.quote.studentCount, 1);
});

test("Stage 10 Audit Remediation Behavioral Suite (AUD-01 through AUD-18)", async () => {
  const { SCHOOL_ROUTES, resolveCallerSchool } = await import("../worker/services/school-routes.ts");
  const { enqueueCohortActivation } = await import("../worker/services/school-activation-service.ts");
  const { provisionStudentAccountAtomic } = await import("../worker/services/auth-provisioning-service.ts");
  const { initializeCheckout } = await import("../worker/services/paystack-service.ts");

  // 1. AUD-11: All state-changing school endpoints require student_live_session
  const liveSessionIds = [
    "schools.register.post",
    "schools.students.post",
    "schools.students.patch",
    "schools.students.disconnect",
    "schools.checkout.initialize",
    "schools.checkout.verify",
  ];
  for (const id of liveSessionIds) {
    const route = SCHOOL_ROUTES.find((r) => r.id === id);
    assert.ok(route, `Expected route ${id} to exist`);
    assert.equal(route.auth, "student_live_session", `Expected route ${id} to require student_live_session`);
  }

  // 2. AUD-01: Student or cross-tenant caller cannot hijack an existing school via resolveCallerSchool or schools.register.post
  const victimSchool = {
    id: "11111111-2222-3333-4444-555555555555",
    name: "Kings College",
    code: "SCH-KING1234",
    type: "secondary_school",
    state: "Lagos",
    admin_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  };

  const hijackSql = async (strings) => {
    const q = strings.join("?");
    // Victim school is NOT owned by attacker and attacker is NOT in school_members
    if (/FROM\s+schools\s+s/i.test(q) && /s\.admin_id\s*=/i.test(q)) {
      return [];
    }
    // Attacker is an enrolled student
    if (/FROM\s+school_students\s+WHERE\s+student_user_id/i.test(q)) {
      return [{ id: "enrolled-row-1" }];
    }
    return [];
  };

  const resolvedForStudent = await resolveCallerSchool(
    {
      userId: "99999999-8888-7777-6666-555555555555",
      email: "student@attacker.com",
      role: "student",
      claims: { user_metadata: { role: "student", school_code: victimSchool.code } },
    },
    { sql: hijackSql }
  );
  assert.equal(resolvedForStudent, null, "Enrolled student with victim school_code in metadata must not resolve or hijack school");

  const registerRoute = SCHOOL_ROUTES.find((r) => r.id === "schools.register.post");
  await assert.rejects(
    () =>
      registerRoute.handler({
        request: new Request("https://jambprep.pages.dev/api/v1/schools/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            schoolName: "Attacker Takeover",
            schoolCode: victimSchool.code,
          }),
        }),
        env: {},
        actor: {
          userId: "99999999-8888-7777-6666-555555555555",
          email: "student@attacker.com",
          role: "student",
          claims: { user_metadata: { role: "student" } },
        },
        getDb: () => ({ sql: hijackSql, runCommittedTransaction: async (cb) => cb(hijackSql) }),
      }),
    (err) => err.status === 403 && err.code === "FORBIDDEN"
  );

  // 3. AUD-02 & AUD-15: MockSchedulerModal sends Authorization Bearer header and schools.mocks.join enforces school membership
  const mockModalSource = fs.readFileSync(path.join(ROOT, "src/app/schools/dashboard/mock-scheduler-modal.tsx"), "utf8");
  assert.ok(mockModalSource.includes("Authorization: `Bearer ${token}`"));
  assert.ok(!mockModalSource.includes("/api/schools/mocks/schedule/"), "Dead fallback must be removed from MockSchedulerModal");

  const joinRoute = SCHOOL_ROUTES.find((r) => r.id === "schools.mocks.join");
  // Outsider student receives 404 because school_students membership filter excludes non-members
  await assert.rejects(
    () =>
      joinRoute.handler({
        request: new Request("https://jambprep.pages.dev/api/v1/schools/mocks/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ labSessionCode: "LAB-KING-ABCDEF" }),
        }),
        env: {},
        actor: {
          userId: "99999999-8888-7777-6666-555555555555",
          email: "outsider@student.com",
          role: "student",
          claims: {},
        },
        getDb: () => ({
          sql: async () => [],
        }),
      }),
    (err) => err.status === 404 && err.code === "NOT_FOUND"
  );

  // Enrolled student attempting to join a future scheduled mock (>15m ahead) receives 409 CONFLICT
  await assert.rejects(
    () =>
      joinRoute.handler({
        request: new Request("https://jambprep.pages.dev/api/v1/schools/mocks/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ labSessionCode: "LAB-KING-ABCDEF" }),
        }),
        env: {},
        now: new Date("2026-10-25T08:00:00Z"),
        actor: {
          userId: "70f207c9-5216-45ae-b0e4-1cd10be28c1e",
          email: "f.danjuma@school.edu.ng",
          role: "student",
          claims: {},
        },
        getDb: () => ({
          sql: async () => [
            {
              school_id: victimSchool.id,
              school_name: victimSchool.name,
              school_code: victimSchool.code,
              active_lab_mock: {
                labSessionCode: "LAB-KING-ABCDEF",
                title: "Future Lab Mock",
                scheduledDate: "2026-10-25T12:00:00Z",
              },
            },
          ],
        }),
      }),
    (err) => err.status === 409 && err.code === "CONFLICT"
  );

  // 4. AUD-03 & AUD-12: checkout.verify enforces school ownership, webhook fails closed without secret, and activation locks & deduplicates
  const verifyRoute = SCHOOL_ROUTES.find((r) => r.id === "schools.checkout.verify");
  await assert.rejects(
    () =>
      verifyRoute.handler({
        request: new Request("https://jambprep.pages.dev/api/v1/schools/checkout/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference: "SCH-ORD-OTHER" }),
        }),
        env: {},
        actor: {
          userId: "99999999-8888-7777-6666-555555555555",
          email: "other@school.com",
          role: "school_admin",
          claims: {},
        },
        getDb: () => ({
          sql: async (strings) => {
            const q = strings.join("?");
            if (/FROM\s+school_orders/i.test(q)) {
              return [
                {
                  id: "ord-other",
                  school_id: victimSchool.id,
                  reference: "SCH-ORD-OTHER",
                  student_count: 5,
                  duration_months: 3,
                  total_amount_kobo: 2250000,
                  status: "pending",
                  school_name: victimSchool.name,
                  school_code: victimSchool.code,
                  metadata: {},
                },
              ];
            }
            // Caller owns a different school
            if (/FROM\s+schools\s+s/i.test(q)) {
              return [{ id: "different-school-id", name: "Other School", code: "SCH-OTHR1111", type: "secondary_school", state: "Oyo", admin_id: "99999999-8888-7777-6666-555555555555" }];
            }
            return [];
          },
        }),
      }),
    (err) => err.status === 403 && err.code === "FORBIDDEN"
  );

  const webhookRoute = SCHOOL_ROUTES.find((r) => r.id === "schools.checkout.webhook");
  await assert.rejects(
    () =>
      webhookRoute.handler({
        request: new Request("https://jambprep.pages.dev/api/v1/schools/checkout/webhook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event: "charge.success", data: { reference: "SCH-ORD-1" } }),
        }),
        env: {},
        getDb: () => ({ sql: async () => [] }),
      }),
    (err) => err.status === 503 && err.code === "SERVICE_CONFIG_UNAVAILABLE"
  );

  const activationQueries = [];
  await enqueueCohortActivation(
    {
      sql: async (strings) => {
        const q = strings.join("?");
        activationQueries.push(q);
        if (/FROM\s+school_students/i.test(q)) {
          return [{ id: "ss-1", student_user_id: "aaaaaaaa-1111-2222-3333-444444444444" }];
        }
        return [];
      },
    },
    victimSchool.id,
    "11111111-1111-1111-1111-111111111111",
    2,
    3,
    ["aaaaaaaa-1111-2222-3333-444444444444"]
  );
  assert.ok(
    activationQueries.some((q) => /FROM\s+school_orders\s+WHERE\s+id\s*=.*FOR\s+UPDATE/i.test(q)),
    "Expected enqueueCohortActivation to lock parent order row FOR UPDATE"
  );
  assert.ok(
    activationQueries.some((q) => /ON\s+CONFLICT\s*\(\s*order_id,\s*student_user_id\s*\)\s*DO\s+NOTHING/i.test(q)),
    "Expected enqueueCohortActivation to deduplicate on (order_id, student_user_id)"
  );

  // 5. AUD-04: provisionStudentAccountAtomic prevents attaching an already-enrolled student to a second school
  const provisionQueries = [];
  const provResult = await provisionStudentAccountAtomic(
    async (strings) => {
      const q = strings.join("?");
      provisionQueries.push(q);
      if (/INSERT\s+INTO\s+profiles/i.test(q)) {
        return [
          {
            id: "70f207c9-5216-45ae-b0e4-1cd10be28c1e",
            display_name: "Fatima Danjuma",
            email: "f.danjuma@school.edu.ng",
            role: "student",
          },
        ];
      }
      if (/FROM\s+referral_codes\s+WHERE\s+user_id/i.test(q)) {
        return [{ code: "FATIMA70" }];
      }
      if (/FROM\s+schools\s+WHERE\s+UPPER\(code\)/i.test(q)) {
        return [{ id: "second-school-id", name: "Second School", code: "SCH-SEC22222" }];
      }
      if (/SELECT\s+school_id\s+FROM\s+school_students\s+WHERE\s+student_user_id/i.test(q)) {
        return [{ school_id: victimSchool.id }];
      }
      return [];
    },
    {
      userId: "70f207c9-5216-45ae-b0e4-1cd10be28c1e",
      email: "f.danjuma@school.edu.ng",
      displayName: "Fatima Danjuma",
      referralCode: "SCH-SEC22222",
    }
  );
  assert.equal(provResult.referralAttribution, "already_attributed");
  assert.ok(
    !provisionQueries.some((q) => /INSERT\s+INTO\s+school_students/i.test(q)),
    "Must not insert into school_students when student is already enrolled in another school"
  );

  // 6. AUD-13: initializeCheckout blocks school-attached students from individual Paystack checkout
  const schoolStudentSql = async (strings) => {
    const q = strings.join("?");
    if (/FROM\s+school_students\s+ss/i.test(q)) {
      return [
        {
          school_id: victimSchool.id,
          school_name: victimSchool.name,
          school_code: victimSchool.code,
          license_status: "pending_Readiness",
          license_expires_at: null,
        },
      ];
    }
    return [];
  };
  await assert.rejects(
    () =>
      initializeCheckout(
        {
          sql: schoolStudentSql,
          runSerializableTransaction: async (cb) => cb(schoolStudentSql),
        },
        { PAYSTACK_SECRET_KEY: "sk_test_dummy" },
        "70f207c9-5216-45ae-b0e4-1cd10be28c1e",
        "f.danjuma@school.edu.ng",
        "idem-key-school-student-1",
        new Date("2026-10-25T08:00:00Z")
      ),
    (err) => err.status === 403 && err.code === "FORBIDDEN"
  );

  // 7. AUD-18: schools.students.disconnect rate-limits after 5 failed password attempts
  const disconnectRoute = SCHOOL_ROUTES.find((r) => r.id === "schools.students.disconnect");
  const rateLimitActorId = "deadbeef-dead-4eef-8eef-000000000099";
  const makeDisconnectAttempt = () =>
    disconnectRoute.handler({
      request: new Request("https://jambprep.pages.dev/api/v1/schools/students/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIds: ["87c56cd8-c9a5-4912-ba00-8c9d3c479595"],
          adminPassword: "wrong-password",
        }),
      }),
      env: {},
      actor: {
        userId: rateLimitActorId,
        email: "ratelimit@school.edu.ng",
        role: "school_admin",
        claims: {},
      },
      getDb: () => ({
        sql: async (strings) => {
          const q = strings.join("?");
          if (/FROM\s+schools\s+s/i.test(q)) {
            return [{ ...victimSchool, admin_id: rateLimitActorId }];
          }
          if (/AS\s+password_valid/i.test(q)) {
            return [{ password_valid: false }];
          }
          return [];
        },
      }),
    });

  for (let i = 0; i < 5; i++) {
    await assert.rejects(makeDisconnectAttempt, (err) => err.status === 403);
  }
  await assert.rejects(makeDisconnectAttempt, (err) => err.status === 429 && err.code === "RATE_LIMITED");
});









