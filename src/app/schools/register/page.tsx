"use client";

import { useState } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { PolicyLinks } from "@/components/legal-page";
import { createClient } from "@/lib/supabase/client";
import { 
  ArrowLeft, 
  ArrowUpRight, 
  Check, 
  Target, 
  ArrowRight,
  Eye, 
  EyeOff,
  AlertCircle,
  Loader2
} from "lucide-react";

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", 
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT Abuja", "Gombe", 
  "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", 
  "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", 
  "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"
];

export default function SchoolRegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    const formData = new FormData(e.currentTarget);
    const cleanSchoolName = (formData.get("schoolName") as string)?.trim() || "";
    const schoolType = (formData.get("schoolType") as string)?.trim() || "secondary_school";
    const state = (formData.get("state") as string)?.trim() || "Lagos";
    const cleanAdminName = (formData.get("adminName") as string)?.trim() || "";
    const cleanEmail = (formData.get("email") as string)?.trim().toLowerCase() || "";
    const password = (formData.get("password") as string) || "";

    if (!cleanSchoolName || cleanSchoolName.length < 2) {
      setError("Please enter a valid school or institution name.");
      setIsPending(false);
      return;
    }
    if (!cleanAdminName || cleanAdminName.length < 2) {
      setError("Please enter the administrator / principal full name.");
      setIsPending(false);
      return;
    }
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Please enter a valid official email address.");
      setIsPending(false);
      return;
    }
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters long.");
      setIsPending(false);
      return;
    }

    const prefix = cleanSchoolName.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase() || "XYZ";
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const randomBytes = new Uint8Array(6);
    crypto.getRandomValues(randomBytes);
    const randomSuffix = Array.from(randomBytes, (b) => alphabet[b % alphabet.length]).join("");
    const schoolCode = `SCH-${prefix}${randomSuffix}`;

    try {
      const supabase = createClient();

      // Preflight check: prevent duplicate accounts or cross-role collisions
      try {
        const { data: emailCheck } = await supabase.rpc("check_email_availability", {
          check_email: cleanEmail,
        });

        if (emailCheck && emailCheck.exists) {
          if (emailCheck.has_school || emailCheck.role === "school_admin") {
            setError(
              "A school administration account with this email already exists. Please sign in to your school portal."
            );
          } else {
            setError(
              `An account with this email is already registered as a ${emailCheck.role || "student"}. Please use a dedicated official administrator email or sign in.`
            );
          }
          setIsPending(false);
          return;
        }
      } catch (checkErr) {
        console.warn("Email preflight check warning:", checkErr);
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            role: "school_admin",
            display_name: cleanAdminName,
            school_name: cleanSchoolName,
            school_type: schoolType,
            state,
            school_code: schoolCode,
          },
        },
      });

      if (authError) {
        setError(authError.message || "Failed to create school account.");
        setIsPending(false);
        return;
      }

      // Security check: Supabase returns user with empty identities when email already exists without throwing
      if (authData?.user && Array.isArray(authData.user.identities) && authData.user.identities.length === 0) {
        setError(
          "An account with this email already exists. Please sign in to the portal instead of creating a new registration."
        );
        setIsPending(false);
        return;
      }

      // Eagerly provision the school record on the Cloudflare Worker so invite links (?school=SCH-XXXX) work immediately
      try {
        const apiBase =
          process.env.NEXT_PUBLIC_API_BASE_URL ||
          "https://jambprep-api-foundation.abdulquddus-akanbi.workers.dev";
        const accessToken = authData?.session?.access_token;
        if (accessToken) {
          await fetch(`${apiBase}/api/v1/schools/register`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              schoolName: cleanSchoolName,
              schoolCode,
              schoolType,
              state,
              adminName: cleanAdminName,
              email: cleanEmail,
            }),
          });
        }
      } catch {
        // Fallback auto-provisioning still runs on dashboard load if offline
      }

      window.location.assign("/schools/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "A network error occurred. Please try again.");
      setIsPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafbf7] text-[#092E28] lg:h-screen lg:overflow-hidden lg:flex lg:flex-col">
      {/* Header matching student auth-shell - fixed at top */}
      <header className="shell flex min-h-20 sm:min-h-24 items-center justify-between gap-4 py-4 shrink-0">
        <Link 
          href="/schools" 
          aria-label="JAMBPrep schools home" 
          className="flex items-center gap-2 text-xl font-bold tracking-tight"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-[#116149] text-white">
            <BrandMark size={36} />
          </span>
          <span>JAMBPrep</span>
          <span className="ml-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-[#116149]">
            For Schools
          </span>
        </Link>
        <Link 
          href="/schools/login" 
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-emerald-950/15 px-4 text-sm font-semibold hover:bg-white transition"
        >
          Sign in to portal <ArrowUpRight size={15} />
        </Link>
      </header>

      {/* Main 2-column grid - fill viewport on desktop while right form scrolls */}
      <main className="shell grid items-start gap-10 pb-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16 xl:gap-20 lg:flex-1 lg:min-h-0 lg:pb-4">
        {/* Left Editorial Card - fixed/non-scrolling on desktop */}
        <aside className="relative hidden min-w-0 flex-col justify-between self-stretch rounded-[2rem] bg-[#102f29] p-8 text-white lg:flex xl:p-10 shadow-xl overflow-hidden shrink-0">
          <div className="entrance">
            <p className="text-[11px] font-semibold tracking-[.16em] text-[#e7b85a]">
              INSTITUTIONAL COHORT LICENSING
            </p>
            <h2 className="mt-6 text-4xl xl:text-5xl leading-[1.12] font-medium tracking-tight">
              Equip your hall.<br />
              <span className="serif-accent text-[#e7b85a]">Empower every candidate.</span>
            </h2>
            <p className="mt-4 max-w-sm leading-relaxed text-sm text-emerald-50/75">
              Transform your school computer lab into an authentic UTME mock examination centre with unified scoring and real-time teacher diagnostics.
            </p>
          </div>

          <div className="entrance delay-2 rounded-2xl border border-white/15 bg-white/5 p-5 my-auto">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">3 simple steps to lab launch</p>
              <Target size={18} className="text-[#e7b85a]" />
            </div>
            <ol className="mt-4 space-y-4">
              {[
                "Register your school or tutorial centre",
                "Import your student roster (CSV, manual, or invite link)",
                "Activate cohort licenses with one-time Paystack checkout"
              ].map((step, index) => (
                <li key={step} className="flex items-center gap-3 text-xs sm:text-sm text-emerald-50/90">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-white/20 text-xs text-[#e7b85a]">
                    0{index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          <p className="flex items-center gap-2 text-xs text-emerald-50/70 pt-2">
            <Check size={15} />
            ₦1,500 / student / month · Zero lab servers required.
          </p>
        </aside>

        {/* Right Form Section - scrollable independently on desktop */}
        <section className="entrance delay-1 flex min-w-0 flex-col self-stretch py-2 sm:py-4 lg:pr-6 lg:overflow-y-auto lg:max-h-full scrollbar-thin">
          <div className="mx-auto w-full max-w-md pb-6">
            <Link 
              href="/schools" 
              className="mb-8 inline-flex min-h-11 items-center gap-2 text-xs font-medium text-slate-500 hover:text-slate-800 transition"
            >
              <ArrowLeft size={14} /> Back to schools overview
            </Link>

            <p className="eyebrow">INSTITUTIONAL ONBOARDING</p>
            <h1 className="mt-4 text-4xl leading-tight font-semibold tracking-[-.045em] sm:text-5xl">
              Register your<br />
              <span className="serif-accent text-[#116149]">school or centre.</span>
            </h1>
            <p className="mt-4 mb-8 text-sm leading-relaxed text-slate-600">
              Create an administrative account to enroll students, conduct synchronized computer lab mocks, and track syllabus diagnostics.
            </p>

            {error && (
              <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-800 flex items-start gap-2.5">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="schoolName" className="block text-sm font-medium text-slate-700 mb-1.5">
                  School or Institution Name *
                </label>
                <input
                  id="schoolName"
                  name="schoolName"
                  type="text"
                  required
                  placeholder="e.g. ABC College or XYZ Schools"
                  className="w-full min-h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm text-[#092E28] placeholder:text-slate-400 focus:border-[#116149] focus:ring-2 focus:ring-emerald-700/15 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="schoolType" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Institution Type
                  </label>
                  <select
                    id="schoolType"
                    name="schoolType"
                    defaultValue="secondary_school"
                    className="w-full min-h-12 rounded-xl border border-slate-300 bg-white px-3 text-sm text-[#092E28] focus:border-[#116149] focus:ring-2 focus:ring-emerald-700/15 transition-colors cursor-pointer"
                  >
                    <option value="secondary_school">Secondary School</option>
                    <option value="tutorial_centre">Tutorial Centre</option>
                    <option value="cbt_training_hub">CBT Training Centre</option>
                    <option value="state_ministry_partner">Government / NGO Cohort</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-slate-700 mb-1.5">
                    State *
                  </label>
                  <select
                    id="state"
                    name="state"
                    defaultValue="Lagos"
                    className="w-full min-h-12 rounded-xl border border-slate-300 bg-white px-3 text-sm text-[#092E28] focus:border-[#116149] focus:ring-2 focus:ring-emerald-700/15 transition-colors cursor-pointer"
                  >
                    {NIGERIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="adminName" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Administrator / Principal Full Name *
                </label>
                <input
                  id="adminName"
                  name="adminName"
                  type="text"
                  required
                  placeholder="e.g. Dr. Olumide Adeleke"
                  className="w-full min-h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm text-[#092E28] placeholder:text-slate-400 focus:border-[#116149] focus:ring-2 focus:ring-emerald-700/15 transition-colors"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Official Admin Email *
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="admin@school.edu.ng"
                  className="w-full min-h-12 rounded-xl border border-slate-300 bg-white px-4 text-sm text-[#092E28] placeholder:text-slate-400 focus:border-[#116149] focus:ring-2 focus:ring-emerald-700/15 transition-colors"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Administrative Password *
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    placeholder="At least 8 characters"
                    className="w-full min-h-12 rounded-xl border border-slate-300 bg-white pl-4 pr-11 text-sm text-[#092E28] placeholder:text-slate-400 focus:border-[#116149] focus:ring-2 focus:ring-emerald-700/15 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 flex size-9 items-center justify-center text-slate-400 hover:text-slate-700 transition"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#116149] px-6 text-sm font-semibold text-white shadow-md hover:bg-[#0c4a37] disabled:opacity-50 transition cursor-pointer"
                >
                  {isPending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Creating School Account...
                    </>
                  ) : (
                    <>
                      Create School Account <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </div>
            </form>

            <p className="mt-7 border-t border-emerald-950/10 pt-6 text-sm text-slate-600">
              Already registered your school?{" "}
              <Link 
                href="/schools/login" 
                className="font-semibold text-[#116149] underline decoration-emerald-800/30 underline-offset-4"
              >
                Sign in to school portal
              </Link>
            </p>

            <p className="mt-4 text-xs leading-relaxed text-slate-500">
              Institutional data is strictly encrypted. Student performance analytics are private to your registered school administrators.
            </p>
          </div>
        </section>
      </main>

      {/* Footer matching school login page */}
      <footer className="shell flex flex-col gap-4 py-3 text-xs leading-relaxed text-slate-500 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <span>JAMBPrep for Schools · Institutional UTME examination & diagnostics platform.</span>
        <PolicyLinks />
      </footer>
    </div>
  );
}
