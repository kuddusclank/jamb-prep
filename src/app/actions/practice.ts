"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { 
  subjects, 
  topics, 
  passages, 
  questions, 
  questionOptions, 
  questionExplanations 
} from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { recordTopicMasteryBatch } from "@/lib/coach";

export interface PracticeQuestionItem {
  id: string;
  stem: string;
  difficulty: string;
  examYear?: number | null;
  subjectCode: string;
  subjectName: string;
  topicTitle: string;
  passage?: {
    title?: string | null;
    content: string;
  } | null;
  options: Array<{
    label: string;
    content: string;
  }>;
}

export async function getPracticeQuestions(
  subjectCode: string,
  topicSlug?: string,
  count: number = 5
): Promise<PracticeQuestionItem[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to practice.");
  }

  // 1. Resolve subject
  const subject = await db.query.subjects.findFirst({
    where: eq(subjects.code, subjectCode),
  });

  if (!subject) return [];

  // 2. Fetch questions for subject (optionally filtered by topic)
  let whereClause = eq(questions.subjectId, subject.id);
  if (topicSlug) {
    const topic = await db.query.topics.findFirst({
      where: and(eq(topics.subjectId, subject.id), eq(topics.slug, topicSlug)),
    });
    if (topic) {
      whereClause = and(eq(questions.subjectId, subject.id), eq(questions.topicId, topic.id)) as any;
    }
  }

  const rawQuestions = await db
    .select({
      id: questions.id,
      stem: questions.stem,
      difficulty: questions.difficulty,
      examYear: questions.examYear,
      topicId: questions.topicId,
      passageId: questions.passageId,
    })
    .from(questions)
    .where(whereClause)
    .orderBy(sql`RANDOM()`)
    .limit(count);

  const results: PracticeQuestionItem[] = [];

  for (const q of rawQuestions) {
    // Fetch topic
    const topicRecord = await db.query.topics.findFirst({
      where: eq(topics.id, q.topicId),
    });

    // Fetch passage if any
    let passageData = null;
    if (q.passageId) {
      const pRecord = await db.query.passages.findFirst({
        where: eq(passages.id, q.passageId),
      });
      if (pRecord) {
        passageData = {
          title: pRecord.title,
          content: pRecord.content,
        };
      }
    }

    // Fetch options WITHOUT revealing isCorrect (client will verify on submit)
    const opts = await db
      .select({
        label: questionOptions.label,
        content: questionOptions.content,
      })
      .from(questionOptions)
      .where(eq(questionOptions.questionId, q.id))
      .orderBy(questionOptions.label);

    results.push({
      id: q.id,
      stem: q.stem,
      difficulty: q.difficulty,
      examYear: q.examYear,
      subjectCode: subject.code,
      subjectName: subject.name,
      topicTitle: topicRecord?.title || "General",
      passage: passageData,
      options: opts,
    });
  }

  return results;
}

export interface PracticeAnswerResult {
  isCorrect: boolean;
  correctOption: string;
  explanation: string;
}

export async function checkPracticeAnswer(
  questionId: string,
  selectedOption: string
): Promise<PracticeAnswerResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to submit answers.");
  }

  // Find question details for subject and topic tracking
  const qRecord = await db.query.questions.findFirst({
    where: eq(questions.id, questionId),
  });

  // Find correct option from database
  const correctOpt = await db.query.questionOptions.findFirst({
    where: and(
      eq(questionOptions.questionId, questionId),
      eq(questionOptions.isCorrect, true)
    ),
  });

  // Find detailed explanation
  const expRecord = await db.query.questionExplanations.findFirst({
    where: eq(questionExplanations.questionId, questionId),
  });

  const isCorrect = correctOpt ? correctOpt.label === selectedOption : false;

  // Real-time study coach topic mastery update
  if (qRecord && qRecord.topicId) {
    try {
      await recordTopicMasteryBatch(user.id, [{
        subjectId: qRecord.subjectId,
        topicId: qRecord.topicId,
        isCorrect,
      }]);
    } catch (err) {
      console.warn("Notice updating practice topic mastery:", err);
    }
  }

  return {
    isCorrect,
    correctOption: correctOpt?.label || "A",
    explanation: expRecord?.explanation || "No explanation provided for this question.",
  };
}
