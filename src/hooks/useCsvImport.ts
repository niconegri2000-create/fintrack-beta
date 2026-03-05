import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceId } from "@/contexts/WorkspaceContext";
import { logger } from "@/lib/logger";
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

/* ── Templates ───────────────────────────────────────────────── */

export function useCsvImportTemplates(accountId?: string | null) {
  const workspaceId = useWorkspaceId();
  return useQuery({
    queryKey: ["csv_import_templates", workspaceId, accountId],
    queryFn: async () => {
      let q = supabase
        .from("csv_import_templates")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("updated_at", { ascending: false });
      if (accountId) q = q.eq("account_id", accountId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveCsvImportTemplate() {
  const workspaceId = useWorkspaceId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ accountId, name, mapping }: { accountId: string; name: string; mapping: CsvMapping }) => {
      logger.info("[CSV_IMPORT] saving template", { name, accountId });
      // Upsert: if template exists for this account+workspace with same name, update it
      const { data: existing } = await supabase
        .from("csv_import_templates")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("account_id", accountId)
        .eq("name", name)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("csv_import_templates")
          .update({ mapping: mapping as any, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) throw error;
        logger.info("[CSV_IMPORT] template updated", existing.id);
      } else {
        const { error } = await supabase
          .from("csv_import_templates")
          .insert({
            workspace_id: workspaceId,
            account_id: accountId,
            name,
            mapping: mapping as any,
          });
        if (error) throw error;
        logger.info("[CSV_IMPORT] template created");
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["csv_import_templates"] });
    },
  });
}

/* ── Run import mutation ─────────────────────────────────────── */

interface RunImportInput {
  accountId: string;
  fileName: string;
  csvText: string;
  mapping: CsvMapping;
  autoTag: boolean;
  saveMapping: boolean;
}

export function useRunCsvImport() {
  const workspaceId = useWorkspaceId();
  const qc = useQueryClient();
  const saveTemplate = useSaveCsvImportTemplate();

  return useMutation<ImportResult, Error, RunImportInput>({
    mutationFn: async ({ accountId, fileName, csvText, mapping, autoTag, saveMapping }) => {
      // 1) File hash check
      const fileHash = await generateFileHash(csvText);
      logger.info(`[CSV_IMPORT] file hash: ${fileHash.slice(0, 16)}…`);

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
      logger.info(`[CSV_IMPORT] parsed ${rawRows.length} rows → ${normalized.length} valid, ${errors.length} parse errors`);

      if (normalized.length === 0) {
        if (errors.length > 0) {
          throw new Error(`PARSE_ERRORS:${errors.slice(0, 3).map((e) => e.reason).join("; ")}`);
        }
        throw new Error("NO_VALID_ROWS");
      }

      // 3) Ensure #import-csv tag exists if autoTag
      let importTagId: string | null = null;
      if (autoTag) {
        const { data: existingTag } = await supabase
          .from("tags")
          .select("id")
          .eq("workspace_id", workspaceId)
          .eq("name", "import-csv")
          .maybeSingle();

        if (existingTag) {
          importTagId = existingTag.id;
        } else {
          const { data: newTag, error: tagErr } = await supabase
            .from("tags")
            .insert({ workspace_id: workspaceId, name: "import-csv" })
            .select("id")
            .single();
          if (!tagErr && newTag) {
            importTagId = newTag.id;
          }
          logger.info(`[CSV_IMPORT] created tag #import-csv: ${importTagId}`);
        }
      }

      // 4) Execute import
      const result = await executeCsvImport(workspaceId, accountId, fileName, fileHash, mapping, normalized, importTagId);

      // 5) Save template if requested
      if (saveMapping) {
        try {
          await saveTemplate.mutateAsync({
            accountId,
            name: fileName.replace(/\.csv$/i, ""),
            mapping,
          });
        } catch (e) {
          logger.warn("[CSV_IMPORT] failed to save template (non-blocking):", e);
        }
      }

      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["csv_imports"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["tags"] });
    },
  });
}
