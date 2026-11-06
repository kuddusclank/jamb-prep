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

function parseListItem(itemText: string): ParsedListItem {
  const clean = itemText.replace(/^[-*]\s+/, "");
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

  // Split into blocks by double newline
  const blocks = content.split(/\n\s*\n/);

  return (
    <div className={`space-y-5 text-slate-800 text-[15px] sm:text-base leading-relaxed ${className}`}>
      {blocks.map((block, idx) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        // 1. Horizontal Rules (---, ***, ___)
        if (/^[-*_]{3,}$/.test(trimmed)) {
          return <hr key={idx} className="my-8 border-slate-200" />;
        }

        // 2. Heading 1 (# Heading or # SECTION...)
        if (trimmed.startsWith("# ")) {
          return (
            <h2
              key={idx}
              className="text-xl sm:text-2xl font-extrabold text-[#092E28] mt-10 mb-4 tracking-tight border-b-2 border-emerald-100 pb-2"
            >
              <MathRenderer content={trimmed.slice(2).trim()} />
            </h2>
          );
        }

        // 3. Heading 2 (## Heading)
        if (trimmed.startsWith("## ")) {
          return (
            <h3
              key={idx}
              className="text-lg sm:text-xl font-bold text-[#092E28] mt-8 mb-3 tracking-tight border-b border-slate-200 pb-1.5"
            >
              <MathRenderer content={trimmed.slice(3).trim()} />
            </h3>
          );
        }

        // 4. Heading 3 (### Heading)
        if (trimmed.startsWith("### ")) {
          return (
            <h4
              key={idx}
              className="text-base sm:text-lg font-bold text-slate-900 mt-6 mb-2 tracking-tight"
            >
              <MathRenderer content={trimmed.slice(4).trim()} />
            </h4>
          );
        }

        // 5. Heading 4 (#### Heading)
        if (trimmed.startsWith("#### ")) {
          return (
            <h5
              key={idx}
              className="text-sm sm:text-base font-bold text-slate-800 mt-5 mb-1.5 tracking-tight"
            >
              <MathRenderer content={trimmed.slice(5).trim()} />
            </h5>
          );
        }

        // 6. GitHub-style Callouts (> [!IMPORTANT], > [!NOTE], etc.)
        if (trimmed.startsWith(">")) {
          const lines = trimmed.split("\n").map((l) => l.replace(/^>\s?/, ""));
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

        // 7. Markdown Tables (| ... |)
        if (trimmed.startsWith("|") && trimmed.includes("\n|")) {
          const rows = trimmed
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

        // 8. Code block (```)
        if (trimmed.startsWith("```") && trimmed.endsWith("```")) {
          const lines = trimmed.split("\n");
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

        // 9. Standalone Display Math ($$ ... $$)
        if (trimmed.startsWith("$$") && trimmed.endsWith("$$")) {
          return (
            <div key={idx} className="my-4 py-2 overflow-x-auto">
              <MathRenderer content={trimmed} />
            </div>
          );
        }

        // 10. Bullet Lists (- or *) with nested math and sub-bullet support
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          // Split ONLY top-level bullets (unindented - or * at start of line)
          const rawItems = trimmed.split(/\n(?=[-*]\s+)/);
          const validItems = rawItems
            .map((item) => parseListItem(item))
            .filter((parsed) => Boolean(parsed.mainLine));

          return (
            <ul key={idx} className="my-3 space-y-2.5 list-disc list-outside pl-5 text-slate-700">
              {validItems.map((item, itemIdx) => {
                return (
                  <li key={itemIdx} className="leading-relaxed">
                    <MathRenderer content={item.mainLine} />

                    {/* Continuation lines if any */}
                    {item.otherLines.length > 0 && (
                      <div className="mt-1 text-slate-700">
                        <MathRenderer content={item.otherLines.join(" ")} />
                      </div>
                    )}

                    {/* Embedded block equations inside this bullet */}
                    {item.mathBlocks.map((mb, mbIdx) => (
                      <div key={mbIdx} className="my-2 overflow-x-auto">
                        <MathRenderer content={mb} />
                      </div>
                    ))}

                    {/* Nested sub-bullets */}
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

        // 11. Numbered Lists (1., 2., etc.)
        if (/^\d+[\.\)]\s+/.test(trimmed)) {
          const items = trimmed.split(/\n(?=\d+[\.\)]\s+)/);
          return (
            <ol key={idx} className="my-3 space-y-2 list-decimal list-outside pl-5 text-slate-700">
              {items.map((item, itemIdx) => {
                const itemClean = item.replace(/^\d+[\.\)]\s+/, "").trim();
                if (!itemClean) return null;
                return (
                  <li key={itemIdx} className="leading-relaxed">
                    <MathRenderer content={itemClean} />
                  </li>
                );
              })}
            </ol>
          );
        }

        // 12. Standard Paragraph
        return (
          <p key={idx} className="leading-relaxed text-slate-800">
            <MathRenderer content={trimmed} />
          </p>
        );
      })}
    </div>
  );
}
