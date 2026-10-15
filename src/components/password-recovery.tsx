"use client";
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { SITE_URL } from '@/lib/seo';
import { recoverySessionTracker } from '@/lib/auth/recovery-session';
import { clearPrivateBrowserState } from '@/lib/auth/storage-cleanup';

export function PasswordRecovery({reset=false}:{reset?:boolean}) {
 const [ready,setReady]=useState(false);
 const [recoveryUserId,setRecoveryUserId]=useState<string|null>(null);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const [error,setError]=useState('');
 const [done,setDone]=useState(false);
 useEffect(()=>{
  if(!reset)return;
  let active=true;
  let recovered=false;
  const client=createClient();
  function acceptSession(session:{user:{id:string}}|null){
   if(!active)return;
   const userId=recoverySessionTracker.userId(session);
   if(userId){recovered=true;setRecoveryUserId(userId);setReady(true);setError('');history.replaceState(history.state,'','/reset-password/');}
   else{setReady(false);setRecoveryUserId(null);}
  }
  const subscription=client.auth.onAuthStateChange((event:string,session:{user:{id:string}}|null)=>{
   recoverySessionTracker.observe(event,session);
   acceptSession(session);
  }).data.subscription;
  // A fast callback can finish before this effect: read the proof captured when the singleton was created.
  void client.auth.getSession().then(({data,error}:{data:{session:{user:{id:string}}|null};error:Error|null})=>{
   if(!active)return;
   if(error)setError('This reset link could not be verified. Request a new link and open it in the same browser.');
   else acceptSession(data.session);
  }).catch(()=>{if(active)setError('Unable to verify the reset link. Please request a new one.');});
  const timeout=setTimeout(()=>{if(active&&!recovered)setError(previous=>previous||'If the password fields have not appeared, request a fresh link and open it in the browser where you requested it.');},10000);
  return()=>{active=false;clearTimeout(timeout);subscription.unsubscribe();};
 },[reset]);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setError('');setBusy(true);
  const form=new FormData(event.currentTarget);
  try {
   const client=createClient();
   if(reset){
    if(!ready||!recoveryUserId)throw new Error('Open a valid recovery link first.');
    const current=await client.auth.getUser();
    if(current.error||current.data.user?.id!==recoveryUserId||!recoverySessionTracker.userId({user:{id:current.data.user.id}}))throw new Error('Your account changed. Request a fresh password reset link.');
    const password=String(form.get('password')||'');
    if(password.length<8)throw new Error('Use at least 8 characters.');
    if(password!==form.get('confirmation'))throw new Error('The passwords do not match.');
    const result=await client.auth.updateUser({password});if(result.error)throw result.error;
    await client.auth.signOut({scope:'local'});
    clearPrivateBrowserState({reason:'logout'});
    setReady(false);setDone(true);setMessage('Password updated. Sign in with your new password.');
   }else{
    const origin=window.location.origin;
    const allowed=origin===SITE_URL||origin==='https://jambprep.pages.dev'||/^http:\/\/(localhost|127\.0\.0\.1):3000$/.test(origin);
    const result=await client.auth.resetPasswordForEmail(String(form.get('email')||'').trim(),{redirectTo:`${allowed?origin:SITE_URL}/reset-password/`});
    if(result.error)throw result.error;
    setDone(true);setMessage('If an account exists for that address, a reset link will arrive shortly. Open it in this browser. Check your spam folder too.');
   }
  }catch(error){setError(error instanceof Error?error.message:'Unable to process your request. Try again.');}finally{setBusy(false);}
 }
 return <main className="flex min-h-screen items-center justify-center bg-white px-5 py-12"><section className="w-full max-w-md"><Link href="/" className="text-sm font-semibold text-emerald-800">← JAMBPrep</Link><h1 className="mt-8 text-3xl font-semibold tracking-tight">{reset?'Set a new password':'Forgot your password?'}</h1><p className="mt-3 text-sm leading-relaxed text-slate-600">{reset?'Use the secure link from your email to choose a new password.':'Enter your account email. We’ll send you a secure reset link.'}</p>{message&&<p role="status" className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">{message}</p>}{error&&(!ready||!reset)&&<p role="alert" className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{error}</p>}{error&&ready&&reset&&<p role="alert" className="mt-5 text-sm text-red-700">{error}</p>}{!done&&(!reset||ready)&&<form onSubmit={submit} className="mt-7 space-y-5">{reset?<><label className="block text-sm font-medium">New password<input required minLength={8} name="password" type="password" autoComplete="new-password" className="mt-2 block min-h-12 w-full rounded-xl border border-slate-300 px-4"/></label><label className="block text-sm font-medium">Confirm password<input required minLength={8} name="confirmation" type="password" autoComplete="new-password" className="mt-2 block min-h-12 w-full rounded-xl border border-slate-300 px-4"/></label></>:<label className="block text-sm font-medium">Email address<input required name="email" type="email" autoComplete="email" className="mt-2 block min-h-12 w-full rounded-xl border border-slate-300 px-4"/></label>}<button disabled={busy} className="min-h-12 w-full rounded-full bg-[#116149] px-5 font-semibold text-white disabled:opacity-50">{busy?'Please wait…':reset?'Update password':'Send reset link'}</button></form>}{reset&&!ready&&!done&&<Link href="/forgot-password/" className="mt-6 flex min-h-11 items-center text-sm font-semibold text-emerald-800 underline">Request a new reset link</Link>}<Link href="/login/" className="mt-4 flex min-h-11 items-center text-sm text-slate-600 underline">Back to sign in</Link></section></main>;
}
