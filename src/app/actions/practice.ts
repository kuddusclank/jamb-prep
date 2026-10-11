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
import { eq, and, sql, inArray } from "drizzle-orm";
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

  if (!Number.isInteger(count) || count < 1 || count > 60) {
    throw new Error("Choose between 1 and 60 practice questions.");
  }

  // 1. Resolve subject
  const subject = await db.query.subjects.findFirst({
    where: eq(subjects.code, subjectCode),
  });

  if (!subject) return [];

  // 2. Fetch questions for subject (optionally filtered by topic)
  let whereClause = and(eq(questions.subjectId, subject.id), eq(questions.status, "published"));
  if (topicSlug) {
    const topic = await db.query.topics.findFirst({
      where: and(eq(topics.subjectId, subject.id), eq(topics.slug, topicSlug)),
    });
    if (!topic) return [];
    if (topic) {
      whereClause = and(eq(questions.subjectId, subject.id), eq(questions.topicId, topic.id), eq(questions.status, "published"));
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

  if (rawQuestions.length === 0) return [];
  const passageIds = [...new Set(rawQuestions.flatMap(q => q.passageId ? [q.passageId] : []))];
  const [topicRows, passageRows, optionRows] = await Promise.all([
    db.select({ id: topics.id, title: topics.title }).from(topics)
      .where(inArray(topics.id, [...new Set(rawQuestions.map(q => q.topicId))])),
    passageIds.length ? db.select({ id: passages.id, title: passages.title, content: passages.content })
      .from(passages).where(inArray(passages.id, passageIds)) : Promise.resolve([]),
    db.select({ questionId: questionOptions.questionId, label: questionOptions.label, content: questionOptions.content })
      .from(questionOptions).where(inArray(questionOptions.questionId, rawQuestions.map(q => q.id)))
      .orderBy(questionOptions.label),
  ]);
  const topicMap = new Map(topicRows.map(t => [t.id, t.title]));
  const passageMap = new Map(passageRows.map(p => [p.id, { title: p.title, content: p.content }]));
  const optionsByQuestion = new Map<string, PracticeQuestionItem["options"]>();
  for (const option of optionRows) {
    const options = optionsByQuestion.get(option.questionId) || [];
    options.push({ label: option.label, content: option.content });
    optionsByQuestion.set(option.questionId, options);
  }
  const results: PracticeQuestionItem[] = rawQuestions.map(q => ({
    id: q.id, stem: q.stem, difficulty: q.difficulty, examYear: q.examYear,
    subjectCode: subject.code, subjectName: subject.name,
    topicTitle: topicMap.get(q.topicId) || "General",
    passage: q.passageId ? passageMap.get(q.passageId) || null : null,
    options: optionsByQuestion.get(q.id) || [],
  }));

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
