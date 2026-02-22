import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RecurringRow } from "@/hooks/useRecurringRules";
import { capitalizeFirst } from "@/lib/normalize";

interface Props {
  data: RecurringRow[];
  isLoading: boolean;
}

export function RecurringTable({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground text-sm">
        Caricamento…
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground text-sm">
        Nessuna ricorrenza configurata
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead className="w-[90px]">Tipo</TableHead>
            <TableHead className="text-right w-[110px]">Importo</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead className="w-[80px] text-center">Giorno</TableHead>
            <TableHead className="w-[120px]">Frequenza</TableHead>
            <TableHead className="w-[100px]">Fine</TableHead>
            <TableHead className="w-[80px] text-center">Attiva</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">{capitalizeFirst(r.name) || "—"}</TableCell>
              <TableCell>
                <Badge variant={r.type === "income" ? "default" : "destructive"} className="text-[11px]">
                  {r.type === "income" ? "Entrata" : "Uscita"}
                </Badge>
              </TableCell>
              <TableCell className={`text-right font-mono font-medium ${r.type === "income" ? "text-success" : "text-destructive"}`}>
                €{r.amount.toFixed(2)}
              </TableCell>
              <TableCell className="text-muted-foreground">{r.category?.name || "—"}</TableCell>
              <TableCell className="text-center font-mono">{r.day_of_month ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {(r.interval_months ?? 1) === 1 ? "Mensile" : `Ogni ${r.interval_months} mesi`}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {r.end_date
                  ? new Date(r.end_date).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" })
                  : "—"}
              </TableCell>
              <TableCell className="text-center">
                <span className={`inline-block h-2 w-2 rounded-full ${r.is_active ? "bg-success" : "bg-muted-foreground"}`} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
