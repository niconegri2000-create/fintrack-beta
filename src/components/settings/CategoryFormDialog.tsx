import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useCreateCategory } from "@/hooks/useCategories";
import { capitalizeFirst } from "@/lib/normalize";
import { toast } from "sonner";

export function CategoryFormDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [priority, setPriority] = useState("mandatory");
  const [isFixedDefault, setIsFixedDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const create = useCreateCategory();

  const reset = () => {
    setName("");
    setPriority("mandatory");
    setIsFixedDefault(false);
    setIsActive(true);
  };

  const handleSubmit = () => {
    const normalized = capitalizeFirst(name);
    if (!normalized) {
      toast.error("Inserisci un nome");
      return;
    }

    create.mutate(
      { name: normalized, priority, is_fixed_default: isFixedDefault, is_active: isActive },
      {
        onSuccess: () => { toast.success("Categoria creata"); reset(); setOpen(false); },
        onError: (err: any) => toast.error(`Errore: ${err?.message || "salvataggio fallito"}`),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" />Nuova categoria</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Nuova categoria</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input maxLength={100} value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. Trasporti" />
          </div>
          <div className="space-y-1.5">
            <Label>Priorità</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mandatory">Obbligatoria</SelectItem>
                <SelectItem value="reducible">Riducibile</SelectItem>
                <SelectItem value="eliminable">Eliminabile</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <Label>Default per fissi</Label>
            <Switch checked={isFixedDefault} onCheckedChange={setIsFixedDefault} />
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
