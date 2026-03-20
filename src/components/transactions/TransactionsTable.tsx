import { useState, useMemo } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, ArrowRightLeft } from "lucide-react";
import { TransactionRow } from "@/hooks/useTransactions";
import { capitalizeFirst } from "@/lib/normalize";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { useAccountContext } from "@/contexts/AccountContext";
import { TransactionEditDialog } from "./TransactionEditDialog";
import { TransactionDeleteDialog } from "./TransactionDeleteDialog";
import { TransferEditDialog } from "./TransferEditDialog";
import { TransferDeleteDialog } from "./TransferDeleteDialog";
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
  const [editTransfer, setEditTransfer] = useState<TransactionRow | null>(null);
  const [deleteTransferId, setDeleteTransferId] = useState<string | null>(null);


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
        Nessuna transazione trovata
      </div>
    );
  }

  const isTransfer = (tx: TransactionRow) => tx.type === "transfer_in" || tx.type === "transfer_out";

  const getTransferLabel = (tx: TransactionRow) => {
    const fromName = tx.transfer_direction === "out" ? accountMap[tx.account_id] : accountMap[tx.linked_account_id || ""];
    const toName = tx.transfer_direction === "in" ? accountMap[tx.account_id] : accountMap[tx.linked_account_id || ""];
    return `Da ${fromName || "?"} → A ${toName || "?"}`;
  };

  const handleEdit = (tx: TransactionRow) => {
    if (isTransfer(tx)) setEditTransfer(tx);
    else setEditTx(tx);
  };

  const handleDelete = (tx: TransactionRow) => {
    if (isTransfer(tx) && tx.transfer_id) setDeleteTransferId(tx.transfer_id);
    else setDeleteTxId(tx.id);
  };

  return (
    <>
      <div className="rounded-xl border bg-card overflow-x-auto">
        <Table className="min-w-[700px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Data</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Tag</TableHead>
              <TableHead className="w-[90px]">Tipo</TableHead>
              <TableHead className="text-right w-[110px]">Importo</TableHead>
              <TableHead className="w-[70px] text-center">Fisso</TableHead>
              {!selectedAccountId && <TableHead className="w-[110px]">Conto</TableHead>}
              <TableHead className="w-[90px]">Fonte</TableHead>
              <TableHead className="w-[80px] text-center">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((tx) => {
              const txTags = tagsMap[tx.id] || [];
              return (
                <TableRow key={tx.id}>
                  <TableCell className="text-xs">{tx.date}</TableCell>
                  <TableCell>
                    {isTransfer(tx) ? (
                      <div className="flex flex-col gap-0.5">
                        <span>{capitalizeFirst(tx.description) || "Trasferimento"}</span>
                        <span className="text-xs text-muted-foreground">{getTransferLabel(tx)}</span>
                      </div>
                    ) : (
                      capitalizeFirst(tx.description) || "—"
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {isTransfer(tx) ? "—" : (tx.category?.name || "—")}
                  </TableCell>
                  <TableCell>
                    {txTags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {txTags.map((tag) => (
                          <Badge key={tag.id} variant="outline" className="text-[10px] px-1.5 py-0">
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {isTransfer(tx) ? (
                      <Badge className="text-[11px] bg-primary/20 text-primary border-primary/30 hover:bg-primary/30">
                        <ArrowRightLeft className="h-3 w-3 mr-1" />
                        Trasf.
                      </Badge>
                    ) : (
                      <Badge className={`text-[11px] ${tx.type === "income" ? "bg-success text-success-foreground hover:bg-success/80" : "bg-destructive text-destructive-foreground hover:bg-destructive/80"}`}>
                        {tx.type === "income" ? "Entrata" : "Uscita"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className={`text-right ft-number font-medium ${isTransfer(tx) ? "text-primary" : tx.type === "income" ? "text-success" : "text-destructive"}`}>
                    {isPrivacy ? "••••" : isTransfer(tx)
                      ? `${tx.transfer_direction === "out" ? "−" : "+"}€${tx.amount.toFixed(2)}`
                      : `${tx.type === "income" ? "+" : "−"}€${tx.amount.toFixed(2)}`}
                  </TableCell>
                  <TableCell className="text-center text-xs text-muted-foreground">{tx.is_fixed ? "Sì" : "No"}</TableCell>
                  {!selectedAccountId && (
                    <TableCell className="text-xs text-muted-foreground">{tx.account_id ? accountMap[tx.account_id] || "—" : "—"}</TableCell>
                  )}
                  <TableCell className="text-xs text-muted-foreground capitalize">
                    {isTransfer(tx) ? "Trasferimento" : tx.source === "manual" ? "Manuale" : tx.source === "recurring_generated" ? "Ricorrente" : tx.source}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(tx)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(tx)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {editTx && (
        <TransactionEditDialog transaction={editTx} open={!!editTx} onOpenChange={(o) => !o && setEditTx(null)} />
      )}
      {deleteTxId && (
        <TransactionDeleteDialog transactionId={deleteTxId} open={!!deleteTxId} onOpenChange={(o) => !o && setDeleteTxId(null)} />
      )}
      {editTransfer && (
        <TransferEditDialog transaction={editTransfer} open={!!editTransfer} onOpenChange={(o) => !o && setEditTransfer(null)} />
      )}
      {deleteTransferId && (
        <TransferDeleteDialog transferId={deleteTransferId} open={!!deleteTransferId} onOpenChange={(o) => !o && setDeleteTransferId(null)} />
      )}
    </>
  );
}
