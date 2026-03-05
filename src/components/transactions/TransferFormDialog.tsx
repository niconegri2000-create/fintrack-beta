import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, ArrowRightLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { useAccountContext } from "@/contexts/AccountContext";
import { useCreateTransfer } from "@/hooks/useTransfers";
import { toast } from "sonner";
import { capitalizeFirst } from "@/lib/normalize";
import { TagInput } from "@/components/ui/tag-input";
import { syncTransactionTags } from "@/hooks/useTags";

export function TransferFormDialog({ trigger }: { trigger?: React.ReactNode } = {}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date>(new Date());
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [tagIds, setTagIds] = useState<string[]>([]);

  const { accounts } = useAccountContext();
  const createTransfer = useCreateTransfer();

  const handleOpenChange = (v: boolean) => {
    if (v) {
      setFromAccountId("");
      setToAccountId("");
    }
    setOpen(v);
  };

  const resetForm = () => {
    setDate(new Date());
    setFromAccountId("");
    setToAccountId("");
    setAmount("");
    setDescription("");
    setTagIds([]);
  };

  const handleSubmit = () => {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      toast.error("Inserisci un importo valido maggiore di 0");
      return;
    }
    if (!fromAccountId || !toAccountId) {
      toast.error("Seleziona entrambi i conti");
      return;
    }
    if (fromAccountId === toAccountId) {
      toast.error("I conti di origine e destinazione devono essere diversi");
      return;
    }

    createTransfer.mutate(
      {
        date: format(date, "yyyy-MM-dd"),
        from_account_id: fromAccountId,
        to_account_id: toAccountId,
        amount: numAmount,
        description: capitalizeFirst(description),
      },
      {
        onSuccess: async ({ outId, inId, transferId }) => {
          if (tagIds.length > 0) {
            try {
              await syncTransactionTags(outId, tagIds);
              await syncTransactionTags(inId, tagIds);
            } catch (e) {
              if (import.meta.env.DEV) console.warn("[TRANSFER] Tag sync failed:", e);
            }
          }
          toast.success("Trasferimento creato");
          resetForm();
          setOpen(false);
        },
        onError: (err: any) => {
          const msg = err?.message || "Errore sconosciuto";
          const code = err?.code;
          if (import.meta.env.DEV) console.error("[TRANSFER] Save error:", { message: msg, code, details: err?.details, hint: err?.hint });
          toast.error(`Errore nel salvataggio: ${msg}`, {
            description: code ? `Codice: ${code}` : undefined,
          });
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" className="gap-1.5">
            <ArrowRightLeft className="h-4 w-4" />
            Nuovo trasferimento
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuovo trasferimento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {/* Date */}
          <div className="space-y-1.5">
            <Label>Data</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "dd/MM/yyyy") : "Seleziona data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>

          {/* From Account */}
          <div className="space-y-1.5">
            <Label>Da conto</Label>
            <Select value={fromAccountId} onValueChange={setFromAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona conto origine" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* To Account */}
          <div className="space-y-1.5">
            <Label>A conto</Label>
            <Select value={toAccountId} onValueChange={setToAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona conto destinazione" />
              </SelectTrigger>
              <SelectContent>
                {accounts.filter((a) => a.id !== fromAccountId).map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label>Importo (€)</Label>
            <Input
              type="number" min="0.01" step="0.01" placeholder="0.00"
              value={amount} onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Descrizione</Label>
            <Input
              placeholder="Descrizione (opzionale)" maxLength={200}
              value={description} onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label>Tag</Label>
            <p className="text-xs text-muted-foreground">Aggiungi uno o più tag (opzionale).</p>
            <TagInput selectedTagIds={tagIds} onChange={setTagIds} />
          </div>

          <Button onClick={handleSubmit} disabled={createTransfer.isPending} className="w-full">
            {createTransfer.isPending ? "Salvataggio…" : "Trasferisci"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
