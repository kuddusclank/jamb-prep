/**
 * Typed Request/Response Contracts & Bounded Streamed Body Parsing (T03)
 *
 * Defines:
 * - Bounded streamed JSON reader (readBoundedJsonBody) enforcing exact byte limits (413)
 * - Strict Content-Type and JSON syntax checks (400)
 * - Schema validation mapping to 422 VALIDATION_FAILED (compatible with both Zod schemas and lightweight Worker validators)
 * - Request/Response DTOs and validators for /api/v1/* endpoints without pulling 45 locale dictionaries into the Worker bundle
 */

import { readBoundedStream } from '../auth';
import { ApiError } from './errors';
import type { SingleQuestionImport } from '../../src/lib/validation/question';

export interface ValidationIssue {
  path: ReadonlyArray<string | number>;
  message?: string;
  issue?: string;
}

export type SafeParseResult<T> =
  | { success: true; data: T }
  | { success: false; error: { issues: ReadonlyArray<ValidationIssue> } };

export interface SchemaValidator<T> {
  safeParse(input: unknown): SafeParseResult<T>;
}

export const UUID_V1_TO_V5_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const BODY_LIMIT_SMALL_WRITE_BYTES = 4 * 1024; // 4 KB
export const BODY_LIMIT_DEFAULT_JSON_BYTES = 16 * 1024; // 16 KB
export const BODY_LIMIT_WEBHOOK_BYTES = 64 * 1024; // 64 KB
export const BODY_LIMIT_ADMIN_IMPORT_BYTES = 512 * 1024; // 512 KB

/**
 * Validates that a string is a canonical UUID (v1-v5). Throws 400 INVALID_UUID otherwise.
 */
export function assertValidUuid(value: unknown, fieldName: string = 'id'): string {
  if (typeof value !== 'string' || !UUID_V1_TO_V5_REGEX.test(value)) {
    throw new ApiError({
      status: 400,
      code: 'INVALID_UUID',
      message: `Invalid UUID format for '${fieldName}'.`,
      details: [{ field: fieldName, issue: 'Must be a valid UUID' }],
    });
  }
  return value.toLowerCase();
}

/**
 * Reads a request body as raw UTF-8 text with an exact byte ceiling using streamed chunk reading.
 */
export async function readBoundedTextBody(
  request: Request,
  maxBytes: number = BODY_LIMIT_DEFAULT_JSON_BYTES,
  timeoutMs: number = 5000
): Promise<string> {
  const contentLengthHeader = request.headers.get('content-length');
  if (contentLengthHeader !== null) {
    const declaredBytes = Number.parseInt(contentLengthHeader, 10);
    if (Number.isFinite(declaredBytes) && declaredBytes > maxBytes) {
      throw new ApiError({
        status: 413,
        code: 'PAYLOAD_TOO_LARGE',
        message: `Request body exceeds the ${maxBytes}-byte limit.`,
      });
    }
  }

  const controller = new AbortController();
  const abort = () => controller.abort();
  request.signal.addEventListener("abort", abort, { once: true });
  if (request.signal.aborted) { controller.abort(); }
  const timer = setTimeout(abort, timeoutMs);
  let bytes: Uint8Array;
  try {
    bytes = await readBoundedStream(request.body, maxBytes, controller.signal);
  } catch (err) {
    if (err instanceof Error && err.message === 'PAYLOAD_TOO_LARGE') {
      throw new ApiError({
        status: 413,
        code: 'PAYLOAD_TOO_LARGE',
        message: `Request body exceeds the ${maxBytes}-byte limit.`,
      });
    }
    throw new ApiError({
      status: 400,
      code: 'BAD_REQUEST',
      message: 'Failed to read request body stream.',
    });
  } finally {
    clearTimeout(timer);
    request.signal.removeEventListener('abort', abort);
  }

  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

/**
 * Reads, bounds, and validates a JSON request body against an optional schema validator.
 */
export async function readBoundedJsonBody<T = Record<string, unknown>>(
  request: Request,
  options?: {
    maxBytes?: number;
    schema?: SchemaValidator<T>;
    allowArrayRoot?: boolean;
  }
): Promise<{ rawText: string; data: T }> {
  const maxBytes = options?.maxBytes ?? BODY_LIMIT_DEFAULT_JSON_BYTES;
  const contentType = request.headers.get('content-type') || '';

  if (!contentType.toLowerCase().includes('application/json')) {
    throw new ApiError({
      status: 400,
      code: 'UNSUPPORTED_MEDIA_TYPE',
      message: 'Content-Type must be application/json.',
    });
  }

  const rawText = await readBoundedTextBody(request, maxBytes);
  if (!rawText || rawText.trim().length === 0) {
    throw new ApiError({
      status: 400,
      code: 'MALFORMED_JSON',
      message: 'Request JSON body cannot be empty.',
    });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new ApiError({
      status: 400,
      code: 'MALFORMED_JSON',
      message: 'Request body is not valid JSON.',
    });
  }

  const isArray = Array.isArray(parsed);
  if (
    parsed === null ||
    typeof parsed !== 'object' ||
    (isArray && !options?.allowArrayRoot)
  ) {
    throw new ApiError({
      status: 400,
      code: 'MALFORMED_JSON',
      message: options?.allowArrayRoot
        ? 'Request body must be a JSON object or array.'
        : 'Request body must be a JSON object.',
    });
  }

  if (options?.schema) {
    const validation = options.schema.safeParse(parsed);
    if (!validation.success) {
      const details = validation.error.issues.slice(0, 12).map((item) => ({
        field: item.path.join('.') || 'body',
        issue: item.issue || item.message || 'Validation failed',
      }));
      throw new ApiError({
        status: 422,
        code: 'VALIDATION_FAILED',
        message: 'Request payload failed validation.',
        details,
      });
    }
    return { rawText, data: validation.data };
  }

  return { rawText, data: parsed as T };
}

function failIssues(issues: ValidationIssue[]): SafeParseResult<never> {
  return { success: false, error: { issues } };
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

// ============================================================================
// Endpoint Schemas & DTOs (Plan Section 6.2)
// ============================================================================

export interface AuthBootstrapRequest {
  displayName: string;
  referralCode?: string | null;
}

export const authBootstrapSchema: SchemaValidator<AuthBootstrapRequest> = {
  safeParse(input: unknown): SafeParseResult<AuthBootstrapRequest> {
    if (!isPlainObject(input)) {
      return failIssues([{ path: ['body'], issue: 'Expected JSON object' }]);
    }
    const issues: ValidationIssue[] = [];
    const displayName = typeof input.displayName === 'string' ? input.displayName.trim() : '';
    if (displayName.length < 2 || displayName.length > 120) {
      issues.push({
        path: ['displayName'],
        issue: 'Display name must be between 2 and 120 characters',
      });
    }
    let referralCode: string | null | undefined = undefined;
    if (input.referralCode !== undefined && input.referralCode !== null) {
      if (typeof input.referralCode !== 'string') {
        issues.push({ path: ['referralCode'], issue: 'referralCode must be a string' });
      } else {
        const trimmed = input.referralCode.trim();
        if (trimmed.length > 32 || !/^[A-Za-z0-9_-]*$/.test(trimmed)) {
          issues.push({ path: ['referralCode'], issue: 'Invalid referral code format' });
        }
        referralCode = trimmed;
      }
    }
    if (issues.length > 0) return failIssues(issues);
    return { success: true, data: { displayName, referralCode } };
  },
};

export interface OnboardingPutRequest {
  electives: string[];
  targetScore: number;
  targetInstitution?: string | null;
  targetCourse?: string | null;
}

export const onboardingPutSchema: SchemaValidator<OnboardingPutRequest> = {
  safeParse(input: unknown): SafeParseResult<OnboardingPutRequest> {
    if (!isPlainObject(input)) {
      return failIssues([{ path: ['body'], issue: 'Expected JSON object' }]);
    }
    const issues: ValidationIssue[] = [];
    const electivesRaw = input.electives;
    const electives: string[] = [];

    if (!Array.isArray(electivesRaw) || electivesRaw.length !== 3) {
      issues.push({ path: ['electives'], issue: 'Exactly 3 elective subjects are required' });
    } else {
      for (let i = 0; i < electivesRaw.length; i++) {
        const item = electivesRaw[i];
        if (typeof item !== 'string' || item.trim().length < 2 || item.trim().length > 60) {
          issues.push({ path: ['electives', i], issue: 'Elective must be a valid subject name' });
        } else {
          electives.push(item.trim());
        }
      }
      if (electives.length === 3) {
        if (new Set(electives).size !== 3) {
          issues.push({ path: ['electives'], issue: 'Elective subjects must be distinct' });
        }
        if (electives.some((s) => s.toLowerCase() === 'use of english')) {
          issues.push({
            path: ['electives'],
            issue: 'Use of English is compulsory and cannot be selected as an elective',
          });
        }
      }
    }

    const targetScore = input.targetScore;
    if (
      typeof targetScore !== 'number' ||
      !Number.isInteger(targetScore) ||
      targetScore < 100 ||
      targetScore > 400
    ) {
      issues.push({
        path: ['targetScore'],
        issue: 'Target score must be an integer between 100 and 400',
      });
    }

    let targetInstitution: string | null | undefined = undefined;
    if (input.targetInstitution !== undefined && input.targetInstitution !== null) {
      if (typeof input.targetInstitution !== 'string' || input.targetInstitution.trim().length > 160) {
        issues.push({ path: ['targetInstitution'], issue: 'Invalid targetInstitution' });
      } else {
        targetInstitution = input.targetInstitution.trim() || null;
      }
    }

    let targetCourse: string | null | undefined = undefined;
    if (input.targetCourse !== undefined && input.targetCourse !== null) {
      if (typeof input.targetCourse !== 'string' || input.targetCourse.trim().length > 160) {
        issues.push({ path: ['targetCourse'], issue: 'Invalid targetCourse' });
      } else {
        targetCourse = input.targetCourse.trim() || null;
      }
    }

    if (issues.length > 0) return failIssues(issues);
    return {
      success: true,
      data: {
        electives,
        targetScore: targetScore as number,
        targetInstitution,
        targetCourse,
      },
    };
  },
};

export interface ProfilePatchRequest {
  displayName: string;
  targetScore: number;
  targetInstitution?: string | null;
  targetCourse?: string | null;
}

export const profilePatchSchema: SchemaValidator<ProfilePatchRequest> = {
  safeParse(input: unknown): SafeParseResult<ProfilePatchRequest> {
    if (!isPlainObject(input)) {
      return failIssues([{ path: ['body'], issue: 'Expected JSON object' }]);
    }
    const issues: ValidationIssue[] = [];
    const displayName = typeof input.displayName === 'string' ? input.displayName.trim() : '';
    if (displayName.length < 2 || displayName.length > 120) {
      issues.push({
        path: ['displayName'],
        issue: 'Display name must be between 2 and 120 characters',
      });
    }

    const targetScore = input.targetScore;
    if (
      typeof targetScore !== 'number' ||
      !Number.isInteger(targetScore) ||
      targetScore < 100 ||
      targetScore > 400
    ) {
      issues.push({
        path: ['targetScore'],
        issue: 'Target score must be an integer between 100 and 400',
      });
    }

    let targetInstitution: string | null | undefined = undefined;
    if (input.targetInstitution !== undefined && input.targetInstitution !== null) {
      if (typeof input.targetInstitution !== 'string' || input.targetInstitution.trim().length > 160) {
        issues.push({ path: ['targetInstitution'], issue: 'Invalid targetInstitution' });
      } else {
        targetInstitution = input.targetInstitution.trim() || null;
      }
    }

    let targetCourse: string | null | undefined = undefined;
    if (input.targetCourse !== undefined && input.targetCourse !== null) {
      if (typeof input.targetCourse !== 'string' || input.targetCourse.trim().length > 160) {
        issues.push({ path: ['targetCourse'], issue: 'Invalid targetCourse' });
      } else {
        targetCourse = input.targetCourse.trim() || null;
      }
    }

    if (issues.length > 0) return failIssues(issues);
    return {
      success: true,
      data: {
        displayName,
        targetScore: targetScore as number,
        targetInstitution,
        targetCourse,
      },
    };
  },
};

export interface PracticeCheckRequest {
  sessionId: string;
  questionId: string;
  selectedOption: 'A' | 'B' | 'C' | 'D';
}

export const practiceCheckSchema: SchemaValidator<PracticeCheckRequest> = {
  safeParse(input: unknown): SafeParseResult<PracticeCheckRequest> {
    if (!isPlainObject(input)) {
      return failIssues([{ path: ['body'], issue: 'Expected JSON object' }]);
    }
    const issues: ValidationIssue[] = [];
    if (typeof input.sessionId !== "string" || !UUID_V1_TO_V5_REGEX.test(input.sessionId)) issues.push({ path: ["sessionId"], issue: "A valid issued practice session is required" });
    if (typeof input.questionId !== 'string' || !UUID_V1_TO_V5_REGEX.test(input.questionId)) {
      issues.push({ path: ['questionId'], issue: 'questionId must be a valid UUID' });
    }
    if (
      input.selectedOption !== 'A' &&
      input.selectedOption !== 'B' &&
      input.selectedOption !== 'C' &&
      input.selectedOption !== 'D'
    ) {
      issues.push({ path: ['selectedOption'], issue: 'selectedOption must be A, B, C, or D' });
    }
    if (issues.length > 0) return failIssues(issues);
    return {
      success: true,
      data: {
        sessionId: input.sessionId as string,
        questionId: (input.questionId as string).toLowerCase(),
        selectedOption: input.selectedOption as 'A' | 'B' | 'C' | 'D',
      },
    };
  },
};

export interface SaveExamAnswerRequest {
  questionId: string;
  selectedOptionId: string | null;
  revision?: number;
}

export const saveExamAnswerSchema: SchemaValidator<SaveExamAnswerRequest> = {
  safeParse(input: unknown): SafeParseResult<SaveExamAnswerRequest> {
    if (!isPlainObject(input)) {
      return failIssues([{ path: ['body'], issue: 'Expected JSON object' }]);
    }
    const issues: ValidationIssue[] = [];
    if (typeof input.questionId !== 'string' || !UUID_V1_TO_V5_REGEX.test(input.questionId)) {
      issues.push({ path: ['questionId'], issue: 'questionId must be a valid UUID' });
    }
    if (
      input.selectedOptionId !== null && (typeof input.selectedOptionId !== 'string' ||
      !UUID_V1_TO_V5_REGEX.test(input.selectedOptionId))
    ) {
      issues.push({ path: ['selectedOptionId'], issue: 'selectedOptionId must be a valid UUID' });
    }
    let revision: number | undefined = undefined;
    if (input.revision !== undefined) {
      if (
        typeof input.revision !== 'number' ||
        !Number.isInteger(input.revision) ||
        input.revision < 1 ||
        input.revision > 1_000_000
      ) {
        issues.push({
          path: ['revision'],
          issue: 'revision must be a positive integer',
        });
      } else {
        revision = input.revision;
      }
    }
    if (issues.length > 0) return failIssues(issues);
    return {
      success: true,
      data: {
        questionId: (input.questionId as string).toLowerCase(),
        selectedOptionId: input.selectedOptionId === null ? null : (input.selectedOptionId as string).toLowerCase(),
        revision,
      },
    };
  },
};

export interface FlagExamQuestionRequest {
  questionId: string;
  isFlagged: boolean;
}

export const flagExamQuestionSchema: SchemaValidator<FlagExamQuestionRequest> = {
  safeParse(input: unknown): SafeParseResult<FlagExamQuestionRequest> {
    if (!isPlainObject(input)) {
      return failIssues([{ path: ['body'], issue: 'Expected JSON object' }]);
    }
    const issues: ValidationIssue[] = [];
    if (typeof input.questionId !== 'string' || !UUID_V1_TO_V5_REGEX.test(input.questionId)) {
      issues.push({ path: ['questionId'], issue: 'questionId must be a valid UUID' });
    }
    if (typeof input.isFlagged !== 'boolean') {
      issues.push({ path: ['isFlagged'], issue: 'isFlagged must be a boolean' });
    }
    if (issues.length > 0) return failIssues(issues);
    return {
      success: true,
      data: {
        questionId: (input.questionId as string).toLowerCase(),
        isFlagged: input.isFlagged as boolean,
      },
    };
  },
};

export interface PaymentVerifyRequest {
  reference: string;
}

export const paymentVerifySchema: SchemaValidator<PaymentVerifyRequest> = {
  safeParse(input: unknown): SafeParseResult<PaymentVerifyRequest> {
    if (!isPlainObject(input)) {
      return failIssues([{ path: ['body'], issue: 'Expected JSON object' }]);
    }
    const ref = typeof input.reference === 'string' ? input.reference.trim() : '';
    if (ref.length < 4 || ref.length > 128 || !/^[A-Za-z0-9_.-]+$/.test(ref)) {
      return failIssues([{ path: ['reference'], issue: 'Invalid payment reference format' }]);
    }
    return { success: true, data: { reference: ref } };
  },
};

export const bulkQuestionImportSchema: SchemaValidator<SingleQuestionImport[]> = {
  safeParse(input: unknown): SafeParseResult<SingleQuestionImport[]> {
    if (!Array.isArray(input) || input.length < 1 || input.length > 10) {
      return failIssues([
        { path: ['body'], issue: 'Import between 1 and 10 complete questions per request' },
      ]);
    }
    const issues: ValidationIssue[] = [];
    const results: SingleQuestionImport[] = [];

    for (let i = 0; i < input.length; i++) {
      const item = input[i];
      if (!isPlainObject(item)) {
        issues.push({ path: [i], issue: 'Question item must be an object' });
        continue;
      }
      const subjectCode =
        typeof item.subjectCode === 'string' ? item.subjectCode.trim().toUpperCase() : '';
      if (subjectCode.length < 2 || subjectCode.length > 6) {
        issues.push({ path: [i, 'subjectCode'], issue: 'subjectCode must be 2 to 6 characters' });
      }
      const topicTitle = typeof item.topicTitle === 'string' ? item.topicTitle.trim() : '';
      if (topicTitle.length < 2 || topicTitle.length > 200) {
        issues.push({
          path: [i, 'topicTitle'],
          issue: 'Topic title must be at least 2 characters',
        });
      }
      const stem = typeof item.stem === 'string' ? item.stem.trim() : '';
      if (stem.length < 5 || stem.length > 20000) {
        issues.push({ path: [i, 'stem'], issue: 'Question stem must be at least 5 characters' });
      }
      const difficulty =
        item.difficulty === undefined ? 'medium' : item.difficulty;
      if (difficulty !== 'easy' && difficulty !== 'medium' && difficulty !== 'hard') {
        issues.push({ path: [i, 'difficulty'], issue: 'difficulty must be easy, medium, or hard' });
      }
      const opts = item.options;
      if (
        !isPlainObject(opts) ||
        typeof opts.A !== 'string' ||
        opts.A.trim().length < 1 ||
        typeof opts.B !== 'string' ||
        opts.B.trim().length < 1 ||
        typeof opts.C !== 'string' ||
        opts.C.trim().length < 1 ||
        typeof opts.D !== 'string' ||
        opts.D.trim().length < 1
      ) {
        issues.push({ path: [i, 'options'], issue: 'Options A, B, C, and D are required' });
      }
      if (isPlainObject(opts) && Object.values(opts).some(value => typeof value !== 'string' || value.length > 10000)) issues.push({path:[i,'options'],issue:'Each option must be bounded text'});
      for (const field of ['passageTitle','passageContent'] as const) if (item[field] !== undefined && (typeof item[field] !== 'string' || (item[field] as string).length > 20000)) issues.push({path:[i,field],issue:'Passage fields must be bounded text'});
      if (item.examYear !== undefined && item.examYear !== null && (!Number.isInteger(item.examYear) || Number(item.examYear)<1978 || Number(item.examYear)>2100)) issues.push({path:[i,'examYear'],issue:'Invalid exam year'});
      if (item.imageUrl) {
        try { const url=new URL(String(item.imageUrl)); if(url.protocol!=='https:' || url.username || url.password || url.hostname!=='bqumnaoiiukifvanoonm.supabase.co' || !url.pathname.startsWith('/storage/v1/object/public/')) throw new Error(); }
        catch { issues.push({path:[i,'imageUrl'],issue:'Only HTTPS public media from the configured project is allowed'}); }
      }
      const correctOption = item.correctOption;
      if (
        correctOption !== 'A' &&
        correctOption !== 'B' &&
        correctOption !== 'C' &&
        correctOption !== 'D'
      ) {
        issues.push({ path: [i, 'correctOption'], issue: 'correctOption must be A, B, C, or D' });
      }
      const explanation = typeof item.explanation === 'string' ? item.explanation.trim() : '';
      if (explanation.length < 5 || explanation.length > 20000) {
        issues.push({
          path: [i, 'explanation'],
          issue: 'Detailed explanation is required',
        });
      }

      if (issues.length === 0) {
        results.push({
          subjectCode,
          topicTitle,
          stem,
          imageUrl: typeof item.imageUrl === 'string' ? item.imageUrl : null,
          difficulty: difficulty as 'easy' | 'medium' | 'hard',
          examYear: typeof item.examYear === 'number' ? item.examYear : null,
          options: {
            A: (opts as Record<string, string>).A,
            B: (opts as Record<string, string>).B,
            C: (opts as Record<string, string>).C,
            D: (opts as Record<string, string>).D,
          },
          correctOption: correctOption as 'A' | 'B' | 'C' | 'D',
          explanation,
          passageTitle: typeof item.passageTitle === 'string' ? item.passageTitle : null,
          passageContent: typeof item.passageContent === 'string' ? item.passageContent : null,
        });
      }
    }

    if (issues.length > 0) return failIssues(issues);
    return { success: true, data: results };
  },
};

export type { SingleQuestionImport };
