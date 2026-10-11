"use client";
import { Suspense, useEffect } from 'react';
import { useRouter,useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { StudyWorkspace } from '@/components/study-workspace';
import { ResourceStatus,useApiResource } from '@/lib/api/use-api-resource';
import { parseAttemptIdFromSearch } from '@/lib/routing/deep-links';
import { MathRenderer } from '@/components/math-renderer';
interface ResultData {totalScore:number;englishScore:number;subject2Score:number;subject3Score:number;subject4Score:number;timeSpentSeconds:number;completedAt:string;}
interface ReviewData {questions:{id:string;stem:string;explanation:string|null;correctOption:string;selectedOption:string|null}[];}
function Review({attemptId}:{attemptId:string}) {
 const resource=useApiResource<ReviewData>(`/api/v1/exams/attempts/${attemptId}/review`);
 if(!resource.data)return <><ResourceStatus error={resource.error} retry={resource.retry}/><Link href="/pricing">Premium includes full answer explanations</Link></>;
 return <section className="mt-8 space-y-5"><h2 className="text-xl font-bold">Answer review</h2>{resource.data.questions.map((question,index)=><article key={question.id} className="rounded-2xl border bg-white p-5"><p className="font-semibold">Question {index+1}</p><MathRenderer content={question.stem}/><p>Your answer: {question.selectedOption??'Unanswered'} · Correct: {question.correctOption}</p>{question.explanation&&<MathRenderer content={question.explanation}/>}</article>)}</section>;
}
function Scorecard({attemptId}:{attemptId:string}) {
 const resource=useApiResource<ResultData>(`/api/v1/exams/attempts/${attemptId}/results`);
 if(!resource.data)return <ResourceStatus error={resource.error} retry={resource.retry}/>;
 const result=resource.data;
 return <main className="shell section-space"><div className="mx-auto max-w-4xl"><h1 className="text-3xl font-bold">Your mock result</h1><div className="my-6 rounded-3xl bg-[#116149] p-8 text-white"><p className="text-5xl font-bold">{result.totalScore}<span className="text-lg"> / 400</span></p><p className="mt-3">Time spent: {Math.floor(result.timeSpentSeconds/60)} minutes</p></div><div className="grid gap-3 sm:grid-cols-4">{[result.englishScore,result.subject2Score,result.subject3Score,result.subject4Score].map((score,index)=><div key={index} className="rounded-2xl border bg-white p-4"><p>{index===0?'English':`Elective ${index}`}</p><strong>{score} / 100</strong></div>)}</div><Link className="mt-6 inline-block text-[#116149] underline" href="/dashboard">Return to your dashboard</Link><Review attemptId={attemptId}/></div></main>;
}
function ResultContent(){const params=useSearchParams();const parsed=parseAttemptIdFromSearch(params);const router=useRouter();useEffect(()=>{if(!parsed.valid)router.replace(`/mock?error=${parsed.reason}`);},[parsed.valid,router]);return parsed.valid?<Scorecard attemptId={parsed.attemptId}/>:<p role="status">Checking result link…</p>;}
export default function ResultPage(){return <StudyWorkspace><Suspense fallback={<p role="status">Loading result…</p>}><ResultContent/></Suspense></StudyWorkspace>;}
