import { useState, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StepUpload } from "./StepUpload";
import { StepMapping } from "./StepMapping";
import { StepControls } from "./StepControls";
import { StepConfirm } from "./StepConfirm";
import { parseCsvText, normalizeRows, autoDetectDateFormat, type CsvMapping, type NormalizedRow } from "@/lib/csvImport";
import { parseExcelFile, suggestMapping, rowsToCsvText } from "@/lib/excelParser";
import { useRunCsvImport } from "@/hooks/useCsvImport";
import { toast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, FileDown } from "lucide-react";
import { logger } from "@/lib/logger";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultAccountId?: string;
}

export type WizardState = {
  accountId: string;
  fileName: string;
  fileType: "csv" | "xls" | "xlsx";
  csvText: string;
  rawRows: Record<string, string>[];
  headers: string[];
  mapping: CsvMapping;
  normalized: NormalizedRow[];
  errors: { row: number; reason: string }[];
  autoTag: boolean;
  saveMapping: boolean;
  /** Original file for re-parsing with different sheet */
  file: File | null;
  sheetNames: string[];
  sheetIndex: number;
};

const STEP_LABELS = ["Upload", "Mapping", "Controlli", "Conferma"];

export function CsvImportWizard({ open, onOpenChange, defaultAccountId }: Props) {
  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>(makeInitialState(defaultAccountId));

  const importMutation = useRunCsvImport();

  const reset = useCallback(() => {
    setStep(0);
    setState(makeInitialState(defaultAccountId));
  }, [defaultAccountId]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setTimeout(reset, 300);
  }, [onOpenChange, reset]);

  const handleNext = useCallback(async () => {
    if (step === 0) {
      const isExcel = state.fileType === "xls" || state.fileType === "xlsx";

      let rawRows: Record<string, string>[];
      let headers: string[];
      let csvText = state.csvText;

      if (isExcel && state.file) {
        try {
          const result = await parseExcelFile(state.file, state.sheetIndex);
          rawRows = result.rows;
          headers = result.headers;
          csvText = rowsToCsvText(headers, rawRows);

          // Auto-suggest mapping
          const suggestion = suggestMapping(headers, rawRows);

          // Auto-detect date format from suggested date column
          let detectedFormat = "dd/mm/yyyy";
          if (suggestion.date_col) {
            const samples = rawRows.slice(0, 20).map((r) => r[suggestion.date_col!]).filter(Boolean);
            detectedFormat = autoDetectDateFormat(samples);
          }

          setState((s) => ({
            ...s,
            rawRows,
            headers,
            csvText,
            sheetNames: result.sheetNames,
            mapping: {
              ...s.mapping,
              date_col: suggestion.date_col ?? "",
              desc_col: suggestion.desc_col ?? "",
              amount_col: suggestion.useSeparateColumns ? undefined : (suggestion.amount_col ?? ""),
              debit_col: suggestion.useSeparateColumns ? (suggestion.debit_col ?? "") : undefined,
              credit_col: suggestion.useSeparateColumns ? (suggestion.credit_col ?? "") : undefined,
              date_format: detectedFormat,
              delimiter: ",",
            },
          }));
          setStep(1);
          return;
        } catch (err: any) {
          toast({ title: "Errore lettura file Excel", description: err?.message, variant: "destructive" });
          return;
        }
      }

      // CSV path
      let delimiter = state.mapping.delimiter ?? ",";
      rawRows = parseCsvText(csvText, delimiter);

      // Auto-detect: try ; if , gives 1 column
      if (rawRows.length > 0 && Object.keys(rawRows[0]).length <= 1 && delimiter === ",") {
        const semiRows = parseCsvText(csvText, ";");
        if (semiRows.length > 0 && Object.keys(semiRows[0]).length > 1) {
          rawRows = semiRows;
          delimiter = ";";
        }
      }

      if (rawRows.length === 0) {
        toast({ title: "Il file è vuoto o non valido", variant: "destructive" });
        return;
      }

      headers = Object.keys(rawRows[0]);

      // Auto-detect date format
      let detectedFormat = state.mapping.date_format;
      const firstCol = headers[0];
      if (firstCol) {
        const samples = rawRows.slice(0, 20).map((r) => r[firstCol]).filter(Boolean);
        detectedFormat = autoDetectDateFormat(samples);
      }

      // Auto-suggest mapping for CSV too
      const suggestion = suggestMapping(headers, rawRows);

      logger.info(`[STATEMENT_IMPORT] File parsato: ${rawRows.length} righe, ${headers.length} colonne`);

      setState((s) => ({
        ...s,
        rawRows,
        headers,
        mapping: {
          ...s.mapping,
          delimiter,
          date_format: detectedFormat,
          date_col: suggestion.date_col ?? s.mapping.date_col ?? "",
          desc_col: suggestion.desc_col ?? s.mapping.desc_col ?? "",
          amount_col: suggestion.useSeparateColumns ? undefined : (suggestion.amount_col ?? s.mapping.amount_col ?? ""),
          debit_col: suggestion.useSeparateColumns ? (suggestion.debit_col ?? "") : s.mapping.debit_col,
          credit_col: suggestion.useSeparateColumns ? (suggestion.credit_col ?? "") : s.mapping.credit_col,
        },
      }));
      setStep(1);
    } else if (step === 1) {
      if (!state.mapping.date_col || !state.mapping.desc_col) {
        toast({ title: "Seleziona almeno Data e Descrizione", variant: "destructive" });
        return;
      }
      if (!state.mapping.amount_col && !(state.mapping.debit_col && state.mapping.credit_col)) {
        toast({ title: "Seleziona Importo oppure Entrate/Uscite", variant: "destructive" });
        return;
      }
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
        autoTag: state.autoTag,
        saveMapping: state.saveMapping,
      });

      if (result.created === 0 && result.duplicate > 0) {
        toast({
          title: "Nessuna nuova transazione",
          description: `Tutte le ${result.duplicate} righe risultano già importate (duplicati).`,
          variant: "destructive",
        });
      } else if (result.created === 0) {
        toast({
          title: "Import fallito",
          description: `${result.errors} errori, nessuna transazione creata.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "✅ Import completato",
          description: `${result.created} create · ${result.duplicate} duplicate · ${result.errors} errori`,
        });
      }
      handleClose();
    } catch (err: any) {
      const msg = err.message ?? "";
      if (msg === "FILE_ALREADY_IMPORTED") {
        toast({ title: "File già importato per questo conto", variant: "destructive" });
      } else if (msg === "CSV_EMPTY") {
        toast({ title: "Il file è vuoto", variant: "destructive" });
      } else if (msg === "NO_VALID_ROWS") {
        toast({ title: "Nessuna riga valida", description: "Controlla mapping e formato data.", variant: "destructive" });
      } else if (msg.startsWith("PARSE_ERRORS:")) {
        toast({ title: "Errori di parsing", description: msg.replace("PARSE_ERRORS:", ""), variant: "destructive" });
      } else {
        toast({ title: "Errore durante l'import", description: msg, variant: "destructive" });
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
      <DialogContent className="w-[92vw] max-w-[1100px] max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" />
            Importa estratto conto
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1 px-6 pb-3 shrink-0">
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

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 pb-2">
          {step === 0 && <StepUpload state={state} setState={setState} />}
          {step === 1 && <StepMapping state={state} setState={setState} />}
          {step === 2 && <StepControls state={state} />}
          {step === 3 && <StepConfirm state={state} setState={setState} />}
        </div>

        {/* Navigation — fixed footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t shrink-0">
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
              {importMutation.isPending ? "Importando…" : `Importa ${state.normalized.length} righe`}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function makeInitialState(defaultAccountId?: string): WizardState {
  return {
    accountId: defaultAccountId ?? "",
    fileName: "",
    fileType: "csv",
    csvText: "",
    rawRows: [],
    headers: [],
    mapping: { date_col: "", desc_col: "", amount_col: "", date_format: "dd/mm/yyyy", delimiter: "," },
    normalized: [],
    errors: [],
    autoTag: true,
    saveMapping: true,
    file: null,
    sheetNames: [],
    sheetIndex: 0,
  };
}
