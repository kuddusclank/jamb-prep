import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import React from "react";
import ReactDOMServer from "react-dom/server";
import ts from "typescript";

const ROOT = process.cwd();

function loadMathRenderer() {
  const filename = path.join(ROOT, "src/components/math-renderer.tsx");
  const source = fs.readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
  });

  const moduleObj = { exports: {} };
  const mockKatex = {
    renderToString: (math, opts) => `<span class="katex">${math}</span>`,
  };
  const mockUtils = {
    isArabicText: (str) => /[\u0600-\u06FF]/.test(str),
  };

  const customRequire = (id) => {
    if (id === "react") return React;
    if (id === "katex") return mockKatex;
    if (id === "@/lib/utils") return mockUtils;
    throw new Error(`Unexpected import ${id}`);
  };

  const fn = new Function("exports", "require", "module", "__filename", "__dirname", outputText);
  fn(moduleObj.exports, customRequire, moduleObj, filename, path.dirname(filename));
  return moduleObj.exports.MathRenderer;
}

test("MathRenderer parses nested bold-italic novel markers without markdown leaks", () => {
  const MathRenderer = loadMathRenderer();
  const input = `**[Novel: *The Lekki Headmaster*]** "What is the matter principal", Who said this to the principal?`;
  const html = ReactDOMServer.renderToStaticMarkup(React.createElement(MathRenderer, { content: input }));

  assert.doesNotMatch(html, /\*\*/, "Raw double asterisks (**) must not leak out in rendered HTML");
  assert.match(html, /<strong[^>]*>\[Novel: <em[^>]*>The Lekki Headmaster<\/em>\]<\/strong>/, "Outer bracket must be bold and inner novel title must be italicized");
  assert.match(html, /(?:&quot;|")What is the matter principal(?:&quot;|"), Who said this to the principal\?/, "Trailing stem text must be preserved");
});

test("MathRenderer supports triple asterisk bold-italic emphasis", () => {
  const MathRenderer = loadMathRenderer();
  const input = `***The Lekki Headmaster*** is the prescribed text.`;
  const html = ReactDOMServer.renderToStaticMarkup(React.createElement(MathRenderer, { content: input }));

  assert.doesNotMatch(html, /\*\*\*/, "Raw triple asterisks (***) must not leak out");
  assert.match(html, /<strong class="font-semibold italic">The Lekki Headmaster<\/strong>/);
});

test("MathRenderer preserves language fill-in blanks without corrupting formatting", () => {
  const MathRenderer = loadMathRenderer();
  const input = "Choose the word: The disciplinary committee decided that the students actions were ______ and warranted sanction.";
  const html = ReactDOMServer.renderToStaticMarkup(React.createElement(MathRenderer, { content: input }));

  assert.match(html, /______/, "Blank fill line with multiple underscores must be preserved");
  assert.doesNotMatch(html, /<em[^>]*>___<\/em>/, "Blanks must not be converted into empty italic tags");
});

test("MathRenderer preserves math multiplication asterisks outside latex", () => {
  const MathRenderer = loadMathRenderer();
  const input = "Calculate the product: 2 * 3 * 4 = 24";
  const html = ReactDOMServer.renderToStaticMarkup(React.createElement(MathRenderer, { content: input }));

  assert.match(html, /2 \* 3 \* 4 = 24/);
  assert.doesNotMatch(html, /<em>3<\/em>/, "Multiplication asterisks must not be parsed as italics");
});

test("MathRenderer properly handles KaTeX expressions alongside markdown formatting", () => {
  const MathRenderer = loadMathRenderer();
  const input = "Given **quadratic equation** $2x^2 - 5x + 2 = 0$, find the roots.";
  const html = ReactDOMServer.renderToStaticMarkup(React.createElement(MathRenderer, { content: input }));

  assert.match(html, /<strong[^>]*>quadratic equation<\/strong>/);
  assert.match(html, /class="katex">2x\^2 - 5x \+ 2 = 0/);
});

test("MathRenderer renders safe HTML tags like <u> and <sub>", () => {
  const MathRenderer = loadMathRenderer();
  const input = "Water is represented as H<sub>2</sub>O and the <u>formula</u> is fixed.";
  const html = ReactDOMServer.renderToStaticMarkup(React.createElement(MathRenderer, { content: input }));

  assert.match(html, /H<sub>2<\/sub>O/);
  assert.match(html, /<u[^>]*>formula<\/u>/);
});

test("MathRenderer normalizes chemical double subscripts and renders clean equations", () => {
  const MathRenderer = loadMathRenderer();
  const input = "$\\text{SO}_4^{2-}_{(aq)} + \\text{Ba}^{2+}_{(aq)} \\xrightarrow{\\text{dil. }\\text{HNO}_3} \\text{BaSO}_{4(s)}$";
  const html = ReactDOMServer.renderToStaticMarkup(React.createElement(MathRenderer, { content: input }));

  assert.doesNotMatch(html, /text-red-600/, "Chemical equations must not fail or render in red");
  assert.match(html, /class="katex"/);
});

