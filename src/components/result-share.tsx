"use client";
import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { shareOrCopy } from '@/lib/share';
import { SITE_URL } from '@/lib/seo';
export function ResultShare({text}:{text:string}) {
 const [status,setStatus]=useState('');
 const url=`${SITE_URL}/register/`;
 async function share(){try{const outcome=await shareOrCopy({title:'My JAMBPrep progress',text,url});setStatus(outcome==='copied'?'Result copied. Paste it into your chat.':outcome==='shared'?'Shared.':'');}catch{setStatus('Unable to copy. Use the WhatsApp button to share.');}}
 return <div className="my-6"><div className="flex flex-wrap justify-center gap-3"><button type="button" onClick={share} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700"><Share2 size={16}/>Share result</button><a href={`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-full bg-[#116149] px-5 text-sm font-semibold text-white">Share to WhatsApp</a></div><p role="status" className="mt-2 text-center text-xs text-slate-500">{status}</p></div>;
}
