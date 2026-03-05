import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, AlertTriangle, XCircle, Copy } from "lucide-react";
import type { WizardState } from "./CsvImportWizard";

interface Props {
  state: WizardState;
}

export function StepControls({ state }: Props) {
  const { normalized, errors, rawRows } = state;
  const total = rawRows.length;
  const valid = normalized.length;
  const skipped = errors.length;
  const countIncome = normalized.filter((r) => r.type === "income").length;
  const countExpense = normalized.filter((r) => r.type === "expense").length;
  const totalIncome = normalized.filter((r) => r.type === "income").reduce((s, r) => s + r.amount, 0);
  const totalExpense = normalized.filter((r) => r.type === "expense").reduce((s, r) => s + r.amount, 0);
  const allSameDirection = valid > 1 && (countIncome === 0 || countExpense === 0);

  // Group errors by reason for quick diagnosis
  const errorGroups = useMemo(() => {
    const groups: Record<string, number> = {};
    for (const e of errors) {
      // Generalize the reason (strip specific values)
      const key = e.reason.replace(/: ".*"$/, "").replace(/\(.*\)$/, "").trim();
      groups[key] = (groups[key] || 0) + 1;
    }
    return Object.entries(groups).sort((a, b) => b[1] - a[1]);
  }, [errors]);

  return (
    <div className="space-y-4">
      {/* Counters */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={<CheckCircle className="h-4 w-4 text-emerald-500" />} label="Valide" value={valid} />
        <StatCard icon={<AlertTriangle className="h-4 w-4 text-amber-500" />} label="Scartate" value={skipped} />
        <StatCard icon={<Copy className="h-4 w-4 text-muted-foreground" />} label="Totali" value={total} />
      </div>

      {valid === 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Nessuna riga valida. Controlla il mapping colonne e il formato data.
        </div>
      )}

      {allSameDirection && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <strong>Attenzione — mapping probabilmente errato:</strong> tutte le {valid} righe risultano{" "}
            {countIncome === 0 ? "Uscite" : "Entrate"}.
            Torna indietro e verifica che il mapping sia corretto (colonne Entrate/Uscite o Direzione/Stato).
          </div>
        </div>
      )}

      {/* Error groups summary */}
      {errorGroups.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-sm font-medium">Motivi scarto:</p>
          <div className="flex flex-wrap gap-1.5">
            {errorGroups.map(([reason, count]) => (
              <Badge key={reason} variant="outline" className="text-xs text-amber-600">
                {reason}: {count}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Error list */}
      {errors.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-sm font-medium flex items-center gap-1.5">
            <XCircle className="h-4 w-4 text-destructive" />
            Righe scartate ({errors.length})
          </p>
          <ScrollArea className="h-[180px] rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-16">Riga</TableHead>
                  <TableHead className="text-xs">Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {errors.slice(0, 100).map((e, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs py-1.5">{e.row + 2}</TableCell>
                    <TableCell className="text-xs py-1.5">{e.reason}</TableCell>
                  </TableRow>
                ))}
                {errors.length > 100 && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-xs text-muted-foreground py-1.5">
                      …e altre {errors.length - 100} righe
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      )}

      {/* Summary by type with totals */}
      {valid > 0 && (
        <div className="flex flex-wrap gap-3">
          <Badge variant="outline" className="text-emerald-600">
            Entrate: {countIncome} (€ {totalIncome.toFixed(2)})
          </Badge>
          <Badge variant="outline" className="text-red-500">
            Uscite: {countExpense} (€ {totalExpense.toFixed(2)})
          </Badge>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card p-3 flex items-center gap-2">
      {icon}
      <div>
        <p className="text-lg font-semibold leading-none">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
