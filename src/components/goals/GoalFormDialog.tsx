import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateGoal } from "@/hooks/useGoals";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workspaceId: string;
}

export default function GoalFormDialog({ open, onOpenChange, workspaceId }: Props) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const create = useCreateGoal(workspaceId);

  const reset = () => { setName(""); setTarget(""); setDate(""); setNote(""); };

  const handleSubmit = () => {
    const t = parseFloat(target);
    if (!name.trim() || isNaN(t) || t <= 0) {
      toast.error("Inserisci nome e importo valido");
      return;
    }
    create.mutate(
      { name: name.trim(), target_amount: t, target_date: date || null, note: note.trim() || null },
      { onSuccess: () => { toast.success("Obiettivo creato"); reset(); onOpenChange(false); } }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuovo obiettivo</DialogTitle>
          <DialogDescription>Definisci il tuo obiettivo di risparmio</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. Vacanza estiva" />
          </div>
          <div className="space-y-1.5">
            <Label>Importo target (€) *</Label>
            <Input type="number" min="0" step="0.01" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="1000" />
          </div>
          <div className="space-y-1.5">
            <Label>Scadenza (opzionale)</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Note (opzionale)</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={handleSubmit} disabled={create.isPending}>Crea</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
