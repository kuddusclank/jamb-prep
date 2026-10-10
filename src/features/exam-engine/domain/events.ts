import { ExamQuestion, SyncStatus } from './types';

export type ExamEvent =
  | {
      type: 'EXAM_INITIALIZED';
      payload: {
        attemptId: string;
        questions: ExamQuestion[];
        expiresAtTimestamp: number;
        initialAnswers: Record<string, string>;
        initialLabels: Record<string, 'A' | 'B' | 'C' | 'D'>;
      };
    }
  | {
      type: 'ANSWER_SELECTED';
      payload: {
        questionId: string;
        optionId: string;
        label: 'A' | 'B' | 'C' | 'D';
      };
    }
  | {
      type: 'ANSWER_REVERSED';
      payload: {
        questionId: string;
      };
    }
  | {
      type: 'NAVIGATE_NEXT';
    }
  | {
      type: 'NAVIGATE_PREVIOUS';
    }
  | {
      type: 'NAVIGATE_TO_INDEX';
      payload: {
        index: number;
      };
    }
  | {
      type: 'SWITCH_SUBJECT';
      payload: {
        subjectCode: string;
      };
    }
  | {
      type: 'TOGGLE_FLAG';
      payload: {
        questionId: string;
      };
    }
  | {
      type: 'TIMER_TICKED';
      payload: {
        remainingSeconds: number;
      };
    }
  | {
      type: 'NETWORK_STATUS_CHANGED';
      payload: {
        isOnline: boolean;
      };
    }
  | {
      type: 'SYNC_STATUS_CHANGED';
      payload: {
        status: SyncStatus;
      };
    }
  | {
      type: 'TOGGLE_SUBMIT_MODAL';
      payload: {
        isOpen: boolean;
      };
    }
  | {
      type: 'EXAM_SUBMITTING';
    }
  | {
      type: 'EXAM_EXPIRED';
    };
