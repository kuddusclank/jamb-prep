/**
 * JAMBPrep B2B School Partnerships & Cohort Pricing Engine
 *
 * Implements confirmed commercial specifications from BMAD:
 * - Retail rate: ₦1,500 per student per month (150,000 integer kobo)
 * - Duration: 1 to 12 calendar months
 * - Formula: Total Kobo = Student Count × 150,000 × Duration Months
 * - Benchmark validation: 50 students × 3 months = 22,500,000 kobo (₦225,000)
 * - One-time prepaid checkout (non-recurring, no auto-debit)
 */

export const MONTHLY_RATE_PER_STUDENT_KOBO = 150000;
export const MONTHLY_RATE_PER_STUDENT_NAIRA = 1500;
export const MIN_STUDENTS = 1;
export const DEFAULT_STUDENTS = 50;
export const MAX_STUDENTS = 2500;
export const MIN_MONTHS = 1;
export const DEFAULT_MONTHS = 3;
export const MAX_MONTHS = 12;

export const SCHOOL_PRICING_CONFIG = {
  RATE_PER_STUDENT_MONTH_NAIRA: MONTHLY_RATE_PER_STUDENT_NAIRA,
  RATE_PER_STUDENT_MONTH_KOBO: MONTHLY_RATE_PER_STUDENT_KOBO,
  MIN_STUDENTS,
  DEFAULT_STUDENTS,
  MAX_STUDENTS,
  MIN_MONTHS,
  DEFAULT_MONTHS,
  MAX_MONTHS,
  QUOTE_EXPIRY_DAYS: 7,
  CURRENCY: 'NGN',
} as const;

export interface SchoolQuoteResult {
  studentCount: number;
  durationMonths: number;
  ratePerStudentMonthKobo: number;
  ratePerStudentKobo: number;
  ratePerStudentMonthNaira: number;
  monthlyTotalKobo: number;
  monthlySubtotalKobo: number;
  monthlyTotalNaira: number;
  totalKobo: number;
  totalAmountKobo: number;
  totalNaira: number;
  formattedTotalNaira: string;
  formattedMonthlyNaira: string;
  currency: 'NGN';
  isRecurring: false;
  quoteVersion: number;
  validUntilDate: string;
}

export interface SchoolApplicationInput {
  schoolName?: string;
  institutionName?: string;
  schoolType?: 'private_secondary' | 'public_secondary' | 'mission_secondary' | 'cbt_tutorial_centre' | 'other' | string;
  state: string;
  lga?: string;
  contactName: string;
  contactRole?: 'principal' | 'proprietor' | 'vice_principal' | 'exam_officer' | 'teacher' | 'other' | string;
  contactEmail?: string;
  email?: string;
  contactPhone?: string;
  phone?: string;
  studentCount: number;
  durationMonths: number;
  targetExamYear?: number;
  additionalNotes?: string;
}

export interface ValidationErrorItem {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationErrorItem[];
}

/**
 * Calculates deterministic integer-kobo quote for institutional cohorts.
 * Enforces strict input validation: duration in [1, 12] and studentCount >= 1.
 */
export function calculateSchoolQuote(
  studentCountInput: number,
  durationMonthsInput: number
): SchoolQuoteResult {
  const count = Number(studentCountInput);
  if (!Number.isFinite(count) || count < MIN_STUDENTS || !Number.isInteger(count)) {
    throw new Error(`INVALID_STUDENT_COUNT: Student count must be an integer >= ${MIN_STUDENTS}`);
  }

  const duration = Number(durationMonthsInput);
  if (
    !Number.isFinite(duration) ||
    duration < MIN_MONTHS ||
    duration > MAX_MONTHS ||
    !Number.isInteger(duration)
  ) {
    throw new Error(
      `INVALID_DURATION: Duration must be an integer between ${MIN_MONTHS} and ${MAX_MONTHS} calendar months`
    );
  }

  const ratePerStudentKobo = MONTHLY_RATE_PER_STUDENT_KOBO;
  const ratePerStudentNaira = MONTHLY_RATE_PER_STUDENT_NAIRA;

  const monthlyTotalKobo = count * ratePerStudentKobo;
  const monthlyTotalNaira = count * ratePerStudentNaira;

  const totalKobo = monthlyTotalKobo * duration;
  const totalNaira = monthlyTotalNaira * duration;

  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + SCHOOL_PRICING_CONFIG.QUOTE_EXPIRY_DAYS);

  return {
    studentCount: count,
    durationMonths: duration,
    ratePerStudentMonthKobo: ratePerStudentKobo,
    ratePerStudentKobo,
    ratePerStudentMonthNaira: ratePerStudentNaira,
    monthlyTotalKobo,
    monthlySubtotalKobo: monthlyTotalKobo,
    monthlyTotalNaira,
    totalKobo,
    totalAmountKobo: totalKobo,
    totalNaira,
    formattedTotalNaira: formatNaira(totalNaira),
    formattedMonthlyNaira: formatNaira(monthlyTotalNaira),
    currency: 'NGN',
    isRecurring: false,
    quoteVersion: 1,
    validUntilDate: validUntil.toISOString().slice(0, 10),
  };
}

/**
 * Formats naira integers with Nigerian currency symbol and commas.
 */
export function formatNaira(amountInNaira: number): string {
  return `₦${Number(amountInNaira || 0).toLocaleString('en-NG')}`;
}

/**
 * Formats integer kobo into Nigerian currency string (₦1,500 for 150000 kobo).
 */
export function formatNairaKobo(amountInKobo: number): string {
  const naira = Math.floor(Number(amountInKobo || 0) / 100);
  return `₦${naira.toLocaleString('en-NG')}`;
}

/**
 * Formats student count with singular/plural suffix.
 */
export function formatStudentCount(count: number): string {
  const n = Number(count) || 0;
  return `${n} student${n === 1 ? '' : 's'}`;
}

/**
 * Generates an institutional application tracking reference code.
 * Format: SCH-[SANITIZED_NAME_UPTO_8_CHARS]-[RANDOM_ALPHANUM_6]
 */
export function generateSchoolApplicationReference(institutionName?: string): string {
  const sanitized = (institutionName || 'INST')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8) || 'INST';

  const randomChars = Math.random().toString(36).substring(2, 8).toUpperCase().padEnd(6, 'X');
  return `SCH-${sanitized}-${randomChars}`;
}

/**
 * Validates institutional school application inputs.
 */
export function validateSchoolApplication(data: Partial<SchoolApplicationInput>): ValidationResult {
  const errors: ValidationErrorItem[] = [];

  const name = (data.institutionName || data.schoolName || '').trim();
  if (!name) {
    errors.push({ field: 'institutionName', message: 'Institution or school name is required' });
  }

  const contact = (data.contactName || '').trim();
  if (!contact) {
    errors.push({ field: 'contactName', message: 'Contact person name is required' });
  }

  const email = (data.contactEmail || data.email || '').trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    errors.push({ field: 'email', message: 'A valid email address is required' });
  }

  const phone = (data.contactPhone || data.phone || '').trim().replace(/[\s-]/g, '');
  if (!phone || phone.length < 8) {
    errors.push({ field: 'phone', message: 'A valid phone number is required' });
  }

  const state = (data.state || '').trim();
  if (!state) {
    errors.push({ field: 'state', message: 'State is required' });
  }

  const count = Number(data.studentCount);
  if (!count || count < MIN_STUDENTS) {
    errors.push({
      field: 'studentCount',
      message: `Student count must be at least ${MIN_STUDENTS}`,
    });
  }

  const duration = Number(data.durationMonths);
  if (!duration || duration < MIN_MONTHS || duration > MAX_MONTHS) {
    errors.push({
      field: 'durationMonths',
      message: `Duration must be between ${MIN_MONTHS} and ${MAX_MONTHS} months`,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
