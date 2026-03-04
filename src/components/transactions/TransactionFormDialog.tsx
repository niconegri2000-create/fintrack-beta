import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCategories } from "@/hooks/useCategories";
import { useCreateTransaction } from "@/hooks/useTransactions";
import { useAccountContext } from "@/contexts/AccountContext";
import { useDateRange } from "@/contexts/DateRangeContext";
import { toast } from "sonner";
import { capitalizeFirst } from "@/lib/normalize";
import { TagInput } from "@/components/ui/tag-input";
import { syncTransactionTags } from "@/hooks/useTags";

export function TransactionFormDialog({ trigger }: { trigger?: React.ReactNode } = {}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date>(new Date());
  const [type, setType] = useState<string>("expense");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [tagIds, setTagIds] = useState<string[]>([]);

  const { data: categories = [] } = useCategories();
  const { selectedAccountId, accounts } = useAccountContext();
  const { dateRange } = useDateRange();
  const defaultAccount = accounts.find((a) => a.is_default) ?? accounts[0];
  const createTx = useCreateTransaction();

  const resolvedDefault = selectedAccountId ?? defaultAccount?.id ?? "";
  const handleOpenChange = (v: boolean) => {
    if (v) setAccountId(resolvedDefault);
    setOpen(v);
  };

  const resetForm = () => {
    setDate(new Date());
    setType("expense");
    setAmount("");
    setAccountId(resolvedDefault);
    setCategoryId("");
    setDescription("");
    setTagIds([]);
  };

  const handleSubmit = () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      toast.error("Inserisci un importo valido maggiore di 0");
      return;
    }
    if (!accountId) {
      toast.error("Seleziona un conto");
      return;
    }

    createTx.mutate(
      {
        date: format(date, "yyyy-MM-dd"),
        type,
        amount: numAmount,
        category_id: categoryId || null,
        description: capitalizeFirst(description),
        is_fixed: false,
        notes: "",
        account_id: accountId,
      },
      {
        onSuccess: async (txId) => {
          if (tagIds.length > 0) {
            try { await syncTransactionTags(txId, tagIds); } catch {}
          }
          const txDate = format(date, "yyyy-MM-dd");
          const isOutOfPeriod = txDate < dateRange.from || txDate > dateRange.to;
          if (isOutOfPeriod) {
            toast.success("Transazione creata. Non la vedi perché il filtro periodo è diverso. Cambia periodo per visualizzarla.", { duration: 5000 });
          } else {
            toast.success("Transazione aggiunta");
          }
          resetForm();
          setOpen(false);
        },
        onError: () => {
          toast.error("Errore nel salvataggio");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Nuova transazione
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuova transazione</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {/* Date */}
          <div className="space-y-1.5">
            <Label>Data</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "dd/MM/yyyy") : "Seleziona data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
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

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Descrizione</Label>
            <Input
              placeholder="Descrizione"
              maxLength={200}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label>Tag</Label>
            <p className="text-xs text-muted-foreground">Aggiungi uno o più tag per classificare la transazione.</p>
            <TagInput selectedTagIds={tagIds} onChange={setTagIds} />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={createTx.isPending}
            className="w-full"
          >
            {createTx.isPending ? "Salvataggio…" : "Salva"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
