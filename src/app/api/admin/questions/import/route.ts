import { NextResponse } from "next/server";
import { db } from "@/db";
import { 
  subjects, 
  topics, 
  passages, 
  questions, 
  questionOptions, 
  questionExplanations 
} from "@/db/schema";
import { bulkQuestionImportSchema } from "@/lib/validation/question";
import { eq, and } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parseResult = bulkQuestionImportSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Validation error", 
          details: parseResult.error.issues 
        },
        { status: 400 }
      );
    }

    const items = parseResult.data;
    let importedCount = 0;
    const errors: Array<{ index: number; reason: string }> = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      try {
        // 1. Resolve Subject
        const subject = await db.query.subjects.findFirst({
          where: eq(subjects.code, item.subjectCode),
        });

        if (!subject) {
          errors.push({ index: i, reason: `Subject code '${item.subjectCode}' not found.` });
          continue;
        }

        // 2. Resolve or Create Topic
        const topicSlug = item.topicTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        let topic = await db.query.topics.findFirst({
          where: and(eq(topics.subjectId, subject.id), eq(topics.slug, topicSlug)),
        });

        if (!topic) {
          const [newTopic] = await db.insert(topics).values({
            subjectId: subject.id,
            title: item.topicTitle,
            slug: topicSlug,
          }).returning();
          topic = newTopic;
        }

        // 3. Resolve or Create Passage (if applicable)
        let passageId: string | null = null;
        if (item.passageContent && item.passageContent.trim().length > 0) {
          const [newPassage] = await db.insert(passages).values({
            subjectId: subject.id,
            title: item.passageTitle || null,
            content: item.passageContent,
          }).returning();
          passageId = newPassage.id;
        }

        // 4. Create Question
        const [newQuestion] = await db.insert(questions).values({
          subjectId: subject.id,
          topicId: topic.id,
          passageId: passageId,
          stem: item.stem,
          imageUrl: item.imageUrl || null,
          difficulty: item.difficulty,
          examYear: item.examYear || null,
          status: "published",
        }).returning();

        // 5. Create Options A, B, C, D
        const optionKeys: Array<"A" | "B" | "C" | "D"> = ["A", "B", "C", "D"];
        const optionValues = optionKeys.map((key) => ({
          questionId: newQuestion.id,
          label: key,
          content: item.options[key],
          isCorrect: item.correctOption === key,
        }));

        await db.insert(questionOptions).values(optionValues);

        // 6. Create Detailed Explanation
        await db.insert(questionExplanations).values({
          questionId: newQuestion.id,
          explanation: item.explanation,
        });

        importedCount++;
      } catch (err: any) {
        errors.push({ index: i, reason: err?.message || "Failed to insert record" });
      }
    }

    return NextResponse.json({
      success: true,
      importedCount,
      totalReceived: items.length,
      errors,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
