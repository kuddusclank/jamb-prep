"use client";
import { StudyWorkspace } from "@/components/study-workspace";
import { ProfileClient } from "./profile-client";
import { useApiResource, ResourceStatus } from "@/lib/api/use-api-resource";
import type { ProfileData, EnrolledData } from "@/lib/api/app-dtos";
export default function ProfilePage() {
  const profile = useApiResource<ProfileData>('/api/v1/profile');
  const enrollment = useApiResource<EnrolledData>('/api/v1/practice/subjects');
  const data = profile.data;
  if (!data?.profile || !data.preferences || !enrollment.data) return <StudyWorkspace><ResourceStatus error={profile.error ?? enrollment.error} retry={() => { profile.retry(); enrollment.retry(); }} /></StudyWorkspace>;
  return <StudyWorkspace><main className="shell section-space"><ProfileClient initialProfile={{ displayName: data.profile.display_name, email: data.profile.email }} initialPreferences={{ targetScore: data.preferences.target_score, targetInstitution: data.preferences.target_institution, targetCourse: data.preferences.target_course }} subscription={data.subscription} enrolledSubjects={enrollment.data.subjects.map((subject) => ({ name: subject.subject_name, code: subject.subject_code, isCompulsory: subject.is_compulsory }))} /></main></StudyWorkspace>;
}
