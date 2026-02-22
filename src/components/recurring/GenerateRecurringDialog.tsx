import { useState } from "react";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MonthPicker } from "@/components/transactions/MonthPicker";
import { useGenerateRecurring } from "@/hooks/useRecurringRules";
import { toast } from "sonner";

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function GenerateRecurringDialog() {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(currentMonth);
  const generate = useGenerateRecurring();

  const handleGenerate = () => {
    generate.mutate(month, {
      onSuccess: (count) => {
        toast.success(
          count > 0
            ? `${count} transazion${count === 1 ? "e generata" : "i generate"}`
            : "Nessuna nuova transazione da generare"
        );
        setOpen(false);
      },
      onError: () => toast.error("Errore nella generazione"),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Play className="h-4 w-4" />
          Genera per mese
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Genera ricorrenti</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">
            Crea le transazioni per tutte le ricorrenze attive nel mese selezionato. Non verranno creati duplicati.
          </p>
          <div className="flex justify-center">
            <MonthPicker value={month} onChange={setMonth} />
          </div>
          <Button onClick={handleGenerate} disabled={generate.isPending} className="w-full">
            {generate.isPending ? "Generazione…" : "Genera"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
