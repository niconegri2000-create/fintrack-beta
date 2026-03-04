import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDeleteTransfer } from "@/hooks/useTransfers";
import { toast } from "sonner";

interface Props {
  transferId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransferDeleteDialog({ transferId, open, onOpenChange }: Props) {
  const del = useDeleteTransfer();

  const handleDelete = () => {
    del.mutate(transferId, {
      onSuccess: () => {
        toast.success("Trasferimento eliminato");
        onOpenChange(false);
      },
      onError: () => toast.error("Errore nell'eliminazione"),
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminare trasferimento?</AlertDialogTitle>
          <AlertDialogDescription>
            Verranno eliminate entrambe le righe collegate (uscita e entrata). Questa operazione è irreversibile.
          </AlertDialogDescription>
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
