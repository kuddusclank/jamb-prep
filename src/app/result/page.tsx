"use client";
import { ResultShare } from '@/components/result-share';
import { mockShareText } from '@/lib/share';
import { Suspense, useEffect } from 'react';
import { useRouter,useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { StudyWorkspace } from '@/components/study-workspace';
import { ResourceStatus,useApiResource } from '@/lib/api/use-api-resource';
import { parseAttemptIdFromSearch } from '@/lib/routing/deep-links';
import { MathRenderer } from '@/components/math-renderer';
import { isArabicText } from '@/lib/utils';
import { MockResultRatingPrompt } from '@/components/mock-result-rating-prompt';
interface ResultData {subjectScores?:{code:string;name:string;count:number;score:number}[];totalScore:number;englishScore:number;subject2Score:number;subject3Score:number;subject4Score:number;timeSpentSeconds:number;completedAt:string;}
interface ReviewData {questions:{id:string;stem:string;explanation:string|null;correctOption:string;selectedOption:string|null}[];}
function Review({attemptId}:{attemptId:string}) {
 const resource=useApiResource<ReviewData>(`/api/v1/exams/attempts/${attemptId}/review`);
 if(!resource.data)return <><ResourceStatus error={resource.error} retry={resource.retry}/><Link href="/pricing">Premium includes full answer explanations</Link></>;
 return <section className="mt-8 space-y-5"><h2 className="text-xl font-bold">Answer review</h2>{resource.data.questions.map((question,index)=>{
   const isQArabic = isArabicText(question.stem) || isArabicText(question.explanation);
   return (
     <details
       key={question.id}
       dir={isQArabic ? "rtl" : undefined}
       className={`rounded-2xl border border-slate-200 bg-white p-5 ${isQArabic ? "text-right [direction:rtl]" : ""}`}
     >
       <summary className="min-h-11 cursor-pointer font-semibold">
         Question {index+1} · {question.selectedOption===question.correctOption?"Correct":question.selectedOption?"Review answer":"Unanswered"}
       </summary>
       <div className="mt-2">
         <MathRenderer content={question.stem}/>
       </div>
       <p className="mt-2 text-sm text-slate-600">Your answer: {question.selectedOption??'Unanswered'} · Correct: {question.correctOption}</p>
       {question.explanation&&<div className="mt-2 text-sm text-slate-700"><MathRenderer content={question.explanation}/></div>}
     </details>
   );
 })}</section>;
}
function Scorecard({attemptId}:{attemptId:string}) {
 const resource=useApiResource<ResultData>(`/api/v1/exams/attempts/${attemptId}/results`);
 if(!resource.data)return <ResourceStatus error={resource.error} retry={resource.retry}/>;
 const result=resource.data;
 const subjects=result.subjectScores?.length ? result.subjectScores : [result.englishScore,result.subject2Score,result.subject3Score,result.subject4Score].map((score,index)=>({code:String(index),name:index===0?'Use of English':`Subject ${index+1}`,score}));
 return <main className="shell section-space"><div className="mx-auto max-w-4xl"><p className="text-xs font-semibold uppercase tracking-widest text-emerald-800">Your progress, one session at a time</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">Your mock result</h1><section className="my-6 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-slate-500">Total score</p><p className="mt-2 text-6xl font-semibold text-[#116149]">{result.totalScore}<span className="text-xl text-slate-400"> / 400</span></p></div><p className="text-sm text-slate-500">{Math.floor(result.timeSpentSeconds/60)} minutes of practice</p></div><div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">{subjects.map(subject=><div key={subject.code} className="rounded-2xl bg-slate-50 p-4"><p className="text-sm text-slate-600">{subject.name}</p><p className="mt-2 text-2xl font-semibold">{subject.score}<span className="text-sm font-normal text-slate-400"> / 100</span></p></div>)}</div><ResultShare
  type="mock"
  totalScore={result.totalScore}
  timeSpentMinutes={Math.floor(result.timeSpentSeconds/60)}
  subjects={subjects}
/></section><div className="flex flex-wrap gap-3"><Link className="inline-flex min-h-11 items-center rounded-full bg-[#116149] px-5 text-sm font-semibold text-white" href="/practice/">Practise a topic</Link><Link className="inline-flex min-h-11 items-center rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold" href="/dashboard/">Back to dashboard</Link></div><Review attemptId={attemptId}/></div><MockResultRatingPrompt attemptId={attemptId}/></main>;

}
function ResultContent(){const params=useSearchParams();const parsed=parseAttemptIdFromSearch(params);const router=useRouter();const redirectReason=parsed.valid?null:parsed.reason;useEffect(()=>{if(redirectReason)router.replace(`/mock?error=${redirectReason}`);},[redirectReason,router]);return parsed.valid?<Scorecard attemptId={parsed.attemptId}/>:<p role="status">Checking result link…</p>;}
export default function ResultPage(){return <StudyWorkspace><Suspense fallback={<p role="status">Loading result…</p>}><ResultContent/></Suspense></StudyWorkspace>;}
