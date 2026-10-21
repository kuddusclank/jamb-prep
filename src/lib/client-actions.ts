/**
 * Browser-safe client action bridge for static export (`output: "export"`).
 *
 * Why this module exists:
 * - Next.js 16.4 `output: "export"` forbids importing `"use server"` modules anywhere
 *   in the compiled client/page graph.
 * - `src/app/actions/*.ts` remain on disk untouched for SSR coexistence and regression tests.
 * - T04 auth/session/bootstrap operations use the real browser Supabase client and
 *   native Worker API client (`src/lib/api/native-client.ts`).
 * - Domain operations use authenticated native API endpoints and explicit errors.
 */

import { getAccountCoordinator } from "@/lib/auth/account-coordinator";
import { createNativeApiClient } from "@/lib/api/native-client";
import { computeBootstrapIdempotencyKey } from "@/lib/auth/session-manager";
import { getDefaultBrowserSessionManager } from "@/lib/auth/session-manager";
import { detachAndUnsubscribeBrowserPush } from "@/lib/pwa/push-client";
import type { ExamQuestion } from "@/features/exam-engine/domain/types";

export interface PracticeQuestionItem {
  imageUrl?: string | null;
  imageAlt?: string | null;
  id: string;
  subjectCode: string;
  subjectName: string;
  topicId: string;
  topicTitle: string;
  stem: string;
  difficulty: string;
  passage: {
    title: string | null;
    content: string;
  } | null;
  options: {
    id: string;
    label: "A" | "B" | "C" | "D";
    content: string;
  }[];
}

export interface PracticeAnswerResult {
  isCorrect: boolean;
  correctOption: "A" | "B" | "C" | "D";
  explanation: string;
}

export interface ExamSessionPayload {
  selectionWarnings?:string[];
  attemptId: string;
  examConditions: boolean;
  startedAt: string;
  expiresAtTimestamp: number;
  questions: ExamQuestion[];
  initialAnswers: Record<string, string>;
  initialLabels: Record<string, "A" | "B" | "C" | "D">;
}

export interface CheckoutPricing {
  originalAmountKobo: number;
  finalAmountKobo: number;
  originalAmountNaira: number;
  finalAmountNaira: number;
  hasDiscount: boolean;
  discountReason: string | null;
  rewardId: string | null;
  isAlreadyPremium: boolean;
  currentExpiresAt: string | null;
}

export interface VerifyPaymentResult {
  success: boolean;
  message: string;
  expiresAt?: string;
}

/**
 * Browser-safe sign-out handler that clears private localStorage/sessionStorage
 * keys and terminates the active Supabase browser session before redirecting to `/login`.
 */
export async function signOutAction(): Promise<void> {
  if (typeof window !== 'undefined') {
    const pending = Object.keys(localStorage).some(key => key.startsWith('jamb_outbox_') && (() => { try { return JSON.parse(localStorage.getItem(key) ?? '[]').length > 0; } catch { return true; } })());
    if (pending && !window.confirm('Some exam answers have not synced. Signing out will remove them from this device. Sign out anyway?')) return;
  }
  await detachAndUnsubscribeBrowserPush({ notifyServer: true }).catch(() => undefined);
  await getDefaultBrowserSessionManager().signOut();
  if (typeof window !== "undefined") {
    window.location.assign("/login");
  }
}

/**
 * Browser-safe fallback provisioning helper for `RegisterForm`.
 */
export async function provisionRegisteredUserAction(
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const displayName = ((formData.get("displayName") as string) || "").trim();
  const referralCodeRaw = ((formData.get("referralCode") as string) || "").trim().toUpperCase();

  if (!displayName || displayName.length < 2) {
    return { success: false, error: "Please enter a valid full name." };
  }

  try {
    const manager = getDefaultBrowserSessionManager();
    await manager.initialize();
    const token = await manager.getValidAccessToken();
    const user = manager.getState().user;
    const session = user && token ? { user, access_token: token } : null;
    if (!session?.user?.id || !session.access_token) {
      return {
        success: false,
        error: "Your session has expired. Please sign in to complete account setup.",
      };
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
    if (!baseUrl) {
      return { success: false, error: "Account setup is temporarily unavailable. Please try again later." };
    }
    if (baseUrl) {
      const apiClient = createNativeApiClient({ baseUrl });
      const idempotencyKey = await computeBootstrapIdempotencyKey(
        session.user.id,
        displayName,
        referralCodeRaw || null
      );
      const result = await apiClient.bootstrapAccount({
        displayName,
        referralCode: referralCodeRaw || null,
        idempotencyKey,
        accessToken: session.access_token,
      });
      if (!result.provisioned || result.userId !== session.user.id) {
        return { success: false, error: "Account setup could not be confirmed. Please retry." };
      }
    }
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Your account was created, but profile setup could not complete. Please click Create account again to retry.",
    };
  }
}

/**
 * Staged T06 onboarding action bridge.
 */
export async function saveOnboardingAction(
  _prevState: unknown,
  formData: FormData
): Promise<{ error?: string } | null> {
  const electivesRaw = formData.get("electives") as string;
  const targetScoreRaw = Number(formData.get("targetScore") || 280);

  let selectedNames: string[] = [];
  try {
    selectedNames = JSON.parse(electivesRaw || "[]");
  } catch {
    return { error: "Invalid subject selection format." };
  }

  const uniqueElectives = Array.from(new Set(selectedNames.filter((s) => s !== "Use of English")));
  if (uniqueElectives.length !== 3) {
    return {
      error:
        "Please select exactly 3 additional UTME elective subjects alongside Use of English.",
    };
  }

  if (Number.isNaN(targetScoreRaw) || targetScoreRaw < 100 || targetScoreRaw > 400) {
    return { error: "Target score must be between 100 and 400." };
  }

  return {
    error:
      "Subject combination validated locally. Your selection has not been saved. Account setup is temporarily unavailable.",
  };
}

/**
 * Metered practice issue bridge.
 */
export interface PracticeSession {sessionId:string;questions:PracticeQuestionItem[];status?:string;expiresAt?:string;answers?:{questionId:string;selectedOptionId:string|null;feedback:PracticeAnswerResult|null}[];}
export async function getPracticeQuestions(subjectCode:string,topicSlug?:string,count=5):Promise<PracticeSession> {
 return getAccountCoordinator().mutate<PracticeSession>('/api/v1/practice/session',{subjectCode,topicSlug:topicSlug??null,count});
}
export async function resumePracticeSession(sessionId:string):Promise<PracticeSession> {
 return getAccountCoordinator().loadResource<PracticeSession>(`/api/v1/practice/sessions/${sessionId}`);
}
export async function finishPracticeSession(sessionId:string,abandon=false) {
 return getAccountCoordinator().mutate(`/api/v1/practice/sessions/${sessionId}/finish`,{abandon});
}
export async function checkPracticeAnswer(sessionId:string,questionId:string,selectedOption:string):Promise<PracticeAnswerResult> {
 return getAccountCoordinator().mutate<PracticeAnswerResult>('/api/v1/practice/check',{sessionId,questionId,selectedOption});
}

/**
 * Weekly 250-Question Practice Pack API Bridges
 */
export interface WeeklyPackResponse {
  packId: string;
  weekKey: string;
  status: string;
  expiresAt: string;
  subjects: Array<{ id: string; code: string; name: string; isCompulsory: boolean; questionCount: number }>;
  questions: Array<PracticeQuestionItem & Record<string, unknown>>;
  feedback: Record<string, { correctOption: string; explanation: string }>;
  answers: Record<string, { selectedOption: string; answeredAt: string }>;
  progress: {
    total: number;
    answered: number;
    bySubject: Record<string, { total: number; answered: number }>;
  };
}

export async function fetchWeeklyPackFromServer(): Promise<WeeklyPackResponse> {
  return getAccountCoordinator().loadResource<WeeklyPackResponse>('/api/v1/practice/weekly-pack');
}

export interface WeeklyPackSyncPayloadItem {
  questionId: string;
  selectedOption: 'A' | 'B' | 'C' | 'D';
  answeredAt?: string;
  timeSpentSeconds?: number;
}

export interface WeeklyPackSyncResultResponse {
  success: boolean;
  syncedCount: number;
  totalAnswered: number;
  totalQuestions: number;
  isCompleted: boolean;
  streakUpdated: boolean;
}

export async function syncWeeklyPackToServer(
  packId: string,
  answers: WeeklyPackSyncPayloadItem[]
): Promise<WeeklyPackSyncResultResponse> {
  return getAccountCoordinator().mutate<WeeklyPackSyncResultResponse>('/api/v1/practice/weekly-pack/sync', {
    packId,
    answers,
  });
}
export async function getMockPayload(attemptId:string):Promise<ExamSessionPayload & {initialRevisions:Record<string,number>;serverNow:number;status:string}> {
  const result = (await getAccountCoordinator().api.request<{attemptId:string;selectionWarnings?:string[];examConditions:boolean;startedAt:string;expiresAt:string;serverNow:number;status:string;questions:(ExamQuestion & {selectedOptionId?:string;revision:number})[]}>(`/api/v1/exams/attempts/${attemptId}`)).data;
  const initialAnswers:Record<string,string>={},initialLabels:Record<string,'A'|'B'|'C'|'D'>={},initialRevisions:Record<string,number>={};
  for(const question of result.questions) { initialRevisions[question.id]=question.revision; if(question.selectedOptionId){initialAnswers[question.id]=question.selectedOptionId; const label=question.options.find((option)=>option.id===question.selectedOptionId)?.label;if(label) initialLabels[question.id]=label;} }
  return {...result,expiresAtTimestamp:Date.now()+Math.max(0,new Date(result.expiresAt).getTime()-result.serverNow),initialAnswers,initialLabels,initialRevisions};
}
export async function startMockAttempt(examConditions=false):Promise<ExamSessionPayload> {
  const result=await getAccountCoordinator().mutate<{attemptId:string}>('/api/v1/exams/attempts',{examConditions});
  return getMockPayload(result.attemptId);
}
export async function syncExamAnswer(attemptId:string,questionId:string,selectedOptionId:string|null,revision=1):Promise<{success:boolean;reason?:string;revision?:number}> {
  const result=(await getAccountCoordinator().api.request<{acknowledged:boolean;revision:number}>(`/api/v1/exams/attempts/${attemptId}/answers`,{method:'PUT',body:{questionId,selectedOptionId,revision},idempotencyKey:`answer-${attemptId}-${questionId}-${revision}`})).data;
  return {success:result.acknowledged,revision:result.revision};
}
export async function recordMockInterruption(attemptId:string,episodeId:string,ended:boolean):Promise<void> {
  await getAccountCoordinator().api.request(`/api/v1/exams/attempts/${attemptId}/interruptions`,{method:'POST',body:{episodeId,ended},idempotencyKey:`episode-${episodeId}-${ended?'end':'start'}`});
}
export async function submitMockExam(attemptId:string):Promise<{success:boolean;aggregateScore:number;subjectBreakdowns:{subjectCode:string;correct:number;total:number;scaledScore:number}[]}> {
  const result=await getAccountCoordinator().mutate<{totalScore:number}>(`/api/v1/exams/attempts/${attemptId}/submit`,{});
  return {success:true,aggregateScore:result.totalScore,subjectBreakdowns:[]};
}

/**
 * Owned server pricing bridge.
 */
export async function getCheckoutPricingAction(): Promise<CheckoutPricing> {
  return getAccountCoordinator().loadResource<CheckoutPricing>('/api/v1/pricing');
}

/**
 * Idempotent Paystack checkout bridge.
 */
export async function initializePaystackCheckoutAction(): Promise<{
  authorizationUrl?: string;
  confirmationUrl?: string;
  reference?: string;
  isDemo?: boolean;
}> {
  return getAccountCoordinator().mutate('/api/v1/payments/checkout', {});
}

/**
 * Owned Paystack verification bridge.
 */
export async function verifyPaystackPaymentAction(
  reference: string
): Promise<VerifyPaymentResult> {
  if (!reference || reference.trim().length === 0) {
    return { success: false, message: "Invalid payment reference." };
  }
  try { return await getAccountCoordinator().mutate<VerifyPaymentResult>('/api/v1/payments/verify', { reference }); }
  catch (error) { return {success:false,message:error instanceof Error ? error.message : 'Payment verification failed. Please retry.'}; }
}

/**
 * Validated profile update bridge.
 */
export async function updateProfileAction(
  _prevState: unknown,
  formData: FormData
): Promise<{ error?: string; success?: boolean; message?: string } | null> {
  const displayName = ((formData.get("displayName") as string) || "").trim();
  const targetScore = Number(formData.get("targetScore") || 280);

  if (!displayName || displayName.length < 2) {
    return { error: "Display name must be at least 2 characters." };
  }
  if (Number.isNaN(targetScore) || targetScore < 100 || targetScore > 400) {
    return { error: "Target UTME score must be between 100 and 400." };
  }

  try {
    await getAccountCoordinator().mutate('/api/v1/profile', { displayName, targetScore, targetInstitution: String(formData.get('targetInstitution') ?? '').trim() || null, targetCourse: String(formData.get('targetCourse') ?? '').trim() || null }, 'PATCH');
    return { success: true, message: 'Your profile has been saved.' };
  } catch (error) { return { error: error instanceof Error ? error.message : 'Unable to save. Please retry.' }; }
}

/**
 * Provider-confirmed subscription cancellation bridge.
 */
export async function cancelSubscriptionAction(): Promise<{
  error?: string;
  success?: boolean;
  message?: string;
}> {
  try { return await getAccountCoordinator().mutate('/api/v1/payments/subscription/cancel', {}); }
  catch (error) { return {error:error instanceof Error ? error.message : 'Unable to confirm cancellation. Please retry.'}; }
}
