/** Bound read-side waiting and clear timers when work finishes. Does not cancel SQL. */
export async function withDeadline<T>(work: PromiseLike<T>, milliseconds: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const start = performance.now();
  let outcome = "ok";
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timeout`)), milliseconds);
      }),
    ]);
  } catch (error) {
    outcome = "error";
    throw error;
  } finally {
    clearTimeout(timer);
    if (process.env.PERFORMANCE_LOGGING === "true") {
      console.info(JSON.stringify({ event: "performance", operation: label, durationMs: Math.round(performance.now() - start), outcome }));
    }
  }
}
