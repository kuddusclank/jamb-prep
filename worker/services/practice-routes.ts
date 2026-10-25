import type { RouteDefinition } from '../api/router';
import { assertValidUuid,readBoundedJsonBody } from '../api/contracts';
import { ApiError } from '../api/errors';
import { executeTransactionalIdempotentMutation,extractIdempotencyKey } from '../api/idempotency';
import {loadAssessmentPools,selectAssessmentForm} from './assessment-selector';
import {getUserSubscriptionStatus} from './subscription-service';
import { practiceCatalogue } from './practice-catalogue-service';
import { getOrIssueWeeklyPack, syncWeeklyPackAnswers, type SyncAnswerItem } from './weekly-pack-service';
import { submitAndScoreExamAttemptAtomic } from './exam-foundation-service';

export const PRACTICE_ROUTES: RouteDefinition[] = [
  {id:'practice.weekly.get',method:'GET',pattern:'/api/v1/practice/weekly-pack',auth:'student',handler:async ctx=>{
    const sql=ctx.getDb().sql;
    const result=await getOrIssueWeeklyPack(sql,ctx.actor!.userId,ctx.now);
    return {status:200,body:result};
  }},
  {id:'practice.weekly.sync',method:'POST',pattern:'/api/v1/practice/weekly-pack/sync',auth:'student',idempotency:'required',handler:async ctx=>{
    const {data,rawText}=await readBoundedJsonBody(ctx.request);
    const body=data as {packId:string;answers:SyncAnswerItem[]};
    const outcome=await executeTransactionalIdempotentMutation({
      db:ctx.getDb(),
      userId:ctx.actor!.userId,
      operation:'practice.weekly.sync',
      canonicalPayload:JSON.stringify({rawText}),
      idempotencyKey:extractIdempotencyKey(ctx.request,{required:true})!,
      execute:async tx=>{
        return {body:await syncWeeklyPackAnswers(tx,ctx.actor!.userId,body,ctx.now)};
      }
    });
    return {status:200,body:outcome.body,headers:outcome.headers};
  }},
  {id:'mock.readiness',method:'GET',pattern:'/api/v1/mock/readiness',auth:'student',handler:async ctx=>{
    const sql=ctx.getDb().sql;const userId=ctx.actor!.userId;
    const [profile]=await sql`SELECT exam_year FROM student_preferences WHERE user_id=${userId}::uuid`;
    const activeRows=await sql<Array<{id:string;expires_at?:string}>>`SELECT id,expires_at FROM attempts WHERE user_id=${userId}::uuid AND mode='mock' AND status='in_progress' ORDER BY started_at DESC,id DESC LIMIT 1`;
    let active: {id:string;expires_at?:string} | undefined = activeRows[0];
    if(active?.expires_at && Date.parse(String(active.expires_at)) <= ctx.now.getTime()){
      await submitAndScoreExamAttemptAtomic(ctx.getDb(),{attemptId:active.id,userId,serverSubmittedAt:ctx.now.toISOString()}).catch(async()=>{
        await sql`UPDATE attempts SET status='expired',completed_at=${ctx.now.toISOString()}::timestamptz WHERE id=${active!.id}::uuid AND status='in_progress'`;
      });
      active=undefined;
    }
    const subscription=await getUserSubscriptionStatus(sql,userId,ctx.now);
    const subjects=await sql<Array<{id:string;code:string;name:string;is_compulsory:boolean;available:number}>>`SELECT s.id,s.code,s.name,s.is_compulsory,(SELECT count(*)::int FROM study_question_pool q WHERE q.subject_id=s.id) AS available FROM subjects s JOIN student_subjects ss ON ss.subject_id=s.id WHERE ss.user_id=${userId}::uuid AND s.is_active ORDER BY s.is_compulsory DESC,s.display_order,s.code`;
    const checked=[];
    for(const subject of subjects){const required=subject.is_compulsory?60:40;let ready=false;let message='';
      if(Number(subject.available)<required)message=`${subject.name} has ${subject.available} eligible questions; ${required} are needed.`;
      else try{const pools=await loadAssessmentPools(sql,subject.id,Number(profile?.exam_year),userId,'readiness');selectAssessmentForm(pools.blueprint,pools.cells,pools.candidates);ready=true;}catch(error){if(error instanceof ApiError&&error.status===409)message=error.message.replace(' No diagnostic allowance has been consumed.','');else throw error;}
      checked.push({code:subject.code,name:subject.name,isCompulsory:subject.is_compulsory,available:Number(subject.available),required,ready,message});
    }
    const ready=checked.length===4&&checked.filter(s=>s.isCompulsory).length===1&&checked.every(s=>s.ready);

    // Check if candidate belongs to a school with an active scheduled mock
    let schoolMockPayload: {
      id: string;
      title: string;
      schoolName: string;
      schoolCode: string;
      scheduledStart: string;
      durationMinutes: number;
      windowStatus: 'scheduled' | 'open' | 'expired';
      hasCompleted: boolean;
      activeAttemptId: string | null;
      previousResult: {
        totalScore: number;
        englishScore: number;
        subject2Score: number;
        subject3Score: number;
        subject4Score: number;
        completedAt: string;
      } | null;
    } | null = null;

    try {
      const enrolledSchoolRows = await sql<Array<{ school_id: string; school_name: string; school_code: string }>>`
        SELECT ss.school_id, s.name AS school_name, s.code AS school_code
        FROM school_students ss
        JOIN schools s ON s.id = ss.school_id
        WHERE ss.student_user_id = ${userId}::uuid
        LIMIT 1
      `;

      if (enrolledSchoolRows[0]) {
        const school = enrolledSchoolRows[0];
        const activeMockRows = await sql<Array<{
          id: string;
          title: string;
          scheduled_start: string;
          duration_minutes: number;
          window_buffer_minutes: number;
          status: string;
        }>>`
          SELECT id, title, scheduled_start, duration_minutes, window_buffer_minutes, status
          FROM school_mocks
          WHERE school_id = ${school.school_id}::uuid AND status = 'active'
          ORDER BY created_at DESC
          LIMIT 1
        `;

        if (activeMockRows[0]) {
          const sm = activeMockRows[0];
          const startMs = new Date(sm.scheduled_start).getTime();
          const durationMs = (sm.duration_minutes || 120) * 60 * 1000;
          const bufferMs = (sm.window_buffer_minutes || 30) * 60 * 1000;
          const endMs = startMs + durationMs + bufferMs;
          const nowMs = ctx.now.getTime();

          let windowStatus: 'scheduled' | 'open' | 'expired' = 'open';
          if (nowMs < startMs) {
            windowStatus = 'scheduled';
          } else if (nowMs > endMs) {
            windowStatus = 'expired';
          }

          const mockAttemptRows = await sql<Array<{
            id: string;
            status: string;
            total_score: number | null;
            english_score: number | null;
            subject2_score: number | null;
            subject3_score: number | null;
            subject4_score: number | null;
            completed_at: string | null;
          }>>`
            SELECT
              a.id,
              a.status,
              ar.total_score,
              ar.english_score,
              ar.subject2_score,
              ar.subject3_score,
              ar.subject4_score,
              ar.created_at AS completed_at
            FROM attempts a
            LEFT JOIN attempt_results ar ON ar.attempt_id = a.id
            WHERE a.user_id = ${userId}::uuid
              AND (a.school_mock_id = ${sm.id}::uuid OR a.blueprint_manifest->>'schoolMockId' = ${sm.id}::text)
            ORDER BY a.started_at DESC
            LIMIT 1
          `;

          const prevAttempt = mockAttemptRows[0];
          const hasCompleted = prevAttempt?.status === 'completed' && prevAttempt?.total_score !== null;
          const mockActiveAttemptId = prevAttempt?.status === 'in_progress' ? prevAttempt.id : null;

          schoolMockPayload = {
            id: sm.id,
            title: sm.title,
            schoolName: school.school_name,
            schoolCode: school.school_code,
            scheduledStart: sm.scheduled_start,
            durationMinutes: sm.duration_minutes || 120,
            windowStatus,
            hasCompleted,
            activeAttemptId: mockActiveAttemptId,
            previousResult: hasCompleted ? {
              totalScore: Number(prevAttempt.total_score),
              englishScore: Number(prevAttempt.english_score),
              subject2Score: Number(prevAttempt.subject2_score),
              subject3Score: Number(prevAttempt.subject3_score),
              subject4Score: Number(prevAttempt.subject4_score),
              completedAt: String(prevAttempt.completed_at),
            } : null,
          };
        }
      }
    } catch {
      // Graceful fallback if school_mocks is unavailable or not applicable
    }

    return {
      status: 200,
      body: {
        ready,
        isPremium: subscription.isPremium,
        activeAttemptId: active?.id ?? null,
        subjects: checked,
        schoolMock: schoolMockPayload,
        message: ready ? 'Your reviewed question banks are ready.' : 'A complete mock is not ready yet. Topic practice remains available; no diagnostic allowance will be used.',
      },
    };
  }},
  {id:'practice.catalogue',method:'GET',pattern:'/api/v1/practice/catalogue',auth:'student',handler:async ctx=>({status:200,body:await practiceCatalogue(ctx.getDb().sql,ctx.actor!.userId,ctx.now)})},
  {id:'practice.session.get',method:'GET',pattern:'/api/v1/practice/sessions/:sessionId',auth:'student',handler:async ctx=>{
    const id=assertValidUuid(ctx.params.sessionId);const sql=ctx.getDb().sql;
    const [session]=await sql`SELECT id,status,expires_at,practice_requested_count FROM attempts WHERE id=${id}::uuid AND user_id=${ctx.actor!.userId}::uuid AND mode='practice'`;
    if(!session)throw new ApiError({status:404,code:'NOT_FOUND',message:'Practice session not found.'});
    const rows=await sql`SELECT aq.snapshot AS question,aa.selected_option_id,
      CASE WHEN aa.selected_option_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM attempts m JOIN attempt_questions mq ON mq.attempt_id=m.id WHERE m.user_id=${ctx.actor!.userId}::uuid AND m.mode='mock' AND m.status='in_progress' AND mq.question_id=aq.question_id)
      THEN jsonb_build_object('isCorrect',aa.selected_option_id=aq.correct_option_id,'correctOption',(SELECT o->>'label' FROM jsonb_array_elements(aq.snapshot->'options') o WHERE o->>'id'=aq.correct_option_id::text),'explanation',aq.frozen_explanation) ELSE NULL END AS feedback
      FROM attempt_questions aq LEFT JOIN attempt_answers aa ON aa.attempt_id=aq.attempt_id AND aa.question_id=aq.question_id WHERE aq.attempt_id=${id}::uuid AND aq.snapshot IS NOT NULL ORDER BY aq.position`;
    return {status:200,body:{sessionId:id,status:session.status==='in_progress'&&rows.length>0&&rows.every(r=>r.selected_option_id)?'completed':session.status,expiresAt:session.expires_at,questions:rows.map(r=>r.question),answers:rows.map(r=>({questionId:(r.question as {id:string}).id,selectedOptionId:r.selected_option_id??null,feedback:r.feedback??null}))}};
  }},
  {id:'practice.session.finish',method:'POST',pattern:'/api/v1/practice/sessions/:sessionId/finish',auth:'student_live_session',idempotency:'required',handler:async ctx=>{
    const id=assertValidUuid(ctx.params.sessionId);const {data,rawText}=await readBoundedJsonBody(ctx.request);
    if(typeof data.abandon!=='boolean')throw new ApiError({status:422,code:'VALIDATION_FAILED',message:'Choose whether to end or complete this session.'});
    const outcome=await executeTransactionalIdempotentMutation({db:ctx.getDb(),userId:ctx.actor!.userId,operation:'practice.finish',canonicalPayload:JSON.stringify({id,rawText}),idempotencyKey:extractIdempotencyKey(ctx.request,{required:true})!,execute:async tx=>{
      await tx`SELECT id FROM profiles WHERE id=${ctx.actor!.userId}::uuid FOR UPDATE`;
      const [session]=await tx`SELECT id,status,expires_at FROM attempts WHERE id=${id}::uuid AND user_id=${ctx.actor!.userId}::uuid AND mode='practice' FOR UPDATE`;
      if(!session)throw new ApiError({status:404,code:'NOT_FOUND',message:'Practice session not found.'});
      const [progress]=await tx`SELECT count(aq.id)::int AS total,count(aa.selected_option_id)::int AS answered FROM attempt_questions aq LEFT JOIN attempt_answers aa ON aa.attempt_id=aq.attempt_id AND aa.question_id=aq.question_id WHERE aq.attempt_id=${id}::uuid`;
      if(!data.abandon&&session.status==='expired')throw new ApiError({status:409,code:'CONFLICT',message:'This session has ended and cannot be completed.'});
      if(!data.abandon&&session.status==='in_progress'&&new Date(String(session.expires_at)).getTime()<=ctx.now.getTime())throw new ApiError({status:409,code:'CONFLICT',message:'This session has expired. End it before starting another.'});
      if(!data.abandon&&(Number(progress.total)===0||Number(progress.answered)!==Number(progress.total)))throw new ApiError({status:409,code:'CONFLICT',message:'Answer the remaining questions or explicitly end this session.'});
      if(session.status==='in_progress'&&data.abandon)await tx`INSERT INTO scored_response_events(attempt_id,question_id,user_id,subject_id,topic_id,mode,answered,is_correct,difficulty,scored_at,editorial_revision) SELECT aq.attempt_id,aq.question_id,${ctx.actor!.userId}::uuid,aq.subject_id,aq.topic_id,'practice',false,false,COALESCE(aq.snapshot->>'difficulty','medium'),${ctx.now.toISOString()}::timestamptz,COALESCE((aq.snapshot->>'editorialRevision')::int,1) FROM attempt_questions aq WHERE aq.attempt_id=${id}::uuid AND NOT EXISTS(SELECT 1 FROM attempt_answers aa WHERE aa.attempt_id=aq.attempt_id AND aa.question_id=aq.question_id AND aa.selected_option_id IS NOT NULL) ON CONFLICT DO NOTHING`;
      if(session.status==='in_progress')await tx`UPDATE attempts SET status=${data.abandon?'expired':'completed'}::attempt_status,completed_at=${ctx.now.toISOString()}::timestamptz WHERE id=${id}::uuid`;
      return {body:{sessionId:id,completed:session.status==='completed'||(session.status==='in_progress'&&!data.abandon),answered:progress.answered,total:progress.total}};
    }});return {status:200,body:outcome.body,headers:outcome.headers};
  }},
];
