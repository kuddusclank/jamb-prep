import React from 'react';
import katex from 'katex';
import { isArabicText } from '@/lib/utils';

interface MathRendererProps {
  content: string;
  className?: string;
}

const TOKEN_REGEX =
  /(\u0000(?:MATH|CODE|BI|BOLD|IT)_\d+\u0000|<(?:u|i|em|b|strong|sub|sup)(?:\s+[^>]*)?>[\s\S]+?<\/(?:u|i|em|b|strong|sub|sup)>)/gi;

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
 * Hierarchically expands tokenized markdown placeholders and safe HTML tags into React nodes
 * using the shared document token table.
 */
function expandTokens(
  str: string,
  keyPrefix: string,
  mathTokens: string[],
  codeTokens: string[],
  biTokens: string[],
  boldTokens: string[],
  italicTokens: string[],
  depth = 0
): React.ReactNode {
  if (!str || depth > 5) return str;

  const parts = str.split(TOKEN_REGEX);
  if (parts.length === 1 && !TOKEN_REGEX.test(str)) {
    return str;
  }

  return parts.map((part, idx) => {
    if (!part) return null;
    const key = `${keyPrefix}-${idx}`;

    // 1. Math formula placeholder
    const mathMatch = part.match(/^\u0000MATH_(\d+)\u0000$/);
    if (mathMatch) {
      const mathToken = mathTokens[Number(mathMatch[1])];
      return mathToken ? renderKaTeXToken(mathToken, key) : null;
    }

    // 2. Inline code placeholder (`...`)
    const codeMatch = part.match(/^\u0000CODE_(\d+)\u0000$/);
    if (codeMatch) {
      const code = codeTokens[Number(codeMatch[1])];
      return (
        <code
          key={key}
          className="px-1.5 py-0.5 rounded-md bg-slate-100 font-mono text-[12px] text-slate-800 border border-slate-200"
        >
          {expandTokens(code, key, mathTokens, codeTokens, biTokens, boldTokens, italicTokens, depth + 1)}
        </code>
      );
    }

    // 3. Bold-Italic placeholder (***...***)
    const biMatch = part.match(/^\u0000BI_(\d+)\u0000$/);
    if (biMatch) {
      const inner = biTokens[Number(biMatch[1])];
      return (
        <strong key={key} className="font-semibold italic">
          {expandTokens(inner, key, mathTokens, codeTokens, biTokens, boldTokens, italicTokens, depth + 1)}
        </strong>
      );
    }

    // 4. Bold placeholder (**...**)
    const boldMatch = part.match(/^\u0000BOLD_(\d+)\u0000$/);
    if (boldMatch) {
      const inner = boldTokens[Number(boldMatch[1])];
      return (
        <strong key={key} className="font-semibold">
          {expandTokens(inner, key, mathTokens, codeTokens, biTokens, boldTokens, italicTokens, depth + 1)}
        </strong>
      );
    }

    // 5. Italic placeholder (*...* or _..._)
    const itMatch = part.match(/^\u0000IT_(\d+)\u0000$/);
    if (itMatch) {
      const inner = italicTokens[Number(itMatch[1])];
      return (
        <em key={key} className="italic">
          {expandTokens(inner, key, mathTokens, codeTokens, biTokens, boldTokens, italicTokens, depth + 1)}
        </em>
      );
    }

    // 6. Safe HTML tags: <u>, <i>, <em>, <b>, <strong>, <sub>, <sup>
    const tagMatch = part.match(/^<(u|i|em|b|strong|sub|sup)(?:\s+[^>]*)?>([\s\S]+)<\/\1>$/i);
    if (tagMatch) {
      const tag = tagMatch[1].toLowerCase();
      const inner = expandTokens(tagMatch[2], key, mathTokens, codeTokens, biTokens, boldTokens, italicTokens, depth + 1);
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

    // Plain text segment
    return <React.Fragment key={key}>{part}</React.Fragment>;
  });
}

/**
 * MathRenderer parses inline math ($...$) and block math ($$...$$)
 * using KaTeX, and seamlessly renders inline formatting (*italic*, **bold**, `code`, <u>underline</u>, etc.)
 * even when math expressions or code blocks are nested inside formatted labels.
 */
export function MathRenderer({ content, className = '' }: MathRendererProps) {
  if (!content) return null;

  const isRtl = isArabicText(content);

  // Pre-normalize common currency patterns like $₦345$ or $$₦1,000$$
  const normalizedContent = content
    .replace(/\$\$([ \t]*)₦([ \t]*)/g, '₦$$$$$1')
    .replace(/\$([ \t]*)₦([ \t]*)/g, '₦$$$1');

  // Step 1: Extract math formulas ($$...$$ and $...$) into placeholders
  const mathTokens: string[] = [];
  const mathRegex = /(\$\$[\s\S]+?\$\$|\$[^\$]+?\$)/g;
  let text = normalizedContent.replace(mathRegex, (match) => {
    const idx = mathTokens.length;
    mathTokens.push(match);
    return `\u0000MATH_${idx}\u0000`;
  });

  // Step 2: Extract inline code (`code`) into placeholders
  const codeTokens: string[] = [];
  text = text.replace(/`([^`\n]+)`/g, (_, code) => {
    const idx = codeTokens.length;
    codeTokens.push(code);
    return `\u0000CODE_${idx}\u0000`;
  });

  // Step 3: Extract bold-italic (***...***) into placeholders
  const biTokens: string[] = [];
  text = text.replace(/\*\*\*(?:(?!\*\*\*|\n\n)[\s\S])+?\*\*\*/g, (m) => {
    const idx = biTokens.length;
    biTokens.push(m.slice(3, -3));
    return `\u0000BI_${idx}\u0000`;
  });

  // Step 4: Extract bold (**...**) into placeholders
  const boldTokens: string[] = [];
  text = text.replace(/\*\*(?:(?!\*\*|\n\n)[\s\S])+?\*\*/g, (m) => {
    const idx = boldTokens.length;
    boldTokens.push(m.slice(2, -2));
    return `\u0000BOLD_${idx}\u0000`;
  });

  // Step 5: Extract italic (*...* and _..._) into placeholders
  const italicTokens: string[] = [];
  text = text.replace(/(?<![\w*])\*(?!\s)(?:(?!\*|\n\n)[\s\S])+?(?<!\s)\*(?![\w*])/g, (m) => {
    const idx = italicTokens.length;
    italicTokens.push(m.slice(1, -1));
    return `\u0000IT_${idx}\u0000`;
  });
  text = text.replace(/(?<![\w_])_(?!\s)(?:(?!_|\n\n)[\s\S])+?(?<!\s)_(?![\w_])/g, (m) => {
    const idx = italicTokens.length;
    italicTokens.push(m.slice(1, -1));
    return `\u0000IT_${idx}\u0000`;
  });

  // Also extract italic markers that were nested inside bold tokens so they share the token table
  for (let i = 0; i < boldTokens.length; i++) {
    boldTokens[i] = boldTokens[i].replace(/(?<![\w*])\*(?!\s)(?:(?!\*|\n\n)[\s\S])+?(?<!\s)\*(?![\w*])/g, (m) => {
      const idx = italicTokens.length;
      italicTokens.push(m.slice(1, -1));
      return `\u0000IT_${idx}\u0000`;
    });
    boldTokens[i] = boldTokens[i].replace(/(?<![\w_])_(?!\s)(?:(?!_|\n\n)[\s\S])+?(?<!\s)_(?![\w_])/g, (m) => {
      const idx = italicTokens.length;
      italicTokens.push(m.slice(1, -1));
      return `\u0000IT_${idx}\u0000`;
    });
  }

  // Step 6: Expand all placeholders recursively into clean React nodes
  const renderedChildren = expandTokens(
    text,
    'math-root',
    mathTokens,
    codeTokens,
    biTokens,
    boldTokens,
    italicTokens
  );

  return (
    <span
      dir={isRtl ? 'rtl' : undefined}
      className={`inline-block leading-relaxed ${isRtl ? 'text-right [direction:rtl]' : ''} ${className}`}
    >
      {renderedChildren}
    </span>
  );
}
