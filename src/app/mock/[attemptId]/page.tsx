import { getCurrentUser } from "@/lib/supabase/current-user";
import { redirect } from "next/navigation";
import { startMockAttempt } from "@/app/actions/exam";
import { ExamSimulator } from "../exam-simulator";

export const metadata = {
  title: "Active Examination Hall — JAMBPrep",
  description: "Live 120-minute Computer-Based Test simulation with 8-key desktop controls.",
};

interface MockAttemptPageProps {
  params: Promise<{ attemptId: string }>;
}

export default async function MockAttemptPage({ params }: MockAttemptPageProps) {
  const { attemptId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Load or rehydrate the attempt session
  const payload = await startMockAttempt(false, attemptId);

  const studentName =
    user.user_metadata?.display_name || user.email?.split("@")[0] || "Candidate";

  return <ExamSimulator initialPayload={payload} studentName={studentName} />;
}
