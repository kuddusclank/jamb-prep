import { test } from "node:test";
import assert from "node:assert/strict";
import { interruptionTransition } from "./interruption.ts";

test("tab hide followed by fullscreen exit is one episode", () => {
  assert.equal(interruptionTransition(false, true, true), "start");
  assert.equal(interruptionTransition(true, true, false), "none");
  assert.equal(interruptionTransition(true, false, false), "none");
  assert.equal(interruptionTransition(true, false, true), "end");
});
test("fullscreen exit followed by tab hide is one episode", () => {
  assert.equal(interruptionTransition(false, false, false), "start");
  assert.equal(interruptionTransition(true, true, false), "none");
  assert.equal(interruptionTransition(true, true, true), "none");
  assert.equal(interruptionTransition(true, false, true), "end");
});
test("focused fullscreen does not create an event; later exit starts another", () => {
  assert.equal(interruptionTransition(false, false, true), "none");
  assert.equal(interruptionTransition(false, false, false), "start");
});
