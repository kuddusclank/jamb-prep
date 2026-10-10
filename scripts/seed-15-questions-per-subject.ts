import { db } from "../src/db";
import { 
  subjects, 
  topics, 
  passages, 
  questions, 
  questionOptions, 
  questionExplanations 
} from "../src/db/schema";
import { eq, inArray } from "drizzle-orm";
import { SingleQuestionImport } from "../src/lib/validation/question";

import { englishQuestions } from "./data/english";
import { mathematicsQuestions } from "./data/mathematics";
import { physicsQuestions } from "./data/physics";
import { chemistryQuestions } from "./data/chemistry";
import { biologyQuestions } from "./data/biology";
import { economicsQuestions } from "./data/economics";
import { governmentQuestions } from "./data/government";
import { literatureQuestions } from "./data/literature";
import { commerceQuestions } from "./data/commerce";
import { accountingQuestions } from "./data/accounting";
import { crkQuestions } from "./data/crk";
import { irsQuestions } from "./data/irs";
import { geographyQuestions } from "./data/geography";
import { agricultureQuestions } from "./data/agriculture";
import { historyQuestions } from "./data/history";

const allSubjectQuestionSets: Record<string, SingleQuestionImport[]> = {
  ENG: englishQuestions,
  MTH: mathematicsQuestions,
  PHY: physicsQuestions,
  CHM: chemistryQuestions,
  BIO: biologyQuestions,
  ECN: economicsQuestions,
  GOV: governmentQuestions,
  LIT: literatureQuestions,
  COM: commerceQuestions,
  ACC: accountingQuestions,
  CRK: crkQuestions,
  IRS: irsQuestions,
  GEO: geographyQuestions,
  AGR: agricultureQuestions,
  HIS: historyQuestions,
};

async function seedSubjectQuestions() {
  console.log("=================================================");
  console.log("   JAMB UTME 15-Subject Mock Question Bank Seed");
  console.log("=================================================");

  // 1. Fetch all subjects
  const allSubjects = await db.select().from(subjects);
  const subjectMap = new Map(allSubjects.map((s) => [s.code, s]));

  // 2. Fetch all existing topics
  const allTopics = await db.select().from(topics);
  const topicMap = new Map(allTopics.map((t) => [`${t.subjectId}:${t.slug}`, t]));

  // 3. Fetch all existing questions stems
  const existingQuestions = await db.select({
    id: questions.id,
    subjectId: questions.subjectId,
    stem: questions.stem,
  }).from(questions);
  const existingStemSet = new Set(existingQuestions.map((q) => `${q.subjectId}:${q.stem}`));

  const summary: Record<string, { total: number; inserted: number; skipped: number }> = {};
  let overallInserted = 0;
  let overallSkipped = 0;

  for (const [code, items] of Object.entries(allSubjectQuestionSets)) {
    summary[code] = { total: items.length, inserted: 0, skipped: 0 };
    const subject = subjectMap.get(code);

    if (!subject) {
      console.error(`❌ Subject code '${code}' not found in database!`);
      continue;
    }

    // 4. Ensure all topics for this subject exist
    for (const item of items) {
      const topicSlug = item.topicTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const key = `${subject.id}:${topicSlug}`;
      if (!topicMap.has(key)) {
        const [newTopic] = await db.insert(topics).values({
          subjectId: subject.id,
          title: item.topicTitle,
          slug: topicSlug,
        }).returning();
        topicMap.set(key, newTopic);
      }
    }

    // 5. Insert new questions in parallel per subject
    const toInsert = items.filter((item) => {
      const isExisting = existingStemSet.has(`${subject.id}:${item.stem}`);
      if (isExisting) {
        summary[code].skipped++;
        overallSkipped++;
        return false;
      }
      return true;
    });

    if (toInsert.length > 0) {
      console.log(`Inserting ${toInsert.length} questions for ${code} (${items.length - toInsert.length} skipped)...`);

      // Process questions concurrently in batches of 5 to respect pool limits
      for (let i = 0; i < toInsert.length; i += 5) {
        const batch = toInsert.slice(i, i + 5);
        await Promise.all(batch.map(async (item) => {
          const topicSlug = item.topicTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-");
          const topic = topicMap.get(`${subject.id}:${topicSlug}`)!;

          let passageId: string | null = null;
          if (item.passageContent && item.passageContent.trim().length > 0) {
            const [newPassage] = await db.insert(passages).values({
              subjectId: subject.id,
              title: item.passageTitle || null,
              content: item.passageContent,
            }).returning();
            passageId = newPassage.id;
          }

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

          const optionKeys: Array<"A" | "B" | "C" | "D"> = ["A", "B", "C", "D"];
          const optionValues = optionKeys.map((k) => ({
            questionId: newQuestion.id,
            label: k,
            content: item.options[k],
            isCorrect: item.correctOption === k,
          }));

          await Promise.all([
            db.insert(questionOptions).values(optionValues),
            db.insert(questionExplanations).values({
              questionId: newQuestion.id,
              explanation: item.explanation,
            }),
          ]);

          summary[code].inserted++;
          overallInserted++;
          existingStemSet.add(`${subject.id}:${item.stem}`);
        }));
      }
    } else {
      console.log(`All ${items.length} questions for ${code} already exist.`);
    }
  }

  console.log("\n=================================================");
  console.log("                SEEDING COMPLETE");
  console.log("=================================================");
  console.table(summary);
  console.log(`\nOverall: ${overallInserted} inserted, ${overallSkipped} skipped across 15 subjects.`);

  process.exit(0);
}

seedSubjectQuestions().catch((err) => {
  console.error("Fatal seed error:", err);
  process.exit(1);
});
