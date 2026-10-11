"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useBrowserAccount } from '@/components/browser-account-boundary';
import { useApiResource, ResourceStatus } from '@/lib/api/use-api-resource';
import { getAccountCoordinator } from '@/lib/auth/account-coordinator';
interface AdminData {adminUserId:string;metrics:{total_students:number;total_published_questions:number;total_completed_attempts:number};}
interface QuestionsData {questions:{id:string;subject_code:string;topic_title:string;status:string}[];}
export default function AdminPage() {
 const {session}=useBrowserAccount();const router=useRouter();
 const overview=useApiResource<AdminData>('/api/v1/admin/overview');
 const questions=useApiResource<QuestionsData>('/api/v1/admin/questions');
 const [input,setInput]=useState('');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
 useEffect(()=>{if(session.status==='unauthenticated')router.replace('/login?redirect=/admin');},[session.status,router]);
 async function importQuestions(){setBusy(true);setMessage('');try{const items=JSON.parse(input);if(!Array.isArray(items)||items.length<1||items.length>10)throw new Error('Provide a JSON array with 1–10 complete questions.');const result=await getAccountCoordinator().mutate<{importedCount:number}>('/api/v1/admin/questions/import',items);setMessage(`Published ${result.importedCount} questions.`);setInput('');overview.retry();questions.retry();}catch(error){setMessage(error instanceof Error?error.message:'Import failed. No questions were published.');}finally{setBusy(false);}}
 if(!overview.data)return <ResourceStatus error={overview.error} retry={overview.retry}/>;
 return <main className="shell section-space"><Link href="/dashboard" className="text-[#116149] underline">Study dashboard</Link><h1 className="mt-6 text-3xl font-bold">Question bank administration</h1><div className="my-6 grid gap-4 sm:grid-cols-3">{Object.entries(overview.data.metrics).map(([label,count])=><div key={label} className="rounded-2xl border bg-white p-5"><p>{label.replaceAll('_',' ')}</p><strong className="text-2xl">{count}</strong></div>)}</div><section className="rounded-2xl border bg-white p-6"><h2 className="text-xl font-bold">Publish a validated batch</h2><p className="my-3">Import 1–10 questions with subjectCode, topicTitle, stem, options A–D, correctOption and explanation. Optional fields: difficulty, examYear, imageUrl, passageTitle and passageContent. Media must already be a public HTTPS object in this Supabase project. The whole batch commits together.</p><label htmlFor="question-json" className="block font-semibold">Question JSON</label><textarea id="question-json" value={input} onChange={event=>setInput(event.target.value)} rows={12} className="mt-2 w-full rounded-xl border p-3 font-mono text-sm"/><button disabled={busy||!input.trim()} onClick={()=>void importQuestions()} className="mt-4 rounded-full bg-[#116149] px-6 py-3 text-white disabled:opacity-50">{busy?'Publishing…':'Validate and publish'}</button>{message&&<p role="status" className="mt-3">{message}</p>}</section><section className="mt-8"><h2 className="text-xl font-bold">Latest 50 questions</h2>{questions.error?<ResourceStatus error={questions.error} retry={questions.retry}/>:<ul className="mt-4 space-y-2">{questions.data?.questions.map(question=><li key={question.id} className="rounded-xl border bg-white p-3">{question.subject_code} · {question.topic_title} · {question.status}<span className="block text-xs text-slate-500">{question.id}</span></li>)}</ul>}</section></main>;
}
