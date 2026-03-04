import { format } from "date-fns";
import { ArrowRightLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDateRange } from "@/contexts/DateRangeContext";
import { useAccountContext } from "@/contexts/AccountContext";
import { useTransfersList, useDeleteTransfer } from "@/hooks/useTransfers";
import { TransferFormDialog } from "@/components/transactions/TransferFormDialog";
import { PeriodPicker } from "@/components/dashboard/PeriodPicker";
import { AccountSwitcher } from "@/components/dashboard/AccountSwitcher";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const Trasferimenti = () => {
  const { dateRange } = useDateRange();
  const { selectedAccountId, accounts } = useAccountContext();
  const { data: transfers, isLoading } = useTransfersList(dateRange.from, dateRange.to, selectedAccountId);
  const deleteTransfer = useDeleteTransfer();
  const { formatAmount } = usePrivacy();

  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? "—";

  const handleDelete = (id: string) => {
    deleteTransfer.mutate(id, {
      onSuccess: () => toast.success("Trasferimento eliminato"),
      onError: (err: any) => toast.error(`Errore: ${err?.message ?? "sconosciuto"}`),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Trasferimenti</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Storico dei trasferimenti tra conti
          </p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
          <TransferFormDialog
            trigger={
              <Button size="sm" className="gap-1.5">
                <ArrowRightLeft className="h-4 w-4" />
                Nuovo trasferimento
              </Button>
            }
          />
          <AccountSwitcher />
          <PeriodPicker />
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : !transfers || transfers.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            Nessun trasferimento nel periodo selezionato
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground text-xs uppercase tracking-wide">
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Da → A</th>
                  <th className="px-4 py-3 text-right">Importo</th>
                  <th className="px-4 py-3">Descrizione</th>
                  <th className="px-4 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((tr) => (
                  <tr key={tr.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {format(new Date(tr.date), "dd/MM/yyyy")}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium">{accountName(tr.from_account_id)}</span>
                      <span className="text-muted-foreground mx-1.5">→</span>
                      <span className="font-medium">{accountName(tr.to_account_id)}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium ft-number">
                      {formatAmount(Number(tr.amount))}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground truncate max-w-[200px]">
                      {tr.description || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Elimina trasferimento</AlertDialogTitle>
                            <AlertDialogDescription>
                              Vuoi eliminare questo trasferimento? Verranno rimosse anche le transazioni collegate.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annulla</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(tr.id)}>
                              Elimina
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Trasferimenti;
