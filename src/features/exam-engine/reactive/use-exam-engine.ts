"use client";
import { getDefaultBrowserSessionManager } from "../../../lib/auth/session-manager";
import { LocalOutboxManager } from "../persistence/local-outbox";

import { useEffect, useRef, useState, useCallback, useSyncExternalStore } from "react";
import { ExamEngine, SyncAnswerHandler } from "./exam-engine";
import { ExamEngineState, initialExamState } from "../domain/state";
import { getAccountCoordinator } from "../../../lib/auth/account-coordinator";
import { ExamQuestion } from "../domain/types";

export function useExamEngine(
  initialPayload: {
    attemptId: string;
    questions: ExamQuestion[];
    expiresAtTimestamp: number;
    initialRevisions?: Record<string, number>;
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
  const flagWrites=useRef(Promise.resolve());
  const [flagError,setFlagError]=useState<string|null>(null);
  const [engineError, setEngineError] = useState<string | null>(null);

  // React state synchronized with RxJS observable
  const [state, setState] = useState<ExamEngineState>(() => engine.getCurrentState());

  useEffect(() => {
    let stopped=false; let release:()=>void=()=>{};
    const userId=getDefaultBrowserSessionManager().getState().user?.id;
    const sub=engine.getState$().subscribe(setState);
    if(!navigator.locks||!userId) setEngineError('This browser cannot safely coordinate exam saving. Use a supported browser to continue.');
    else void navigator.locks.request(`jamb-exam-${userId}-${initialPayload.attemptId}`,{ifAvailable:true},async(lock)=>{
      if(stopped) return;
      if(!lock){setEngineError('This mock is open in another tab. Close that tab, then reload here.');return;}
      await new Promise<void>((resolve)=>{
        release=resolve;
        try { LocalOutboxManager.seedRevisions(initialPayload.attemptId,initialPayload.initialRevisions??{}); engine.initialize(initialPayload); }
        catch(error){setEngineError(error instanceof Error?error.message:'Exam saving is unavailable.');resolve();}
      });
    }).catch(()=>setEngineError('Unable to coordinate safe exam saving. Please reload.'));
    return ()=>{stopped=true;sub.unsubscribe();engine.destroy();release();};
  }, [engine, initialPayload]);

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
    const isFlagged=engine.getCurrentState().flaggedQuestionIds.has(currentQ.id);
    const actor=getDefaultBrowserSessionManager().getState().user?.id;
    flagWrites.current=flagWrites.current.then(async()=>{
      if(getDefaultBrowserSessionManager().getState().user?.id!==actor) return;
      await getAccountCoordinator().api.request(`/api/v1/exams/attempts/${initialPayload.attemptId}/flags`,{method:'PATCH',body:{questionId:currentQ.id,isFlagged}});
      setFlagError(null);
    }).catch(()=>setFlagError('A review flag could not sync. Answer saving is unaffected. Toggle it again after reconnecting.'));
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
    engineError,
    flagError,
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
