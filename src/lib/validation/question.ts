import { z } from "zod";

export const questionOptionSchema = z.object({
  A: z.string().min(1, "Option A is required"),
  B: z.string().min(1, "Option B is required"),
  C: z.string().min(1, "Option C is required"),
  D: z.string().min(1, "Option D is required"),
});

export const singleQuestionImportSchema = z.object({
  subtopicSlug: z.string().max(200).optional(),
  passageReference: z.string().max(200).optional(),
  tags: z.array(z.string().max(100)).max(20).optional(),
  externalReference: z.string().max(200).optional(),
  sourceType: z.enum(['original','past_question','adapted']).optional(),
  sourceReference: z.string().max(2000).optional(),
  rightsNote: z.string().max(2000).optional(),
  imageAlt: z.string().max(2000).optional(),
  subjectCode: z.string().min(2).max(6).toUpperCase(), // e.g. 'ENG', 'MTH', 'PHY', 'CHM', 'BIO'
  topicTitle: z.string().min(2, "Topic title must be at least 2 characters"),
  stem: z.string().min(5, "Question stem must be at least 5 characters"),
  imageUrl: z.string().url().optional().nullable(),
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  examYear: z.number().int().min(1978).max(2100).optional().nullable(),
  options: questionOptionSchema,
  correctOption: z.enum(["A", "B", "C", "D"]),
  explanation: z.string().min(5, "Detailed explanation is required"),
  passageTitle: z.string().optional().nullable(),
  passageContent: z.string().optional().nullable(),
});

export const bulkQuestionImportSchema = z.array(singleQuestionImportSchema).min(1, "At least one question is required for import");

export type SingleQuestionImport = z.infer<typeof singleQuestionImportSchema>;
export type BulkQuestionImport = z.infer<typeof bulkQuestionImportSchema>;
