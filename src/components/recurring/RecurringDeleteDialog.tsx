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
import { useDeleteRecurring } from "@/hooks/useRecurringRules";
import { toast } from "sonner";

interface Props {
  ruleId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RecurringDeleteDialog({ ruleId, open, onOpenChange }: Props) {
  const del = useDeleteRecurring();

  const handleDelete = () => {
    del.mutate(ruleId, {
      onSuccess: () => {
        toast.success("Ricorrenza eliminata");
        onOpenChange(false);
      },
      onError: () => toast.error("Errore nell'eliminazione"),
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminare ricorrenza?</AlertDialogTitle>
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
