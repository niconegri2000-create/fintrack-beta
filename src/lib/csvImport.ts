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
  // Excel serial: days since 1899-12-30
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

export function parseDate(raw: string, format: string): string | null {
  if (!raw) return null;
  const s = raw.trim();

  // "Auto" mode: try all formats
  if (format === "auto") {
    // 1. Italian text date
    const it = parseItalianTextDate(s);
    if (it) return it;
    // 2. Numeric formats
    for (const fmt of ["dd/mm/yyyy", "yyyy-mm-dd", "dd-mm-yyyy", "dd.mm.yyyy"]) {
      const r = parseNumericDate(s, fmt);
      if (r) return r;
    }
    // 3. Excel serial
    const serial = parseExcelSerialDate(s);
    if (serial) return serial;
    return null;
  }

  // Explicit "d MMMM yyyy" Italian text format
  if (format === "d-mmmm-yyyy-it") {
    return parseItalianTextDate(s);
  }

  // Numeric format
  return parseNumericDate(s, format);
}

/**
 * Auto-detect date format from a sample of values.
 */
export function autoDetectDateFormat(samples: string[]): string {
  // Check Italian text dates first
  const italianCount = samples.filter((s) => parseItalianTextDate(s.trim()) !== null).length;
  if (italianCount >= 2) return "auto";

  const formats = ["dd/mm/yyyy", "yyyy-mm-dd", "dd-mm-yyyy", "dd.mm.yyyy", "mm/dd/yyyy"];
  let best = "dd/mm/yyyy";
  let bestCount = 0;
  for (const fmt of formats) {
    const count = samples.filter((s) => parseNumericDate(s.trim(), fmt) !== null).length;
    if (count > bestCount) {
      bestCount = count;
      best = fmt;
    }
  }
  // If nothing matches well, default to auto
  if (bestCount < 2 && samples.length >= 2) return "auto";
  return best;
}

export function parseAmount(
  raw: string,
  opts?: { negativeIsExpense?: boolean }
): { amount: number; type: "income" | "expense" } | null {
  if (!raw) return null;

  // Clean currency symbols and whitespace
  let cleaned = raw.replace(/[€$£\s]/g, "");

  // Detect European number format: dots as thousands, comma as decimal
  // e.g. "1.234,56" or "-1.234,56"
  if (/\d{1,3}(\.\d{3})*(,\d+)?$/.test(cleaned) && cleaned.includes(",")) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (/\d+,\d{2}$/.test(cleaned) && !cleaned.includes(".")) {
    // Simple comma decimal: "1234,56"
    cleaned = cleaned.replace(",", ".");
  }
  // Otherwise assume dots are decimals (US/UK format)

  const num = parseFloat(cleaned);
  if (isNaN(num) || num === 0) return null;

  if (opts?.negativeIsExpense !== false) {
    return num < 0
      ? { amount: Math.abs(num), type: "expense" }
      : { amount: num, type: "income" };
  }
  return { amount: Math.abs(num), type: num >= 0 ? "income" : "expense" };
}

/* ── CSV Parsing ─────────────────────────────────────────────── */

export interface CsvMapping {
  date_col: string;
  desc_col: string;
  amount_col?: string;
  debit_col?: string;
  credit_col?: string;
  negative_is_expense?: boolean;
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

export function normalizeRows(
  rows: Record<string, string>[],
  mapping: CsvMapping
): { normalized: NormalizedRow[]; errors: { row: number; reason: string }[] } {
  const normalized: NormalizedRow[] = [];
  const errors: { row: number; reason: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rawDate = row[mapping.date_col];
    const date = parseDate(rawDate, mapping.date_format);
    if (!date) {
      errors.push({ row: i, reason: `Data non valida: "${rawDate}"` });
      continue;
    }

    const description = normalizeDescription(row[mapping.desc_col] ?? "");

    let amountResult: { amount: number; type: "income" | "expense" } | null = null;

    if (mapping.debit_col && mapping.credit_col) {
      const debitRaw = row[mapping.debit_col];
      const creditRaw = row[mapping.credit_col];
      const debit = parseAmount(debitRaw);
      const credit = parseAmount(creditRaw);
      if (debit && debit.amount > 0) {
        amountResult = { amount: debit.amount, type: "expense" };
      } else if (credit && credit.amount > 0) {
        amountResult = { amount: credit.amount, type: "income" };
      }
    } else if (mapping.amount_col) {
      amountResult = parseAmount(row[mapping.amount_col], {
        negativeIsExpense: mapping.negative_is_expense ?? true,
      });
    }

    if (!amountResult || amountResult.amount <= 0) {
      errors.push({ row: i, reason: `Importo non valido: "${row[mapping.amount_col ?? ""] ?? ""}"` });
      continue;
    }

    normalized.push({
      date,
      description,
      amount: amountResult.amount,
      type: amountResult.type,
      raw: row,
    });
  }

  return { normalized, errors };
}

/* ── Import execution ────────────────────────────────────────── */

export interface ImportResult {
  importId: string;
  total: number;
  created: number;
  duplicate: number;
  skipped: number;
  errors: number;
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

  // 1) Create import record
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
  let errors = 0;

  // 2) Process each row
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const dedupKey = await generateDedupKey(workspaceId, accountId, row.date, row.amount, row.description);

      // Insert transaction
      const { data: txData, error: txErr } = await supabase.from("transactions").insert({
        workspace_id: workspaceId,
        account_id: accountId,
        date: row.date,
        description: row.description || null,
        amount: row.amount,
        type: row.type,
        is_fixed: false,
        source: "csv_import",
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
          logger.info(`[CSV_IMPORT] row ${i}: duplicate (dedup_key collision)`);
        } else {
          status = "error";
          reason = `${txErr.message} (code: ${txErr.code})`;
          errors++;
          logger.error(`[CSV_IMPORT] row ${i}: error:`, txErr.message, txErr.code);
        }
      } else {
        status = "created";
        created++;

        // Tag the transaction if autoTag and we have a tag ID
        if (importTagId && txData?.id) {
          await supabase.from("transaction_tags").insert({
            transaction_id: txData.id,
            tag_id: importTagId,
          });
        }
      }

      // Audit row
      await supabase.from("csv_import_rows").insert({
        import_id: importId,
        raw: row.raw as any,
        normalized: { date: row.date, description: row.description, amount: row.amount, type: row.type } as any,
        status,
        reason,
      });
    } catch (err: any) {
      errors++;
      logger.error(`[CSV_IMPORT] row ${i}: unexpected error:`, err?.message);
      await supabase.from("csv_import_rows").insert({
        import_id: importId,
        raw: row.raw as any,
        normalized: {} as any,
        status: "error",
        reason: err?.message ?? "Unknown error",
      });
    }
  }

  // 3) Update stats
  const stats = { total: rows.length, created, duplicate, skipped, errors };
  await supabase.from("csv_imports").update({ stats: stats as any }).eq("id", importId);

  logger.info(`[CSV_IMPORT] done | id=${importId} | created=${created} duplicate=${duplicate} skipped=${skipped} errors=${errors}`);
  return { importId, ...stats };
}
