// RFC 4180 CSV Parser
export function parseRfcCsv(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, ""); // Remove UTF-8 BOM if present
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;
  let closedQuote = false;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const nextChar = clean[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote: ""
          currentCell += '"';
          i++;
        } else {
          // Closing quote
          inQuotes = false;
          closedQuote = true;
        }
      } else {
        currentCell += char;
      }
    } else {
      if (closedQuote && ![",", "\r", "\n"].includes(char)) throw new Error("Unexpected text after quoted CSV field.");
      if (char === '"') {
        if (currentCell.length) throw new Error("Quote must start at the beginning of a CSV field.");
        inQuotes = true;
      } else if (char === ",") {
        currentRow.push(currentCell);
        currentCell = "";
        closedQuote = false;
      } else if (char === "\r") {
        if (nextChar === "\n") i++;
        currentRow.push(currentCell);
        rows.push(currentRow);
        currentRow = [];
        currentCell = "";
        closedQuote = false;
      } else if (char === "\n") {
        currentRow.push(currentCell);
        rows.push(currentRow);
        currentRow = [];
        currentCell = "";
        closedQuote = false;
      } else {
        currentCell += char;
      }
    }
  }

  if (inQuotes) throw new Error("Unclosed quoted CSV field.");
  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows.filter((r) => r.length > 0 && r.some((c) => c.trim().length > 0));
}

// Preserve mathematical operators in imported plain text; spreadsheet exports need separate escaping.
export function sanitizeCell(value: string): string { return value.trim(); }


/** Keep import requests below the server body limit without changing source row order. */
export function buildImportBatches<T>(rows:T[],maxRows=10,maxBytes=60000):Array<{offset:number;rows:T[]}> {
 const batches:Array<{offset:number;rows:T[]}>=[];let current:T[]=[];let offset=0;
 for(let index=0;index<rows.length;index++){
  if(new TextEncoder().encode(JSON.stringify([rows[index]])).length>maxBytes)throw new Error(`Row ${index+1} exceeds the safe request size.`);
  const candidate=[...current,rows[index]];
  if(current.length&&(candidate.length>maxRows||new TextEncoder().encode(JSON.stringify(candidate)).length>maxBytes)){batches.push({offset,rows:current});offset=index;current=[rows[index]];}else current=candidate;
 }
 if(current.length)batches.push({offset,rows:current});return batches;
}

export function escapeCsvCell(value:unknown):string {let text=String(value??'');if(/^[=+\-@\t\r]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';}
