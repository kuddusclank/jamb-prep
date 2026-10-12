export type ExamStatus = 
  | 'loading' 
  | 'ready' 
  | 'in_progress' 
  | 'submitting' 
  | 'expired' 
  | 'completed';

export type SyncStatus = 
  | 'synced' 
  | 'pending' 
  | 'syncing' 
  | 'offline' 
  | 'error';

export interface ExamOption {
  id: string;
  label: 'A' | 'B' | 'C' | 'D';
  content: string;
}

export interface ExamQuestion {
  imageUrl?: string | null;
  imageAlt?: string | null;
  id: string;
  position: number; // 1 to 180
  subjectCode: string;
  subjectName: string;
  stem: string;
  difficulty: string;
  examYear?: number | null;
  passage?: {
    title?: string | null;
    content: string;
  } | null;
  options: ExamOption[];
}

export interface ExamSubjectTab {
  code: string;
  name: string;
  startIndex: number;
  count: number;
}

export interface OutboxItem {
  questionId: string;
  optionId: string | null;
  label?: 'A' | 'B' | 'C' | 'D';
  timestamp: number;
  retryCount: number;
  revision: number;
}
