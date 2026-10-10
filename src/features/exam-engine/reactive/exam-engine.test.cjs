const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, filename);
const { ExamEngine } = require('./exam-engine.ts');
test('timer resumes after effect cleanup and catches up on visibility changes', () => {
  global.window = new EventTarget();
  global.document = new EventTarget();
  const engine = new ExamEngine();
  const realNow = Date.now;
  let now = 100000;
  Date.now = () => now;
  const payload = { attemptId: 'timer-test', questions: [], expiresAtTimestamp: now + 120000 };
  try {
    engine.initialize(payload);
    assert.equal(engine.getCurrentState().timeRemainingSeconds, 120);
    engine.destroy();
    engine.initialize(payload);
    now += 31000;
    document.dispatchEvent(new Event('visibilitychange'));
    assert.equal(engine.getCurrentState().timeRemainingSeconds, 89);
    now += 100000;
    window.dispatchEvent(new Event('focus'));
    assert.equal(engine.getCurrentState().status, 'expired');
    assert.equal(engine.getCurrentState().timeRemainingSeconds, 0);
  } finally {
    engine.destroy();
    Date.now = realNow;
    delete global.window;
    delete global.document;
  }
});
