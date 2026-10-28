"use client";

import { ResultShare } from "@/components/result-share";
import { practiceShareText } from "@/lib/share";
import { useEffect, useRef, useState } from "react";
import { ReportQuestionDialog } from "@/components/report-question-dialog";
import { QuestionDiagram } from "@/components/question-diagram";
import { MathRenderer } from "@/components/math-renderer";
import { isArabicText } from "@/lib/utils";
import { 
  resumePracticeSession,
  finishPracticeSession,
  getPracticeQuestions, 
  checkPracticeAnswer, 
  PracticeQuestionItem, 
  PracticeAnswerResult 
} from "@/lib/client-actions";
import { 
  BookOpen, 
  BookA,
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  RotateCcw, 
  Loader2, 
  Layers, 
  HelpCircle,
  Award,
  Lock,
  Building2,
  SignalLow,
  SignalMedium,
  SignalHigh
} from "lucide-react";
import Link from "@/components/pending-link";
import { InspectableText } from "@/components/dictionary/inspectable-text";
import { QuickLookupDialog } from "@/components/dictionary/quick-lookup-dialog";
import { useAccountTier } from "@/lib/auth/use-account-tier";
import { useWorkspaceFocus } from "@/components/study-workspace-context";

import { PageHeader } from "@/components/page-header";
import { useRouter } from "next/navigation";
import type { PracticeSubject, PracticeTopic } from "@/lib/api/practice-dtos";
type SubjectOption = PracticeSubject;
function evidenceLabel(value:{sampleSize:number;accuracy:number|null;strength:string}) {return value.strength==='unassessed'?'Not assessed':value.strength==='early'?`Early evidence · ${value.sampleSize} answered`:`${value.accuracy}% · ${value.sampleSize} answered · ${value.strength}`;}
function topicOrder(a:PracticeTopic,b:PracticeTopic){const ranks:Record<string,number>={weak:0,developing:1,strong:2,provisional:3,early:4,unassessed:5};return ranks[a.strength]-ranks[b.strength]||a.title.localeCompare(b.title);}

function DifficultyIndicator({ difficulty }: { difficulty?: string }) {
  const diff = difficulty?.toLowerCase() || "medium";
  if (diff === "easy") {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10.5px] font-semibold"
        title="Difficulty: Easy (1 bar)"
      >
        <SignalLow size={13} className="text-emerald-600 stroke-[2.2] shrink-0" />
        <span className="hidden sm:inline uppercase">Easy</span>
      </span>
    );
  }
  if (diff === "hard") {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 text-[10.5px] font-semibold"
        title="Difficulty: Hard (3 bars)"
      >
        <SignalHigh size={13} className="text-rose-600 stroke-[2.2] shrink-0" />
        <span className="hidden sm:inline uppercase">Hard</span>
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[10.5px] font-semibold"
      title="Difficulty: Medium (2 bars)"
    >
      <SignalMedium size={13} className="text-amber-600 stroke-[2.2] shrink-0" />
      <span className="hidden sm:inline uppercase">Medium</span>
    </span>
  );
}


interface PracticeClientProps {
  enrolledSubjects: SubjectOption[];
  initialSubjectCode?: string;
  initialTopicSlug?: string;
  isPremium?: boolean;
  dailySessionUsed:boolean;
  activeSessionId:string|null;
  initialSessionId?:string;
  refreshCatalogue:()=>void;
}

export function PracticeClient({ 
  enrolledSubjects, 
  initialSubjectCode,
  initialTopicSlug,
  isPremium = false, dailySessionUsed, activeSessionId, initialSessionId, refreshCatalogue
}: PracticeClientProps) {

  const initialSub = enrolledSubjects.find((s) => s.code === initialSubjectCode)?.code || enrolledSubjects[0]?.code || "";
  const router=useRouter();
  const currentSessionRef=useRef<string|null>(null);
  const [sessionId,setSessionId]=useState<string|null>(null);
  const [savedFeedback,setSavedFeedback]=useState<Record<string,PracticeAnswerResult>>({});
  const [selectedSubject, setSelectedSubject] = useState<string>(initialSub);
  const [selectedTopicSlug, setSelectedTopicSlug] = useState<string | undefined>(initialTopicSlug);
  const [topicSearch,setTopicSearch]=useState("");
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [questions, setQuestions] = useState<PracticeQuestionItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [answerResult, setAnswerResult] = useState<PracticeAnswerResult | null>(null);
  const [score, setScore] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isQuickLookupOpen, setIsQuickLookupOpen] = useState<boolean>(false);
  const tier = useAccountTier();
  const { setFocusMode, setOnQuit } = useWorkspaceFocus();

  useEffect(() => {
    const isPracticing = questions.length > 0;
    setFocusMode(isPracticing);
    if (isPracticing) {
      setOnQuit(() => () => { void endPractice(); });
    } else {
      setOnQuit(undefined);
    }
    return () => {
      setFocusMode(false);
      setOnQuit(undefined);
    };
  }, [questions.length, setFocusMode, setOnQuit, sessionId, selectedSubject, selectedTopic?.slug]);

  const subject=enrolledSubjects.find(s=>s.code===selectedSubject);
  const selectedTopic=subject?.topics.find(t=>t.slug===selectedTopicSlug||t.aliases.some(a=>a.toLowerCase()===selectedTopicSlug?.toLowerCase()));
  const available=selectedTopicSlug ? selectedTopic?.available??0 : subject?.available??0;
  const invalidSelection=!subject || Boolean(selectedTopicSlug&&!selectedTopic);
  function writeUrl(nextSubject:string,nextTopic?:string,nextSession?:string){const params=new URLSearchParams({subject:nextSubject});if(nextTopic)params.set('topic',nextTopic);if(nextSession)params.set('session',nextSession);router.replace('/practice/?'+params.toString(),{scroll:false});}
  useEffect(()=>{setSelectedSubject(initialSubjectCode?.toUpperCase()??enrolledSubjects[0]?.code??'');setSelectedTopicSlug(initialTopicSlug);},[initialSubjectCode,initialTopicSlug,enrolledSubjects]);
  useEffect(()=>{
    if(!initialSessionId||initialSessionId===currentSessionRef.current)return;
    let active=true;setIsLoading(true);setErrorMessage(null);
    void resumePracticeSession(initialSessionId).then(result=>{if(!active)return;currentSessionRef.current=result.sessionId;setSessionId(result.sessionId);setQuestions(result.questions);const feedback=Object.fromEntries((result.answers??[]).filter(a=>a.feedback).map(a=>[a.questionId,a.feedback!]));setSavedFeedback(feedback);setScore(Object.values(feedback).filter(f=>f.isCorrect).length);const first=result.questions.findIndex(q=>!feedback[q.id]);setCurrentIndex(first<0?Math.max(0,result.questions.length-1):first);setIsCompleted(result.status==='completed');setAnswerResult(first<0?feedback[result.questions[result.questions.length-1]?.id]??null:null);setSelectedOption(null);if(result.status!=='completed'&&(result.status==='expired'||(result.expiresAt&&new Date(result.expiresAt).getTime()<=Date.now()))){setQuestions([]);setErrorMessage('This practice session has ended. Choose a new session when your allowance permits.');}}).catch(error=>{if(active)setErrorMessage(error instanceof Error?error.message:'Unable to resume practice.');}).finally(()=>{if(active)setIsLoading(false);});return()=>{active=false;};
  },[initialSessionId]);
  const startPractice=async()=>{
    setIsLoading(true);setErrorMessage(null);
    try{const result=await getPracticeQuestions(selectedSubject,selectedTopic?.slug,questionCount);currentSessionRef.current=result.sessionId;setSessionId(result.sessionId);setQuestions(result.questions);setCurrentIndex(0);setSavedFeedback({});setSelectedOption(null);setAnswerResult(null);setScore(0);setIsCompleted(false);writeUrl(selectedSubject,selectedTopic?.slug,result.sessionId);}
    catch(error){setErrorMessage(error instanceof Error?error.message:'Unable to issue practice.');}finally{setIsLoading(false);}
  };
  async function endPractice() {
    setIsSubmitting(true);
    try {
      if (sessionId) {
        await finishPracticeSession(sessionId, true);
      }
    } catch {
      // non-blocking
    } finally {
      setQuestions([]);
      currentSessionRef.current = null;
      setSessionId(null);
      writeUrl(selectedSubject, selectedTopic?.slug);
      refreshCatalogue();
      setIsSubmitting(false);
    }
  }

  const handleSelectOption = (label: string) => {
    if (answerResult || savedFeedback[questions[currentIndex]?.id]) return; // Prevent changing after answer is revealed
    setSelectedOption(label);
  };

  const handleSubmitAnswer = async () => {
    if (!selectedOption || answerResult || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const currentQ = questions[currentIndex];
      if(!sessionId) throw new Error("Resume your practice session first.");
      const result = await checkPracticeAnswer(sessionId,currentQ.id, selectedOption);
      setSavedFeedback(values=>({...values,[currentQ.id]:result}));
      setAnswerResult(result);
      if (result.isCorrect) {
        setScore((prev) => prev + 1);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Unable to check your answer. Please retry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextQuestion=async()=>{
    if(currentIndex+1<questions.length){const next=currentIndex+1;setCurrentIndex(next);setSelectedOption(null);setAnswerResult(savedFeedback[questions[next].id]??null);}
    else if(sessionId){setIsSubmitting(true);try{await finishPracticeSession(sessionId);setIsCompleted(true);}catch(error){setErrorMessage(error instanceof Error?error.message:'Unable to complete this session.');}finally{setIsSubmitting(false);}}
  };

  const currentQ = questions[currentIndex];

  // 1. PRACTICE SETUP SCREEN
  if (questions.length === 0 || isCompleted) {
    if (isCompleted) {
      const percentage = Math.round((score / questions.length) * 100);
      return (
        <div className="max-w-5xl mx-auto space-y-8">
          <PageHeader
            badge={{ icon: <Award size={13} />, text: "Practice Session Complete" }}
            title="Session Performance Summary"
            subtitle={`You completed ${questions.length} questions in ${currentQ?.subjectName || "Practice Mode"}.`}
          />

          <div className="rounded-3xl border border-emerald-950/10 bg-white p-6 sm:p-10 shadow-sm text-center max-w-2xl mx-auto">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-emerald-50 text-[#116149] mb-4">
              <Award size={32} />
            </div>
            <span className="text-[10px] font-bold tracking-[0.14em] text-[#116149] uppercase">
              PRACTICE COMPLETE
            </span>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#092E28]">
              Practice Session <span className="serif-accent text-[#116149]">Summary</span>
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              You completed {questions.length} questions in {currentQ?.subjectName || "Practice Mode"}.
            </p>

            <div className="my-8 p-6 rounded-2xl bg-[#F6F8F5] border border-slate-200/80 flex items-center justify-around">
              <div>
                <span className="text-3xl font-bold text-[#092E28]">{score} / {questions.length}</span>
                <span className="block text-xs text-slate-500 mt-1 font-medium">Correct Answers</span>
              </div>
              <div className="h-10 w-px bg-slate-300" />
              <div>
                <span className={`text-3xl font-bold ${percentage >= 70 ? 'text-[#116149]' : 'text-amber-600'}`}>
                  {percentage}%
                </span>
                <span className="block text-xs text-slate-500 mt-1 font-medium">Accuracy</span>
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-8 max-w-md mx-auto leading-relaxed">
              {percentage >= 75
                ? "Excellent performance! Keep reinforcing your mastery with consistent daily revision."
                : "Good effort. Review the diagnostic explanations carefully to turn mistakes into points."}
            </p>
            <ResultShare
              type="practice"
              score={score}
              totalQuestions={questions.length}
              percentage={percentage}
              subjectName={currentQ?.subjectName || "Use of English"}
              topicTitle={new Set(questions.map(q => q.topicTitle)).size === 1 ? questions[0]?.topicTitle : undefined}
              feedbackText={
                percentage >= 75
                  ? "Excellent performance! Keep reinforcing your mastery with consistent daily revision."
                  : "Good effort. Review the diagnostic explanations carefully to turn mistakes into points."
              }
            />
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {isPremium ? (
                <button
                  onClick={() => {
                    setQuestions([]);
                    setIsCompleted(false);
                    currentSessionRef.current=null;setSessionId(null);
                    writeUrl(selectedSubject,selectedTopic?.slug);
                    refreshCatalogue();
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <RotateCcw size={16} /> Choose Another Topic
                </button>
              ) : (
                <Link
                  href="/pricing"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-6 py-3.5 text-sm font-semibold text-amber-900 hover:bg-amber-100 transition-colors"
                >
                  {tier.isSchoolAttached ? (
                    <>
                      <Building2 size={16} className="text-[#116149]" /> Contact School Admin for Unlimited Practice
                    </>
                  ) : (
                    <>Upgrade for Unlimited Practice</>
                  )}
                </Link>
              )}
              <Link
                href="/dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#116149] px-6 py-3.5 text-sm font-semibold text-white hover:bg-[#0e523e] transition-colors"
              >
                Return to Dashboard <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-5xl mx-auto space-y-8">
        <PageHeader
          badge={{ icon: <Layers size={13} />, text: "Self-Paced Topic Mastery" }}
          title="Practice Questions & Explanations"
          subtitle="Work through verified questions with step-by-step diagnostic solutions, formulas, and instant lexical explanations."
          actions={
            <Link
              href="/practice/weekly"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white text-[#116149] border border-emerald-200 hover:bg-emerald-50 transition shadow-2xs"
            >
              <BookOpen size={13} /> Weekly Offline Pack
            </Link>
          }
        />

        <div className="rounded-3xl border border-emerald-950/10 bg-white p-6 sm:p-10 shadow-sm">
          <div className="mb-6 pb-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-[#092E28]">
                Configure Practice Session
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Select an enrolled subject and choose a specific topic to target.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
              {enrolledSubjects.length} enrolled subjects
            </span>
          </div>

          {errorMessage && (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 flex items-start gap-2.5">
              <HelpCircle size={16} className="shrink-0 mt-0.5 text-amber-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-6">
          {/* Subject Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5">
              1. Choose Subject
            </label>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {enrolledSubjects.map((sub) => {
                const isSelected = selectedSubject === sub.code;
                return (
                  <button
                    key={sub.code}
                    type="button"
                    onClick={() => {setSelectedSubject(sub.code);setSelectedTopicSlug(undefined);writeUrl(sub.code);}}
                    className={`flex items-center justify-between p-4 rounded-2xl border text-left text-sm font-medium transition-all cursor-pointer ${
                      isSelected
                        ? "border-[#116149] bg-emerald-50 text-[#092E28] ring-1 ring-[#116149]"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <div>
                      <span className="font-semibold block">{sub.name}</span>
                      <small className="text-xs text-slate-500">
                        {sub.isCompulsory ? "Compulsory" : "Elective"} ({sub.code})
                      </small><span className="mt-1 block text-xs text-slate-500">{evidenceLabel(sub)}</span>
                    </div>
                    {isSelected && (
                      <span className="flex size-6 items-center justify-center rounded-full bg-[#116149] text-white">
                        <CheckCircle2 size={14} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="practice-topic" className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700">2. Choose topic</label>
            <p className="mb-3 text-xs text-slate-500">Strength uses distinct answered questions across sessions. Repeated reviews and skipped questions are counted separately.</p><input type="search" aria-label="Search topics" value={topicSearch} onChange={e=>setTopicSearch(e.target.value)} placeholder="Find a topic…" className="mb-2 min-h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"/>
            <select id="practice-topic" aria-describedby="practice-topic-evidence" value={selectedTopic?.slug??selectedTopicSlug??''} onChange={e=>{const value=e.target.value||undefined;setSelectedTopicSlug(value);writeUrl(selectedSubject,value);}} className="min-h-12 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm">
              <option value="">All topics</option>
              {selectedTopicSlug&&!selectedTopic&&<option value={selectedTopicSlug}>Requested topic unavailable — choose another</option>}
              {[...(subject?.topics??[])].filter(t=>t.id===selectedTopic?.id||t.title.toLowerCase().includes(topicSearch.toLowerCase())).sort(topicOrder).map(t=><option key={t.id} value={t.slug}>{t.title} · {evidenceLabel(t)}</option>)}
            </select>
            <p id="practice-topic-evidence" className="mt-2 text-xs leading-relaxed text-slate-500">{selectedTopic ? <><span className="font-medium text-slate-700">{selectedTopic.title}</span>{" · "}{evidenceLabel(selectedTopic)}</> : "Strength comes from your saved answers. Topics without evidence appear last."}</p>
            {invalidSelection&&<p role="alert" className="mt-2 text-sm text-red-700">This link does not match an active enrolled subject and topic. Choose a valid selection.</p>}
            {available<5&&!invalidSelection&&<p role="status" className="mt-2 text-sm text-amber-800">Only {available} question{available===1?'':'s'} available here; at least 5 are needed. No free session will be consumed.</p>}
          </div>
          {/* Question Count */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5">
              3. Number of Questions
            </label>
            <div className="flex gap-3">
              {[5, 10, 15].map((cnt) => (
                <button
                  key={cnt}
                  disabled={available<cnt}
                  type="button"
                  onClick={() => setQuestionCount(cnt)}
                  className={`flex-1 py-3 rounded-2xl border text-sm font-semibold transition-all cursor-pointer disabled:opacity-40 ${
                    questionCount === cnt
                      ? "border-[#116149] bg-[#116149] text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  {cnt} Questions
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {isPremium
                ? "Pro includes unlimited practice sessions across all subjects."
                : dailySessionUsed
                ? activeSessionId
                  ? "Your free practice session is in progress. Resume your saved session below or upgrade to Pro."
                  : "Your free practice session has been used. Upgrade to Pro for unlimited practice sessions."
                : "Free tier includes one practice session: choose 5, 10 or 15 questions. Upgrade to Pro for unlimited practice."}
            </p>
          </div>

          {activeSessionId&&<div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-sm">You have a saved practice session.</p><div className="mt-3 flex gap-3"><button disabled={isLoading} onClick={()=>{writeUrl(selectedSubject,selectedTopic?.slug,activeSessionId);}} className="rounded-full bg-emerald-800 px-5 py-3 text-sm text-white">Resume session</button><button disabled={isLoading} onClick={async()=>{setIsLoading(true);try{await finishPracticeSession(activeSessionId,true);refreshCatalogue();}catch(error){setErrorMessage(error instanceof Error?error.message:'Unable to end session.');}finally{setIsLoading(false);}}} className="rounded-full border px-5 py-3 text-sm">End session</button></div></div>}
          {/* Launch Button */}
          {!isPremium && dailySessionUsed ? (
            <Link
              href="/pricing"
              className="w-full flex items-center justify-center gap-2 rounded-full bg-[#116149] px-6 py-4 text-sm font-semibold text-white shadow-sm hover:bg-[#0e523e] transition-all cursor-pointer text-center"
            >
              {tier.isSchoolAttached ? (
                <>
                  <Building2 size={18} className="text-[#E7B85A]" /> Contact School Admin for Unlimited Practice <ArrowRight size={16} />
                </>
              ) : (
                <>
                  Upgrade to Pro for Unlimited Practice <ArrowRight size={16} />
                </>
              )}
            </Link>
          ) : (
            <button
              type="button"
              onClick={startPractice}
              disabled={isLoading||invalidSelection||available<questionCount||Boolean(activeSessionId)}
              className="w-full flex items-center justify-center gap-2 rounded-full bg-[#116149] px-6 py-4 text-sm font-semibold text-white shadow-sm hover:bg-[#0e523e] transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Preparing Practice Set...
                </>
              ) : (
                <>
                  Start Focused Practice <ArrowRight size={16} />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
  }

  // 2. ACTIVE QUESTION SCREEN
  return (
    <div className="max-w-5xl mx-auto">
      {errorMessage && (
        <div className="px-4 sm:px-0 pt-3">
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {errorMessage}
          </p>
        </div>
      )}

      {/* Top Question Metadata Card (glued to top on mobile, borderless full width) */}
      <div className="bg-white border-b sm:border border-slate-200/90 rounded-none sm:rounded-2xl px-4 py-3 sm:p-4 shadow-none sm:shadow-2xs sticky top-16 z-20 sm:static sm:mb-8">
        {/* Row 1: Question Progress Badge, Difficulty Icon Badge, Dictionary & Flag (Quit moved to top header) */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-slate-800 text-sm whitespace-nowrap">
              Question {currentIndex + 1}{" "}
              <span className="text-slate-400 font-normal text-xs">of {questions.length}</span>
            </span>
            <DifficultyIndicator difficulty={currentQ.difficulty} />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isPremium ? (
              <button
                type="button"
                onClick={() => setIsQuickLookupOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-[#116149] border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer"
                title="Open Quick UTME Dictionary"
              >
                <BookA size={12} />
                <span>Dictionary</span>
              </button>
            ) : (
              <Link
                href="/pricing"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 transition-colors cursor-pointer"
                title={tier.isSchoolAttached ? `Quick Dictionary requires an active license from ${tier.school?.schoolName || 'your school'}` : "Quick Dictionary is a Pro feature — click to upgrade"}
              >
                {tier.isSchoolAttached ? <Building2 size={11} /> : <Lock size={11} />}
                <span>Dictionary</span>
                <span className="text-[9px] font-extrabold uppercase bg-amber-200/90 text-amber-950 px-1 rounded">
                  {tier.isSchoolAttached ? "SCHOOL" : "PRO"}
                </span>
              </Link>
            )}
            <ReportQuestionDialog key={currentQ.id} questionId={currentQ.id} variant="icon" />
          </div>
        </div>

        {/* Row 2: Subject & Topic (Clean full width without collisions) */}
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 min-w-0">
          <span className="font-bold text-[#116149] text-xs uppercase tracking-wider shrink-0">
            {currentQ.subjectName}
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-xs text-slate-500 font-medium truncate" title={currentQ.topicTitle}>
            {currentQ.topicTitle}
          </span>
        </div>

        {/* Row 3: Progress Bar */}
        <div
          className="h-1 w-full bg-slate-100 rounded-full overflow-hidden mt-2.5"
          role="progressbar"
          aria-valuenow={currentIndex + 1}
          aria-valuemin={1}
          aria-valuemax={questions.length}
        >
          <div
            className="h-full bg-[#116149] rounded-full transition-all duration-300"
            style={{ width: `${Math.round(((currentIndex + 1) / questions.length) * 100)}%` }}
          />
        </div>
      </div>

      <div className="px-4 py-4 sm:px-0 space-y-6 sm:space-y-8">
<QuestionDiagram url={currentQ.imageUrl} alt={currentQ.imageAlt} />
      {/* Reading Passage (if present) */}
      {currentQ.passage && (
        <div
          dir={isArabicText(currentQ.passage.content) ? "rtl" : undefined}
          className={`rounded-3xl border border-emerald-950/10 bg-[#EDF2E9]/60 p-6 sm:p-8 ${
            isArabicText(currentQ.passage.content) ? "text-right [direction:rtl]" : ""
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            {currentQ.passage.title ? (
              <h3 className="text-sm font-bold text-[#092E28] uppercase tracking-wider">
                Passage: {currentQ.passage.title}
              </h3>
            ) : <span />}
            {!isArabicText(currentQ.passage.content) && (
              isPremium ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                  <BookA size={11} /> Tap words to inspect
                </span>
              ) : (
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full hover:bg-amber-200 transition-colors cursor-pointer"
                  title={tier.isSchoolAttached ? `Vocabulary Inspector is unlocked through your school license with ${tier.school?.schoolName || 'your school'}` : "Vocabulary Inspector is a Pro feature — click to unlock"}
                >
                  {tier.isSchoolAttached ? <Building2 size={10} /> : <Lock size={10} />}
                  <span>Tap words to inspect</span>
                  <span className="text-[9px] font-extrabold uppercase bg-amber-200/90 text-amber-950 px-1 rounded">
                    {tier.isSchoolAttached ? "SCHOOL" : "PRO"}
                  </span>
                </Link>
              )
            )}
          </div>
          <div className="text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">
            {!isArabicText(currentQ.passage.content) ? (
              <InspectableText content={currentQ.passage.content} isPremium={isPremium} />
            ) : (
              <MathRenderer content={currentQ.passage.content} />
            )}
          </div>
        </div>
      )}

      {/* Question Card */}
      {(() => {
        const isQArabic =
          currentQ.subjectCode === 'ARB' ||
          isArabicText(currentQ.stem) ||
          currentQ.options.some((o) => isArabicText(o.content));

        return (
          <div className="rounded-3xl border border-emerald-950/10 bg-white p-6 sm:p-10 shadow-sm space-y-6">
            {/* Question Stem with KaTeX Math Rendering */}
            <div
              dir={isQArabic ? "rtl" : undefined}
              className={`text-base sm:text-lg font-medium text-[#092E28] leading-relaxed ${
                isQArabic ? "text-right [direction:rtl]" : ""
              }`}
            >
              <MathRenderer content={currentQ.stem} />
            </div>

        {/* Multiple Choice Options (A, B, C, D) */}
        <div className="space-y-3 pt-2">
          {currentQ.options.map((opt) => {
            const isSelected = selectedOption === opt.label;
            const isCorrectOption = answerResult?.correctOption === opt.label;
            const isChosenWrong = answerResult && isSelected && !answerResult.isCorrect;

            let cardStyles = "border-slate-200 bg-white hover:border-slate-300 text-slate-800";
            let badgeStyles = "border-slate-300 bg-slate-50 text-slate-700";

            if (answerResult) {
              if (isCorrectOption) {
                cardStyles = "border-emerald-600 bg-emerald-50/80 text-[#092E28] ring-1 ring-emerald-600";
                badgeStyles = "border-emerald-600 bg-emerald-600 text-white";
              } else if (isChosenWrong) {
                cardStyles = "border-red-400 bg-red-50/60 text-red-950";
                badgeStyles = "border-red-400 bg-red-500 text-white";
              } else {
                cardStyles = "border-slate-200 opacity-60 text-slate-600";
              }
            } else if (isSelected) {
              cardStyles = "border-[#116149] bg-emerald-50/60 text-[#092E28] ring-1 ring-[#116149]";
              badgeStyles = "border-[#116149] bg-[#116149] text-white";
            }

            const isOptArabic = isQArabic || isArabicText(opt.content);

            return (
              <button
                key={opt.label}
                type="button"
                onClick={() => handleSelectOption(opt.label)}
                disabled={!!answerResult}
                dir={isOptArabic ? "rtl" : undefined}
                className={`w-full flex items-start gap-4 p-4 sm:p-4.5 rounded-2xl border font-medium transition-all cursor-pointer disabled:cursor-default ${
                  isOptArabic
                    ? "flex-row text-right [direction:rtl]"
                    : "text-left"
                } text-sm sm:text-base ${cardStyles}`}
              >
                <span className={`flex size-7 shrink-0 items-center justify-center rounded-xl border text-xs font-bold transition-colors ${badgeStyles}`}>
                  {opt.label}
                </span>
                <span className="flex-1 pt-0.5">
                  <MathRenderer content={opt.content} />
                </span>
              </button>
            );
          })}
        </div>

        {/* Detailed Diagnostic Solution Banner */}
        {answerResult && (() => {
          const isExpArabic = isQArabic || isArabicText(answerResult.explanation);
          return (
            <div
              dir={isExpArabic ? "rtl" : undefined}
              className={`mt-6 rounded-2xl p-5 sm:p-6 border ${
                isExpArabic ? "text-right [direction:rtl]" : ""
              } ${
                answerResult.isCorrect 
                  ? "bg-emerald-50/90 border-emerald-200 text-emerald-950" 
                  : "bg-amber-50/90 border-amber-200 text-amber-950"
              }`}
            >
              <div className={`flex items-center gap-2 mb-2 font-bold text-sm ${isExpArabic ? "flex-row-reverse justify-end" : ""}`}>
                {answerResult.isCorrect ? (
                  <>
                    <CheckCircle2 size={18} className="text-emerald-700 shrink-0" />
                    <span className="text-emerald-800">Correct! Option {answerResult.correctOption}</span>
                  </>
                ) : (
                  <>
                    <XCircle size={18} className="text-amber-700 shrink-0" />
                    <span className="text-amber-800">Incorrect. The correct answer is Option {answerResult.correctOption}</span>
                  </>
                )}
              </div>
              <div className="text-xs sm:text-sm leading-relaxed mt-2 text-slate-800">
                <strong className="block mb-1 text-slate-900">Step-by-step Explanation:</strong>
                <MathRenderer content={answerResult.explanation} />
              </div>
            </div>
          );
        })()}

        {/* Action Buttons */}
        <div className="pt-4 flex items-center justify-between border-t border-slate-100">
          <button
            type="button"
            disabled={isSubmitting} onClick={() => { void endPractice(); }}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            Quit Practice
          </button>

          {!answerResult ? (
            <button
              type="button"
              onClick={handleSubmitAnswer}
              disabled={!selectedOption || isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#116149] px-7 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#0e523e] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Verifying...
                </>
              ) : (
                "Check Answer"
              )}
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting} onClick={()=>void handleNextQuestion()}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#116149] px-7 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#0e523e] transition-all cursor-pointer"
            >
              {currentIndex + 1 < questions.length ? (
                <>
                  Next Question <ArrowRight size={16} />
                </>
              ) : (
                "Finish Session"
              )}
            </button>
          )}
        </div>
      </div>
    );
  })()}
      </div>

      <QuickLookupDialog
        isOpen={isQuickLookupOpen}
        onClose={() => setIsQuickLookupOpen(false)}
      />
    </div>
  );
}
