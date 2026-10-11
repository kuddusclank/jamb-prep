"use client";
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BrowserAccountBoundary, useBrowserAccount } from '@/components/browser-account-boundary';
import { ResourceStatus } from '@/lib/api/use-api-resource';
import { getMockPayload } from '@/lib/client-actions';
import { parseAttemptIdFromSearch, buildCanonicalResultUrl } from '@/lib/routing/deep-links';
import { ExamSimulator } from '../mock/exam-simulator';
function ExamContent() {
  const params=useSearchParams();const parsed=parseAttemptIdFromSearch(params);const router=useRouter();const account=useBrowserAccount();
  const attemptId=parsed.valid?parsed.attemptId:null;
  const [payload,setPayload]=useState<Awaited<ReturnType<typeof getMockPayload>>|null>(null);
  const [error,setError]=useState<string|null>(null);const [retry,setRetry]=useState(0);
  useEffect(()=>{
    let active=true;setPayload(null);setError(null);
    if(!attemptId){router.replace(`/mock?error=${parsed.valid?'missing':parsed.reason}`);return;}
    void getMockPayload(attemptId).then((data)=>{if(active){if(data.status==='completed')router.replace(buildCanonicalResultUrl(attemptId));else setPayload(data);}}).catch((failure:unknown)=>{if(active)setError(failure instanceof Error?failure.message:'Unable to load your exam.');});
    return()=>{active=false;};
  },[attemptId,router,retry,account.session.user?.id]);
  if(!payload)return <ResourceStatus error={error} retry={()=>setRetry((value)=>value+1)}/>;
  return <ExamSimulator initialPayload={payload} studentName={account.identity?.user.displayName??''}/>;
}
export default function ExamPage(){return <BrowserAccountBoundary><Suspense fallback={<p role="status">Loading exam…</p>}><ExamContent/></Suspense></BrowserAccountBoundary>;}
