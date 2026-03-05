import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

/* ── Fingerprint / Dedup ─────────────────────────────────────── */

export async function generateDedupKey(
  workspaceId: string,
  accountId: string,
  date: string,
  amount: number,
  description: string
): Promise<string> {
  const raw = [workspaceId, accountId, date, String(amount), normalizeDescription(description)].join("|");
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(raw));
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function generateFileHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(content));
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* ── Normalisation helpers ───────────────────────────────────── */

export function normalizeDescription(desc: string): string {
  return (desc ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const ITALIAN_MONTHS: Record<string, string> = {
  gennaio: "01", febbraio: "02", marzo: "03", aprile: "04",
  maggio: "05", giugno: "06", luglio: "07", agosto: "08",
  settembre: "09", ottobre: "10", novembre: "11", dicembre: "12",
};

const ITALIAN_DATE_RE = /^(\d{1,2})\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s+(\d{4})$/i;

function parseItalianTextDate(s: string): string | null {
  const m = s.replace(/\s+/g, " ").trim().match(ITALIAN_DATE_RE);
  if (!m) return null;
  const day = m[1].padStart(2, "0");
  const month = ITALIAN_MONTHS[m[2].toLowerCase()];
  const year = m[3];
  if (!month) return null;
  return `${year}-${month}-${day}`;
}

function parseExcelSerialDate(value: string): string | null {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 1 || num > 200000) return null;
  const date = new Date(Date.UTC(1899, 11, 30 + num));
  if (isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function parseNumericDate(s: string, format: string): string | null {
  const patterns: Record<string, RegExp> = {
    "yyyy-mm-dd": /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    "dd/mm/yyyy": /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    "mm/dd/yyyy": /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    "dd-mm-yyyy": /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
    "dd.mm.yyyy": /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/,
  };
  const re = patterns[format];
  if (!re) return null;
  const m = s.match(re);
  if (!m) return null;
  if (format === "yyyy-mm-dd") return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  if (format === "mm/dd/yyyy") return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

function stripTimePart(s: string): string {
  if (/^\d{4}-\d{1,2}-\d{1,2}T/.test(s)) return s.split("T")[0];
  if (/^\d{4}-\d{1,2}-\d{1,2}\s+\d{1,2}:/.test(s)) return s.split(/\s+/)[0];
  if (/^\d{1,2}[\/\.\-]\d{1,2}[\/\.\-]\d{4}\s+\d{1,2}:/.test(s)) return s.split(/\s+/)[0];
  return s;
}

export function parseDate(raw: string, format: string): string | null {
  if (!raw) return null;
  const s = stripTimePart(raw.trim());

  if (format === "auto") {
    const it = parseItalianTextDate(s);
    if (it) return it;
    for (const fmt of ["dd/mm/yyyy", "yyyy-mm-dd", "dd-mm-yyyy", "dd.mm.yyyy"]) {
      const r = parseNumericDate(s, fmt);
      if (r) return r;
    }
    const serial = parseExcelSerialDate(s);
    if (serial) return serial;
    return null;
  }

  if (format === "d-mmmm-yyyy-it") {
    return parseItalianTextDate(s);
  }

  return parseNumericDate(s, format);
}

export function autoDetectDateFormat(samples: string[]): string {
  const cleaned = samples.map((s) => stripTimePart(s.trim()));
  const italianCount = cleaned.filter((s) => parseItalianTextDate(s) !== null).length;
  if (italianCount >= 2) return "auto";

  const formats = ["dd/mm/yyyy", "yyyy-mm-dd", "dd-mm-yyyy", "dd.mm.yyyy", "mm/dd/yyyy"];
  let best = "dd/mm/yyyy";
  let bestCount = 0;
  for (const fmt of formats) {
    const count = cleaned.filter((s) => parseNumericDate(s, fmt) !== null).length;
    if (count > bestCount) {
      bestCount = count;
      best = fmt;
    }
  }
  if (bestCount < 2 && samples.length >= 2) return "auto";
  return best;
}

/* ── Robust amount parser (bank-agnostic) ────────────────────── */

/**
 * Parse a raw value into a number, handling European/US/mixed formats.
 * Accepts: €, EUR, spaces, NBSP, +/- signs, Italian/US number formats.
 * Returns the numeric value (preserving sign) or null if unparseable.
 */
export function parseRawNumber(raw: any): number | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (!s) return null;

  // Strip currency symbols, EUR text, all whitespace (including NBSP \u00A0)
  let cleaned = s.replace(/[€$£]/g, "").replace(/EUR/gi, "").replace(/[\s\u00A0]/g, "");
  if (!cleaned) return null;

  // Extract sign
  let sign = 1;
  if (cleaned.startsWith("-")) { sign = -1; cleaned = cleaned.slice(1); }
  else if (cleaned.startsWith("+")) { cleaned = cleaned.slice(1); }
  // Handle trailing sign (rare)
  if (cleaned.endsWith("-")) { sign = -1; cleaned = cleaned.slice(0, -1); }

  if (!cleaned) return null;

  // Determine decimal separator by position analysis
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");

  if (lastComma > -1 && lastDot > -1) {
    // Both present: the one appearing LAST is the decimal separator
    if (lastComma > lastDot) {
      // e.g. 1.234,56 → European
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      // e.g. 1,234.56 → US
      cleaned = cleaned.replace(/,/g, "");
    }
  } else if (lastComma > -1) {
    // Only comma: check if it looks like thousands separator (e.g. 1,234) or decimal (e.g. 123,45)
    const afterComma = cleaned.slice(lastComma + 1);
    const beforeComma = cleaned.slice(0, lastComma);
    // Multiple commas = thousands separator (e.g. 1,234,567)
    const commaCount = (cleaned.match(/,/g) || []).length;
    if (commaCount > 1) {
      cleaned = cleaned.replace(/,/g, "");
    } else if (afterComma.length === 3 && beforeComma.length >= 1 && beforeComma.length <= 3 && /^\d+$/.test(afterComma)) {
      // Ambiguous: 1,234 could be 1234 (thousands) or 1.234 (decimal)
      // Default to European (decimal comma) since this is an Italian app
      cleaned = cleaned.replace(",", ".");
    } else {
      // Treat comma as decimal separator (e.g. 123,45 or 0,5)
      cleaned = cleaned.replace(",", ".");
    }
  }
  // If only dot: it's already fine (either decimal or thousands)
  // Check for multiple dots (thousands separator): 1.234.567
  if (lastDot > -1 && lastComma === -1) {
    const dotCount = (cleaned.match(/\./g) || []).length;
    if (dotCount > 1) {
      cleaned = cleaned.replace(/\./g, "");
    }
  }

  const num = Number(cleaned);
  if (isNaN(num) || !isFinite(num)) return null;
  return sign * num;
}

/* ── Transaction derivation ──────────────────────────────────── */

/** Default debit direction values (case-insensitive) */
const DEFAULT_DEBIT_VALUES = ["D", "DEBIT", "DEBITO", "USCITA", "DARE"];
/** Default credit direction values (case-insensitive) */
const DEFAULT_CREDIT_VALUES = ["A", "CREDIT", "CREDITO", "ENTRATA", "AVERE"];

export interface DeriveResult {
  amount: number;
  type: "income" | "expense";
  isValid: true;
}

export interface DeriveError {
  isValid: false;
  reason: string;
}

/**
 * Derive signed amount + type from a raw row based on mapping mode.
 * Returns a deterministic result for one of three modes:
 *   A) Separate columns (debit_col + credit_col)
 *   B) Single amount + sign toggle (negative_is_expense)
 *   C) Single amount + direction column
 */
export function deriveTransaction(
  row: Record<string, string>,
  mapping: CsvMapping
): DeriveResult | DeriveError {
  // ── Mode A: separate debit/credit columns ──
  if (mapping.debit_col && mapping.credit_col) {
    const debitRaw = (row[mapping.debit_col] ?? "").trim();
    const creditRaw = (row[mapping.credit_col] ?? "").trim();
    const debitNum = parseRawNumber(debitRaw);
    const creditNum = parseRawNumber(creditRaw);
    const hasDebit = debitNum !== null && debitNum !== 0;
    const hasCredit = creditNum !== null && creditNum !== 0;

    if (hasDebit && hasCredit) {
      return { isValid: false, reason: `Entrate e Uscite entrambe valorizzate (${debitRaw}, ${creditRaw})` };
    }
    if (!hasDebit && !hasCredit) {
      return { isValid: false, reason: "Importo mancante: entrambe le colonne vuote o zero" };
    }
    if (hasDebit) {
      return { isValid: true, amount: Math.abs(debitNum!), type: "expense" };
    }
    return { isValid: true, amount: Math.abs(creditNum!), type: "income" };
  }

  // ── Mode B & C: single amount column ──
  if (!mapping.amount_col) {
    return { isValid: false, reason: "Nessuna colonna importo configurata" };
  }

  const amountRaw = (row[mapping.amount_col] ?? "").trim();
  const parsedNum = parseRawNumber(amountRaw);
  if (parsedNum === null) {
    return { isValid: false, reason: `Importo non valido (parsing fallito): "${amountRaw}"` };
  }
  if (parsedNum === 0) {
    return { isValid: false, reason: "Importo uguale a zero" };
  }

  // ── Mode C: direction column ──
  if (mapping.direction_col) {
    const dirRaw = (row[mapping.direction_col] ?? "").trim().toUpperCase();
    if (!dirRaw) {
      return { isValid: false, reason: "Direzione/Stato vuoto" };
    }
    const debitVals = (mapping.debit_values && mapping.debit_values.length > 0)
      ? mapping.debit_values.map((v) => v.trim().toUpperCase())
      : DEFAULT_DEBIT_VALUES;
    const creditVals = (mapping.credit_values && mapping.credit_values.length > 0)
      ? mapping.credit_values.map((v) => v.trim().toUpperCase())
      : DEFAULT_CREDIT_VALUES;

    if (debitVals.includes(dirRaw)) {
      return { isValid: true, amount: Math.abs(parsedNum), type: "expense" };
    }
    if (creditVals.includes(dirRaw)) {
      return { isValid: true, amount: Math.abs(parsedNum), type: "income" };
    }
    return { isValid: false, reason: `Direzione non riconosciuta: "${dirRaw}"` };
  }

  // ── Mode B: sign-based ──
  if (mapping.negative_is_expense !== false) {
    return parsedNum < 0
      ? { isValid: true, amount: Math.abs(parsedNum), type: "expense" }
      : { isValid: true, amount: parsedNum, type: "income" };
  }

  // Fallback: treat abs value, positive = income
  return parsedNum < 0
    ? { isValid: true, amount: Math.abs(parsedNum), type: "expense" }
    : { isValid: true, amount: parsedNum, type: "income" };
}

/* ── CSV Parsing ─────────────────────────────────────────────── */

export interface CsvMapping {
  date_col: string;
  desc_col: string;
  amount_col?: string;
  debit_col?: string;
  credit_col?: string;
  negative_is_expense?: boolean;
  direction_col?: string;
  debit_values?: string[];
  credit_values?: string[];
  date_format: string;
  skip_rows?: number;
  delimiter?: string;
}

export interface NormalizedRow {
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  raw: Record<string, string>;
}

export function parseCsvText(text: string, delimiter = ","): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0], delimiter);
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line, delimiter);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h.trim()] = (values[i] ?? "").trim();
    });
    return row;
  });
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/**
 * Normalize rows using deterministic deriveTransaction logic.
 * Debug logging included for first 5 rows.
 */
export function normalizeRows(
  rows: Record<string, string>[],
  mapping: CsvMapping
): { normalized: NormalizedRow[]; errors: { row: number; reason: string }[] } {
  const normalized: NormalizedRow[] = [];
  const errors: { row: number; reason: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // 1) Parse date
    const rawDate = row[mapping.date_col];
    const date = parseDate(rawDate, mapping.date_format);
    if (!date) {
      errors.push({ row: i, reason: `Data non valida: "${rawDate}"` });
      continue;
    }

    // 2) Parse description
    const description = normalizeDescription(row[mapping.desc_col] ?? "");

    // 3) Derive amount + type using unified logic
    const result = deriveTransaction(row, mapping);

    if (!result.isValid) {
      errors.push({ row: i, reason: (result as DeriveError).reason });
      continue;
    }

    if (result.amount <= 0) {
      errors.push({ row: i, reason: `Importo non valido (${result.amount})` });
      continue;
    }

    // Debug logging for first 5 rows
    if (i < 5) {
      const mode = (mapping.debit_col && mapping.credit_col) ? "A:separate"
        : mapping.direction_col ? "C:direction"
        : "B:signed";
      logger.info(`[CSV_IMPORT] row ${i}: mode=${mode} → amount=${result.amount} type=${result.type} date=${date}`);
    }

    normalized.push({
      date,
      description,
      amount: result.amount,
      type: result.type,
      raw: row,
    });
  }

  // Summary log
  const incomeCount = normalized.filter((r) => r.type === "income").length;
  const expenseCount = normalized.filter((r) => r.type === "expense").length;
  logger.info(`[CSV_IMPORT] normalizeRows: ${normalized.length} valid (${incomeCount} income, ${expenseCount} expense), ${errors.length} errors`);

  return { normalized, errors };
}

/* ── Legacy compat exports ───────────────────────────────────── */

export function parseAmount(
  raw: string,
  opts?: { negativeIsExpense?: boolean }
): { amount: number; type: "income" | "expense" } | null {
  const num = parseRawNumber(raw);
  if (num === null || num === 0) return null;

  if (opts?.negativeIsExpense !== false) {
    return num < 0
      ? { amount: Math.abs(num), type: "expense" }
      : { amount: num, type: "income" };
  }
  return { amount: Math.abs(num), type: num >= 0 ? "income" : "expense" };
}

/* ── Import execution ────────────────────────────────────────── */

export interface ImportResult {
  importId: string;
  total: number;
  created: number;
  duplicate: number;
  skipped: number;
  errors: number;
  errorDetails: { row: number; reason: string }[];
}

export async function executeCsvImport(
  workspaceId: string,
  accountId: string,
  fileName: string,
  fileHash: string,
  mapping: CsvMapping,
  rows: NormalizedRow[],
  importTagId: string | null = null
): Promise<ImportResult> {
  logger.info(`[CSV_IMPORT] start | rows=${rows.length} | account=${accountId} | tagId=${importTagId}`);

  const { data: importRec, error: importErr } = await supabase
    .from("csv_imports")
    .insert({
      workspace_id: workspaceId,
      account_id: accountId,
      file_name: fileName,
      file_hash: fileHash,
      mapping: mapping as any,
      period_start: rows.length > 0 ? rows.reduce((min, r) => (r.date < min ? r.date : min), rows[0].date) : null,
      period_end: rows.length > 0 ? rows.reduce((max, r) => (r.date > max ? r.date : max), rows[0].date) : null,
    })
    .select("id")
    .single();

  if (importErr) {
    logger.error("[CSV_IMPORT] failed to create import record:", importErr.message, importErr.code);
    throw new Error(`Errore creazione record import: ${importErr.message}`);
  }

  const importId = importRec.id;
  logger.info(`[CSV_IMPORT] import record created | id=${importId}`);

  let created = 0;
  let duplicate = 0;
  let skipped = 0;
  let importErrors = 0;
  const errorDetails: { row: number; reason: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const dedupKey = await generateDedupKey(workspaceId, accountId, row.date, row.amount, row.description);

      const { data: txData, error: txErr } = await supabase.from("transactions").insert({
        workspace_id: workspaceId,
        account_id: accountId,
        date: row.date,
        description: row.description || null,
        amount: row.amount,
        type: row.type,
        is_fixed: false,
        source: "import",
        import_id: importId,
        dedup_key: dedupKey,
      }).select("id").maybeSingle();

      let status: string;
      let reason: string | null = null;

      if (txErr) {
        if (txErr.code === "23505" || txErr.message?.includes("duplicate") || txErr.message?.includes("uq_transactions_dedup")) {
          status = "duplicate";
          reason = "Fingerprint già presente";
          duplicate++;
        } else {
          status = "error";
          reason = `${txErr.message} (code: ${txErr.code})`;
          importErrors++;
          errorDetails.push({ row: i, reason });
          logger.error(`[CSV_IMPORT] row ${i}: DB error:`, txErr.message, txErr.code);
        }
      } else {
        status = "created";
        created++;

        if (importTagId && txData?.id) {
          await supabase.from("transaction_tags").insert({
            transaction_id: txData.id,
            tag_id: importTagId,
          });
        }
      }

      await supabase.from("csv_import_rows").insert({
        import_id: importId,
        raw: row.raw as any,
        normalized: { date: row.date, description: row.description, amount: row.amount, type: row.type } as any,
        status,
        reason,
      });
    } catch (err: any) {
      importErrors++;
      const reason = err?.message ?? "Unknown error";
      errorDetails.push({ row: i, reason });
      logger.error(`[CSV_IMPORT] row ${i}: unexpected error:`, reason);
      await supabase.from("csv_import_rows").insert({
        import_id: importId,
        raw: row.raw as any,
        normalized: {} as any,
        status: "error",
        reason,
      });
    }
  }

  const importStatus = created > 0 ? "success" : "failed";
  const stats = { total: rows.length, created, duplicate, skipped, errors: importErrors };
  await supabase.from("csv_imports").update({ stats: stats as any, import_status: importStatus } as any).eq("id", importId);

  if (importStatus === "failed") {
    await supabase.from("csv_import_rows").delete().eq("import_id", importId);
    await supabase.from("csv_imports").delete().eq("id", importId);
  }

  logger.info(`[CSV_IMPORT] done | id=${importId} | status=${importStatus} | created=${created} duplicate=${duplicate} skipped=${skipped} errors=${importErrors}`);
  if (errorDetails.length > 0) {
    logger.error(`[CSV_IMPORT] first errors:`, JSON.stringify(errorDetails.slice(0, 5)));
  }
  return { importId, ...stats, errorDetails };
}
