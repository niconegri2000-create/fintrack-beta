import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Plus } from "lucide-react";
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
import { useCreateRecurring } from "@/hooks/useRecurringRules";
import { toast } from "sonner";
import { capitalizeFirst } from "@/lib/normalize";

export function RecurringFormDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [intervalMonths, setIntervalMonths] = useState("1");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [isFixed, setIsFixed] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const { data: categories = [] } = useCategories();
  const create = useCreateRecurring();

  const reset = () => {
    setName("");
    setType("expense");
    setAmount("");
    setCategoryId("");
    setDayOfMonth("1");
    setIntervalMonths("1");
    setStartDate(new Date());
    setIsFixed(true);
    setIsActive(true);
    setEndDate(undefined);
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error("Inserisci un nome");
      return;
    }
    const num = parseFloat(amount);
    if (!num || num <= 0) {
      toast.error("Importo deve essere maggiore di 0");
      return;
    }
    const day = parseInt(dayOfMonth);
    if (isNaN(day) || day < 1 || day > 31) {
      toast.error("Giorno del mese non valido (1–31)");
      return;
    }
    if (endDate && endDate < startDate) {
      toast.error("La data fine deve essere uguale o successiva alla data inizio");
      return;
    }

    create.mutate(
      {
        name: capitalizeFirst(name),
        type,
        amount: num,
        category_id: categoryId || null,
        day_of_month: day,
        start_date: format(startDate, "yyyy-MM-dd"),
        is_fixed: isFixed,
        is_active: isActive,
        interval_months: parseInt(intervalMonths) || 1,
        end_date: endDate ? format(endDate, "yyyy-MM-dd") : null,
      },
      {
        onSuccess: () => {
          toast.success("Ricorrenza creata");
          reset();
          setOpen(false);
        },
        onError: () => toast.error("Errore nel salvataggio"),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Nuova ricorrenza
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuova ricorrenza</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input maxLength={100} value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. Affitto" />
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
            <Input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          </div>

          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue placeholder="Seleziona" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
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
            <Label>Giorno del mese</Label>
            <Input type="number" min="1" max="31" value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)} />
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
            <Label>Costo fisso</Label>
            <Switch checked={isFixed} onCheckedChange={setIsFixed} />
          </div>

          <div className="flex items-center justify-between">
            <Label>Attiva</Label>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <Button onClick={handleSubmit} disabled={create.isPending} className="w-full">
            {create.isPending ? "Salvataggio…" : "Salva"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
