"use client";

import React from "react";
import { MathRenderer } from "@/components/math-renderer";
import { AlertCircle, Info, Lightbulb, BookOpen } from "lucide-react";

interface StudyContentRendererProps {
  content: string;
  className?: string;
}

interface ParsedListItem {
  mainLine: string;
  subBullets: string[];
  mathBlocks: string[];
  otherLines: string[];
}

interface MarkdownBlock {
  type: "heading" | "hr" | "callout" | "table" | "code" | "ul" | "ol" | "p";
  content: string;
}

function tokenizeMarkdownBlocks(markdown: string): MarkdownBlock[] {
  const lines = markdown.split(/\r?\n/);
  const blocks: MarkdownBlock[] = [];
  let currentBlock: string[] = [];
  let currentType: MarkdownBlock["type"] | null = null;

  function flush() {
    if (currentBlock.length > 0 && currentType) {
      blocks.push({ type: currentType, content: currentBlock.join("\n").trim() });
      currentBlock = [];
      currentType = null;
    }
  }

  let inCode = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (inCode) {
      currentBlock.push(line);
      if (trimmed.startsWith("```")) {
        inCode = false;
        flush();
      }
      continue;
    }

    if (!trimmed) {
      flush();
      continue;
    }

    if (trimmed.startsWith("```")) {
      flush();
      inCode = true;
      currentType = "code";
      currentBlock.push(line);
      continue;
    }

    if (/^[-*_]{3,}$/.test(trimmed)) {
      flush();
      blocks.push({ type: "hr", content: trimmed });
      continue;
    }

    if (/^#{1,6}\s+/.test(trimmed)) {
      flush();
      blocks.push({ type: "heading", content: trimmed });
      continue;
    }

    if (trimmed.startsWith(">")) {
      if (currentType !== "callout") flush();
      currentType = "callout";
      currentBlock.push(line);
      continue;
    }

    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      if (currentType !== "table") flush();
      currentType = "table";
      currentBlock.push(line);
      continue;
    }

    // Bullet list: starts with - or * at column 0
    if (/^[-*]\s+/.test(trimmed)) {
      if (currentType !== "ul") {
        flush();
        currentType = "ul";
      }
      currentBlock.push(line);
      continue;
    }

    // Numbered list: starts with 1. or 2) etc.
    if (/^\d+[\.\)]\s+/.test(trimmed)) {
      if (currentType !== "ol") {
        flush();
        currentType = "ol";
      }
      currentBlock.push(line);
      continue;
    }

    // Indented continuation lines (sub-bullets, indented block math, etc.)
    if ((currentType === "ul" || currentType === "ol") && (/^\s+/.test(line) || trimmed.startsWith("$$"))) {
      currentBlock.push(line);
      continue;
    }

    // Regular paragraph text
    if (currentType !== "p") {
      flush();
      currentType = "p";
    }
    currentBlock.push(line);
  }

  flush();
  return blocks;
}

function parseListItem(itemText: string): ParsedListItem {
  const clean = itemText.replace(/^([-*]|\d+[\.\)])\s+/, "");
  const lines = clean.split("\n");
  const mainLine = lines[0].trim();
  const rest = lines.slice(1);

  const subBullets: string[] = [];
  const mathBlocks: string[] = [];
  const otherLines: string[] = [];

  for (const rawLine of rest) {
    const l = rawLine.trim();
    if (!l) continue;
    if (l.startsWith("- ") || l.startsWith("* ")) {
      subBullets.push(l.replace(/^[-*]\s+/, "").trim());
    } else if (l.startsWith("$$") && l.endsWith("$$")) {
      mathBlocks.push(l);
    } else {
      otherLines.push(l);
    }
  }

  return { mainLine, subBullets, mathBlocks, otherLines };
}

export function StudyContentRenderer({ content, className = "" }: StudyContentRendererProps) {
  if (!content) return null;

  const blocks = tokenizeMarkdownBlocks(content);

  return (
    <div className={`space-y-5 text-slate-800 text-[15px] sm:text-base leading-relaxed ${className}`}>
      {blocks.map((block, idx) => {
        const text = block.content;

        // 1. Horizontal Rule
        if (block.type === "hr") {
          return <hr key={idx} className="my-8 border-slate-200" />;
        }

        // 2. Headings
        if (block.type === "heading") {
          if (text.startsWith("#### ")) {
            return (
              <h5 key={idx} className="text-sm sm:text-base font-bold text-slate-850 mt-5 mb-1.5 tracking-tight">
                <MathRenderer content={text.slice(5).trim()} />
              </h5>
            );
          }
          if (text.startsWith("### ")) {
            return (
              <h4 key={idx} className="text-base sm:text-lg font-bold text-slate-900 mt-6 mb-2 tracking-tight">
                <MathRenderer content={text.slice(4).trim()} />
              </h4>
            );
          }
          if (text.startsWith("## ")) {
            return (
              <h3 key={idx} className="text-lg sm:text-xl font-bold text-[#092E28] mt-8 mb-3 tracking-tight border-b border-slate-200 pb-1.5">
                <MathRenderer content={text.slice(3).trim()} />
              </h3>
            );
          }
          if (text.startsWith("# ")) {
            return (
              <h2 key={idx} className="text-xl sm:text-2xl font-extrabold text-[#092E28] mt-10 mb-4 tracking-tight border-b-2 border-emerald-100 pb-2">
                <MathRenderer content={text.slice(2).trim()} />
              </h2>
            );
          }
        }

        // 3. Callout / Blockquote (> [!IMPORTANT], > [!NOTE], etc.)
        if (block.type === "callout") {
          const lines = text.split("\n").map((l) => l.replace(/^>\s?/, ""));
          const firstLine = lines[0] || "";
          const isImportant = firstLine.includes("[!IMPORTANT]") || firstLine.includes("[!WARNING]");
          const isTip = firstLine.includes("[!TIP]");
          const isNote = firstLine.includes("[!NOTE]");

          const bodyLines = (isImportant || isTip || isNote) ? lines.slice(1) : lines;
          const bodyText = bodyLines.join("\n");

          return (
            <div
              key={idx}
              className="my-5 rounded-xl border-l-4 border-[#116149] bg-emerald-50/50 border border-slate-200 p-4 sm:p-5"
            >
              <div className="flex items-center gap-2 mb-2">
                {isImportant && <AlertCircle size={17} className="text-[#116149] shrink-0" />}
                {isTip && <Lightbulb size={17} className="text-[#116149] shrink-0" />}
                {isNote && <Info size={17} className="text-[#116149] shrink-0" />}
                {!isImportant && !isTip && !isNote && <BookOpen size={17} className="text-[#116149] shrink-0" />}
                <span className="text-xs font-bold uppercase tracking-wider text-[#092E28]">
                  {isImportant ? "Key Exam Distinction & Trap" : isTip ? "Pro Tip" : "Official Syllabus Note"}
                </span>
              </div>
              <div className="text-sm sm:text-[15px] leading-relaxed text-slate-700">
                <MathRenderer content={bodyText} />
              </div>
            </div>
          );
        }

        // 4. Tables
        if (block.type === "table") {
          const rows = text
            .split("\n")
            .map((r) => r.trim())
            .filter((r) => r.startsWith("|") && r.endsWith("|"));

          if (rows.length >= 2) {
            const headerRow = rows[0]
              .slice(1, -1)
              .split("|")
              .map((c) => c.trim());
            const dataRows = rows.slice(2).map((r) =>
              r
                .slice(1, -1)
                .split("|")
                .map((c) => c.trim())
            );

            return (
              <div key={idx} className="my-5 overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-slate-50 text-slate-900 font-semibold border-b border-slate-200">
                    <tr>
                      {headerRow.map((h, i) => (
                        <th key={i} className="p-3 sm:px-4 sm:py-3 whitespace-nowrap">
                          <MathRenderer content={h} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {dataRows.map((row, ri) => (
                      <tr key={ri} className="hover:bg-slate-50 transition-colors">
                        {row.map((cell, ci) => (
                          <td key={ci} className="p-3 sm:px-4 sm:py-3 text-slate-700">
                            <MathRenderer content={cell} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }
        }

        // 5. Code block
        if (block.type === "code") {
          const lines = text.split("\n");
          const code = lines.slice(1, -1).join("\n");
          return (
            <pre
              key={idx}
              className="my-4 rounded-xl border border-slate-200 bg-slate-900 text-slate-100 p-4 font-mono text-xs sm:text-sm overflow-x-auto"
            >
              <code>{code}</code>
            </pre>
          );
        }

        // 6. Bullet Lists (- or *) with nested sub-bullets & equations
        if (block.type === "ul") {
          const rawItems = text.split(/\n(?=[-*]\s+)/);
          const validItems = rawItems
            .map((item) => parseListItem(item))
            .filter((parsed) => Boolean(parsed.mainLine));

          return (
            <ul key={idx} className="my-4 space-y-2.5 list-disc list-outside pl-5 text-slate-700">
              {validItems.map((item, itemIdx) => {
                return (
                  <li key={itemIdx} className="leading-relaxed">
                    <MathRenderer content={item.mainLine} />

                    {item.otherLines.length > 0 && (
                      <div className="mt-1 text-slate-700">
                        <MathRenderer content={item.otherLines.join(" ")} />
                      </div>
                    )}

                    {item.mathBlocks.map((mb, mbIdx) => (
                      <div key={mbIdx} className="my-2 overflow-x-auto">
                        <MathRenderer content={mb} />
                      </div>
                    ))}

                    {item.subBullets.length > 0 && (
                      <ul className="mt-2 space-y-1.5 list-circle list-outside pl-5 text-slate-600 text-sm">
                        {item.subBullets.map((sub, sIdx) => (
                          <li key={sIdx} className="leading-relaxed">
                            <MathRenderer content={sub} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          );
        }

        // 7. Numbered Lists (1., 2., etc.)
        if (block.type === "ol") {
          const rawItems = text.split(/\n(?=\d+[\.\)]\s+)/);
          const validItems = rawItems
            .map((item) => parseListItem(item))
            .filter((parsed) => Boolean(parsed.mainLine));

          return (
            <ol key={idx} className="my-3 space-y-2 list-decimal list-outside pl-5 text-slate-700">
              {validItems.map((item, itemIdx) => {
                return (
                  <li key={itemIdx} className="leading-relaxed">
                    <MathRenderer content={item.mainLine} />

                    {item.otherLines.length > 0 && (
                      <div className="mt-1 text-slate-700">
                        <MathRenderer content={item.otherLines.join(" ")} />
                      </div>
                    )}

                    {item.mathBlocks.map((mb, mbIdx) => (
                      <div key={mbIdx} className="my-2 overflow-x-auto">
                        <MathRenderer content={mb} />
                      </div>
                    ))}

                    {item.subBullets.length > 0 && (
                      <ul className="mt-2 space-y-1.5 list-circle list-outside pl-5 text-slate-600 text-xs sm:text-sm">
                        {item.subBullets.map((sub, sIdx) => (
                          <li key={sIdx} className="leading-relaxed">
                            <MathRenderer content={sub} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ol>
          );
        }

        // 8. Standard Paragraph
        return (
          <p key={idx} className="leading-relaxed text-slate-800">
            <MathRenderer content={text} />
          </p>
        );
      })}
    </div>
  );
}
