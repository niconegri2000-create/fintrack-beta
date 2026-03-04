import { useCallback, useRef } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAccounts } from "@/hooks/useAccounts";
import { Upload, FileText } from "lucide-react";
import type { WizardState } from "./CsvImportWizard";

interface Props {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
}

export function StepUpload({ state, setState }: Props) {
  const { data: accounts = [] } = useAccounts();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.toLowerCase().endsWith(".csv")) {
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setState((s) => ({ ...s, csvText: text, fileName: file.name }));
      };
      reader.readAsText(file);
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

      {/* File drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/30 ${
          state.csvText ? "border-primary/40 bg-primary/5" : "border-border"
        }`}
      >
        {state.csvText ? (
          <div className="flex flex-col items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            <p className="text-sm font-medium">{state.fileName}</p>
            <p className="text-xs text-muted-foreground">
              {state.csvText.split("\n").length - 1} righe rilevate
            </p>
            <p className="text-xs text-primary cursor-pointer hover:underline">Clicca per cambiare file</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">Trascina un file CSV qui</p>
            <p className="text-xs text-muted-foreground">oppure clicca per selezionare</p>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>

      {/* Delimiter selector */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Separatore colonne</label>
        <Select
          value={state.mapping.delimiter ?? ","}
          onValueChange={(v) => setState((s) => ({ ...s, mapping: { ...s.mapping, delimiter: v } }))}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value=",">Virgola (,)</SelectItem>
            <SelectItem value=";">Punto e virgola (;)</SelectItem>
            <SelectItem value="\t">Tab</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
        💡 Il file resta locale: verrà parsato nel browser e salvate solo le transazioni nel tuo conto.
      </p>
    </div>
  );
}
