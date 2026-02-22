import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAddContribution } from "@/hooks/useGoalContributions";
import { toast } from "sonner";
import { format } from "date-fns";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workspaceId: string;
  goalId: string;
  goalName: string;
  mode: "contribute" | "withdraw";
}

export default function ContributionDialog({ open, onOpenChange, workspaceId, goalId, goalName, mode }: Props) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [note, setNote] = useState("");
  const add = useAddContribution(workspaceId);

  const isWithdraw = mode === "withdraw";
  const title = isWithdraw ? `Preleva da "${goalName}"` : `Contribuisci a "${goalName}"`;

  const reset = () => { setAmount(""); setDate(format(new Date(), "yyyy-MM-dd")); setNote(""); };

  const handleSubmit = () => {
    const v = parseFloat(amount);
    if (isNaN(v) || v <= 0) {
      toast.error("Inserisci un importo valido");
      return;
    }
    const finalAmount = isWithdraw ? -v : v;
    add.mutate(
      { goal_id: goalId, date, amount: finalAmount, note: note.trim() || null },
      { onSuccess: () => { toast.success(isWithdraw ? "Prelievo registrato" : "Contributo aggiunto"); reset(); onOpenChange(false); } }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{isWithdraw ? "Registra un prelievo dall'obiettivo" : "Registra un contributo verso l'obiettivo"}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Importo (€) *</Label>
            <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="100" />
          </div>
          <div className="space-y-1.5">
            <Label>Data *</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Note (opzionale)</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={handleSubmit} disabled={add.isPending} variant={isWithdraw ? "destructive" : "default"}>
            {isWithdraw ? "Preleva" : "Aggiungi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
