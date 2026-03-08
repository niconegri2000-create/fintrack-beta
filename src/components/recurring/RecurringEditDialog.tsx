import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCategories } from "@/hooks/useCategories";
import { useUpdateRecurring, RecurringRow } from "@/hooks/useRecurringRules";
import { useAccountContext } from "@/contexts/AccountContext";
import { toast } from "sonner";
import { capitalizeFirst } from "@/lib/normalize";
import { TagInput } from "@/components/ui/tag-input";
import { useRecurringTags, syncRecurringTags } from "@/hooks/useTags";

interface Props {
  rule: RecurringRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RecurringEditDialog({ rule, open, onOpenChange }: Props) {
  const [name, setName] = useState(rule.name || "");
  const [type, setType] = useState(rule.type);
  const [amount, setAmount] = useState(String(rule.amount));
  const [accountId, setAccountId] = useState(rule.account_id || "");
  const [categoryId, setCategoryId] = useState(rule.category?.id || "");
  const [startDate, setStartDate] = useState<Date>(new Date(rule.start_date));
  const [intervalMonths, setIntervalMonths] = useState(String(rule.interval_months));
  const [isActive, setIsActive] = useState(rule.is_active);
  const [endDate, setEndDate] = useState<Date | undefined>(rule.end_date ? new Date(rule.end_date) : undefined);
  const [tagIds, setTagIds] = useState<string[]>([]);

  const { data: categories = [] } = useCategories();
  const { accounts } = useAccountContext();
  const update = useUpdateRecurring();
  const { data: existingTagIds = [] } = useRecurringTags(open ? rule.id : null);

  useEffect(() => {
    if (open) {
      setName(rule.name || "");
      setType(rule.type);
      setAmount(String(rule.amount));
      setAccountId(rule.account_id || "");
      setCategoryId(rule.category?.id || "");
      setStartDate(new Date(rule.start_date));
      setIntervalMonths(String(rule.interval_months));
      setIsActive(rule.is_active);
      setEndDate(rule.end_date ? new Date(rule.end_date) : undefined);
    }
  }, [open, rule]);

  useEffect(() => {
    if (open && existingTagIds.length >= 0) {
      setTagIds(existingTagIds);
    }
  }, [open, existingTagIds]);

  const handleSubmit = () => {
    if (!name.trim()) { toast.error("Inserisci un nome"); return; }
    const num = parseFloat(amount);
    if (!num || num <= 0) { toast.error("Importo deve essere maggiore di 0"); return; }
    const day = startDate.getDate();
    if (!accountId) { toast.error("Seleziona un conto"); return; }

    update.mutate(
      {
        id: rule.id,
        name: capitalizeFirst(name), type, amount: num,
        category_id: categoryId || null, day_of_month: day,
        start_date: format(startDate, "yyyy-MM-dd"),
        interval_months: parseInt(intervalMonths) || 1,
        end_date: endDate ? format(endDate, "yyyy-MM-dd") : null,
        is_active: isActive, is_fixed: true, account_id: accountId,
      },
      {
        onSuccess: async () => {
          try { await syncRecurringTags(rule.id, tagIds); } catch {}
          toast.success("Ricorrenza aggiornata");
          onOpenChange(false);
        },
        onError: () => toast.error("Errore nell'aggiornamento"),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Modifica ricorrenza</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Conto</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger><SelectValue placeholder="Seleziona conto" /></SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (<SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Entrata</SelectItem>
                <SelectItem value="expense">Uscita</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Importo (€)</Label>
            <Input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue placeholder="Seleziona" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Frequenza</Label>
            <Select value={intervalMonths} onValueChange={setIntervalMonths}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Ogni 1 mese</SelectItem>
                <SelectItem value="2">Ogni 2 mesi</SelectItem>
                <SelectItem value="3">Ogni 3 mesi</SelectItem>
                <SelectItem value="6">Ogni 6 mesi</SelectItem>
                <SelectItem value="12">Ogni 12 mesi</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Data inizio</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(startDate, "dd/MM/yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={startDate} onSelect={(d) => d && setStartDate(d)} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1.5">
            <Label>Data fine (opzionale)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "dd/MM/yyyy") : "Nessuna data fine"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={endDate} onSelect={(d) => setEndDate(d || undefined)} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
            {endDate && (
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setEndDate(undefined)}>
                Rimuovi data fine
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Label>Attiva</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label>Tag</Label>
            <p className="text-xs text-muted-foreground">Aggiungi uno o più tag per classificare la ricorrenza.</p>
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
