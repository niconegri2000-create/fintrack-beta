import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { useAccountContext } from "@/contexts/AccountContext";
import { useUpdateTransfer } from "@/hooks/useTransfers";
import { TransactionRow } from "@/hooks/useTransactions";
import { toast } from "sonner";
import { capitalizeFirst } from "@/lib/normalize";
import { TagInput } from "@/components/ui/tag-input";
import { useTransactionTags, syncTransactionTags } from "@/hooks/useTags";

interface Props {
  transaction: TransactionRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransferEditDialog({ transaction, open, onOpenChange }: Props) {
  const isOut = transaction.transfer_direction === "out";
  const fromAccId = isOut ? transaction.account_id : (transaction.linked_account_id || "");
  const toAccId = isOut ? (transaction.linked_account_id || "") : transaction.account_id;

  const [date, setDate] = useState<Date>(new Date(transaction.date));
  const [fromAccountId, setFromAccountId] = useState(fromAccId);
  const [toAccountId, setToAccountId] = useState(toAccId);
  const [amount, setAmount] = useState(String(transaction.amount));
  const [description, setDescription] = useState(transaction.description || "");
  const [tagIds, setTagIds] = useState<string[]>([]);

  const { accounts } = useAccountContext();
  const update = useUpdateTransfer();
  const qc = useQueryClient();
  const { data: existingTagIds = [] } = useTransactionTags(open ? transaction.id : null);

  useEffect(() => {
    if (open) {
      setDate(new Date(transaction.date));
      const isO = transaction.transfer_direction === "out";
      setFromAccountId(isO ? transaction.account_id : (transaction.linked_account_id || ""));
      setToAccountId(isO ? (transaction.linked_account_id || "") : transaction.account_id);
      setAmount(String(transaction.amount));
      setDescription(transaction.description || "");
    }
  }, [open, transaction]);

  useEffect(() => {
    if (open && existingTagIds.length >= 0) setTagIds(existingTagIds);
  }, [open, existingTagIds]);

  const handleSubmit = () => {
    const num = parseFloat(amount);
    if (!num || num <= 0) { toast.error("Importo deve essere maggiore di 0"); return; }
    if (!fromAccountId || !toAccountId) { toast.error("Seleziona entrambi i conti"); return; }
    if (fromAccountId === toAccountId) { toast.error("I conti devono essere diversi"); return; }

    update.mutate(
      {
        transfer_id: transaction.transfer_id!,
        date: format(date, "yyyy-MM-dd"),
        from_account_id: fromAccountId,
        to_account_id: toAccountId,
        amount: num,
        description: capitalizeFirst(description),
      },
      {
        onSuccess: async () => {
          try { await syncTransactionTags(transaction.id, tagIds); } catch {}
          qc.invalidateQueries({ queryKey: ["transactions"] });
          qc.invalidateQueries({ queryKey: ["transaction_tags"] });
          qc.invalidateQueries({ queryKey: ["transaction_tags_batch"] });
          toast.success("Trasferimento aggiornato");
          onOpenChange(false);
        },
        onError: () => toast.error("Errore nell'aggiornamento"),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifica trasferimento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Data</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(date, "dd/MM/yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1.5">
            <Label>Da conto</Label>
            <Select value={fromAccountId} onValueChange={setFromAccountId}>
              <SelectTrigger><SelectValue placeholder="Conto origine" /></SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>A conto</Label>
            <Select value={toAccountId} onValueChange={setToAccountId}>
              <SelectTrigger><SelectValue placeholder="Conto destinazione" /></SelectTrigger>
              <SelectContent>
                {accounts.filter((a) => a.id !== fromAccountId).map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Importo (€)</Label>
            <Input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Descrizione</Label>
            <Input placeholder="Descrizione" maxLength={200} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Tag</Label>
            <TagInput selectedTagIds={tagIds} onChange={setTagIds} />
          </div>

          <Button onClick={handleSubmit} disabled={update.isPending} className="w-full">
            {update.isPending ? "Salvataggio…" : "Salva modifiche"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
