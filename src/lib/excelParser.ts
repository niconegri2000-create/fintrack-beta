import * as XLSX from "xlsx";

/**
 * Parse an XLS/XLSX file into CSV text (comma-separated).
 * Uses the first sheet only.
 */
export async function parseExcelFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("Il file Excel non contiene fogli.");
  const sheet = workbook.Sheets[sheetName];
  // Convert to CSV with comma separator
  const csv = XLSX.utils.sheet_to_csv(sheet, { FS: ",", RS: "\n", dateNF: "yyyy-mm-dd" });
  return csv;
}
