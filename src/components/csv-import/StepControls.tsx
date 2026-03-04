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

      {/* Summary by type */}
      {valid > 0 && (
        <div className="flex gap-3">
          <Badge variant="outline" className="text-emerald-600">
            Entrate: {normalized.filter((r) => r.type === "income").length}
          </Badge>
          <Badge variant="outline" className="text-red-500">
            Uscite: {normalized.filter((r) => r.type === "expense").length}
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
