import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const studyDataPath = path.join(__dirname, "../src/lib/study/study-data.json");

test("Study Platform — Data Registry Integrity", async (t) => {
  await t.test("study-data.json exists and contains exactly 25 official UTME subjects", () => {
    assert.ok(fs.existsSync(studyDataPath), "study-data.json must exist");
    const raw = fs.readFileSync(studyDataPath, "utf-8");
    const subjects = JSON.parse(raw);
    assert.equal(subjects.length, 25, "Must have exactly 25 subjects");

    const codes = subjects.map((s) => s.code);
    assert.ok(codes.includes("ENG"), "Must include Use of English");
    assert.ok(codes.includes("MTH"), "Must include Mathematics");
    assert.ok(codes.includes("PHY"), "Must include Physics");
    assert.ok(codes.includes("CHM"), "Must include Chemistry");
    assert.ok(codes.includes("BIO"), "Must include Biology");
    assert.ok(codes.includes("ECN"), "Must include Economics");
    assert.ok(codes.includes("GOV"), "Must include Government");
    assert.ok(codes.includes("LIT"), "Must include Literature in English");
  });

  await t.test("Use of English has correct compulsory metadata and topics", () => {
    const subjects = JSON.parse(fs.readFileSync(studyDataPath, "utf-8"));
    const eng = subjects.find((s) => s.code === "ENG");
    assert.ok(eng, "ENG must exist");
    assert.equal(eng.isCompulsory, true);
    assert.equal(eng.questionCount, 60);
    assert.equal(eng.timeTargetMinutes, 40);
    assert.ok(eng.topics.length >= 10, "ENG must have syllabus topics");
    assert.ok(eng.strategies.length === 10, "ENG must have 10 golden exam strategies");
  });

  await t.test("Mathematics has KaTeX math formulas and topics", () => {
    const subjects = JSON.parse(fs.readFileSync(studyDataPath, "utf-8"));
    const mth = subjects.find((s) => s.code === "MTH");
    assert.ok(mth, "MTH must exist");
    assert.equal(mth.isCompulsory, false);
    assert.equal(mth.questionCount, 40);
    assert.equal(mth.timeTargetMinutes, 25);
    assert.equal(mth.topics.length, 18);
    assert.equal(mth.strategies.length, 10);

    const numBases = mth.topics.find((t) => t.slug === "number-bases");
    assert.ok(numBases, "Number bases topic must exist");
    assert.ok(numBases.content.length > 200, "Topic content must be substantive");
  });

  await t.test("All topics have valid slugs, reading times, and non-empty content", () => {
    const subjects = JSON.parse(fs.readFileSync(studyDataPath, "utf-8"));
    let totalTopics = 0;
    for (const subj of subjects) {
      assert.ok(subj.name, `Subject ${subj.code} must have a name`);
      assert.ok(subj.topics.length > 0, `Subject ${subj.code} must have at least 1 topic`);
      for (const topic of subj.topics) {
        totalTopics++;
        assert.ok(topic.id, "Topic must have id");
        assert.ok(topic.slug, `Topic ${topic.id} must have slug`);
        assert.ok(topic.title, `Topic ${topic.id} must have title`);
        assert.ok(topic.readingTimeMinutes >= 3, `Topic ${topic.id} reading time must be >= 3`);
        assert.ok(topic.content.length > 50, `Topic ${topic.id} content must be non-empty`);
      }
    }
    assert.ok(totalTopics > 200, `Total topics across all 25 subjects should exceed 200 (got ${totalTopics})`);
  });

  await t.test("StudyClient renders Paywall cleanly for free candidates without runtime crashes", async () => {
    const React = (await import("react")).default;
    const ReactDOMServer = (await import("react-dom/server")).default;
    const clientModule = await import("../src/app/study/study-client.tsx");
    const StudyClient = clientModule.StudyClient;

    const html = ReactDOMServer.renderToString(React.createElement(StudyClient));
    assert.ok(html.length > 1000, "Rendered HTML must contain study paywall");
    assert.match(html, /PRO FEATURE/);
    assert.match(html, /UTME Study &amp; Subject Revision Coach|UTME Study & Subject Revision Coach/);
    assert.match(html, /Unlock with Pro/);
    assert.match(html, /All 25 Official UTME Subjects/);
    assert.doesNotMatch(html, /ReferenceError/);
  });

  await t.test("StudyClient renders all 25 subjects cleanly for Pro candidates without raw markdown leaks", async () => {
    const React = (await import("react")).default;
    const ReactDOMServer = (await import("react-dom/server")).default;
    const clientModule = await import("../src/app/study/study-client.tsx");
    const StudyClient = clientModule.StudyClient;

    const html = ReactDOMServer.renderToString(
      React.createElement(StudyClient, { initialEntitlement: { isPremium: true } })
    );
    assert.ok(html.length > 5000, "Rendered HTML must contain full subject directory");
    assert.match(html, /Use of English/);
    assert.match(html, /Mathematics/);
    assert.doesNotMatch(html, /ReferenceError/);
    assert.doesNotMatch(html, /---/, "Card snippets must never contain raw markdown dividers");
    assert.doesNotMatch(html, /## Overview/, "Card snippets must never contain raw section headers");
  });

  await t.test("StudyContentRenderer renders numbered items as structured HTML ordered lists", async () => {
    const React = (await import("react")).default;
    const ReactDOMServer = (await import("react-dom/server")).default;
    const { StudyContentRenderer } = await import("../src/components/study/study-content-renderer.tsx");
    const subjects = JSON.parse(fs.readFileSync(studyDataPath, "utf-8"));
    const eng = subjects.find((s) => s.code === "ENG");

    const parts = eng.overview.split("---");
    const cleanOverview = parts[1].replace(/^#+[^\n]*\n+/gm, "").trim();

    const html = ReactDOMServer.renderToString(
      React.createElement(StudyContentRenderer, { content: cleanOverview })
    );

    assert.match(html, /<ol[^>]*>/, "Numbered syllabus breakdown must be rendered as an ordered list <ol>");
    assert.match(html, /<li[^>]*>/, "Numbered items must be individual <li> elements");
    assert.match(html, /Comprehension and Summary \(15 Questions\)/);
    assert.match(html, /Oral Forms \(10 Questions\)/);
  });
});
