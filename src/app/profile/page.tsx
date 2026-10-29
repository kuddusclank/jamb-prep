"use client";

import { useEffect } from "react";
import { StudyWorkspace } from "@/components/study-workspace";
import { ProfileClient } from "./profile-client";
import { OfflineProfileView } from "./offline-profile-view";
import { OfflineGatedNotice } from "@/app/dashboard/offline-gated-notice";
import { useBrowserAccount } from "@/components/browser-account-boundary";
import { useApiResource, ResourceStatus } from "@/lib/api/use-api-resource";
import { useNetworkStatus, isNetworkOrTimeoutError } from "@/lib/offline/network-state";
import { getOfflineProfile, isOfflineAccessValid, saveOfflineProfile } from "@/lib/offline/offline-profile-cache";
import type { ProfileData, EnrolledData } from "@/lib/api/app-dtos";

export default function ProfilePage() {
  const profile = useApiResource<ProfileData>('/api/v1/profile');
  const enrollment = useApiResource<EnrolledData>('/api/v1/practice/subjects');
  const account = useBrowserAccount();
  const { isOffline } = useNetworkStatus();

  const offlineProfile = getOfflineProfile(account.identity?.user?.id || account.session.user?.id);
  const userId = account.identity?.user?.id || account.session.user?.id || offlineProfile?.userId;
  const offlineValidity = isOfflineAccessValid(offlineProfile);

  // Auto-persist snapshot when online data arrives
  useEffect(() => {
    if (profile.data?.profile && userId) {
      saveOfflineProfile({
        userId,
        profile: profile.data,
        enrolledSubjects: enrollment.data?.subjects?.map((s) => ({
          id: s.subject_id,
          code: s.subject_code,
          name: s.subject_name,
          isCompulsory: s.is_compulsory,
        })),
      });
    }
  }, [profile.data, enrollment.data, userId]);

  const isNetworkFailure =
    (profile.error ? isNetworkOrTimeoutError(profile.error) : false) ||
    (enrollment.error ? isNetworkOrTimeoutError(enrollment.error) : false);

  // Automatically refresh online data when connectivity returns
  useEffect(() => {
    if (!isOffline && isNetworkFailure) {
      profile.retry();
      enrollment.retry();
    }
  }, [isOffline, isNetworkFailure, profile.retry, enrollment.retry]);

  // Switch to offline profile view only when there is no profile/enrollment data loaded in memory
  if ((isOffline && (!profile.data || !enrollment.data)) || (isNetworkFailure && (!profile.data || !enrollment.data))) {
    if (offlineValidity.valid) {
      return (
        <StudyWorkspace>
          <OfflineProfileView profile={offlineValidity.profile} />
        </StudyWorkspace>
      );
    }
    return (
      <StudyWorkspace>
        <OfflineGatedNotice
          reason={offlineValidity.reason}
          profile={offlineValidity.profile}
          onRetry={() => {
            profile.retry();
            enrollment.retry();
          }}
        />
      </StudyWorkspace>
    );
  }

  const data = profile.data;
  if (!data?.profile || !data.preferences || !enrollment.data) {
    return (
      <StudyWorkspace>
        <ResourceStatus
          error={profile.error ?? enrollment.error}
          retry={() => {
            profile.retry();
            enrollment.retry();
          }}
        />
      </StudyWorkspace>
    );
  }

  return (
    <StudyWorkspace>
      <main className="shell section-space">
        <ProfileClient
          initialProfile={{ displayName: data.profile.display_name, email: data.profile.email }}
          initialPreferences={{
            targetScore: data.preferences.target_score,
            targetInstitution: data.preferences.target_institution,
            targetCourse: data.preferences.target_course,
          }}
          subscription={data.subscription}
          enrolledSubjects={enrollment.data.subjects.map((subject) => ({
            name: subject.subject_name,
            code: subject.subject_code,
            isCompulsory: subject.is_compulsory,
          }))}
        />
      </main>
    </StudyWorkspace>
  );
}
