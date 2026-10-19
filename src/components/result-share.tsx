"use client";

import { useEffect, useState } from "react";
import { Share2, Loader2 } from "lucide-react";
import { useBrowserAccount } from "@/components/browser-account-boundary";
import { getAccountCoordinator } from "@/lib/auth/account-coordinator";
import { SITE_URL } from "@/lib/seo";
import { practiceShareText, mockShareText } from "@/lib/share";
import { generateResultCardImage } from "@/lib/result-card-image";

export interface ResultShareProps {
  text?: string;
  type?: "practice" | "mock";
  subjectName?: string;
  topicTitle?: string;
  score?: number;
  totalQuestions?: number;
  percentage?: number;
  feedbackText?: string;
  totalScore?: number;
  timeSpentMinutes?: number;
  subjects?: { name: string; score: number }[];
}

export function ResultShare(props: ResultShareProps) {
  const [status, setStatus] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const { identity } = useBrowserAccount();
  const [referralCode, setReferralCode] = useState<string | null>(identity?.referralCode || null);

  useEffect(() => {
    if (identity?.referralCode) {
      setReferralCode(identity.referralCode);
    } else if (typeof window !== "undefined") {
      getAccountCoordinator()
        .api.getSessionIdentity()
        .then((res) => {
          if (res?.referralCode) setReferralCode(res.referralCode);
        })
        .catch(() => {});
    }
  }, [identity?.referralCode]);

  const referralUrl = typeof window !== "undefined"
    ? referralCode
      ? `${window.location.origin}/register?ref=${encodeURIComponent(referralCode)}`
      : `${window.location.origin}/register/`
    : `${SITE_URL}/register/`;

  const type = props.type || "practice";

  const buildShareText = () => {
    if (props.text) {
      return props.text.includes("http") ? props.text : `${props.text}\n${referralUrl}`;
    }
    if (type === "mock") {
      return mockShareText(props.totalScore ?? 0, referralUrl);
    }
    return practiceShareText(
      props.score ?? 0,
      props.totalQuestions ?? 0,
      props.subjectName || "UTME",
      props.topicTitle,
      referralUrl
    );
  };

  async function handleShare() {
    if (isSharing) return;
    setIsSharing(true);
    setStatus("");

    try {
      const shareMessage = buildShareText();
      const blob = await generateResultCardImage({
        type,
        subjectName: props.subjectName,
        topicTitle: props.topicTitle,
        score: props.score,
        totalQuestions: props.totalQuestions,
        percentage: props.percentage,
        feedbackText: props.feedbackText,
        totalScore: props.totalScore,
        timeSpentMinutes: props.timeSpentMinutes,
        subjects: props.subjects,
        referralCode,
        referralUrl,
      });

      const file = new File([blob], `jambprep-${type}-result.png`, { type: "image/png" });

      let shared = false;
      const isMobile =
        typeof navigator !== "undefined" &&
        (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || "") ||
          (typeof navigator.maxTouchPoints === "number" &&
            navigator.maxTouchPoints > 1 &&
            typeof window !== "undefined" &&
            "ontouchend" in window));

      if (isMobile && typeof navigator !== "undefined" && typeof navigator.canShare === "function") {
        try {
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: type === "mock" ? "My UTME Mock Result" : "My JAMBPrep Practice Result",
              text: shareMessage,
            });
            shared = true;
          }
        } catch (shareErr) {
          if (shareErr instanceof Error && shareErr.name === "AbortError") {
            setIsSharing(false);
            return;
          }
        }
      }

      if (!shared) {
        // Fallback for desktop or non-file share: download image & copy referral link
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = `jambprep-${type}-result.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);

        try {
          if (navigator.clipboard) {
            await navigator.clipboard.writeText(shareMessage);
            setStatus("Result image saved & invite link copied to clipboard!");
          } else {
            setStatus("Result image saved!");
          }
        } catch {
          setStatus("Result image saved!");
        }
      } else {
        setStatus("Result shared successfully!");
      }

      setTimeout(() => setStatus(""), 4000);
    } catch {
      // General fallback
      try {
        const shareMessage = buildShareText();
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(shareMessage);
          setStatus("Invite link copied to clipboard!");
        } else {
          setStatus("Unable to generate share image.");
        }
      } catch {
        setStatus("Unable to share.");
      }
      setTimeout(() => setStatus(""), 4000);
    } finally {
      setIsSharing(false);
    }
  }

  return (
    <div className="my-6 flex flex-col items-center">
      <button
        type="button"
        onClick={() => void handleShare()}
        disabled={isSharing}
        className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-full bg-[#116149] px-8 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0e523e] transition-all cursor-pointer disabled:opacity-60"
      >
        {isSharing ? (
          <>
            <Loader2 size={18} className="animate-spin" /> Preparing share...
          </>
        ) : (
          <>
            <Share2 size={18} /> Share Result
          </>
        )}
      </button>
      {status && (
        <p role="status" className="mt-2.5 text-center text-xs font-medium text-emerald-800">
          {status}
        </p>
      )}
    </div>
  );
}
