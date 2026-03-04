import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceId } from "@/contexts/WorkspaceContext";
import {
  parseCsvText,
  normalizeRows,
  generateFileHash,
  executeCsvImport,
  type CsvMapping,
  type ImportResult,
} from "@/lib/csvImport";

/* ── List past imports ───────────────────────────────────────── */

export function useCsvImports(accountId?: string | null) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: ["csv_imports", workspaceId, accountId],
    queryFn: async () => {
      let q = supabase
        .from("csv_imports")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (accountId) q = q.eq("account_id", accountId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

/* ── Run import mutation ─────────────────────────────────────── */

interface RunImportInput {
  accountId: string;
  fileName: string;
  csvText: string;
  mapping: CsvMapping;
}

export function useRunCsvImport() {
  const workspaceId = useWorkspaceId();
  const qc = useQueryClient();

  return useMutation<ImportResult, Error, RunImportInput>({
    mutationFn: async ({ accountId, fileName, csvText, mapping }) => {
      // 1) File hash check
      const fileHash = await generateFileHash(csvText);

      // Check if already imported
      const { data: existing } = await supabase
        .from("csv_imports")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("account_id", accountId)
        .eq("file_hash", fileHash)
        .maybeSingle();

      if (existing) {
        throw new Error("FILE_ALREADY_IMPORTED");
      }

      // 2) Parse & normalize
      const rawRows = parseCsvText(csvText, mapping.delimiter);
      if (rawRows.length === 0) {
        throw new Error("CSV_EMPTY");
      }

      const { normalized, errors } = normalizeRows(rawRows, mapping);
      console.info(`[CSV_IMPORT] parsed ${rawRows.length} rows → ${normalized.length} valid, ${errors.length} errors`);

      if (normalized.length === 0) {
        throw new Error("NO_VALID_ROWS");
      }

      // 3) Execute
      return executeCsvImport(workspaceId, accountId, fileName, fileHash, mapping, normalized);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["csv_imports"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
