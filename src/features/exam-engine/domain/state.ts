import { ExamQuestion, ExamSubjectTab, ExamStatus, SyncStatus } from './types';
import { ExamEvent } from './events';

export interface ExamEngineState {
  attemptId: string;
  status: ExamStatus;
  syncStatus: SyncStatus;
  isOnline: boolean;
  questions: ExamQuestion[];
  subjectTabs: ExamSubjectTab[];
  currentIndex: number;
  answers: Record<string, string>;
  answerLabels: Record<string, 'A' | 'B' | 'C' | 'D'>;
  flaggedQuestionIds: Set<string>;
  expiresAtTimestamp: number;
  timeRemainingSeconds: number;
  isSubmitModalOpen: boolean;

  // Reactive Navigation Properties
  canGoPrevious: boolean;
  canGoNext: boolean;
  previousPosition: number | null;
  nextPosition: number | null;

  // Reactive Stats
  answeredCount: number;
  unansweredCount: number;
}

export const initialExamState: ExamEngineState = {
  attemptId: '',
  status: 'loading',
  syncStatus: 'synced',
  isOnline: true,
  questions: [],
  subjectTabs: [],
  currentIndex: 0,
  answers: {},
  answerLabels: {},
  flaggedQuestionIds: new Set(),
  expiresAtTimestamp: 0,
  timeRemainingSeconds: 7200,
  isSubmitModalOpen: false,

  canGoPrevious: false,
  canGoNext: false,
  previousPosition: null,
  nextPosition: null,

  answeredCount: 0,
  unansweredCount: 0,
};

export function examReducer(state: ExamEngineState, event: ExamEvent): ExamEngineState {
  switch (event.type) {
    case 'EXAM_INITIALIZED': {
      const { attemptId, questions, expiresAtTimestamp, initialAnswers, initialLabels } = event.payload;

      // Group subject tabs from frozen question sequence
      const tabs: ExamSubjectTab[] = [];
      const seenSubjects = new Map<string, { name: string; startIndex: number; count: number }>();

      questions.forEach((q, idx) => {
        if (!seenSubjects.has(q.subjectCode)) {
          seenSubjects.set(q.subjectCode, { name: q.subjectName, startIndex: idx, count: 1 });
        } else {
          seenSubjects.get(q.subjectCode)!.count += 1;
        }
      });

      seenSubjects.forEach((val, code) => {
        tabs.push({
          code,
          name: val.name,
          startIndex: val.startIndex,
          count: val.count,
        });
      });

      const now = Date.now();
      const remainingSeconds = Math.max(0, Math.floor((expiresAtTimestamp - now) / 1000));
      const answeredCount = Object.keys(initialAnswers).length;

      return {
        ...state,
        attemptId,
        status: remainingSeconds > 0 ? 'in_progress' : 'expired',
        questions,
        subjectTabs: tabs,
        currentIndex: 0,
        answers: initialAnswers,
        answerLabels: initialLabels,
        expiresAtTimestamp,
        timeRemainingSeconds: remainingSeconds,
        canGoPrevious: false,
        canGoNext: questions.length > 1,
        previousPosition: null,
        nextPosition: questions.length > 1 ? 2 : null,
        answeredCount,
        unansweredCount: Math.max(0, questions.length - answeredCount),
      };
    }

    case 'ANSWER_SELECTED': {
      const { questionId, optionId, label } = event.payload;
      const nextAnswers = { ...state.answers, [questionId]: optionId };
      const nextLabels = { ...state.answerLabels, [questionId]: label };
      const answeredCount = Object.keys(nextAnswers).length;

      return {
        ...state,
        answers: nextAnswers,
        answerLabels: nextLabels,
        answeredCount,
        unansweredCount: Math.max(0, state.questions.length - answeredCount),
        syncStatus: 'pending',
      };
    }

    case 'ANSWER_REVERSED': {
      const { questionId } = event.payload;
      const nextAnswers = { ...state.answers };
      const nextLabels = { ...state.answerLabels };
      delete nextAnswers[questionId];
      delete nextLabels[questionId];
      const answeredCount = Object.keys(nextAnswers).length;

      return {
        ...state,
        answers: nextAnswers,
        answerLabels: nextLabels,
        answeredCount,
        unansweredCount: Math.max(0, state.questions.length - answeredCount),
        syncStatus: 'pending',
      };
    }

    case 'NAVIGATE_NEXT': {
      if (state.currentIndex + 1 < state.questions.length) {
        const nextIdx = state.currentIndex + 1;
        return {
          ...state,
          currentIndex: nextIdx,
          canGoPrevious: true,
          canGoNext: nextIdx + 1 < state.questions.length,
          previousPosition: nextIdx,
          nextPosition: nextIdx + 2 <= state.questions.length ? nextIdx + 2 : null,
        };
      }
      return state;
    }

    case 'NAVIGATE_PREVIOUS': {
      if (state.currentIndex > 0) {
        const prevIdx = state.currentIndex - 1;
        return {
          ...state,
          currentIndex: prevIdx,
          canGoPrevious: prevIdx > 0,
          canGoNext: true,
          previousPosition: prevIdx > 0 ? prevIdx : null,
          nextPosition: prevIdx + 2,
        };
      }
      return state;
    }

    case 'NAVIGATE_TO_INDEX': {
      const { index } = event.payload;
      if (index >= 0 && index < state.questions.length) {
        return {
          ...state,
          currentIndex: index,
          canGoPrevious: index > 0,
          canGoNext: index + 1 < state.questions.length,
          previousPosition: index > 0 ? index : null,
          nextPosition: index + 2 <= state.questions.length ? index + 2 : null,
        };
      }
      return state;
    }

    case 'SWITCH_SUBJECT': {
      const { subjectCode } = event.payload;
      const tab = state.subjectTabs.find((t) => t.code === subjectCode);
      if (tab) {
        const idx = tab.startIndex;
        return {
          ...state,
          currentIndex: idx,
          canGoPrevious: idx > 0,
          canGoNext: idx + 1 < state.questions.length,
          previousPosition: idx > 0 ? idx : null,
          nextPosition: idx + 2 <= state.questions.length ? idx + 2 : null,
        };
      }
      return state;
    }

    case 'TOGGLE_FLAG': {
      const { questionId } = event.payload;
      const nextFlags = new Set(state.flaggedQuestionIds);
      if (nextFlags.has(questionId)) {
        nextFlags.delete(questionId);
      } else {
        nextFlags.add(questionId);
      }
      return {
        ...state,
        flaggedQuestionIds: nextFlags,
      };
    }

    case 'TIMER_TICKED': {
      return {
        ...state,
        timeRemainingSeconds: event.payload.remainingSeconds,
      };
    }

    case 'NETWORK_STATUS_CHANGED': {
      return {
        ...state,
        isOnline: event.payload.isOnline,
        syncStatus: event.payload.isOnline ? state.syncStatus : 'offline',
      };
    }

    case 'SYNC_STATUS_CHANGED': {
      return {
        ...state,
        syncStatus: event.payload.status,
      };
    }

    case 'TOGGLE_SUBMIT_MODAL': {
      return {
        ...state,
        isSubmitModalOpen: event.payload.isOpen,
      };
    }

    case 'EXAM_SUBMITTING': {
      return {
        ...state,
        status: 'submitting',
      };
    }

    case 'EXAM_EXPIRED': {
      return {
        ...state,
        status: 'expired',
        timeRemainingSeconds: 0,
      };
    }

    default:
      return state;
  }
}
