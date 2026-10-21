"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { StudyWorkspace } from "@/components/study-workspace";
import { PracticeClient } from "./practice-client";
import { WeeklyPracticeClient } from "./weekly/weekly-practice-client";
import { useBrowserAccount } from "@/components/browser-account-boundary";
import { useApiResource, ResourceStatus } from "@/lib/api/use-api-resource";
import type { PracticeCatalogue } from "@/lib/api/practice-dtos";
import { getWeeklyPackFromIdb } from "@/lib/offline/idb-storage";
import { getCurrentWeekKey } from "@/lib/offline/weekly-pack-client";
import { getOfflineProfile, isOfflineAccessValid } from "@/lib/offline/offline-profile-cache";
import { OfflineGatedNotice } from "@/app/dashboard/offline-gated-notice";
import { useNetworkStatus, isNetworkOrTimeoutError } from "@/lib/offline/network-state";

function PracticePageContent() {
  const searchParams = useSearchParams();
  const account = useBrowserAccount();
  const userId = account.identity?.user?.id || account.session.user?.id || "";
  const { isOffline, isOnline } = useNetworkStatus();
  const [hasCachedPack, setHasCachedPack] = useState(false);
  const [checkedCache, setCheckedCache] = useState(false);

  const catalogue = useApiResource<PracticeCatalogue>("/api/v1/practice/catalogue");

  useEffect(() => {
    if (!userId) return;
    const weekKey = getCurrentWeekKey();
    void getWeeklyPackFromIdb(userId, weekKey)
      .then((pack) => {
        setHasCachedPack(Boolean(pack && pack.questions?.length > 0));
        setCheckedCache(true);
      })
      .catch(() => {
        setHasCachedPack(false);
        setCheckedCache(true);
      });
  }, [userId]);

  const offlineProfile = getOfflineProfile(userId);
  const offlineValidity = isOfflineAccessValid(offlineProfile);

  const isNetworkFailure = catalogue.error ? isNetworkOrTimeoutError(catalogue.error) : false;

  // Automatically refresh online catalogue when connectivity returns
  useEffect(() => {
    if (isOnline && isNetworkFailure) {
      catalogue.retry();
    }
  }, [isOnline, isNetworkFailure, catalogue.retry]);

  // Auto-switch to offline practice the moment internet is lost or request fails with network/timeout error
  if (isOffline || (isNetworkFailure && !catalogue.data) || (catalogue.error && !catalogue.data)) {
    // If user is not valid paid/active offline subscriber, display gated notice
    if (!offlineValidity.valid) {
      return (
        <OfflineGatedNotice
          reason={offlineValidity.reason}
          profile={offlineValidity.profile}
          onRetry={catalogue.retry}
        />
      );
    }

    if (hasCachedPack) {
      return <WeeklyPracticeClient />;
    }

    if (checkedCache && !hasCachedPack) {
      return (
        <div className="rounded-3xl border border-amber-200 bg-amber-50/70 p-8 text-center max-w-lg mx-auto space-y-4">
          <h2 className="text-xl font-bold text-[#092E28]">No Offline Questions Cached</h2>
          <p className="text-sm text-slate-600">
            Please connect to the internet once to automatically download your 250-question practice pack for offline use.
          </p>
        </div>
      );
    }
  }

  if (!catalogue.data) {
    return <ResourceStatus error={catalogue.error} retry={catalogue.retry} />;
  }

  const initialSubjectCode = searchParams.get("subject") || undefined;
  const initialTopicSlug = searchParams.get("topic") || undefined;

  return (
    <PracticeClient
      enrolledSubjects={catalogue.data.subjects}
      dailySessionUsed={catalogue.data.dailySessionUsed}
      activeSessionId={catalogue.data.activeSessionId}
      initialSessionId={searchParams.get("session") ?? undefined}
      refreshCatalogue={catalogue.retry}
      initialSubjectCode={initialSubjectCode}
      initialTopicSlug={initialTopicSlug}
      isPremium={catalogue.data.isPremium}
    />
  );
}

export default function PracticePage() {
  return (
    <StudyWorkspace>
      <main className="shell section-space">
        <Suspense
          fallback={
            <div className="rounded-3xl border border-emerald-950/10 bg-white p-8 text-center text-xs text-slate-500 max-w-2xl mx-auto">
              Loading practice workspace...
            </div>
          }
        >
          <PracticePageContent />
        </Suspense>
      </main>
    </StudyWorkspace>
  );
}
