/** One episode remains open until BOTH visibility and fullscreen are restored. */
export function interruptionTransition(open: boolean, hidden: boolean, fullscreen: boolean): "start" | "end" | "none" {
  const away = hidden || !fullscreen;
  if (away && !open) return "start";
  if (!away && open) return "end";
  return "none";
}
