/** Short-lived in-memory proof of the SDK's verified recovery event; never inferred from a normal session. */
export function createRecoverySessionTracker(now:()=>number=Date.now) {
 let recovery:{userId:string;until:number}|null=null;
 return {
  observe(event:string,session:{user:{id:string}}|null) {
   if(event==='PASSWORD_RECOVERY'&&session){recovery={userId:session.user.id,until:now()+15*60*1000};}
   else if(event==='SIGNED_OUT'||(session&&recovery&&session.user.id!==recovery.userId)){recovery=null;}
  },
  userId(session:{user:{id:string}}|null) {
   if(!session||!recovery||now()>=recovery.until||session.user.id!==recovery.userId)return null;
   return recovery.userId;
  },
 };
}
export const recoverySessionTracker=createRecoverySessionTracker();
