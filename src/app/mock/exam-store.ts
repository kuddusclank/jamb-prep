import { create } from 'zustand';

export interface ExamOption {
  id: string;
  label: 'A' | 'B' | 'C' | 'D';
  content: string;
}

export interface ExamQuestion {
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

export interface ExamState {
  attemptId: string;
  questions: ExamQuestion[];
  subjectTabs: ExamSubjectTab[];
  currentIndex: number;
  answers: Record<string, string>; // questionId -> optionId
  answerLabels: Record<string, 'A' | 'B' | 'C' | 'D'>; // questionId -> label
  flaggedQuestionIds: Set<string>;
  expiresAtTimestamp: number;
  timeRemainingSeconds: number;
  isSubmitting: boolean;
  isSubmitModalOpen: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';

  // Reactive Navigation State
  canGoPrevious: boolean;
  canGoNext: boolean;
  nextPosition: number | null;
  previousPosition: number | null;

  // Actions
  initializeExam: (payload: {
    attemptId: string;
    questions: ExamQuestion[];
    expiresAtTimestamp: number;
    initialAnswers?: Record<string, string>;
    initialLabels?: Record<string, 'A' | 'B' | 'C' | 'D'>;
  }) => void;
  selectOption: (optionId: string, label: 'A' | 'B' | 'C' | 'D') => void;
  reverseOption: () => void;
  toggleFlag: () => void;
  goToNext: () => void;
  goToPrevious: () => void;
  goToIndex: (index: number) => void;
  switchSubject: (subjectCode: string) => void;
  tickTimer: () => void;
  setSubmitModalOpen: (open: boolean) => void;
  setSaveStatus: (status: 'idle' | 'saving' | 'saved' | 'error') => void;
}

export const useExamStore = create<ExamState>((set, get) => ({
  attemptId: '',
  questions: [],
  subjectTabs: [],
  currentIndex: 0,
  answers: {},
  answerLabels: {},
  flaggedQuestionIds: new Set<string>(),
  expiresAtTimestamp: 0,
  timeRemainingSeconds: 7200, // 120 mins
  isSubmitting: false,
  isSubmitModalOpen: false,
  saveStatus: 'idle',

  canGoPrevious: false,
  canGoNext: false,
  nextPosition: null,
  previousPosition: null,

  initializeExam: ({ attemptId, questions, expiresAtTimestamp, initialAnswers = {}, initialLabels = {} }) => {
    // Group subject tabs reactively from question stream
    const tabs: ExamSubjectTab[] = [];
    const seenSubjects = new Map<string, { name: string; startIndex: number; count: number }>();

    questions.forEach((q, idx) => {
      if (!seenSubjects.has(q.subjectCode)) {
        seenSubjects.set(q.subjectCode, { name: q.subjectName, startIndex: idx, count: 1 });
      } else {
        const item = seenSubjects.get(q.subjectCode)!;
        item.count += 1;
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

    // Check local storage for autosaved answers
    let mergedAnswers = { ...initialAnswers };
    let mergedLabels = { ...initialLabels };
    try {
      const local = localStorage.getItem(`jamb_exam_${attemptId}`);
      if (local) {
        const parsed = JSON.parse(local);
        if (parsed.answers) mergedAnswers = { ...mergedAnswers, ...parsed.answers };
        if (parsed.labels) mergedLabels = { ...mergedLabels, ...parsed.labels };
      }
    } catch {}

    const now = Date.now();
    const remaining = Math.max(0, Math.floor((expiresAtTimestamp - now) / 1000));

    set({
      attemptId,
      questions,
      subjectTabs: tabs,
      currentIndex: 0,
      answers: mergedAnswers,
      answerLabels: mergedLabels,
      expiresAtTimestamp,
      timeRemainingSeconds: remaining,
      canGoPrevious: false,
      canGoNext: questions.length > 1,
      previousPosition: null,
      nextPosition: questions.length > 1 ? 2 : null,
    });
  },

  selectOption: (optionId, label) => {
    const { questions, currentIndex, answers, answerLabels, attemptId } = get();
    const currentQ = questions[currentIndex];
    if (!currentQ) return;

    const newAnswers = { ...answers, [currentQ.id]: optionId };
    const newLabels = { ...answerLabels, [currentQ.id]: label };

    // Persist immediately to localStorage (resilient crash guard)
    try {
      localStorage.setItem(`jamb_exam_${attemptId}`, JSON.stringify({
        answers: newAnswers,
        labels: newLabels,
      }));
    } catch {}

    set({
      answers: newAnswers,
      answerLabels: newLabels,
      saveStatus: 'saving',
    });
  },

  reverseOption: () => {
    const { questions, currentIndex, answers, answerLabels, attemptId } = get();
    const currentQ = questions[currentIndex];
    if (!currentQ) return;

    const newAnswers = { ...answers };
    const newLabels = { ...answerLabels };
    delete newAnswers[currentQ.id];
    delete newLabels[currentQ.id];

    try {
      localStorage.setItem(`jamb_exam_${attemptId}`, JSON.stringify({
        answers: newAnswers,
        labels: newLabels,
      }));
    } catch {}

    set({
      answers: newAnswers,
      answerLabels: newLabels,
      saveStatus: 'saving',
    });
  },

  toggleFlag: () => {
    const { questions, currentIndex, flaggedQuestionIds } = get();
    const currentQ = questions[currentIndex];
    if (!currentQ) return;

    const nextFlags = new Set(flaggedQuestionIds);
    if (nextFlags.has(currentQ.id)) {
      nextFlags.delete(currentQ.id);
    } else {
      nextFlags.add(currentQ.id);
    }

    set({ flaggedQuestionIds: nextFlags });
  },

  goToNext: () => {
    const { currentIndex, questions } = get();
    if (currentIndex + 1 < questions.length) {
      const nextIdx = currentIndex + 1;
      set({
        currentIndex: nextIdx,
        canGoPrevious: true,
        canGoNext: nextIdx + 1 < questions.length,
        previousPosition: nextIdx, // 1-indexed position of prev is nextIdx
        nextPosition: nextIdx + 2 <= questions.length ? nextIdx + 2 : null,
      });
    }
  },

  goToPrevious: () => {
    const { currentIndex, questions } = get();
    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      set({
        currentIndex: prevIdx,
        canGoPrevious: prevIdx > 0,
        canGoNext: true,
        previousPosition: prevIdx > 0 ? prevIdx : null,
        nextPosition: prevIdx + 2,
      });
    }
  },

  goToIndex: (index: number) => {
    const { questions } = get();
    if (index >= 0 && index < questions.length) {
      set({
        currentIndex: index,
        canGoPrevious: index > 0,
        canGoNext: index + 1 < questions.length,
        previousPosition: index > 0 ? index : null,
        nextPosition: index + 2 <= questions.length ? index + 2 : null,
      });
    }
  },

  switchSubject: (subjectCode: string) => {
    const { subjectTabs } = get();
    const tab = subjectTabs.find((t) => t.code === subjectCode);
    if (tab) {
      get().goToIndex(tab.startIndex);
    }
  },

  tickTimer: () => {
    const { expiresAtTimestamp } = get();
    const now = Date.now();
    const remaining = Math.max(0, Math.floor((expiresAtTimestamp - now) / 1000));
    set({ timeRemainingSeconds: remaining });
  },

  setSubmitModalOpen: (open: boolean) => set({ isSubmitModalOpen: open }),
  setSaveStatus: (status) => set({ saveStatus: status }),
}));
