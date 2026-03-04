import { useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { WizardState } from "./CsvImportWizard";

interface Props {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
}

export function StepConfirm({ state, setState }: Props) {
  const { normalized } = state;
  const preview = useMemo(() => normalized.slice(0, 50), [normalized]);

  const totalIncome = useMemo(
    () => normalized.filter((r) => r.type === "income").reduce((s, r) => s + r.amount, 0),
    [normalized]
  );
  const totalExpense = useMemo(
    () => normalized.filter((r) => r.type === "expense").reduce((s, r) => s + r.amount, 0),
    [normalized]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 text-sm">
        <span>
          <strong>{normalized.length}</strong> transazioni da importare
        </span>
        <Badge variant="outline" className="text-emerald-600">
          + € {totalIncome.toFixed(2)}
        </Badge>
        <Badge variant="outline" className="text-red-500">
          - € {totalExpense.toFixed(2)}
        </Badge>
      </div>

      {/* Preview table */}
      <ScrollArea className="h-[250px] rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Data</TableHead>
              <TableHead className="text-xs">Descrizione</TableHead>
              <TableHead className="text-xs text-right">Importo</TableHead>
              <TableHead className="text-xs">Tipo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {preview.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="text-xs py-1.5 whitespace-nowrap">{r.date}</TableCell>
                <TableCell className="text-xs py-1.5 max-w-[200px] truncate">{r.description || "—"}</TableCell>
                <TableCell className="text-xs py-1.5 text-right font-mono">€ {r.amount.toFixed(2)}</TableCell>
                <TableCell className="text-xs py-1.5">
                  <Badge variant="outline" className={r.type === "income" ? "text-emerald-600" : "text-red-500"}>
                    {r.type === "income" ? "Entrata" : "Uscita"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
      {normalized.length > 50 && (
        <p className="text-xs text-muted-foreground">Mostrate 50 di {normalized.length} righe</p>
      )}

      {/* Options */}
      <div className="space-y-3 pt-2">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox
            checked={state.autoTag}
            onCheckedChange={(c) => setState((s) => ({ ...s, autoTag: !!c }))}
          />
          Applica tag automatico <Badge variant="secondary" className="text-xs">#import-csv</Badge>
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox
            checked={state.saveMapping}
            onCheckedChange={(c) => setState((s) => ({ ...s, saveMapping: !!c }))}
          />
          Salva mapping come modello per questo conto
        </label>
      </div>
    </div>
  );
}
