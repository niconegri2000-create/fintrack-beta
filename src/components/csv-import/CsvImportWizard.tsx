import { useState, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StepUpload } from "./StepUpload";
import { StepMapping } from "./StepMapping";
import { StepControls } from "./StepControls";
import { StepConfirm } from "./StepConfirm";
import { parseCsvText, normalizeRows, type CsvMapping, type NormalizedRow } from "@/lib/csvImport";
import { useRunCsvImport } from "@/hooks/useCsvImport";
import { toast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Upload } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultAccountId?: string;
}

export type WizardState = {
  accountId: string;
  fileName: string;
  csvText: string;
  rawRows: Record<string, string>[];
  headers: string[];
  mapping: CsvMapping;
  normalized: NormalizedRow[];
  errors: { row: number; reason: string }[];
  autoTag: boolean;
  saveMapping: boolean;
};

const STEP_LABELS = ["Upload", "Mapping", "Controlli", "Conferma"];

export function CsvImportWizard({ open, onOpenChange, defaultAccountId }: Props) {
  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>({
    accountId: defaultAccountId ?? "",
    fileName: "",
    csvText: "",
    rawRows: [],
    headers: [],
    mapping: { date_col: "", desc_col: "", amount_col: "", date_format: "dd/mm/yyyy", delimiter: "," },
    normalized: [],
    errors: [],
    autoTag: true,
    saveMapping: true,
  });

  const importMutation = useRunCsvImport();

  const reset = useCallback(() => {
    setStep(0);
    setState({
      accountId: defaultAccountId ?? "",
      fileName: "",
      csvText: "",
      rawRows: [],
      headers: [],
      mapping: { date_col: "", desc_col: "", amount_col: "", date_format: "dd/mm/yyyy", delimiter: "," },
      normalized: [],
      errors: [],
      autoTag: true,
      saveMapping: true,
    });
  }, [defaultAccountId]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setTimeout(reset, 300);
  }, [onOpenChange, reset]);

  // Re-parse when going from step 1 → 2
  const handleNext = useCallback(() => {
    if (step === 0) {
      // Parse CSV
      const rawRows = parseCsvText(state.csvText, state.mapping.delimiter);
      if (rawRows.length === 0) {
        toast({ title: "Il file CSV è vuoto o non valido", variant: "destructive" });
        return;
      }
      const headers = Object.keys(rawRows[0]);
      // Auto-detect delimiter if , gives 1 col and ; gives more
      if (headers.length <= 1 && state.mapping.delimiter === ",") {
        const semiRows = parseCsvText(state.csvText, ";");
        if (semiRows.length > 0 && Object.keys(semiRows[0]).length > 1) {
          const semiHeaders = Object.keys(semiRows[0]);
          setState((s) => ({
            ...s,
            rawRows: semiRows,
            headers: semiHeaders,
            mapping: { ...s.mapping, delimiter: ";" },
          }));
          setStep(1);
          return;
        }
      }
      setState((s) => ({ ...s, rawRows, headers }));
      setStep(1);
    } else if (step === 1) {
      // Validate mapping
      if (!state.mapping.date_col || !state.mapping.desc_col) {
        toast({ title: "Seleziona almeno Data e Descrizione", variant: "destructive" });
        return;
      }
      if (!state.mapping.amount_col && !(state.mapping.debit_col && state.mapping.credit_col)) {
        toast({ title: "Seleziona Importo oppure Entrate/Uscite", variant: "destructive" });
        return;
      }
      // Normalize
      const { normalized, errors } = normalizeRows(state.rawRows, state.mapping);
      setState((s) => ({ ...s, normalized, errors }));
      setStep(2);
    } else if (step === 2) {
      if (state.normalized.length === 0) {
        toast({ title: "Nessuna riga valida da importare", variant: "destructive" });
        return;
      }
      setStep(3);
    }
  }, [step, state]);

  const handleImport = useCallback(async () => {
    try {
      const result = await importMutation.mutateAsync({
        accountId: state.accountId,
        fileName: state.fileName,
        csvText: state.csvText,
        mapping: state.mapping,
      });
      toast({
        title: "Import completato",
        description: `${result.created} create, ${result.duplicate} duplicate, ${result.errors} errori`,
      });
      handleClose();
    } catch (err: any) {
      if (err.message === "FILE_ALREADY_IMPORTED") {
        toast({ title: "File già importato per questo conto", variant: "destructive" });
      } else if (err.message === "CSV_EMPTY") {
        toast({ title: "Il CSV è vuoto", variant: "destructive" });
      } else if (err.message === "NO_VALID_ROWS") {
        toast({ title: "Nessuna riga valida nel CSV", variant: "destructive" });
      } else {
        toast({ title: "Errore durante l'import", description: err.message, variant: "destructive" });
      }
    }
  }, [importMutation, state, handleClose]);

  const canNext = useMemo(() => {
    if (step === 0) return !!state.csvText && !!state.accountId;
    if (step === 1) return !!state.mapping.date_col && !!state.mapping.desc_col;
    if (step === 2) return state.normalized.length > 0;
    return false;
  }, [step, state]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import CSV Banca
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1 mb-4">
          {STEP_LABELS.map((label, i) => (
            <div key={i} className="flex items-center gap-1 flex-1">
              <div
                className={`flex items-center justify-center h-7 w-7 rounded-full text-xs font-medium shrink-0 ${
                  i === step
                    ? "bg-primary text-primary-foreground"
                    : i < step
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </div>
              <span className={`text-xs hidden sm:inline ${i === step ? "font-medium" : "text-muted-foreground"}`}>
                {label}
              </span>
              {i < STEP_LABELS.length - 1 && <div className="flex-1 h-px bg-border mx-1" />}
            </div>
          ))}
        </div>

        {/* Step content */}
        {step === 0 && <StepUpload state={state} setState={setState} />}
        {step === 1 && <StepMapping state={state} setState={setState} />}
        {step === 2 && <StepControls state={state} />}
        {step === 3 && <StepConfirm state={state} setState={setState} />}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={() => (step === 0 ? handleClose() : setStep(step - 1))}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            {step === 0 ? "Annulla" : "Indietro"}
          </Button>
          {step < 3 ? (
            <Button onClick={handleNext} disabled={!canNext}>
              Avanti
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleImport} disabled={importMutation.isPending}>
              {importMutation.isPending ? "Importando…" : "Importa"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
