import { 
  Subject, 
  BehaviorSubject, 
  Observable, 
  Subscription, 
  interval, 
  fromEvent, 
  merge 
} from 'rxjs';
import { 
  filter, 
  map, 
  debounceTime, 
  distinctUntilChanged, 
  tap 
} from 'rxjs/operators';
import { ExamEvent } from '../domain/events';
import { ExamEngineState, initialExamState, examReducer } from '../domain/state';
import { LocalOutboxManager } from '../persistence/local-outbox';
import { ExamQuestion } from '../domain/types';

export type SyncAnswerHandler = (
  attemptId: string, 
  questionId: string, 
  optionId: string | null,
  revision: number
) => Promise<{ success: boolean; revision?: number; reason?: string }>;

export class ExamEngine {
  private events$ = new Subject<ExamEvent>();
  private state$ = new BehaviorSubject<ExamEngineState>(initialExamState);
  private subscriptions = new Subscription();
  private drain: Promise<void> | null = null;
  private disposed = false;
  private storageError: Error | null = null;
  private syncAnswerFn?: SyncAnswerHandler;

  constructor(syncHandler?: SyncAnswerHandler) {
    this.syncAnswerFn = syncHandler;

  }

  /**
   * Subscribe to the reactive engine state
   */
  public getState$(): Observable<ExamEngineState> {
    return this.state$.asObservable();
  }

  public getCurrentState(): ExamEngineState {
    return this.state$.getValue();
  }

  /**
   * Dispatch an event to the reactive engine
   */
  public dispatch(event: ExamEvent): void {
    this.events$.next(event);
  }

  /**
   * Initialize examination session and rehydrate from local outbox
   */
  public initialize(payload: {
    attemptId: string;
    questions: ExamQuestion[];
    expiresAtTimestamp: number;
    initialAnswers?: Record<string, string>;
    initialLabels?: Record<string, 'A' | 'B' | 'C' | 'D'>;
  }): void {
    this.disposed = false;
    // Effects may mount, clean up and mount again in React Strict Mode.
    // Start browser subscriptions here, never during component rendering.
    if (this.subscriptions.closed) this.subscriptions = new Subscription();
    this.setupEventReducer();
    this.setupTimerStream();
    this.setupConnectivityStream();
    this.setupAutosavePipeline();
    // Rehydrate local storage answers if newer
    let mergedAnswers = { ...(payload.initialAnswers || {}) };
    let mergedLabels = { ...(payload.initialLabels || {}) };

    for(const item of LocalOutboxManager.getOutbox(payload.attemptId)) {
      if(item.optionId) { mergedAnswers[item.questionId]=item.optionId; if(item.label) mergedLabels[item.questionId]=item.label; }
      else { delete mergedAnswers[item.questionId]; delete mergedLabels[item.questionId]; }
    }

    this.dispatch({
      type: 'EXAM_INITIALIZED',
      payload: {
        attemptId: payload.attemptId,
        questions: payload.questions,
        expiresAtTimestamp: payload.expiresAtTimestamp,
        initialAnswers: mergedAnswers,
        initialLabels: mergedLabels,
      },
    });

    // Check for any un-synced items in outbox and flush immediately
    void this.flushOutbox().catch(() => {});
  }

  // 1. Central Event Reducer Pipeline
  private setupEventReducer(): void {
    this.subscriptions.add(
      this.events$.subscribe((event) => {
        const currentState = this.state$.getValue();
        const nextState = examReducer(currentState, event);
        this.state$.next(nextState);
      })
    );
  }

  // 2. Authoritative Timer & Visibility Stream
  private setupTimerStream(): void {
    if (typeof window === 'undefined') return;

    // Resynchronize on both 1-second interval AND window focus/visibilitychange
    const timerTicks$ = interval(1000);
    const focusEvents$ = merge(
      fromEvent(window, 'focus'),
      fromEvent(document, 'visibilitychange')
    );

    const clockStream$ = merge(timerTicks$, focusEvents$).pipe(
      map(() => {
        const { expiresAtTimestamp } = this.state$.getValue();
        if (!expiresAtTimestamp) return 0;
        const now = Date.now();
        return Math.max(0, Math.floor((expiresAtTimestamp - now) / 1000));
      }),
      distinctUntilChanged()
    );

    this.subscriptions.add(
      clockStream$.subscribe((remainingSeconds) => {
        const { status } = this.state$.getValue();
        if (status === 'completed' || status === 'submitting') return;

        if (remainingSeconds <= 0 && status === 'in_progress') {
          this.dispatch({ type: 'EXAM_EXPIRED' });
        } else {
          this.dispatch({
            type: 'TIMER_TICKED',
            payload: { remainingSeconds },
          });
        }
      })
    );
  }

  // 3. Network Connectivity Stream
  private setupConnectivityStream(): void {
    if (typeof window === 'undefined') return;

    const online$ = fromEvent(window, 'online').pipe(map(() => true));
    const offline$ = fromEvent(window, 'offline').pipe(map(() => false));

    this.subscriptions.add(
      merge(online$, offline$).subscribe((isOnline) => {
        this.dispatch({
          type: 'NETWORK_STATUS_CHANGED',
          payload: { isOnline },
        });

        if (isOnline) {
          void this.flushOutbox().catch(() => {});
        }
      })
    );
  }

  // 4. Reactive Autosave & Outbox Synchronization Pipeline
  private setupAutosavePipeline(): void {
    const isAnswerEvent = (
      e: ExamEvent
    ): e is
      | { type: 'ANSWER_SELECTED'; payload: { questionId: string; optionId: string; label: 'A' | 'B' | 'C' | 'D' } }
      | { type: 'ANSWER_REVERSED'; payload: { questionId: string } } => {
      return e.type === 'ANSWER_SELECTED' || e.type === 'ANSWER_REVERSED';
    };

    const answerEvents$ = this.events$.pipe(
      filter(isAnswerEvent),
      tap((event) => {
        const state = this.state$.getValue();
        try {
        // Step 1: Immediate local storage snapshot save
        LocalOutboxManager.saveSnapshot(state.attemptId, state.answers, state.answerLabels);

        // Step 2: Enqueue to persistent outbox queue
        if (event.type === 'ANSWER_SELECTED') {
          LocalOutboxManager.enqueue(
            state.attemptId,
            event.payload.questionId,
            event.payload.optionId,
            event.payload.label
          );
        } else {
          LocalOutboxManager.enqueue(state.attemptId, event.payload.questionId, null);
        }
        this.storageError=null;
        } catch(error) { this.storageError=new Error("Your browser could not save this answer. Enable local storage and select the answer again before submitting."); this.dispatch({type:"SYNC_STATUS_CHANGED",payload:{status:"error"}}); }
      }),
      // Step 3: Debounce network requests to prevent server flooding on rapid hotkey mashing
      debounceTime(350)
    );

    this.subscriptions.add(
      answerEvents$.subscribe(() => {
        void this.flushOutbox().catch(() => {});
      })
    );
  }

  /**
   * Drain the outbox queue to the server
   */
  public async flushOutbox(): Promise<void> {
    if (!this.drain) this.drain=this.drainAnswers().finally(()=>{this.drain=null;});
    await this.drain;
    // An answer can arrive after an empty drain returned but before its promise settled.
    const attemptId=this.state$.getValue().attemptId;
    if (!this.disposed && attemptId && LocalOutboxManager.getOutbox(attemptId).length) await this.flushOutbox();
  }
  private async drainAnswers():Promise<void> {
    const state=this.state$.getValue();
    if(this.storageError) throw this.storageError;
    if(this.disposed||!this.syncAnswerFn||!state.attemptId) throw new Error('Exam saving is unavailable.');
    if(!navigator.onLine && LocalOutboxManager.getOutbox(state.attemptId).length) throw new Error('You are offline. Reconnect before submitting.');
    this.dispatch({type:'SYNC_STATUS_CHANGED',payload:{status:'syncing'}});
    try {
      while(!this.disposed) {
        const pending=LocalOutboxManager.getOutbox(state.attemptId);
        if(!pending.length) break;
        const item=pending[0];
        try {
          const result=await this.syncAnswerFn(state.attemptId,item.questionId,item.optionId,item.revision);
          if(this.disposed) throw new Error('Exam session closed.');
          if(!result.success||result.revision!==item.revision) throw new Error('Your answer was not acknowledged. Retry before submitting.');
          LocalOutboxManager.removeFromOutbox(state.attemptId,item.questionId,result.revision);
        } catch(error) {
          const code=error && typeof error==='object' && 'code' in error ? String(error.code) : '';
          if(!this.disposed && state.status==='expired' && code==='ATTEMPT_EXPIRED') { LocalOutboxManager.removeFromOutbox(state.attemptId,item.questionId,item.revision); continue; }
          throw error;
        }
      }
      if(this.disposed) throw new Error('Exam session closed.');
      this.dispatch({type:'SYNC_STATUS_CHANGED',payload:{status:'synced'}});
    } catch(error) { if(!this.disposed) this.dispatch({type:'SYNC_STATUS_CHANGED',payload:{status:'error'}}); throw error; }
  }

  /**
   * Cleanup and dispose RxJS subscriptions
   */
  public destroy(): void {
    this.disposed = true;
    this.subscriptions.unsubscribe();

  }
}
