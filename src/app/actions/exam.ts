"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import {
  attemptInterruptions,
  attempts,
  attemptQuestions,
  attemptAnswers,
  attemptResults,
  studentSubjects,
  subjects,
  questions,
  questionOptions,
  passages
} from "@/db/schema";
import { eq, and, gt, sql, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ExamQuestion } from "@/app/mock/exam-store";
import { recordTopicMasteryBatch } from "@/lib/coach";
import { getUserSubscriptionStatus } from "@/lib/subscription";

export async function startMockAttempt(examConditions = false, resumeId?: string): Promise<{
  examConditions: boolean;
  attemptId: string;
  questions: ExamQuestion[];
  expiresAtTimestamp: number;
  initialAnswers: Record<string, string>;
  initialLabels: Record<string, 'A' | 'B' | 'C' | 'D'>;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (typeof examConditions !== "boolean") throw new Error("Invalid mock mode");

  // 1. Enforce subscription entitlement: free tier gets 1 diagnostic mock
  const subStatus = await getUserSubscriptionStatus(user.id);
  if (!resumeId && !subStatus.isPremium) {
    const pastCompletedMocks = await db.query.attempts.findMany({
      where: and(
        eq(attempts.userId, user.id),
        eq(attempts.mode, "mock"),
        eq(attempts.status, "completed")
      ),
    });

    if (pastCompletedMocks.length >= 1) {
      throw new Error("Free tier includes 1 diagnostic benchmark mock. Please upgrade to Premium for unlimited full simulations.");
    }
  }

  const now = new Date();

  // 1. Check for an active, unexpired attempt
  const activeAttempt = await db.query.attempts.findFirst({
    where: and(
      eq(attempts.userId, user.id),
      eq(attempts.mode, "mock"),
      eq(attempts.status, "in_progress"),
      ...(resumeId ? [eq(attempts.id, resumeId)] : [gt(attempts.expiresAt, now)])
    ),
  });

  if (resumeId && !activeAttempt) throw new Error("Active attempt not found");

  let attemptId = activeAttempt?.id;
  let expiresAt = activeAttempt?.expiresAt;

  if (!attemptId) {
    // 2. Fetch student's 4 enrolled subjects
    let candidateSubjects = await db
      .select({
        id: subjects.id,
        code: subjects.code,
        name: subjects.name,
        isCompulsory: subjects.isCompulsory,
      })
      .from(studentSubjects)
      .innerJoin(subjects, eq(studentSubjects.subjectId, subjects.id))
      .where(eq(studentSubjects.userId, user.id));

    if (!candidateSubjects || candidateSubjects.length === 0) {
      // Default fallback: English + 3 core electives
      candidateSubjects = await db
        .select({
          id: subjects.id,
          code: subjects.code,
          name: subjects.name,
          isCompulsory: subjects.isCompulsory,
        })
        .from(subjects)
        .where(eq(subjects.isActive, true))
        .limit(4);
    }

    // Sort to ensure English is always first
    candidateSubjects.sort((a, b) => (b.isCompulsory ? 1 : 0) - (a.isCompulsory ? 1 : 0));

    // Create new 120-minute mock attempt
    expiresAt = new Date(Date.now() + 120 * 60 * 1000); // 120 minutes from now

    const [newAttempt] = await db.insert(attempts).values({
      userId: user.id,
      examConditions,
      mode: "mock",
      status: "in_progress",
      startedAt: now,
      expiresAt: expiresAt,
    }).returning();

    attemptId = newAttempt.id;

    // Build the frozen question list across candidate's subjects
    let position = 1;
    const frozenQuestionsToInsert: Array<{
      attemptId: string;
      questionId: string;
      subjectId: string;
      position: number;
    }> = [];

    const subjectQuestionLists = await Promise.all(candidateSubjects.map(sub =>
      db.select({ id: questions.id }).from(questions)
        .where(and(eq(questions.subjectId, sub.id), eq(questions.status, "published")))
        .orderBy(sql`RANDOM()`).limit(sub.isCompulsory ? 60 : 40)
    ));
    candidateSubjects.forEach((sub, index) => {
      for (const question of subjectQuestionLists[index]) {
        frozenQuestionsToInsert.push({
          attemptId: newAttempt.id, questionId: question.id,
          subjectId: sub.id, position: position++,
        });
      }
    });

    if (frozenQuestionsToInsert.length > 0) {
      await db.insert(attemptQuestions).values(frozenQuestionsToInsert);
    }
  }

  // 3. Rehydrate the frozen question sequence
  const frozenList = await db
    .select({
      position: attemptQuestions.position,
      questionId: attemptQuestions.questionId,
      subjectId: attemptQuestions.subjectId,
      subjectCode: subjects.code,
      subjectName: subjects.name,
      stem: questions.stem,
      difficulty: questions.difficulty,
      examYear: questions.examYear,
      passageId: questions.passageId,
    })
    .from(attemptQuestions)
    .innerJoin(questions, eq(attemptQuestions.questionId, questions.id))
    .innerJoin(subjects, eq(attemptQuestions.subjectId, subjects.id))
    .where(eq(attemptQuestions.attemptId, attemptId))
    .orderBy(attemptQuestions.position);

  const passageIds = [...new Set(frozenList.flatMap(item => item.passageId ? [item.passageId] : []))];
  const [passageRows, optionRows] = await Promise.all([
    passageIds.length ? db.select({ id: passages.id, title: passages.title, content: passages.content })
      .from(passages).where(inArray(passages.id, passageIds)) : Promise.resolve([]),
    frozenList.length ? db.select({
      id: questionOptions.id, questionId: questionOptions.questionId,
      label: questionOptions.label, content: questionOptions.content,
    }).from(questionOptions).where(inArray(questionOptions.questionId, frozenList.map(item => item.questionId)))
      .orderBy(questionOptions.label) : Promise.resolve([]),
  ]);
  const passageMap = new Map(passageRows.map(p => [p.id, { title: p.title, content: p.content }]));
  const optionsByQuestion = new Map<string, ExamQuestion["options"]>();
  for (const option of optionRows) {
    const options = optionsByQuestion.get(option.questionId) || [];
    options.push({ id: option.id, label: option.label as 'A' | 'B' | 'C' | 'D', content: option.content });
    optionsByQuestion.set(option.questionId, options);
  }
  const formattedQuestions: ExamQuestion[] = frozenList.map(item => ({
    id: item.questionId, position: item.position,
    subjectCode: item.subjectCode, subjectName: item.subjectName,
    stem: item.stem, difficulty: item.difficulty, examYear: item.examYear,
    passage: item.passageId ? passageMap.get(item.passageId) || null : null,
    options: optionsByQuestion.get(item.questionId) || [],
  }));

  // 4. Retrieve existing answers if rehydrating
  const existingAnswers = await db
    .select({
      questionId: attemptAnswers.questionId,
      selectedOptionId: attemptAnswers.selectedOptionId,
    })
    .from(attemptAnswers)
    .where(eq(attemptAnswers.attemptId, attemptId));

  const initialAnswers: Record<string, string> = {};
  const initialLabels: Record<string, 'A' | 'B' | 'C' | 'D'> = {};

  if (existingAnswers.length > 0) {
    const optionIds = existingAnswers
      .map((a) => a.selectedOptionId)
      .filter((id): id is string => Boolean(id));

    if (optionIds.length > 0) {
      const labels = await db
        .select({
          id: questionOptions.id,
          label: questionOptions.label,
        })
        .from(questionOptions)
        .where(inArray(questionOptions.id, optionIds));

      const labelMap = new Map(labels.map((l) => [l.id, l.label as 'A' | 'B' | 'C' | 'D']));

      existingAnswers.forEach((ans) => {
        if (ans.selectedOptionId) {
          initialAnswers[ans.questionId] = ans.selectedOptionId;
          const lbl = labelMap.get(ans.selectedOptionId);
          if (lbl) initialLabels[ans.questionId] = lbl;
        }
      });
    }
  }

  return {
    attemptId,
    examConditions: activeAttempt?.examConditions ?? examConditions,
    questions: formattedQuestions,
    expiresAtTimestamp: expiresAt ? new Date(expiresAt).getTime() : Date.now() + 120 * 60 * 1000,
    initialAnswers,
    initialLabels,
  };
}

export async function syncExamAnswer(
  attemptId: string,
  questionId: string,
  selectedOptionId: string | null
): Promise<{ success: boolean }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false };
    const attempt = await db.query.attempts.findFirst({ where: and(eq(attempts.id, attemptId), eq(attempts.userId, user.id)) });
    if (!attempt || attempt.status !== "in_progress" || attempt.expiresAt.getTime() <= Date.now()) return { success: false };
    const question = await db.query.attemptQuestions.findFirst({ where: and(eq(attemptQuestions.attemptId, attemptId), eq(attemptQuestions.questionId, questionId)) });
    if (!question) return { success: false };
    if (selectedOptionId) {
      const option = await db.query.questionOptions.findFirst({ where: and(eq(questionOptions.id, selectedOptionId), eq(questionOptions.questionId, questionId)) });
      if (!option) return { success: false };
      await db.insert(attemptAnswers).values({
        attemptId,
        questionId,
        selectedOptionId,
        answeredAt: new Date(),
      }).onConflictDoUpdate({
        target: [attemptAnswers.attemptId, attemptAnswers.questionId],
        set: {
          selectedOptionId,
          answeredAt: new Date(),
        },
      });
    } else {
      // Reverse / Deselect
      await db.delete(attemptAnswers).where(
        and(
          eq(attemptAnswers.attemptId, attemptId),
          eq(attemptAnswers.questionId, questionId)
        )
      );
    }
    return { success: true };
  } catch (err) {
    console.warn("Failed to sync answer to server:", err);
    return { success: false };
  }
}

export async function submitMockExam(attemptId: string): Promise<{ resultId: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 1. Fetch attempt and verify ownership
  const attempt = await db.query.attempts.findFirst({
    where: and(eq(attempts.id, attemptId), eq(attempts.userId, user.id)),
  });

  if (!attempt) {
    throw new Error("Attempt not found");
  }

  // 2. Compute official scaled scoring
  const userAnswers = await db
    .select({
      questionId: attemptAnswers.questionId,
      selectedOptionId: attemptAnswers.selectedOptionId,
    })
    .from(attemptAnswers)
    .where(eq(attemptAnswers.attemptId, attemptId));


  // Fetch correct option IDs for all questions in this attempt
  const correctOptions = await db
    .select({
      id: questionOptions.id,
      questionId: questionOptions.questionId,
      subjectId: questions.subjectId,
    })
    .from(questionOptions)
    .innerJoin(questions, eq(questionOptions.questionId, questions.id))
    .where(eq(questionOptions.isCorrect, true));

  const correctOptionIdSet = new Set(correctOptions.map((co) => co.id));

  // Calculate subject-level breakdowns and topic-level mastery
  const subjectScores: Record<string, { correct: number; total: number }> = {};
  const topicScores: Record<string, { correct: number; total: number }> = {};

  // Find all questions in the attempt with their topicId
  const attemptQList = await db
    .select({
      questionId: attemptQuestions.questionId,
      subjectId: attemptQuestions.subjectId,
      topicId: questions.topicId,
    })
    .from(attemptQuestions)
    .innerJoin(questions, eq(attemptQuestions.questionId, questions.id))
    .where(eq(attemptQuestions.attemptId, attemptId));

  attemptQList.forEach((q) => {
    if (!subjectScores[q.subjectId]) {
      subjectScores[q.subjectId] = { correct: 0, total: 0 };
    }
    subjectScores[q.subjectId].total += 1;

    if (!topicScores[q.topicId]) {
      topicScores[q.topicId] = { correct: 0, total: 0 };
    }
    topicScores[q.topicId].total += 1;
  });

  const userAnswerMap = new Map(userAnswers.map((ua) => [ua.questionId, ua.selectedOptionId]));
  const masteryBatch: Array<{ subjectId: string; topicId: string; isCorrect: boolean }> = [];
  let totalCorrect = 0;

  attemptQList.forEach((q) => {
    const selectedOptId = userAnswerMap.get(q.questionId);
    const isCorrect = !!(selectedOptId && correctOptionIdSet.has(selectedOptId));

    if (isCorrect) {
      totalCorrect += 1;
      if (subjectScores[q.subjectId]) subjectScores[q.subjectId].correct += 1;
      if (topicScores[q.topicId]) topicScores[q.topicId].correct += 1;
    }

    masteryBatch.push({
      subjectId: q.subjectId,
      topicId: q.topicId,
      isCorrect,
    });
  });

  // Scale each subject to 100 points, total to 400 points
  const subIds = Object.keys(subjectScores);
  const scaledScores: number[] = subIds.map((subId) => {
    const s = subjectScores[subId];
    return s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
  });

  const englishScore = scaledScores[0] || 0;
  const subject2Score = scaledScores[1] || 0;
  const subject3Score = scaledScores[2] || 0;
  const subject4Score = scaledScores[3] || 0;
  const totalScore = englishScore + subject2Score + subject3Score + subject4Score;

  const timeSpentSeconds = Math.max(0, Math.floor((Date.now() - new Date(attempt.startedAt).getTime()) / 1000));

  // 3. Finalize attempt status
  await db.update(attempts).set({
    status: "completed",
    completedAt: new Date(),
  }).where(eq(attempts.id, attemptId));

  // 4. Update student topic mastery records for the diagnostic study coach
  try {
    await recordTopicMasteryBatch(user.id, masteryBatch);
  } catch (err) {
    console.warn("Notice updating topic mastery batch:", err);
  }

  // 5. Record official result
  const richBreakdown = {
    subjects: subjectScores,
    topics: topicScores,
  };

  const [resultRecord] = await db.insert(attemptResults).values({
    attemptId,
    userId: user.id,
    totalScore,
    englishScore,
    subject2Score,
    subject3Score,
    subject4Score,
    totalAnswered: userAnswers.length,
    totalCorrect,
    timeSpentSeconds,
    topicBreakdown: richBreakdown,
  }).onConflictDoUpdate({
    target: attemptResults.attemptId,
    set: {
      totalScore,
      englishScore,
      subject2Score,
      subject3Score,
      subject4Score,
      totalAnswered: userAnswers.length,
      totalCorrect,
      timeSpentSeconds,
      topicBreakdown: richBreakdown,
    },
  }).returning();

  return { resultId: resultRecord.id };
}

export async function recordMockInterruption(attemptId: string, id: string, ended: boolean) {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuid.test(attemptId) || !uuid.test(id) || typeof ended !== "boolean") throw new Error("Invalid event");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in required");
  const attempt = await db.query.attempts.findFirst({ where: and(eq(attempts.id, attemptId), eq(attempts.userId, user.id)) });
  if (!attempt?.examConditions || attempt.status !== "in_progress") return;
  const now = new Date(Math.min(Date.now(), attempt.expiresAt.getTime()));
  if (ended) {
    await db.update(attemptInterruptions).set({ endedAt: now }).where(and(eq(attemptInterruptions.id, id), eq(attemptInterruptions.attemptId, attemptId)));
  } else {
    await db.insert(attemptInterruptions).values({ id, attemptId, startedAt: now }).onConflictDoNothing();
  }
}
