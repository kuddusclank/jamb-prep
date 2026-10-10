"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { 
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

export async function startMockAttempt(): Promise<{
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

  const now = new Date();

  // 1. Check for an active, unexpired attempt
  const activeAttempt = await db.query.attempts.findFirst({
    where: and(
      eq(attempts.userId, user.id),
      eq(attempts.mode, "mock"),
      eq(attempts.status, "in_progress"),
      gt(attempts.expiresAt, now)
    ),
  });

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

    for (const sub of candidateSubjects) {
      // Pull published questions for this subject
      const subQuestions = await db
        .select({ id: questions.id })
        .from(questions)
        .where(eq(questions.subjectId, sub.id))
        .orderBy(sql`RANDOM()`)
        .limit(sub.isCompulsory ? 60 : 40);

      for (const q of subQuestions) {
        frozenQuestionsToInsert.push({
          attemptId: newAttempt.id,
          questionId: q.id,
          subjectId: sub.id,
          position: position++,
        });
      }
    }

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

  const formattedQuestions: ExamQuestion[] = [];

  for (const item of frozenList) {
    // Fetch passage if present
    let passageData = null;
    if (item.passageId) {
      const p = await db.query.passages.findFirst({
        where: eq(passages.id, item.passageId),
      });
      if (p) {
        passageData = {
          title: p.title,
          content: p.content,
        };
      }
    }

    // Fetch options (WITHOUT isCorrect answer key)
    const rawOptions = await db
      .select({
        id: questionOptions.id,
        label: questionOptions.label,
        content: questionOptions.content,
      })
      .from(questionOptions)
      .where(eq(questionOptions.questionId, item.questionId))
      .orderBy(questionOptions.label);

    formattedQuestions.push({
      id: item.questionId,
      position: item.position,
      subjectCode: item.subjectCode,
      subjectName: item.subjectName,
      stem: item.stem,
      difficulty: item.difficulty,
      examYear: item.examYear,
      passage: passageData,
      options: rawOptions.map((o) => ({
        id: o.id,
        label: o.label as 'A' | 'B' | 'C' | 'D',
        content: o.content,
      })),
    });
  }

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
    if (selectedOptionId) {
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

  const userSelectedOptionIds = userAnswers
    .map((a) => a.selectedOptionId)
    .filter((id): id is string => Boolean(id));

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
  const questionSubjectMap = new Map(correctOptions.map((co) => [co.questionId, co.subjectId]));

  // Calculate subject-level breakdowns
  const subjectScores: Record<string, { correct: number; total: number }> = {};

  // Find all questions in the attempt
  const attemptQList = await db
    .select({
      questionId: attemptQuestions.questionId,
      subjectId: attemptQuestions.subjectId,
    })
    .from(attemptQuestions)
    .where(eq(attemptQuestions.attemptId, attemptId));

  attemptQList.forEach((q) => {
    if (!subjectScores[q.subjectId]) {
      subjectScores[q.subjectId] = { correct: 0, total: 0 };
    }
    subjectScores[q.subjectId].total += 1;
  });

  let totalCorrect = 0;
  userAnswers.forEach((ans) => {
    if (ans.selectedOptionId && correctOptionIdSet.has(ans.selectedOptionId)) {
      totalCorrect += 1;
      const subId = questionSubjectMap.get(ans.questionId);
      if (subId && subjectScores[subId]) {
        subjectScores[subId].correct += 1;
      }
    }
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

  // 4. Record official result
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
    topicBreakdown: subjectScores,
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
      topicBreakdown: subjectScores,
    },
  }).returning();

  return { resultId: resultRecord.id };
}
