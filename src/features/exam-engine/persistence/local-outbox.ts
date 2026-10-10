import { OutboxItem } from '../domain/types';

export class LocalOutboxManager {
  private static getStorageKey(attemptId: string): string {
    return `jamb_cbt_${attemptId}`;
  }

  private static getOutboxKey(attemptId: string): string {
    return `jamb_outbox_${attemptId}`;
  }

  static saveSnapshot(
    attemptId: string, 
    answers: Record<string, string>, 
    labels: Record<string, 'A' | 'B' | 'C' | 'D'>
  ): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(
        this.getStorageKey(attemptId),
        JSON.stringify({ answers, labels, updatedAt: Date.now() })
      );
    } catch (e) {
      console.warn('Failed to save answers snapshot to local storage', e);
    }
  }

  static loadSnapshot(attemptId: string): {
    answers: Record<string, string>;
    labels: Record<string, 'A' | 'B' | 'C' | 'D'>;
  } | null {
    if (typeof window === 'undefined') return null;
    try {
      const data = localStorage.getItem(this.getStorageKey(attemptId));
      if (!data) return null;
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  static enqueue(
    attemptId: string, 
    questionId: string, 
    optionId: string | null, 
    label?: 'A' | 'B' | 'C' | 'D'
  ): void {
    if (typeof window === 'undefined') return;
    try {
      const outbox = this.getOutbox(attemptId);
      // Remove any existing pending item for the same question
      const filtered = outbox.filter((item) => item.questionId !== questionId);
      filtered.push({
        questionId,
        optionId,
        label,
        timestamp: Date.now(),
        retryCount: 0,
      });
      localStorage.setItem(this.getOutboxKey(attemptId), JSON.stringify(filtered));
    } catch (e) {
      console.warn('Failed to enqueue answer to outbox', e);
    }
  }

  static getOutbox(attemptId: string): OutboxItem[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(this.getOutboxKey(attemptId));
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static removeFromOutbox(attemptId: string, questionId: string): void {
    if (typeof window === 'undefined') return;
    try {
      const outbox = this.getOutbox(attemptId);
      const filtered = outbox.filter((item) => item.questionId !== questionId);
      localStorage.setItem(this.getOutboxKey(attemptId), JSON.stringify(filtered));
    } catch (e) {
      console.warn('Failed to remove item from outbox', e);
    }
  }

  static clear(attemptId: string): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(this.getStorageKey(attemptId));
      localStorage.removeItem(this.getOutboxKey(attemptId));
    } catch {}
  }
}
