import * as XLSX from "@e965/xlsx";
import { logger } from "@/lib/logger";

/* ── Marker-based header detection for bank statements ──────── */

const HEADER_MARKERS = [
  "data", "date", "descrizione", "description", "importo", "amount",
  "dare", "avere", "debit", "credit", "valuta", "operazione",
  "causale", "divisa", "saldo", "controvalore",
];

const SUMMARY_MARKERS = [
  "saldo iniziale", "saldo finale", "saldo disponibile", "saldo contabile",
  "numero movimenti", "totale", "totale dare", "totale avere",
  "iban", "intestatario", "conto", "filiale", "data estrazione",
];

const DATE_RE = /^(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}-\d{2}-\d{2})$/;
const AMOUNT_RE = /^-?\s*[\d.,]+\s*€?$/;

function scoreRow(cells: string[]): number {
  let score = 0;
  for (const cell of cells) {
    const lower = cell.toLowerCase().trim();
    if (HEADER_MARKERS.some((m) => lower === m || lower.includes(m))) score += 3;
  }
  // Bonus if at least 3 non-empty cells
  const nonEmpty = cells.filter((c) => c.trim()).length;
  if (nonEmpty >= 3) score += 1;
  if (nonEmpty >= 5) score += 1;
  return score;
}

function isSummaryRow(cells: string[]): boolean {
  const joined = cells.join(" ").toLowerCase();
  return SUMMARY_MARKERS.some((m) => joined.includes(m));
}

function isDataRow(cells: string[]): boolean {
  const hasDate = cells.some((c) => DATE_RE.test(c.trim()));
  const hasAmount = cells.some((c) => AMOUNT_RE.test(c.trim()));
  return hasDate && hasAmount;
}

export interface ParsedExcelResult {
  headers: string[];
  rows: Record<string, string>[];
  sheetNames: string[];
}

/**
 * Parse an XLS/XLSX file, auto-detecting the movements table.
 * Returns structured headers + rows (same shape as CSV parser output).
 */
export async function parseExcelFile(file: File, sheetIndex = 0): Promise<ParsedExcelResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

  const sheetNames = workbook.SheetNames;
  if (sheetNames.length === 0) throw new Error("Il file Excel non contiene fogli.");

  const sheetName = sheetNames[sheetIndex] ?? sheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // Get all rows as string arrays
  const rawRows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,
    dateNF: "yyyy-mm-dd",
    defval: "",
  });

  if (rawRows.length < 2) throw new Error("Nessuna riga trovata nel file Excel.");

  // Convert all cells to strings
  const allRows = rawRows.map((row) =>
    (row as unknown[]).map((c) => String(c ?? "").trim())
  );

  // Find header row: scan first 60 rows, pick highest score ≥ 4
  let headerIdx = -1;
  let bestScore = 0;
  const scanLimit = Math.min(allRows.length, 60);

  for (let i = 0; i < scanLimit; i++) {
    const s = scoreRow(allRows[i]);
    if (s > bestScore) {
      bestScore = s;
      headerIdx = i;
    }
  }

  // Fallback: find first row followed by a data row
  if (bestScore < 4) {
    for (let i = 0; i < scanLimit - 1; i++) {
      const nonEmpty = allRows[i].filter((c) => c).length;
      if (nonEmpty >= 3 && isDataRow(allRows[i + 1])) {
        headerIdx = i;
        break;
      }
    }
  }

  if (headerIdx < 0) headerIdx = 0;

  // Build headers
  const headerCells = allRows[headerIdx];
  const headers = headerCells.map((c, i) => {
    const val = c.trim();
    return val || `COL${i + 1}`;
  });

  // Remove trailing empty columns
  let lastNonEmptyCol = headers.length - 1;
  while (lastNonEmptyCol > 0 && headers[lastNonEmptyCol].startsWith("COL")) {
    // Check if any data row has content in this column
    const hasData = allRows.slice(headerIdx + 1, headerIdx + 20).some(
      (r) => r[lastNonEmptyCol] && r[lastNonEmptyCol].trim()
    );
    if (!hasData) lastNonEmptyCol--;
    else break;
  }
  const effectiveHeaders = headers.slice(0, lastNonEmptyCol + 1);

  // Build data rows, skipping empty and summary rows
  const rows: Record<string, string>[] = [];

  for (let i = headerIdx + 1; i < allRows.length; i++) {
    const row = allRows[i];
    const hasContent = row.some((c) => c.trim() !== "");
    if (!hasContent) continue;

    // Skip summary/preamble rows
    if (isSummaryRow(row)) continue;

    const record: Record<string, string> = {};
    effectiveHeaders.forEach((h, ci) => {
      record[h] = (row[ci] ?? "").trim();
    });
    rows.push(record);
  }

  logger.info(`[STATEMENT_IMPORT] Excel letto: header alla riga ${headerIdx + 1}, ${rows.length} righe movimenti`);

  if (rows.length === 0) throw new Error("Nessun movimento trovato nel file Excel.");

  return { headers: effectiveHeaders, rows, sheetNames };
}

/* ── Column auto-suggest heuristics ─────────────────────────── */

export interface SuggestedMapping {
  date_col?: string;
  desc_col?: string;
  amount_col?: string;
  debit_col?: string;
  credit_col?: string;
  useSeparateColumns: boolean;
}

export function suggestMapping(headers: string[], sampleRows: Record<string, string>[]): SuggestedMapping {
  const result: SuggestedMapping = { useSeparateColumns: false };

  const lower = (s: string) => s.toLowerCase().trim();

  // Date column: header contains "data" or "date", or first column with date-like values
  for (const h of headers) {
    const l = lower(h);
    if (l === "data" || l === "date" || l.includes("data oper") || l.includes("data val")) {
      if (!result.date_col) result.date_col = h;
      continue;
    }
  }
  if (!result.date_col) {
    for (const h of headers) {
      const vals = sampleRows.slice(0, 5).map((r) => r[h]);
      if (vals.filter((v) => DATE_RE.test(v)).length >= 2) {
        result.date_col = h;
        break;
      }
    }
  }

  // Debit/Credit columns
  const debitCol = headers.find((h) => /^dare$/i.test(h.trim()) || /^debit/i.test(h.trim()));
  const creditCol = headers.find((h) => /^avere$/i.test(h.trim()) || /^credit/i.test(h.trim()));

  if (debitCol && creditCol) {
    result.debit_col = debitCol;
    result.credit_col = creditCol;
    result.useSeparateColumns = true;
  } else {
    // Amount column: header contains "importo" or "amount", or first numeric column
    for (const h of headers) {
      const l = lower(h);
      if (l === "importo" || l === "amount" || l.includes("importo")) {
        result.amount_col = h;
        break;
      }
    }
    if (!result.amount_col) {
      for (const h of headers) {
        if (h === result.date_col) continue;
        const vals = sampleRows.slice(0, 5).map((r) => r[h]);
        if (vals.filter((v) => AMOUNT_RE.test(v)).length >= 2) {
          result.amount_col = h;
          break;
        }
      }
    }
  }

  // Description column: longest average text, not date/amount
  const usedCols = new Set([result.date_col, result.amount_col, result.debit_col, result.credit_col]);
  let bestDescCol = "";
  let bestAvgLen = 0;

  for (const h of headers) {
    if (usedCols.has(h)) continue;
    const l = lower(h);
    // Prefer columns named "descrizione", "causale", "description"
    if (l === "descrizione" || l === "causale" || l === "description" || l.includes("descr")) {
      bestDescCol = h;
      bestAvgLen = Infinity;
      break;
    }
    const avgLen = sampleRows.slice(0, 10).reduce((sum, r) => sum + (r[h]?.length ?? 0), 0) / Math.max(sampleRows.length, 1);
    if (avgLen > bestAvgLen) {
      bestAvgLen = avgLen;
      bestDescCol = h;
    }
  }
  if (bestDescCol) result.desc_col = bestDescCol;

  return result;
}

/* ── Legacy CSV-compatible export (for backward compat) ─────── */

export function rowsToCsvText(headers: string[], rows: Record<string, string>[]): string {
  const escape = (v: string) => {
    if (v.includes(",") || v.includes('"') || v.includes("\n")) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };

  const lines = [headers.map(escape).join(",")];
  for (const row of rows) {
    const values = headers.map((h) => escape(row[h] ?? ""));
    lines.push(values.join(","));
  }
  return lines.join("\n");
}
