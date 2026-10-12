import {serveQuestionMedia} from '../services/admin-media-service';
/**
 * Native Cloudflare Worker Entry Point for Production-Candidate API Foundation (T03)
 *
 * Requirements:
 * - Zero Next.js / React / @opennextjs/cloudflare imports.
 * - Zero T01/T02 spike rollback sentinels or benchmark schemas.
 * - Lazy request-scoped Direct Hyperdrive DB allocation.
 * - Guaranteed socket teardown via ctx.waitUntil(lazyDb.cleanup()) without unhandled rejections.
 */

import { createLazyDbHolder, DbContextFactory } from './db-context';
import { ApiRouterHooks, dispatchNativeApiRequest, NativeApiEnv } from './router';

export interface WorkerExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException?(): void;
}

export interface NativeApiHandlerOptions {
  dbFactory?: DbContextFactory;
  hooks?: ApiRouterHooks;
}

export function createNativeApiHandler(options?: NativeApiHandlerOptions) {
  return {
    async fetch(
      request: Request,
      env: NativeApiEnv,
      ctx: WorkerExecutionContext
    ): Promise<Response> {
      const media = await serveQuestionMedia(request, env, ctx);
      if (media) return media;
      const lazyDb = createLazyDbHolder(env, options?.dbFactory);

      try {
        return await dispatchNativeApiRequest(
          request,
          env,
          () => lazyDb.getDb(),
          options?.hooks
        );
      } finally {
        if (lazyDb.isAllocated) {
          ctx.waitUntil(lazyDb.cleanup());
        }
      }
    },
  };
}

const nativeApiWorker = createNativeApiHandler();

export default nativeApiWorker;
