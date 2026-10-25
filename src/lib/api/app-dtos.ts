import type { CoachInsights } from '../../../worker/services/coach-service';
import type { SubscriptionStatus, SchoolAffiliation } from '../../../worker/services/subscription-service';
import type { StudyScheduleViewResponse } from '../../../worker/services/study-schedule-service';
export type { CoachInsights, SubscriptionStatus, SchoolAffiliation, StudyScheduleViewResponse };
export interface DashboardData { userId: string; subscription: SubscriptionStatus; coach: CoachInsights; qualifiedReferrals: number; has50PercentReward: boolean; studyStreak?: StudyScheduleViewResponse | null; }
export interface ProfileData { profile: { id: string; display_name: string; email: string; role: string } | null; preferences: { target_score: number; target_institution: string | null; target_course: string | null } | null; subscription: SubscriptionStatus; studyStreak?: StudyScheduleViewResponse | null; }
export interface EnrolledData { subjects: { subject_id: string; subject_code: string; subject_name: string; is_compulsory: boolean }[]; }
export interface ReferralData { code: string | null; totalReferred: number; qualifiedCount: number; referrals: { status: string; created_at: string; qualified_at: string | null }[]; rewards: { id: string; status: string; reward_type: string }[]; }
