import type { OutboxItem } from '../domain/types';
import { getDefaultBrowserSessionManager } from '../../../lib/auth/session-manager';

/** The engine holds a Web Lock for the actor/attempt lifetime, including revision allocation. */
export class LocalOutboxManager {
  private static scope(attemptId:string) {
    const userId=getDefaultBrowserSessionManager().getState().user?.id;
    if(!userId) throw new Error('Sign in before saving exam answers.');
    return `${userId}_${attemptId}`;
  }
  private static getStorageKey(attemptId:string) {return `jamb_cbt_${this.scope(attemptId)}`;}
  private static getOutboxKey(attemptId:string) {return `jamb_outbox_${this.scope(attemptId)}`;}
  private static revisionsKey(attemptId:string) {return `jamb_exam_revisions_${this.scope(attemptId)}`;}
  static seedRevisions(attemptId:string,initial:Record<string,number>) {
    const key=this.revisionsKey(attemptId); const revisions=JSON.parse(localStorage.getItem(key)??'{}');
    for(const [questionId,revision] of Object.entries(initial)) revisions[questionId]=Math.max(Number(revisions[questionId]??0),revision);
    localStorage.setItem(key,JSON.stringify(revisions));
  }
  static saveSnapshot(attemptId:string,answers:Record<string,string>,labels:Record<string,'A'|'B'|'C'|'D'>) {
    if(typeof window==='undefined') return;
    localStorage.setItem(this.getStorageKey(attemptId),JSON.stringify({answers,labels,updatedAt:Date.now()}));
  }
  static loadSnapshot(attemptId:string):{answers:Record<string,string>;labels:Record<string,'A'|'B'|'C'|'D'>}|null {
    if(typeof window==='undefined') return null;
    try{return JSON.parse(localStorage.getItem(this.getStorageKey(attemptId))??'null');}catch{return null;}
  }
  static enqueue(attemptId:string,questionId:string,optionId:string|null,label?:'A'|'B'|'C'|'D') {
    const key=this.revisionsKey(attemptId); const revisions=JSON.parse(localStorage.getItem(key)??'{}');
    const revision=Number(revisions[questionId]??0)+1;
    revisions[questionId]=revision; localStorage.setItem(key,JSON.stringify(revisions));
    const pending=this.getOutbox(attemptId).filter((item)=>item.questionId!==questionId);
    pending.push({questionId,optionId,label,revision,timestamp:Date.now(),retryCount:0});
    localStorage.setItem(this.getOutboxKey(attemptId),JSON.stringify(pending));
  }
  static getOutbox(attemptId:string):OutboxItem[] {
    if(typeof window==='undefined') return [];
    const data=JSON.parse(localStorage.getItem(this.getOutboxKey(attemptId))??'[]');
    if(!Array.isArray(data)||data.some((item)=>!Number.isInteger(item.revision)||item.revision<1)) throw new Error('Saved answers need recovery before submission.');
    return data;
  }
  static removeFromOutbox(attemptId:string,questionId:string,ackRevision:number) {
    const pending=this.getOutbox(attemptId).filter((item)=>item.questionId!==questionId||item.revision>ackRevision);
    localStorage.setItem(this.getOutboxKey(attemptId),JSON.stringify(pending));
  }
  static clear(attemptId:string) {
    localStorage.removeItem(this.getStorageKey(attemptId)); localStorage.removeItem(this.getOutboxKey(attemptId)); localStorage.removeItem(this.revisionsKey(attemptId));
  }
}
