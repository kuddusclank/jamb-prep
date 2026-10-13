import { BrowserAccountNavigation } from "@/components/browser-account-boundary";
import Link from "@/components/pending-link";
import { 
  ArrowRight, 
  ArrowUpRight, 
  BookOpen, 
  Check, 
  Clock3, 
  Flag, 
  GraduationCap, 
  ShieldCheck, 
  Target, 
  Sparkles, 
  Flame, 
  BarChart3, 
  LogOut 
} from "lucide-react";
import { MobileMenu, Reveal, SubjectPicker } from "./landing-interactions";
import { UserDropdown } from "@/components/user-dropdown";

const button = "inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-[#116149] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#0b4936] hover:-translate-y-0.5";
const faq = [
  ['Do I need an account to practise or take an exam?', 'Yes. You must create an account and sign in before starting any practice questions, diagnostic mock or exam, including free sessions. Registration is open.'],
  ['Will it work on my phone?', 'The platform is optimized for phones, tablets and computers. The mock interface includes touch-friendly question navigation as well as desktop keyboard controls.'],
  ['What happens if my internet disconnects?', 'The exam engine automatically saves answers on your device and syncs them continuously. You can continue answering questions without interruption.'],
  ['What will the free plan include?', 'One full diagnostic mock, a detailed score breakdown, and one topic-practice session of 5, 10 or 15 questions each day with comprehensive step-by-step explanations. The daily allowance resets at midnight West Africa Time.'],
  ['How does Premium access work?', 'Premium access is ₦1,000 for 30 days via Paystack, granting unlimited CBT mocks, unlimited practice questions, full answer explanations, and advanced study coach analytics. If you refer 2 verified friends, you unlock 50% off (₦500).'],
];

export default function Home() {
  const user = null as { email?: string | null } | null;
  const isPremium = false as boolean;
  const entitlement = null as { expiresAt: Date } | null;
  const displayName = "Candidate";

  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>

      {/* Header Navigation */}
      <header className="sticky top-0 z-40 border-b border-emerald-950/10 bg-[#fafbf7]/95 backdrop-blur-lg">
        <div className="shell flex h-20 items-center justify-between gap-4">
          <Link href={user ? "/dashboard" : "/"} aria-label="JambPrep home" className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#116149] text-white">
              <BookOpen size={20}/>
            </span>
            <span>jambprep<span className="text-[#116149]">.</span></span>
          </Link>

          {user ? (
            /* Auth Navigation */
            <nav aria-label="Main navigation" className="hidden items-center gap-7 text-sm text-slate-600 md:flex">
              <Link href="/dashboard" className="text-[#116149] font-bold">
                Dashboard
              </Link>
              <Link href="/practice" className="hover:text-[#116149] font-medium transition-colors">
                Topic Practice
              </Link>
              <Link href="/mock" className="hover:text-[#116149] font-medium transition-colors">
                CBT Mock
              </Link>
              <Link href="/analytics" className="hover:text-[#116149] font-medium transition-colors flex items-center gap-1">
                <BarChart3 size={15} /> Coach
              </Link>
              <Link href="/pricing" className="hover:text-[#116149] font-medium transition-colors">
                Pricing
              </Link>
              {!isPremium && (
                <Link href="/referrals" className="text-amber-800 font-semibold hover:text-amber-900 flex items-center gap-1 text-xs">
                  <Sparkles size={13} /> 50% Off
                </Link>
              )}
            </nav>
          ) : (
            /* Guest Navigation */
            <nav aria-label="Main navigation" className="hidden items-center gap-8 text-sm text-slate-600 md:flex">
              <a href="#how-it-works" className="hover:text-[#116149] transition-colors">How it works</a>
              <a href="#subjects" className="hover:text-[#116149] transition-colors">Subjects</a>
              <a href="#pricing" className="hover:text-[#116149] transition-colors">Pricing</a>
            </nav>
          )}

          {/* Action Area */}
          <div className="flex items-center gap-3">
            <BrowserAccountNavigation />
            <MobileMenu />
          </div>
        </div>
      </header>

      <main id="main">
        {/* Hero Section */}
        <section className="shell grid items-center gap-14 pt-14 pb-16 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pt-24 lg:pb-24">
          <div>
            {user ? (
              <>
                <p className="entrance eyebrow">
                  <span className="size-2 rounded-full bg-[#116149] animate-pulse"/> WELCOME BACK, {displayName.toUpperCase()}
                </p>
                <h1 className="entrance delay-1 mt-7 text-[clamp(3.3rem,6.4vw,5.7rem)] leading-[1.04] font-semibold tracking-[-0.065em]">
                  Ready for your<br/>next study <span className="serif-accent text-[#116149]">session?</span>
                </h1>
                <p className="entrance delay-2 mt-7 max-w-lg text-lg leading-relaxed text-slate-600">
                  Pick up right where you left off. Jump into your daily topic-practice session, test your timing in a full CBT simulation, or review weak topics with your coach.
                </p>
                <div className="entrance delay-3 mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                  <Link href="/dashboard" className={button}>
                    Open Dashboard <ArrowRight size={17}/>
                  </Link>
                  <Link href="/practice" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-emerald-950/20 bg-white px-6 text-sm font-semibold text-[#116149] hover:bg-emerald-50 transition">
                    Start Daily Practice <ArrowUpRight size={16}/>
                  </Link>
                </div>
                <p className="entrance delay-3 mt-5 text-xs text-slate-500">
                  Signed in as <strong className="text-slate-700 font-semibold">{user.email}</strong> · {isPremium ? "Premium Active (Unlimited CBT Mocks)" : "Free Tier Active (one session/day)"}
                </p>
              </>
            ) : (
              <>
                <p className="entrance eyebrow">
                  <span className="size-2 rounded-full bg-[#116149]"/> A CLEARER WAY TO PREPARE FOR UTME
                </p>
                <h1 className="entrance delay-1 mt-7 text-[clamp(3.3rem,6.4vw,5.7rem)] leading-[1.04] font-semibold tracking-[-0.065em]">
                  Know what to<br/>study <span className="serif-accent text-[#116149]">next.</span>
                </h1>
                <p className="entrance delay-2 mt-7 max-w-lg text-lg leading-relaxed text-slate-600">
                  Less guessing. More purposeful practice. Turn your mock results into a clear plan for the topics that need your attention.
                </p>
                <div className="entrance delay-3 mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                  <Link href="/register" className={button}>
                    Create account <ArrowRight size={17}/>
                  </Link>
                  <a href="#how-it-works" className="inline-flex min-h-12 items-center justify-center gap-2 text-sm font-semibold">
                    See how it works <ArrowUpRight size={16}/>
                  </a>
                </div>
                <p className="entrance delay-3 mt-5 text-xs text-slate-500">
                  Account required for all practice and exams · Free diagnostic included
                </p>
              </>
            )}
          </div>

          {/* Interactive Card Preview */}
          <div className="entrance delay-2 relative rounded-[2rem] bg-[#eaf0e4] p-5 sm:p-9">
            <div className="absolute top-5 right-6 text-[10px] font-semibold tracking-[0.16em] text-emerald-900/60">
              {user ? "YOUR PERFORMANCE OVERVIEW" : "YOUR NEXT CHAPTER"}
            </div>
            <div className="relative mt-6 rounded-2xl border border-white bg-white p-6 shadow-2xl shadow-emerald-950/10 sm:p-8">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">Your preparation, in focus</span>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] text-slate-600">
                  {user ? "Study Coach Diagnostic" : "Example report"}
                </span>
              </div>
              <div className="mt-8 flex items-end justify-between border-b border-slate-100 pb-6">
                <div>
                  <p className="text-xs text-slate-500">Mock exam score</p>
                  <p className="mt-2 text-6xl font-semibold tracking-tighter">
                    248<span className="text-xl font-normal tracking-normal text-slate-400"> / 400</span>
                  </p>
                </div>
                <div className="rounded-xl bg-[#f6f8f1] p-3 text-xs text-emerald-900">
                  <Target size={17} className="mb-2"/>Target <strong>280</strong>
                </div>
              </div>
              <div className="mt-6 space-y-4">
                {[['Use of English',72],['Mathematics',68],['Chemistry',62],['Physics',46]].map(([subject,score]) => (
                  <div key={subject as string}>
                    <div className="mb-2 flex justify-between text-xs">
                      <span>{subject}</span>
                      <span className="font-semibold">{score}/100</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div 
                        className={`score-bar h-full rounded-full ${subject === 'Physics' ? 'bg-[#d8ad51]' : 'bg-[#116149]'}`} 
                        style={{width:`${score}%`}}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-7 flex items-center gap-3 rounded-xl bg-[#f8f2df] p-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white">
                  <BookOpen size={17}/>
                </span>
                <div>
                  <p className="text-[10px] font-bold tracking-wider text-[#725617]">YOUR NEXT STUDY FOCUS</p>
                  <p className="mt-1 text-sm font-semibold">Physics: Heat & thermodynamics</p>
                </div>
              </div>
            </div>
            <p className="mt-5 text-center text-xs text-emerald-900/70">
              A score tells you where you are. A plan helps you move forward.
            </p>
          </div>
        </section>

        {/* Feature Badges */}
        <div className="border-y border-emerald-950/10 bg-white">
          <div className="shell grid grid-cols-2 gap-6 py-7 text-sm md:grid-cols-4">
            {[[BookOpen,'15 Official UTME Subjects'],[Clock3,'120-minute CBT format'],[Target,'Topic-by-topic mastery coach'],[GraduationCap,'Syllabus-aligned questions']].map(([Icon,label]) => { 
              const Symbol = Icon as typeof BookOpen; 
              return (
                <div key={String(label)} className="flex items-center gap-3">
                  <Symbol size={19} className="shrink-0 text-[#116149]"/>
                  <span className="font-medium">{String(label)}</span>
                </div>
              ); 
            })}
          </div>
        </div>

        {/* How It Works */}
        <section id="how-it-works" className="shell section-space">
          <Reveal>
            <p className="eyebrow">A LITTLE STRUCTURE. A LOT MORE CLARITY.</p>
            <h2 className="section-title mt-4 max-w-xl">
              Make every study session<br/><span className="serif-accent">count for something.</span>
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {[
              ['01','Find your starting point','Take a diagnostic mock to see your strengths and the topics that deserve more time.','A clear picture of where you are'],
              ['02','Practise with purpose','Work through focused questions and understand the reasoning behind each answer with step-by-step explanations.','Learn the why, not just the answer'],
              ['03','See what’s changing','Return to a mock, compare your results and let the study coach guide your next revision focus.','Your next step, made clearer']
            ].map(([n,title,body,note]) => (
              <Reveal key={n} className="border-t border-emerald-950/20 pt-6">
                <span className="serif-accent text-4xl text-[#116149]">{n}</span>
                <h3 className="mt-6 text-xl font-semibold">{title}</h3>
                <p className="mt-3 leading-relaxed text-slate-600">{body}</p>
                <p className="mt-6 flex items-center gap-2 text-xs font-semibold text-[#116149]">
                  <ArrowRight size={14}/>{note}
                </p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Getting Started / Active Cockpit Section */}
        <section id="get-started" className="bg-[#edf2e9]">
          <div className="shell section-space grid items-center gap-12 lg:grid-cols-2">
            {user ? (
              <>
                <Reveal>
                  <p className="eyebrow">YOUR UTME HEADQUARTERS</p>
                  <h2 className="section-title mt-5">
                    Your study workspace<br/>is ready,<br/>
                    <span className="serif-accent">{displayName}.</span>
                  </h2>
                  <p className="mt-6 max-w-sm leading-relaxed text-slate-600">
                    You are signed in as <strong className="text-[#116149]">{user.email}</strong>. Everything you need to revise, test, and improve is active.
                  </p>
                </Reveal>
                <Reveal className="rounded-3xl border border-emerald-950/10 bg-white p-8">
                  <h3 className="text-xl font-semibold">Quick Actions</h3>
                  <div className="mt-6 space-y-4">
                    <Link href="/practice" className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 hover:border-[#116149] hover:bg-emerald-50/40 transition">
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-100 text-[#116149]">
                          <BookOpen size={18}/>
                        </span>
                        <div>
                          <p className="text-sm font-bold">Daily Topic Practice</p>
                          <p className="text-xs text-slate-500">One daily 5, 10 or 15-question session with explanations</p>
                        </div>
                      </div>
                      <ArrowRight size={16} className="text-[#116149]"/>
                    </Link>

                    <Link href="/mock" className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 hover:border-[#116149] hover:bg-emerald-50/40 transition">
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 items-center justify-center rounded-xl bg-amber-100 text-amber-900">
                          <Clock3 size={18}/>
                        </span>
                        <div>
                          <p className="text-sm font-bold">Full CBT Simulation</p>
                          <p className="text-xs text-slate-500">180 questions, 120-minute timed exam</p>
                        </div>
                      </div>
                      <ArrowRight size={16} className="text-[#116149]"/>
                    </Link>

                    <Link href="/analytics" className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 hover:border-[#116149] hover:bg-emerald-50/40 transition">
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-100 text-[#116149]">
                          <BarChart3 size={18}/>
                        </span>
                        <div>
                          <p className="text-sm font-bold">Study Coach Analytics</p>
                          <p className="text-xs text-slate-500">Weak-topic breakdown & target tracking</p>
                        </div>
                      </div>
                      <ArrowRight size={16} className="text-[#116149]"/>
                    </Link>
                  </div>
                  <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Link href="/dashboard" className={button}>
                      Open Dashboard <ArrowRight size={17}/>
                    </Link>
                    <Link href="/pricing" className="inline-flex min-h-12 items-center justify-center gap-2 text-sm font-semibold text-[#116149] hover:underline">
                      {isPremium ? "Manage Premium Plan" : "Upgrade to Premium (₦1,000)"} <ArrowUpRight size={16}/>
                    </Link>
                  </div>
                </Reveal>
              </>
            ) : (
              <>
                <Reveal>
                  <p className="eyebrow">YOUR ACCOUNT. YOUR PROGRESS.</p>
                  <h2 className="section-title mt-5">
                    A better study habit<br/>starts with<br/>
                    <span className="serif-accent">your own account.</span>
                  </h2>
                  <p className="mt-6 max-w-sm leading-relaxed text-slate-600">
                    Create an account and sign in before answering practice questions or taking any mock exam. Free sessions require an account too.
                  </p>
                </Reveal>
                <Reveal className="rounded-3xl border border-emerald-950/10 bg-white p-8">
                  <h3 className="text-xl font-semibold">Getting started</h3>
                  <ol className="mt-6 space-y-6">
                    {['Create your account and sign in','Choose English and three elective subjects','Set your target and start your free diagnostic'].map((step,index) => (
                      <li key={step} className="flex items-center gap-4 text-sm">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 font-semibold text-emerald-800">
                          {index+1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                  <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Link href="/register" className={button}>
                      Create account free <ArrowRight size={17}/>
                    </Link>
                    <Link href="/login" className="inline-flex min-h-12 items-center justify-center gap-2 text-sm font-semibold text-[#116149] hover:underline">
                      Sign in instead <ArrowUpRight size={16}/>
                    </Link>
                  </div>
                </Reveal>
              </>
            )}
          </div>
        </section>

        {/* Mock Exam Preview */}
        <section className="shell section-space grid items-center gap-12 lg:grid-cols-2">
          <Reveal className="overflow-hidden rounded-2xl bg-[#102f29] p-6 text-white sm:p-8">
            <div className="flex items-center justify-between border-b border-white/15 pb-5 text-xs">
              <span className="font-semibold">MOCK EXAM PREVIEW</span>
              <span className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 font-mono">
                <Clock3 size={14}/> 01:48:22
              </span>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {['English','Mathematics','Physics','Chemistry'].map((s,i) => (
                <span key={s} className={`rounded-full px-3 py-2 text-xs ${i === 0 ? 'bg-[#e7b85a] text-[#102f29]' : 'bg-white/10 text-white/80'}`}>
                  {s}
                </span>
              ))}
            </div>
            <p className="mt-7 text-sm text-white/70">Your questions. Your pace.</p>
            <div className="mt-4 grid grid-cols-6 gap-2 sm:grid-cols-10" aria-label="Illustrative question palette">
              {Array.from({length:30},(_,i) => (
                <span key={i} className={`flex aspect-square items-center justify-center rounded-lg text-xs ${i === 13 ? 'bg-[#e7b85a] text-[#102f29]' : i < 12 ? 'bg-[#367361]' : 'bg-white/10'}`}>
                  {i+1}
                </span>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-4 text-xs text-white/80">
              <span>■ Answered</span>
              <span className="text-[#e7b85a]">⚑ Flagged</span>
              <span>□ To do</span>
            </div>
            <p className="mt-7 border-t border-white/15 pt-4 text-xs text-white/60">
              Accurate JAMB exam software layout · Autosave enabled
            </p>
          </Reveal>
          <Reveal>
            <p className="eyebrow">BUILD CONFIDENCE BEFORE EXAM DAY</p>
            <h2 className="section-title mt-4">
              Get familiar with<br/><span className="serif-accent">the rhythm of CBT.</span>
            </h2>
            <p className="mt-5 leading-relaxed text-slate-600">
              The full mock brings together 180 questions, four subjects and a two-hour timer, so you can train knowledge, speed, and exam stamina together.
            </p>
            <div className="mt-7 space-y-5">
              {[
                [Clock3,'Keep an eye on your pace','A clear countdown and easy subject switching.'],
                [Flag,'Come back with a fresh eye','Flag a tricky question and return to it later.'],
                [ShieldCheck,'Prepare with fewer distractions','A focused interface with continuous answer autosave and session recovery.']
              ].map(([Icon,title,body]) => {
                const Symbol = Icon as typeof Clock3;
                return (
                  <div key={String(title)} className="flex gap-4">
                    <Symbol size={20} className="mt-1 shrink-0 text-[#116149]"/>
                    <div>
                      <h3 className="text-sm font-semibold">{String(title)}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-slate-600">{String(body)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Reveal>
        </section>

        {/* Subject Combination Explorer */}
        <section id="subjects" className="border-y border-emerald-950/10 bg-white">
          <div className="shell section-space">
            <Reveal>
              <div className="mb-9 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div>
                  <p className="eyebrow">YOUR SUBJECTS. YOUR STUDY PLAN.</p>
                  <h2 className="section-title mt-4">What’s your combination?</h2>
                </div>
                <p className="max-w-xs text-sm leading-relaxed text-slate-600">
                  Use of English is compulsory. Select three electives to preview your subject combination.
                </p>
              </div>
              <SubjectPicker/>
            </Reveal>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="shell section-space">
          <Reveal className="text-center">
            <p className="eyebrow justify-center">CLEAR & SIMPLE PRICING</p>
            <h2 className="section-title mt-4">Start small. <span className="serif-accent">Go further.</span></h2>
            <p className="mt-4 text-slate-600">
              Create an account for your free diagnostic. Upgrade anytime for unlimited revision and coach insights.
            </p>
          </Reveal>

          <div className="mx-auto mt-12 grid max-w-4xl gap-5 md:grid-cols-2">
            {[
              {
                name: 'Free',
                price: '₦0',
                period: 'to get started',
                desc: 'Find your starting point and build a daily revision habit.',
                features: [
                  'One full diagnostic mock exam',
                  'One daily session: 5, 10 or 15 questions',
                  'Explanations during topic practice',
                  'Score breakdown and weak-topic feedback'
                ],
                isPaid: false
              },
              {
                name: 'Premium',
                price: '₦1,000',
                period: 'for 30 days',
                desc: 'Full access to practise, review and simulate CBT exams.',
                features: [
                  'Unlimited 180-question full mock exams',
                  'Unlimited daily topic practice',
                  'Full mock answer reviews and explanations',
                  'Advanced performance and mastery analytics'
                ],
                isPaid: true
              }
            ].map((plan, i) => (
              <Reveal key={plan.name} className={`flex flex-col rounded-3xl border p-7 sm:p-9 ${i ? 'border-[#116149] bg-[#102f29] text-white' : 'border-emerald-950/15 bg-white'}`}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{plan.name}</p>
                  {user && ((!plan.isPaid && !isPremium) || (plan.isPaid && isPremium)) && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      CURRENT PLAN
                    </span>
                  )}
                </div>
                <p className="mt-5 text-5xl font-semibold tracking-tight">{plan.price}</p>
                <p className={`mt-2 text-sm ${i ? 'text-white/65' : 'text-slate-500'}`}>{plan.period}</p>
                <p className={`mt-5 text-sm leading-relaxed ${i ? 'text-white/80' : 'text-slate-600'}`}>{plan.desc}</p>
                <ul className="mt-7 flex-1 space-y-4">
                  {plan.features.map(f => (
                    <li key={f} className="flex gap-3 text-sm">
                      <Check size={17} className="shrink-0 text-emerald-400"/>
                      {f}
                    </li>
                  ))}
                </ul>

                {/* Auth-aware Plan Action Button */}
                {user ? (
                  plan.isPaid ? (
                    isPremium ? (
                      <Link 
                        href="/dashboard" 
                        className="mt-9 inline-flex min-h-12 items-center justify-center gap-2 rounded-full text-sm font-semibold bg-[#e7b85a] text-[#102f29]"
                      >
                        Premium Active <Check size={16}/>
                      </Link>
                    ) : (
                      <Link 
                        href="/pricing" 
                        className="mt-9 inline-flex min-h-12 items-center justify-center gap-2 rounded-full text-sm font-semibold bg-[#e7b85a] text-[#102f29] hover:bg-[#d8a848] transition"
                      >
                        Upgrade to Premium <ArrowRight size={16}/>
                      </Link>
                    )
                  ) : (
                    <Link 
                      href="/dashboard" 
                      className="mt-9 inline-flex min-h-12 items-center justify-center gap-2 rounded-full text-sm font-semibold bg-[#edf2e9] text-[#116149] hover:bg-[#e2eadc] transition"
                    >
                      Go to Dashboard <ArrowRight size={16}/>
                    </Link>
                  )
                ) : (
                  plan.isPaid ? (
                    <Link 
                      href="/login?redirect=/pricing" 
                      className="mt-9 inline-flex min-h-12 items-center justify-center gap-2 rounded-full text-sm font-semibold bg-[#e7b85a] text-[#102f29] hover:bg-[#d8a848] transition"
                    >
                      Get Premium Access <ArrowRight size={16}/>
                    </Link>
                  ) : (
                    <Link 
                      href="/register" 
                      className="mt-9 inline-flex min-h-12 items-center justify-center gap-2 rounded-full text-sm font-semibold bg-[#edf2e9] text-[#116149] hover:bg-[#e2eadc] transition"
                    >
                      Create Free Account <ArrowRight size={16}/>
                    </Link>
                  )
                )}

                <p className={`mt-3 text-center text-xs ${i ? 'text-white/60' : 'text-slate-500'}`}>
                  {plan.isPaid ? "Instant Paystack activation · Secure checkout" : "Instant access after signup"}
                </p>
              </Reveal>
            ))}
          </div>

          <p className="mx-auto mt-5 max-w-2xl text-center text-xs leading-relaxed text-slate-500">
            Free practice resets at midnight WAT. Premium access lasts 30 days; additional periods extend access seamlessly.
          </p>

          {!isPremium && (
            <Reveal className="mx-auto mt-8 flex max-w-4xl flex-col gap-3 rounded-2xl bg-[#f1e8cc] p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-amber-950 flex items-center gap-2">
                  <Sparkles size={16} className="text-amber-800" /> Refer & Earn 50% Off
                </p>
                <p className="max-w-lg text-sm leading-relaxed text-amber-900 mt-1">
                  Invite two friends who register and get your <strong>30-day Premium for just ₦500</strong>!
                </p>
              </div>
              <Link 
                href={user ? "/referrals" : "/login?redirect=/referrals"} 
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#116149] px-5 text-xs font-semibold text-white hover:bg-[#0c4a37] transition whitespace-nowrap self-start sm:self-auto"
              >
                {user ? "View Referral Hub" : "Sign In to Refer"} <ArrowRight size={14}/>
              </Link>
            </Reveal>
          )}
        </section>

        {/* FAQs */}
        <section className="shell grid gap-10 pb-24 md:grid-cols-[.7fr_1fr]">
          <Reveal>
            <p className="eyebrow">A FEW THINGS YOU MIGHT ASK</p>
            <h2 className="section-title mt-4">Before you<br/><span className="serif-accent">get started.</span></h2>
          </Reveal>
          <div>
            {faq.map(([question,answer]) => (
              <details key={question} className="group border-b border-emerald-950/15 py-5">
                <summary className="cursor-pointer text-base font-semibold">{question}</summary>
                <p className="mt-4 text-sm leading-relaxed text-slate-600">{answer}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Bottom Banner */}
        <section className="bg-[#116149] text-white">
          <Reveal className="shell py-16 text-center sm:py-20">
            <p className="text-xs font-semibold tracking-[.16em] text-emerald-100">
              {user ? "STAY DISCIPLINED · HIT YOUR TARGET" : "YOUR NEXT STEP CAN BE A SMALL ONE"}
            </p>
            <h2 className="mt-5 text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
              {user ? (
                <>Every practice session counts.<br/><span className="serif-accent text-[#e7b85a]">Keep building.</span></>
              ) : (
                <>Start with your account.<br/><span className="serif-accent text-[#e7b85a]">Build from there.</span></>
              )}
            </h2>
            <Link 
              href={user ? "/dashboard" : "/register"} 
              className="mt-8 inline-flex min-h-12 items-center gap-3 rounded-full bg-white px-7 py-3 text-sm font-semibold text-[#116149] hover:bg-emerald-50 transition shadow-lg"
            >
              {user ? "Go to your Dashboard" : "Create free account"} <ArrowRight size={17}/>
            </Link>
          </Reveal>
        </section>
      </main>

      <footer className="shell flex flex-col justify-between gap-5 py-9 text-xs text-slate-500 sm:flex-row">
        <span className="text-lg font-bold text-[#102f29]">jambprep.</span>
        <p className="max-w-lg leading-relaxed">
          An independent UTME preparation platform. Not affiliated with the Joint Admissions and Matriculation Board.
        </p>
        <a href="#main" className="inline-flex min-h-11 items-center gap-2 self-start">Back to top ↑</a>
      </footer>
    </>
  );
}
