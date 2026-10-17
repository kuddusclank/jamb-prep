import React from 'react';
import katex from 'katex';

interface MathRendererProps {
  content: string;
  className?: string;
}

const INLINE_FORMAT_REGEX =
  /(\*\*[^*\n]+?\*\*|(?<![\w*])\*(?!\s)[^*\n]+?(?<!\s)\*(?![\w*])|(?<![\w_])_(?!\s)[^_\n]+?(?<!\s)_(?![\w_])|<(?:u|i|em|b|strong|sub|sup)>[\s\S]+?<\/(?:u|i|em|b|strong|sub|sup)>)/gi;

function renderInlineFormatting(text: string, keyPrefix: string, depth = 0): React.ReactNode {
  if (!text || depth > 3) return text;

  const tokens = text.split(INLINE_FORMAT_REGEX);
  if (tokens.length === 1) return text;

  return tokens.map((token, idx) => {
    if (!token) return null;
    const key = `${keyPrefix}-${idx}`;

    // **bold**
    if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
      return (
        <strong key={key} className="font-semibold">
          {renderInlineFormatting(token.slice(2, -2), key, depth + 1)}
        </strong>
      );
    }

    // *italic*
    if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
      return (
        <em key={key} className="italic">
          {renderInlineFormatting(token.slice(1, -1), key, depth + 1)}
        </em>
      );
    }

    // _italic_
    if (token.startsWith('_') && token.endsWith('_') && token.length > 2) {
      return (
        <em key={key} className="italic">
          {renderInlineFormatting(token.slice(1, -1), key, depth + 1)}
        </em>
      );
    }

    // Safe inline HTML tags: <u>, <i>, <em>, <b>, <strong>, <sub>, <sup>
    const tagMatch = token.match(/^<(u|i|em|b|strong|sub|sup)>([\s\S]+)<\/\1>$/i);
    if (tagMatch) {
      const tag = tagMatch[1].toLowerCase();
      const inner = renderInlineFormatting(tagMatch[2], key, depth + 1);
      if (tag === 'u') {
        return (
          <u key={key} className="underline decoration-2 underline-offset-2">
            {inner}
          </u>
        );
      }
      if (tag === 'i' || tag === 'em') {
        return (
          <em key={key} className="italic">
            {inner}
          </em>
        );
      }
      if (tag === 'b' || tag === 'strong') {
        return (
          <strong key={key} className="font-semibold">
            {inner}
          </strong>
        );
      }
      if (tag === 'sub') {
        return <sub key={key}>{inner}</sub>;
      }
      if (tag === 'sup') {
        return <sup key={key}>{inner}</sup>;
      }
    }

    return <React.Fragment key={key}>{token}</React.Fragment>;
  });
}

/**
 * MathRenderer parses inline math ($...$) and block math ($$...$$)
 * using KaTeX, and renders inline emphasis (*italic*, **bold**, <u>underline</u>, etc.)
 * in standard text segments.
 */
export function MathRenderer({ content, className = '' }: MathRendererProps) {
  if (!content) return null;

  // Pattern matching $$...$$ (display math) or $...$ (inline math)
  const mathRegex = /(\$\$[\s\S]+?\$\$|\$[^\$]+?\$)/g;
  const parts = content.split(mathRegex);

  return (
    <span className={`inline-block leading-relaxed ${className}`}>
      {parts.map((part, index) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const math = part.slice(2, -2).trim();
          try {
            const html = katex.renderToString(math, {
              displayMode: true,
              throwOnError: false,
            });
            return (
              <span
                key={index}
                className="my-2 block text-center overflow-x-auto py-1"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } catch {
            return <code key={index} className="text-red-600">{part}</code>;
          }
        } else if (part.startsWith('$') && part.endsWith('$')) {
          const math = part.slice(1, -1).trim();
          try {
            const html = katex.renderToString(math, {
              displayMode: false,
              throwOnError: false,
            });
            return (
              <span
                key={index}
                className="inline px-0.5"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            );
          } catch {
            return <code key={index} className="text-red-600">{part}</code>;
          }
        }

        // Render text with inline formatting (*italic*, **bold**, <u>underline</u>, etc.)
        return <span key={index}>{renderInlineFormatting(part, `p${index}`)}</span>;
      })}
    </span>
  );
}

