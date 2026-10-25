"use client";

import { useApiResource } from "@/lib/api/use-api-resource";
import type { ProfileData, SchoolAffiliation } from "@/lib/api/app-dtos";

export interface AccountTierState {
  isPremium: boolean;
  isSchoolAttached: boolean;
  school: SchoolAffiliation | null;
  upgradeLabel: string;
  upgradeBadgeText: string;
  upgradeTooltip: string;
  contactAdminMessage: string;
}

export function useAccountTier(): AccountTierState {
  const profile = useApiResource<ProfileData>("/api/v1/profile");
  const subscription = profile.data?.subscription;

  const isPremium = Boolean(subscription?.isPremium);
  const isSchoolAttached = Boolean(subscription?.isSchoolAttached);
  const school = subscription?.school ?? null;

  return {
    isPremium,
    isSchoolAttached,
    school,
    upgradeLabel: isSchoolAttached ? "Contact School Admin" : "Upgrade to Pro",
    upgradeBadgeText: isSchoolAttached ? "School License" : "Upgrade to Pro",
    upgradeTooltip: isSchoolAttached
      ? `Requires an active license from ${school?.schoolName || "your school"} — contact your administrator`
      : "Pro feature — click to upgrade",
    contactAdminMessage: `Your account is enrolled under ${school?.schoolName || "your school"}. Please contact your school administrator to activate your unlimited CBT access.`,
  };
}
