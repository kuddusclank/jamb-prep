import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/current-user";
import { getUserSubscriptionStatus } from "@/lib/subscription";
import { StudyWorkspaceClient } from "./study-workspace-client";

export async function StudyWorkspace({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const subStatus = await getUserSubscriptionStatus(user.id);
  const isPremium = subStatus?.isPremium ?? false;
  return <StudyWorkspaceClient isPremium={isPremium}>{children}</StudyWorkspaceClient>;
}
