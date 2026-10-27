import { BrandMark } from "@/components/brand-mark";
import { BrowserAccountBoundary } from "@/components/browser-account-boundary";
import { OnboardingWizard } from "./onboarding-wizard";

export const metadata = {
  title: "Set Up Your Subjects & Target — JAMBPrep",
  description: "Select your 4 UTME subjects and target score to personalize your practice and mock simulations.",
};

export default function OnboardingPage() {
  return (
    <BrowserAccountBoundary><div className="min-h-screen bg-[#F6F8F5] text-[#092E28] flex flex-col justify-between p-4 sm:p-6">
      <header className="max-w-3xl w-full mx-auto pt-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-xl bg-[#116149] text-white">
            <BrandMark size={32}/>
          </span>
          <span>JAMBPrep</span>
        </div>
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 text-[#116149]">
          Your study profile
        </span>
      </header>

      <main className="max-w-3xl w-full mx-auto my-6 sm:my-8">
        <div className="rounded-3xl border border-emerald-950/10 bg-white p-6 sm:p-10 shadow-xs">
          <OnboardingWizard />
        </div>
      </main>

      <footer className="text-center py-4 text-xs text-slate-400">
        Choose the subjects you intend to take in UTME.
      </footer>
    </div></BrowserAccountBoundary>
  );
}
