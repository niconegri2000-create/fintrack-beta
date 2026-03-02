import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useCreateGoal } from "@/hooks/useGoals";
import { useAccountContext } from "@/contexts/AccountContext";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export default function GoalFormDialog({ open, onOpenChange }: Props) {
  const { accounts, selectedAccountId } = useAccountContext();
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [accountId, setAccountId] = useState("");
  const create = useCreateGoal();

  const handleOpenChange = (v: boolean) => {
    if (v && !accountId) {
      const defaultId = selectedAccountId ?? accounts[0]?.id ?? "";
      setAccountId(defaultId);
    }
    onOpenChange(v);
  };

  const reset = () => { setName(""); setTarget(""); setDate(""); setNote(""); setAccountId(""); };

  const handleSubmit = () => {
    const t = parseFloat(target);
    if (!name.trim() || isNaN(t) || t <= 0) {
      toast.error("Inserisci nome e importo valido");
      return;
    }
    if (!accountId) {
      toast.error("Seleziona un conto");
      return;
    }
    create.mutate(
      { name: name.trim(), target_amount: t, target_date: date || null, note: note.trim() || null, account_id: accountId },
      { onSuccess: () => { toast.success("Obiettivo creato"); reset(); onOpenChange(false); } }
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuovo obiettivo</DialogTitle>
          <DialogDescription>Definisci il tuo obiettivo di risparmio</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Conto associato *</Label>
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
