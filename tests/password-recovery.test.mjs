import test from 'node:test';
import assert from 'node:assert/strict';
import {createRecoverySessionTracker} from '../src/lib/auth/recovery-session.ts';
const session={user:{id:'recovered-user'}};
test('verified recovery survives late form subscription and initial session replay',()=>{
 const tracker=createRecoverySessionTracker();tracker.observe('PASSWORD_RECOVERY',session);
 // A form may subscribe after exchange and see INITIAL_SESSION rather than PASSWORD_RECOVERY.
 tracker.observe('INITIAL_SESSION',session);assert.equal(tracker.userId(session),'recovered-user');
 tracker.observe('TOKEN_REFRESHED',session);assert.equal(tracker.userId(session),'recovered-user');
});
test('ordinary sign in, absent session, another actor, logout and expired proof do not unlock recovery',()=>{
 let now=0;const tracker=createRecoverySessionTracker(()=>now);
 tracker.observe('SIGNED_IN',session);assert.equal(tracker.userId(session),null);
 tracker.observe('PASSWORD_RECOVERY',session);assert.equal(tracker.userId(null),null);assert.equal(tracker.userId({user:{id:'other'}}),null);
 now=15*60*1000;assert.equal(tracker.userId(session),null);
 tracker.observe('PASSWORD_RECOVERY',session);tracker.observe('SIGNED_OUT',null);assert.equal(tracker.userId(session),null);
 tracker.observe('PASSWORD_RECOVERY',session);tracker.observe('SIGNED_IN',{user:{id:'other'}});assert.equal(tracker.userId(session),null);
});
