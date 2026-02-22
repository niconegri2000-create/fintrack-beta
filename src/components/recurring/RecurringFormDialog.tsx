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

export function RecurringFormDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [isFixed, setIsFixed] = useState(true);
  const [isActive, setIsActive] = useState(true);

  const { data: categories = [] } = useCategories();
  const create = useCreateRecurring();

  const reset = () => {
    setName("");
    setType("expense");
    setAmount("");
    setCategoryId("");
    setDayOfMonth("1");
    setStartDate(new Date());
    setIsFixed(true);
    setIsActive(true);
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

    create.mutate(
      {
        name: name.trim(),
        type,
        amount: num,
        category_id: categoryId || null,
        day_of_month: day,
        start_date: format(startDate, "yyyy-MM-dd"),
        is_fixed: isFixed,
        is_active: isActive,
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
