import * as XLSX from "@e965/xlsx";
import { logger } from "@/lib/logger";

/**
 * Parse an XLS/XLSX file into structured rows (same format as CSV parser output).
 * Uses the first sheet. Handles BPER-style exports with date cells and European numbers.
 */
export async function parseExcelFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("Il file Excel non contiene fogli.");
  const sheet = workbook.Sheets[sheetName];

  // Get raw rows as arrays
  const rawRows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: false,        // get formatted strings so dates come as text
    dateNF: "yyyy-mm-dd",
    defval: "",
  });

  if (rawRows.length < 2) throw new Error("Nessuna riga trovata nel file Excel.");

  // Find the header row: first row where all cells are non-empty strings
  let headerIdx = 0;
  for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
    const row = rawRows[i];
    const nonEmpty = row.filter((c) => String(c ?? "").trim() !== "").length;
    if (nonEmpty >= 2) {
      headerIdx = i;
      break;
    }
  }

  const headerRow = rawRows[headerIdx];
  const headers = headerRow.map((c, i) => {
    const val = String(c ?? "").trim();
    return val || `COL${i + 1}`;
  });

  // Build CSV string with comma separator
  const escape = (v: string) => {
    if (v.includes(",") || v.includes('"') || v.includes("\n")) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };

  const lines = [headers.map(escape).join(",")];

  for (let i = headerIdx + 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    // Skip completely empty rows
    const hasContent = row.some((c) => String(c ?? "").trim() !== "");
    if (!hasContent) continue;

    const values = headers.map((_, ci) => {
      const cell = row[ci];
      const val = String(cell ?? "").trim();
      return escape(val);
    });
    lines.push(values.join(","));
  }

  const totalDataRows = lines.length - 1;
  logger.info(`[STATEMENT_IMPORT] Excel letto correttamente: ${totalDataRows} righe trovate`);

  if (totalDataRows === 0) throw new Error("Nessuna riga trovata nel file Excel.");

  return lines.join("\n");
}
