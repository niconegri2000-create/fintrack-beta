import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { TransactionRow } from "@/hooks/useTransactions";
import { capitalizeFirst } from "@/lib/normalize";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { useAccountContext } from "@/contexts/AccountContext";
import { TransactionEditDialog } from "./TransactionEditDialog";
import { TransactionDeleteDialog } from "./TransactionDeleteDialog";

interface Props {
  data: TransactionRow[];
  isLoading: boolean;
}

export function TransactionsTable({ data, isLoading }: Props) {
  const { formatAmount, isPrivacy } = usePrivacy();
  const { accounts, selectedAccountId } = useAccountContext();
  const accountMap = useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, a.name])), [accounts]);
  const [editTx, setEditTx] = useState<TransactionRow | null>(null);
  const [deleteTxId, setDeleteTxId] = useState<string | null>(null);

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
    <>
      <div className="rounded-xl border bg-card overflow-x-auto">
        <Table className="min-w-[700px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Data</TableHead>
              <TableHead>Descrizione</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="w-[90px]">Tipo</TableHead>
              <TableHead className="text-right w-[110px]">Importo</TableHead>
              <TableHead className="w-[70px] text-center">Fisso</TableHead>
              {!selectedAccountId && <TableHead className="w-[110px]">Conto</TableHead>}
              <TableHead className="w-[90px]">Fonte</TableHead>
              <TableHead className="w-[80px] text-center">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((tx) => (
              <TableRow key={tx.id}>
                <TableCell className="font-mono text-xs">{tx.date}</TableCell>
                <TableCell>{capitalizeFirst(tx.description) || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{tx.category?.name || "—"}</TableCell>
                <TableCell>
                  <Badge className={`text-[11px] ${tx.type === "income" ? "bg-success text-success-foreground hover:bg-success/80" : "bg-destructive text-destructive-foreground hover:bg-destructive/80"}`}>
                    {tx.type === "income" ? "Entrata" : "Uscita"}
                  </Badge>
                </TableCell>
                <TableCell className={`text-right font-mono font-medium ${tx.type === "income" ? "text-success" : "text-destructive"}`}>
                  {isPrivacy ? "••••" : `${tx.type === "income" ? "+" : "−"}€${tx.amount.toFixed(2)}`}
                </TableCell>
                <TableCell className="text-center text-xs text-muted-foreground">{tx.is_fixed ? "Sì" : "No"}</TableCell>
                {!selectedAccountId && (
                  <TableCell className="text-xs text-muted-foreground">{tx.account_id ? accountMap[tx.account_id] || "—" : "—"}</TableCell>
                )}
                <TableCell className="text-xs text-muted-foreground capitalize">
                  {tx.source === "manual" ? "Manuale" : tx.source === "recurring_generated" ? "Ricorrente" : tx.source}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditTx(tx)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTxId(tx.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {editTx && (
        <TransactionEditDialog transaction={editTx} open={!!editTx} onOpenChange={(o) => !o && setEditTx(null)} />
      )}
      {deleteTxId && (
        <TransactionDeleteDialog transactionId={deleteTxId} open={!!deleteTxId} onOpenChange={(o) => !o && setDeleteTxId(null)} />
      )}
    </>
  );
}
