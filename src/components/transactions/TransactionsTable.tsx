import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TransactionRow } from "@/hooks/useTransactions";
import { capitalizeFirst } from "@/lib/normalize";

interface Props {
  data: TransactionRow[];
  isLoading: boolean;
}

export function TransactionsTable({ data, isLoading }: Props) {
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
        Nessuna transazione in questo mese
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Data</TableHead>
            <TableHead>Descrizione</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead className="w-[90px]">Tipo</TableHead>
            <TableHead className="text-right w-[110px]">Importo</TableHead>
            <TableHead className="w-[70px] text-center">Fisso</TableHead>
            <TableHead className="w-[90px]">Fonte</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((tx) => (
            <TableRow key={tx.id}>
              <TableCell className="font-mono text-xs">
                {tx.date}
              </TableCell>
              <TableCell>{capitalizeFirst(tx.description) || "—"}</TableCell>
              <TableCell className="text-muted-foreground">
                {tx.category?.name || "—"}
              </TableCell>
              <TableCell>
                <Badge
                  className={`text-[11px] ${
                    tx.type === "income"
                      ? "bg-success text-success-foreground hover:bg-success/80"
                      : "bg-destructive text-destructive-foreground hover:bg-destructive/80"
                  }`}
                >
                  {tx.type === "income" ? "Entrata" : "Uscita"}
                </Badge>
              </TableCell>
              <TableCell
                className={`text-right font-mono font-medium ${
                  tx.type === "income" ? "text-success" : "text-destructive"
                }`}
              >
                {tx.type === "income" ? "+" : "−"}€{tx.amount.toFixed(2)}
              </TableCell>
              <TableCell className="text-center text-xs text-muted-foreground">
                {tx.is_fixed ? "Sì" : "No"}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground capitalize">
                {tx.source === "manual"
                  ? "Manuale"
                  : tx.source === "recurring_generated"
                  ? "Ricorrente"
                  : tx.source}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
