"use client";

import { useEffect, useRef, useState, useCallback, useSyncExternalStore } from "react";
import { ExamEngine, SyncAnswerHandler } from "./exam-engine";
import { ExamEngineState, initialExamState } from "../domain/state";
import { ExamQuestion } from "../domain/types";

export function useExamEngine(
  initialPayload: {
    attemptId: string;
    questions: ExamQuestion[];
    expiresAtTimestamp: number;
    initialAnswers?: Record<string, string>;
    initialLabels?: Record<string, 'A' | 'B' | 'C' | 'D'>;
  },
  syncHandler?: SyncAnswerHandler
) {
  const engineRef = useRef<ExamEngine | null>(null);

  if (!engineRef.current) {
    engineRef.current = new ExamEngine(syncHandler);
  }

  const engine = engineRef.current;

  // React state synchronized with RxJS observable
  const [state, setState] = useState<ExamEngineState>(() => engine.getCurrentState());

  useEffect(() => {
    // Initialize session in engine
    engine.initialize(initialPayload);

    // Subscribe to state observable
    const sub = engine.getState$().subscribe((nextState) => {
      setState(nextState);
    });

    return () => {
      sub.unsubscribe();
      engine.destroy();
    };
  }, [engine]); // Run once per engine lifecycle

  // Memoized action dispatchers
  const selectOption = useCallback(
    (optionId: string, label: 'A' | 'B' | 'C' | 'D') => {
      const currentQ = state.questions[state.currentIndex];
      if (!currentQ) return;
      engine.dispatch({
        type: 'ANSWER_SELECTED',
        payload: { questionId: currentQ.id, optionId, label },
      });
    },
    [engine, state.questions, state.currentIndex]
  );

  const reverseOption = useCallback(() => {
    const currentQ = state.questions[state.currentIndex];
    if (!currentQ) return;
    engine.dispatch({
      type: 'ANSWER_REVERSED',
      payload: { questionId: currentQ.id },
    });
  }, [engine, state.questions, state.currentIndex]);

  const toggleFlag = useCallback(() => {
    const currentQ = state.questions[state.currentIndex];
    if (!currentQ) return;
    engine.dispatch({
      type: 'TOGGLE_FLAG',
      payload: { questionId: currentQ.id },
    });
  }, [engine, state.questions, state.currentIndex]);

  const goToNext = useCallback(() => {
    engine.dispatch({ type: 'NAVIGATE_NEXT' });
  }, [engine]);

  const goToPrevious = useCallback(() => {
    engine.dispatch({ type: 'NAVIGATE_PREVIOUS' });
  }, [engine]);

  const goToIndex = useCallback(
    (index: number) => {
      engine.dispatch({ type: 'NAVIGATE_TO_INDEX', payload: { index } });
    },
    [engine]
  );

  const switchSubject = useCallback(
    (subjectCode: string) => {
      engine.dispatch({ type: 'SWITCH_SUBJECT', payload: { subjectCode } });
    },
    [engine]
  );

  const setSubmitModalOpen = useCallback(
    (isOpen: boolean) => {
      engine.dispatch({ type: 'TOGGLE_SUBMIT_MODAL', payload: { isOpen } });
    },
    [engine]
  );

  return {
    state,
    engine,
    selectOption,
    reverseOption,
    toggleFlag,
    goToNext,
    goToPrevious,
    goToIndex,
    switchSubject,
    setSubmitModalOpen,
  };
}
