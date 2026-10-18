export type ShareOutcome = 'shared' | 'copied' | 'cancelled';
export async function shareOrCopy(data: ShareData, platform: Pick<Navigator,'share'|'clipboard'> = navigator): Promise<ShareOutcome> {
 if (platform.share) {
  try { await platform.share(data); return 'shared'; }
  catch (error) { if (error instanceof Error && error.name === 'AbortError') return 'cancelled'; }
 }
 await platform.clipboard.writeText([data.text,data.url].filter(Boolean).join('\n'));
 return 'copied';
}
export function practiceShareText(score:number,total:number,subject:string,topic?:string,referralUrl?:string) {
 const base = `I scored ${score}/${total} in ${topic ? `${topic} (${subject})` : `${subject} practice`} on JAMBPrep. One session closer to my goal. Ready for your turn?`;
 return referralUrl ? `${base}\n${referralUrl}` : base;
}
export function mockShareText(score:number,referralUrl?:string) {
 const base = `I scored ${score}/400 in a JAMBPrep UTME mock. Every session helps me prepare better. Practise with me!`;
 return referralUrl ? `${base}\n${referralUrl}` : base;
}
