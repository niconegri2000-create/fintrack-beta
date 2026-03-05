import { useCallback, useRef } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAccounts } from "@/hooks/useAccounts";
import { useCsvImportTemplates } from "@/hooks/useCsvImport";
import { Upload, FileText, History, Info } from "lucide-react";
import type { WizardState } from "./CsvImportWizard";
import type { CsvMapping } from "@/lib/csvImport";
import { toast } from "@/hooks/use-toast";

interface Props {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
}

function getFileType(name: string): "csv" | "xls" | "xlsx" | null {
  const lower = name.toLowerCase();
  if (lower.endsWith(".xlsx")) return "xlsx";
  if (lower.endsWith(".xls")) return "xls";
  if (lower.endsWith(".csv")) return "csv";
  return null;
}

export function StepUpload({ state, setState }: Props) {
  const { data: accounts = [] } = useAccounts();
  const { data: templates = [] } = useCsvImportTemplates(state.accountId || undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      const fileType = getFileType(file.name);
      if (!fileType) {
        toast({ title: "Formato non supportato. Usa CSV o Excel (XLS/XLSX).", variant: "destructive" });
        return;
      }

      if (fileType === "csv") {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          setState((s) => ({ ...s, csvText: text, fileName: file.name, fileType: "csv", file }));
        };
        reader.readAsText(file);
      } else {
        // Store file for later parsing in handleNext (keeps raw File for sheet selection)
        setState((s) => ({
          ...s,
          csvText: "__excel_pending__",
          fileName: file.name,
          fileType,
          file,
          mapping: { ...s.mapping, delimiter: "," },
        }));
      }
    },
    [setState]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const applyTemplate = useCallback(
    (templateId: string) => {
      const tpl = templates.find((t) => t.id === templateId);
      if (!tpl) return;
      const mapping = tpl.mapping as unknown as CsvMapping;
      setState((s) => ({ ...s, mapping: { ...s.mapping, ...mapping } }));
    },
    [templates, setState]
  );

  const isCsv = state.fileType === "csv";
  const hasFile = !!state.csvText;

  return (
    <div className="space-y-4">
      {/* Account selector */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Conto destinazione</label>
        <Select value={state.accountId} onValueChange={(v) => setState((s) => ({ ...s, accountId: v }))}>
          <SelectTrigger>
            <SelectValue placeholder="Seleziona conto" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Template selector */}
      {templates.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium flex items-center gap-1.5">
            <History className="h-3.5 w-3.5" />
            Modello mapping salvato
          </label>
          <Select onValueChange={applyTemplate}>
            <SelectTrigger>
              <SelectValue placeholder="Seleziona un modello (opzionale)" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Precompila il mapping con un modello precedente</p>
        </div>
      )}

      {/* Sheet selector for multi-sheet Excel */}
      {state.sheetNames.length > 1 && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Foglio Excel</label>
          <Select
            value={String(state.sheetIndex)}
            onValueChange={(v) => setState((s) => ({ ...s, sheetIndex: parseInt(v, 10) }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {state.sheetNames.map((name, i) => (
                <SelectItem key={i} value={String(i)}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* File drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/30 ${
          hasFile ? "border-primary/40 bg-primary/5" : "border-border"
        }`}
      >
        {hasFile ? (
          <div className="flex flex-col items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            <p className="text-sm font-medium">{state.fileName}</p>
            {isCsv && (
              <p className="text-xs text-muted-foreground">
                {state.csvText.split("\n").filter((l) => l.trim()).length - 1} righe rilevate
              </p>
            )}
            {!isCsv && (
              <p className="text-xs text-muted-foreground">File Excel — verrà analizzato al prossimo step</p>
            )}
            <p className="text-xs text-primary cursor-pointer hover:underline">Clicca per cambiare file</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">Trascina un file CSV o Excel qui</p>
            <p className="text-xs text-muted-foreground">CSV / XLS / XLSX — oppure clicca per selezionare</p>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xls,.xlsx"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>

      {/* Delimiter selector — CSV only */}
      {isCsv && hasFile && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Separatore colonne</label>
          <Select
            value={state.mapping.delimiter ?? ","}
            onValueChange={(v) => setState((s) => ({ ...s, mapping: { ...s.mapping, delimiter: v } }))}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value=",">Virgola (,)</SelectItem>
              <SelectItem value=";">Punto e virgola (;)</SelectItem>
              <SelectItem value={"\t"}>Tab</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Excel detected info */}
      {hasFile && !isCsv && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
          <Info className="h-3.5 w-3.5 shrink-0" />
          File Excel rilevato: la tabella movimenti verrà individuata automaticamente.
        </div>
      )}

      {/* BPER hint */}
      <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1">
        <p className="text-xs font-medium flex items-center gap-1.5">
          <Info className="h-3.5 w-3.5 text-primary" />
          BPER: come scaricare il file
        </p>
        <p className="text-xs text-muted-foreground">
          Da Home Banking: Conti → scorri in fondo → Scarica → XLS. Poi carica qui il file.
        </p>
      </div>

      <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
        💡 Il file resta locale: verrà parsato nel browser e salvate solo le transazioni nel tuo conto.
      </p>
    </div>
  );
}
