import React from 'react';
import katex from 'katex';
import { isArabicText } from '@/lib/utils';

interface MathRendererProps {
  content: string;
  className?: string;
}

const INLINE_FORMAT_REGEX =
  /(\*\*\*(?:(?!\*\*\*|\n\n)[\s\S])+?\*\*\*|\*\*(?:(?!\*\*|\n\n)[\s\S])+?\*\*|(?<![\w*])\*(?!\s)(?:(?!\*|\n\n)[\s\S])+?(?<!\s)\*(?![\w*])|(?<![\w_])_(?!\s)(?:(?!_|\n\n)[\s\S])+?(?<!\s)_(?![\w_])|<(?:u|i|em|b|strong|sub|sup)(?:\s+[^>]*)?>[\s\S]+?<\/(?:u|i|em|b|strong|sub|sup)>)/gi;

const MATH_PLACEHOLDER_REGEX = /\u0000MATH_(\d+)\u0000/g;

/**
 * Normalizes common chemical and LaTeX edge cases so KaTeX can render without double-subscript errors.
 */
function normalizeMath(math: string): string {
  if (!math) return '';
  let res = math
    // Fix chemical double subscripts e.g. \text{SO}_4^{2-}_{(aq)} -> \text{SO}_4^{2-}{}_{(aq)}
    .replace(/(_(?:\{[^}]*\}|[0-9a-zA-Z]+)\^(?:\{[^}]*\}|[0-9a-zA-Z+-]+))(_(?:\{[^}]*\}|\([^)]*\)|[0-9a-zA-Z]+))/g, '$1{}$2')
    // Fix double subscripts without superscripts e.g. X_a_b -> X_a{}_b
    .replace(/(_(?:\{[^}]*\}|[0-9a-zA-Z]+))(_(?:\{[^}]*\}|\([^)]*\)|[0-9a-zA-Z]+))/g, '$1{}$2')
    // Fix illegal escapes like \-- -> --
    .replace(/\\--/g, '--');

  // Strip @{...} unsupported array column spacing
  while (/@\{[^}]*\}/.test(res)) {
    res = res.replace(/(\\begin\{array\}\{[^}]*?)@\{[^}]*\}([^}]*?\})/g, '$1$2');
  }

  return res;
}

/**
 * Renders a single math token (either inline $...$ or block $$...$$) using KaTeX.
 */
function renderKaTeXToken(rawToken: string, key: string): React.ReactNode {
  const isDisplay = rawToken.startsWith('$$') && rawToken.endsWith('$$');
  const innerMath = isDisplay ? rawToken.slice(2, -2).trim() : rawToken.slice(1, -1).trim();
  const normalized = normalizeMath(innerMath);

  try {
    const html = katex.renderToString(normalized, {
      displayMode: isDisplay,
      throwOnError: false,
      strict: false,
    });

    if (isDisplay) {
      return (
        <span
          key={key}
          className="my-2 block text-center overflow-x-auto py-1"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      );
    }

    return (
      <span
        key={key}
        className="inline px-0.5"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  } catch {
    return (
      <code key={key} className="text-red-600">
        {rawToken}
      </code>
    );
  }
}

/**
 * Replaces math placeholder tokens (\u0000MATH_0\u0000) inside plain text segments
 * with rendered KaTeX elements.
 */
function expandMathPlaceholders(text: string, mathTokens: string[], keyPrefix: string): React.ReactNode {
  if (!text) return text;
  if (!text.includes('\u0000MATH_')) return text;

  const parts = text.split(MATH_PLACEHOLDER_REGEX);
  if (parts.length === 1) return text;

  const nodes: React.ReactNode[] = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;

    // Odd indices from split with capture group match the captured group: the index digits
    if (i % 2 === 1) {
      const mathIndex = parseInt(part, 10);
      const mathToken = mathTokens[mathIndex];
      if (mathToken) {
        nodes.push(renderKaTeXToken(mathToken, `${keyPrefix}-m${mathIndex}`));
      }
    } else {
      nodes.push(<React.Fragment key={`${keyPrefix}-t${i}`}>{part}</React.Fragment>);
    }
  }

  return nodes.length === 1 ? nodes[0] : <React.Fragment key={keyPrefix}>{nodes}</React.Fragment>;
}

/**
 * Recursively parses inline markdown formatting (bold, italic, tags) while preserving
 * math placeholders so math formulas inside formatting tags (e.g. **Base $n$:**)
 * receive both proper styling and KaTeX rendering.
 */
function renderInlineFormatting(
  text: string,
  mathTokens: string[],
  keyPrefix: string,
  depth = 0
): React.ReactNode {
  if (!text || depth > 3) return expandMathPlaceholders(text, mathTokens, keyPrefix);

  const tokens = text.split(INLINE_FORMAT_REGEX);
  if (tokens.length === 1) return expandMathPlaceholders(text, mathTokens, keyPrefix);

  return tokens.map((token, idx) => {
    if (!token) return null;
    const key = `${keyPrefix}-${idx}`;

    // ***bold italic***
    if (token.startsWith('***') && token.endsWith('***') && token.length > 6) {
      return (
        <strong key={key} className="font-semibold italic">
          {renderInlineFormatting(token.slice(3, -3), mathTokens, key, depth + 1)}
        </strong>
      );
    }

    // **bold**
    if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
      return (
        <strong key={key} className="font-semibold">
          {renderInlineFormatting(token.slice(2, -2), mathTokens, key, depth + 1)}
        </strong>
      );
    }

    // *italic*
    if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
      return (
        <em key={key} className="italic">
          {renderInlineFormatting(token.slice(1, -1), mathTokens, key, depth + 1)}
        </em>
      );
    }

    // _italic_
    if (token.startsWith('_') && token.endsWith('_') && token.length > 2) {
      return (
        <em key={key} className="italic">
          {renderInlineFormatting(token.slice(1, -1), mathTokens, key, depth + 1)}
        </em>
      );
    }

    // Safe inline HTML tags: <u>, <i>, <em>, <b>, <strong>, <sub>, <sup>
    const tagMatch = token.match(/^<(u|i|em|b|strong|sub|sup)(?:\s+[^>]*)?>([\s\S]+)<\/\1>$/i);
    if (tagMatch) {
      const tag = tagMatch[1].toLowerCase();
      const inner = renderInlineFormatting(tagMatch[2], mathTokens, key, depth + 1);
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

    return expandMathPlaceholders(token, mathTokens, key);
  });
}

/**
 * MathRenderer parses inline math ($...$) and block math ($$...$$)
 * using KaTeX, and seamlessly renders inline formatting (*italic*, **bold**, <u>underline</u>, etc.)
 * even when math expressions are inside formatted labels.
 */
export function MathRenderer({ content, className = '' }: MathRendererProps) {
  if (!content) return null;

  const isRtl = isArabicText(content);

  // Pre-normalize common currency patterns like $₦345$ or $$₦1,000$$
  const normalizedContent = content
    .replace(/\$\$([ \t]*)₦([ \t]*)/g, '₦$$$$$1')
    .replace(/\$([ \t]*)₦([ \t]*)/g, '₦$$$1');

  // Step 1: Extract all math formulas and replace them with safe unique placeholder tokens
  const mathTokens: string[] = [];
  const mathRegex = /(\$\$[\s\S]+?\$\$|\$[^\$]+?\$)/g;
  const contentWithPlaceholders = normalizedContent.replace(mathRegex, (match) => {
    const idx = mathTokens.length;
    mathTokens.push(match);
    return `\u0000MATH_${idx}\u0000`;
  });

  // Step 2: Parse inline markdown formatting and expand placeholders with KaTeX
  const renderedChildren = renderInlineFormatting(contentWithPlaceholders, mathTokens, 'math-root');

  return (
    <span
      dir={isRtl ? 'rtl' : undefined}
      className={`inline-block leading-relaxed ${isRtl ? 'text-right [direction:rtl]' : ''} ${className}`}
    >
      {renderedChildren}
    </span>
  );
}
