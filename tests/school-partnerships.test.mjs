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
