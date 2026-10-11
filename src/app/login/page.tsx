import Link from "next/link";
import { BookOpen } from "lucide-react";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Log in — JAMBPrep",
  description: "Sign in to your JAMBPrep UTME study dashboard and mock simulator.",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F6F8F5] text-[#092E28]">
      {/* Simple Top Bar */}
      <header className="shell py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-[#116149] text-white">
            <BookOpen size={18} />
          </span>
          <span className="text-lg font-bold tracking-tight">
            jamb<span className="text-[#116149]">prep</span>.
          </span>
        </Link>
        <Link
          href="/register"
          className="text-xs font-semibold text-[#116149] hover:underline"
        >
          New candidate? Create account →
        </Link>
      </header>

      {/* Main Auth Card */}
      <main className="shell flex-1 flex items-center justify-center py-8">
        <div className="w-full max-w-md rounded-3xl border border-emerald-950/10 bg-white p-6 sm:p-9 shadow-xl shadow-emerald-950/5">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-widest text-[#116149]">
              Welcome Back
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Continue your <span className="serif-accent text-[#116149]">UTME prep.</span>
            </h1>
            <p className="mt-1.5 text-xs text-slate-500">
              Sign in to access your 4 subjects, topic mastery tracker, and timed CBT mocks.
            </p>
          </div>

          <LoginForm />

          <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-600">
            Don&apos;t have an account yet?{" "}
            <Link href="/register" className="font-semibold text-[#116149] hover:underline">
              Start free diagnostic
            </Link>
          </div>
        </div>
      </main>

      {/* Simple Footer */}
      <footer className="shell py-6 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} JAMBPrep Nigeria · Built for 250+ UTME Candidates
      </footer>
    </div>
  );
}
