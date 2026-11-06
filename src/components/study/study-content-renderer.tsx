"use client";

import React from "react";
import { MathRenderer } from "@/components/math-renderer";
import { AlertCircle, CheckCircle, Info, Lightbulb, BookOpen } from "lucide-react";

interface StudyContentRendererProps {
  content: string;
  className?: string;
}

export function StudyContentRenderer({ content, className = "" }: StudyContentRendererProps) {
  if (!content) return null;

  // Split into blocks by double newline
  const blocks = content.split(/\n\s*\n/);

  return (
    <div className={`space-y-5 text-zinc-800 dark:text-zinc-200 text-[15px] sm:text-base leading-relaxed ${className}`}>
      {blocks.map((block, idx) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        // 1. Heading 4 (#### Heading)
        if (trimmed.startsWith("#### ")) {
          return (
            <h4
              key={idx}
              className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-6 mb-2 tracking-tight"
            >
              <MathRenderer content={trimmed.slice(5).trim()} />
            </h4>
          );
        }

        // 2. Heading 3 (### Heading)
        if (trimmed.startsWith("### ")) {
          return (
            <h3
              key={idx}
              className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-8 mb-3 tracking-tight border-b border-zinc-200 dark:border-zinc-800 pb-1.5"
            >
              <MathRenderer content={trimmed.slice(4).trim()} />
            </h3>
          );
        }

        // 3. Heading 2 (## Heading)
        if (trimmed.startsWith("## ")) {
          return (
            <h2
              key={idx}
              className="text-xl sm:text-2xl font-extrabold text-[#092E28] dark:text-emerald-400 mt-10 mb-4 tracking-tight"
            >
              <MathRenderer content={trimmed.slice(3).trim()} />
            </h2>
          );
        }

        // 4. GitHub-style Callouts (> [!IMPORTANT], > [!NOTE], etc.)
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
              className="my-5 rounded-xl border-l-4 border-emerald-700 bg-zinc-50 dark:bg-zinc-900/70 border-zinc-200 dark:border-zinc-800 p-4 sm:p-5"
            >
              <div className="flex items-center gap-2 mb-2">
                {isImportant && <AlertCircle size={17} className="text-emerald-700 shrink-0" />}
                {isTip && <Lightbulb size={17} className="text-emerald-700 shrink-0" />}
                {isNote && <Info size={17} className="text-emerald-700 shrink-0" />}
                {!isImportant && !isTip && !isNote && <BookOpen size={17} className="text-emerald-700 shrink-0" />}
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                  {isImportant ? "Key Exam Distinction & Trap" : isTip ? "Pro Tip" : "Official Syllabus Note"}
                </span>
              </div>
              <div className="text-sm sm:text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
                <MathRenderer content={bodyText} />
              </div>
            </div>
          );
        }

        // 5. Markdown Tables (| ... |)
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
            // row 1 is usually separator (|---|---|)
            const dataRows = rows.slice(2).map((r) =>
              r
                .slice(1, -1)
                .split("|")
                .map((c) => c.trim())
            );

            return (
              <div key={idx} className="my-5 overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-zinc-100 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 font-semibold border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      {headerRow.map((h, i) => (
                        <th key={i} className="p-3 sm:px-4 sm:py-3 whitespace-nowrap">
                          <MathRenderer content={h} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {dataRows.map((row, ri) => (
                      <tr key={ri} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                        {row.map((cell, ci) => (
                          <td key={ci} className="p-3 sm:px-4 sm:py-3 text-zinc-700 dark:text-zinc-300">
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

        // 6. Code block (```)
        if (trimmed.startsWith("```") && trimmed.endsWith("```")) {
          const lines = trimmed.split("\n");
          const code = lines.slice(1, -1).join("\n");
          return (
            <pre
              key={idx}
              className="my-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-900 text-zinc-100 p-4 font-mono text-xs sm:text-sm overflow-x-auto"
            >
              <code>{code}</code>
            </pre>
          );
        }

        // 7. Bullet Lists (- or *)
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          const items = trimmed.split(/\n(?=[-|\*]\s+)/);
          return (
            <ul key={idx} className="my-3 space-y-2 list-disc list-outside pl-5 text-zinc-700 dark:text-zinc-300">
              {items.map((item, itemIdx) => {
                const itemClean = item.replace(/^[-|\*]\s+/, "").trim();
                return (
                  <li key={itemIdx} className="leading-relaxed">
                    <MathRenderer content={itemClean} />
                  </li>
                );
              })}
            </ul>
          );
        }

        // 8. Numbered Lists (1., 2., etc.)
        if (/^\d+[\.\)]\s+/.test(trimmed)) {
          const items = trimmed.split(/\n(?=\d+[\.\)]\s+)/);
          return (
            <ol key={idx} className="my-3 space-y-2 list-decimal list-outside pl-5 text-zinc-700 dark:text-zinc-300">
              {items.map((item, itemIdx) => {
                const itemClean = item.replace(/^\d+[\.\)]\s+/, "").trim();
                return (
                  <li key={itemIdx} className="leading-relaxed">
                    <MathRenderer content={itemClean} />
                  </li>
                );
              })}
            </ol>
          );
        }

        // 9. Standard Paragraph
        return (
          <p key={idx} className="leading-relaxed">
            <MathRenderer content={trimmed} />
          </p>
        );
      })}
    </div>
  );
}
