import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDeleteTransaction } from "@/hooks/useTransactions";
import { toast } from "sonner";

interface Props {
  transactionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionDeleteDialog({ transactionId, open, onOpenChange }: Props) {
  const del = useDeleteTransaction();

  const handleDelete = () => {
    del.mutate(transactionId, {
      onSuccess: () => {
        toast.success("Transazione eliminata");
        onOpenChange(false);
      },
      onError: () => toast.error("Errore nell'eliminazione"),
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminare transazione?</AlertDialogTitle>
          <AlertDialogDescription>Questa operazione è irreversibile.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annulla</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={del.isPending}>
            {del.isPending ? "Eliminazione…" : "Elimina"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
