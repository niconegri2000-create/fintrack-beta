import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { MaskedDateInput } from "@/components/ui/masked-date-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCategories } from "@/hooks/useCategories";
import { useUpdateTransaction, TransactionRow } from "@/hooks/useTransactions";
import { useAccountContext } from "@/contexts/AccountContext";
import { toast } from "sonner";
import { capitalizeFirst } from "@/lib/normalize";
import { TagInput } from "@/components/ui/tag-input";
import { useTransactionTags, syncTransactionTags } from "@/hooks/useTags";

interface Props {
  transaction: TransactionRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionEditDialog({ transaction, open, onOpenChange }: Props) {
  const [date, setDate] = useState<Date>(new Date(transaction.date));
  const [type, setType] = useState(transaction.type);
  const [amount, setAmount] = useState(String(transaction.amount));
  const [accountId, setAccountId] = useState(transaction.account_id || "");
  const [categoryId, setCategoryId] = useState(transaction.category?.id || "");
  const [description, setDescription] = useState(transaction.description || "");
  const [tagIds, setTagIds] = useState<string[]>([]);

  const { data: categories = [] } = useCategories();
  const { accounts } = useAccountContext();
  const update = useUpdateTransaction();
  const qc = useQueryClient();
  const { data: existingTagIds = [] } = useTransactionTags(open ? transaction.id : null);

  useEffect(() => {
    if (open) {
      setDate(new Date(transaction.date));
      setType(transaction.type);
      setAmount(String(transaction.amount));
      setAccountId(transaction.account_id || "");
      setCategoryId(transaction.category?.id || "");
      setDescription(transaction.description || "");
    }
  }, [open, transaction]);

  useEffect(() => {
    if (open && existingTagIds.length >= 0) {
      setTagIds(existingTagIds);
    }
  }, [open, existingTagIds]);

  const handleSubmit = () => {
    const num = parseFloat(amount);
    if (!num || num <= 0) {
      toast.error("Importo deve essere maggiore di 0");
      return;
    }
    if (!accountId) {
      toast.error("Seleziona un conto");
      return;
    }

    update.mutate(
      {
        id: transaction.id,
        date: format(date, "yyyy-MM-dd"),
        type,
        amount: num,
        category_id: categoryId || null,
        description: capitalizeFirst(description),
        notes: transaction.notes || "",
        account_id: accountId,
      },
      {
        onSuccess: async () => {
          try { await syncTransactionTags(transaction.id, tagIds); } catch {}
          qc.invalidateQueries({ queryKey: ["transactions"] });
          qc.invalidateQueries({ queryKey: ["transaction_tags"] });
          qc.invalidateQueries({ queryKey: ["transaction_tags_batch"] });
          toast.success("Transazione aggiornata");
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
          <DialogTitle>Modifica transazione</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {/* Date */}
          <div className="space-y-1.5">
            <Label>Data</Label>
            <MaskedDateInput value={date} onChange={setDate} />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input
              placeholder="Nome"
              maxLength={200}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Account */}
          <div className="space-y-1.5">
            <Label>Conto</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona conto" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Entrata</SelectItem>
                <SelectItem value="expense">Uscita</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label>Importo (€)</Label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label>Tag</Label>
            <p className="text-xs text-muted-foreground">Aggiungi uno o più tag per classificare la transazione.</p>
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