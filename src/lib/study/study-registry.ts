import type { StudySubject, StudyTopic } from "./types";
import rawStudyData from "./study-data.json";

export const STUDY_SUBJECTS: StudySubject[] = rawStudyData as StudySubject[];

const SUBJECTS_BY_CODE = new Map<string, StudySubject>();
const TOPICS_BY_KEY = new Map<string, StudyTopic>();

for (const subject of STUDY_SUBJECTS) {
  SUBJECTS_BY_CODE.set(subject.code.toUpperCase(), subject);
  for (const topic of subject.topics) {
    TOPICS_BY_KEY.set(`${subject.code.toUpperCase()}:${topic.slug.toLowerCase()}`, topic);
  }
}

export function getAllStudySubjects(): StudySubject[] {
  return STUDY_SUBJECTS;
}

export function getStudySubject(code: string | null | undefined): StudySubject | undefined {
  if (!code) return undefined;
  return SUBJECTS_BY_CODE.get(code.toUpperCase().trim());
}

export function getStudyTopic(
  subjectCode: string | null | undefined,
  topicSlug: string | null | undefined
): StudyTopic | undefined {
  if (!subjectCode || !topicSlug) return undefined;
  return TOPICS_BY_KEY.get(`${subjectCode.toUpperCase().trim()}:${topicSlug.toLowerCase().trim()}`);
}

export function searchStudyTopics(
  query: string,
  subjectCode?: string
): Array<{ subject: StudySubject; topic: StudyTopic }> {
  const cleanQuery = query.toLowerCase().trim();
  if (!cleanQuery) return [];

  const subjectsToSearch = subjectCode
    ? [getStudySubject(subjectCode)].filter((s): s is StudySubject => Boolean(s))
    : STUDY_SUBJECTS;

  const results: Array<{ subject: StudySubject; topic: StudyTopic }> = [];

  for (const subject of subjectsToSearch) {
    for (const topic of subject.topics) {
      if (
        topic.title.toLowerCase().includes(cleanQuery) ||
        topic.subtopics.some((st) => st.toLowerCase().includes(cleanQuery)) ||
        topic.content.toLowerCase().includes(cleanQuery)
      ) {
        results.push({ subject, topic });
      }
    }
  }

  return results;
}
