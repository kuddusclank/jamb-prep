export interface StudyTopic {
  id: string;
  slug: string;
  title: string;
  order: number;
  readingTimeMinutes: number;
  subtopics: string[];
  content: string;
}

export interface StudyExamStrategy {
  number: number;
  title: string;
  description: string;
}

export interface StudySubject {
  code: string;
  name: string;
  isCompulsory: boolean;
  questionCount: number;
  timeTargetMinutes: number;
  totalTopics: number;
  overview: string;
  strategies: StudyExamStrategy[];
  topics: StudyTopic[];
}
