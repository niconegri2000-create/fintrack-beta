import { useState } from "react";
import { Pencil } from "lucide-react";
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
import { Category, useUpdateCategory } from "@/hooks/useCategories";
import { capitalizeFirst } from "@/lib/normalize";
import { toast } from "sonner";

interface Props {
  category: Category;
}

export function CategoryEditDialog({ category }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(category.name);
  const [priority, setPriority] = useState(category.priority);
  const [isFixedDefault, setIsFixedDefault] = useState(category.is_fixed_default);
  const [isActive, setIsActive] = useState(category.is_active);

  const update = useUpdateCategory();

  const handleSubmit = () => {
    const normalized = capitalizeFirst(name);
    if (!normalized) {
      toast.error("Inserisci un nome");
      return;
    }
    update.mutate(
      { id: category.id, name: normalized, priority, is_fixed_default: isFixedDefault, is_active: isActive },
      {
        onSuccess: () => { toast.success("Categoria aggiornata"); setOpen(false); },
        onError: () => toast.error("Errore nell'aggiornamento"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (v) { setName(category.name); setPriority(category.priority); setIsFixedDefault(category.is_fixed_default); setIsActive(category.is_active); }
      setOpen(v);
    }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="h-3.5 w-3.5" /></Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Modifica categoria</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
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
          <Button onClick={handleSubmit} disabled={update.isPending} className="w-full">
            {update.isPending ? "Salvataggio…" : "Salva"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
