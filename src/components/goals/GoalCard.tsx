import { Goal } from "@/hooks/useGoals";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { differenceInMonths } from "date-fns";
import { Plus, Minus, Pause, Play, CheckCircle2, AlertTriangle, Archive } from "lucide-react";

interface Props {
  goal: Goal;
  minBalanceThreshold: number;
  onContribute: (g: Goal) => void;
  onWithdraw: (g: Goal) => void;
  onTogglePause: (g: Goal) => void;
  onComplete: (g: Goal) => void;
  onArchive?: (g: Goal) => void;
}

export default function GoalCard({ goal, minBalanceThreshold, onContribute, onWithdraw, onTogglePause, onComplete, onArchive }: Props) {
  const remaining = Math.max(goal.target_amount - goal.saved, 0);
  const progress = goal.target_amount > 0 ? Math.min(Math.max((goal.saved / goal.target_amount) * 100, 0), 100) : 0;
  const reached = goal.saved >= goal.target_amount;

  // Monthly needed calculation
  let monthsLeft: number | null = null;
  let neededPerMonth: number | null = null;
  let showThresholdWarning = false;

  if (goal.target_date && goal.status === "active" && !reached) {
    monthsLeft = differenceInMonths(new Date(goal.target_date), new Date());
    if (monthsLeft > 0) {
      neededPerMonth = remaining / monthsLeft;
      if (minBalanceThreshold > 0 && neededPerMonth > minBalanceThreshold * 0.5) {
        showThresholdWarning = true;
      }
    }
  }

  const statusBadge = () => {
    if (reached && goal.status !== "completed") {
      return <Badge className="bg-accent text-accent-foreground">Raggiunto</Badge>;
    }
    switch (goal.status) {
      case "completed": return <Badge className="bg-accent text-accent-foreground">Completato</Badge>;
      case "paused": return <Badge variant="secondary">In pausa</Badge>;
      case "archived": return <Badge variant="secondary">Archiviato</Badge>;
      default: return <Badge variant="outline">Attivo</Badge>;
    }
  };

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-base truncate">{goal.name}</h3>
          {goal.target_date && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Scadenza: {new Date(goal.target_date).toLocaleDateString("it-IT")}
            </p>
          )}
        </div>
        {statusBadge()}
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-mono font-medium">€ {goal.saved.toFixed(2)}</span>
          <span className="text-muted-foreground">€ {goal.target_amount.toFixed(2)}</span>
        </div>
        <Progress value={progress} className="h-2.5" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{progress.toFixed(0)}%</span>
          <span>Mancano € {remaining.toFixed(2)}</span>
        </div>
      </div>

      {/* Monthly info */}
      {neededPerMonth !== null && monthsLeft !== null && monthsLeft > 0 && (
        <p className="text-xs text-muted-foreground">
          ~€ {neededPerMonth.toFixed(2)}/mese per {monthsLeft} mesi
        </p>
      )}

      {/* Threshold warning */}
      {showThresholdWarning && (
        <div className="flex items-center gap-2 text-xs rounded-lg bg-warning/10 text-warning p-2.5">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>Attenzione: il piano di risparmio potrebbe avvicinarti alla soglia minima.</span>
        </div>
      )}

      {/* Reached suggestion */}
      {reached && goal.status === "active" && (
        <div className="flex items-center gap-2 text-xs rounded-lg bg-accent/10 text-accent p-2.5">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          <span>Obiettivo raggiunto! Puoi segnarlo come completato.</span>
        </div>
      )}

      {/* Actions */}
      {goal.status !== "completed" && goal.status !== "archived" && (
        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" variant="outline" onClick={() => onContribute(goal)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Contributo
          </Button>
          <Button size="sm" variant="outline" onClick={() => onWithdraw(goal)} className="gap-1.5">
            <Minus className="h-3.5 w-3.5" /> Preleva
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onTogglePause(goal)} className="gap-1.5">
            {goal.status === "paused" ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            {goal.status === "paused" ? "Riprendi" : "Pausa"}
          </Button>
          {(reached || goal.saved > 0) && (
            <Button size="sm" variant="ghost" onClick={() => onComplete(goal)} className="gap-1.5 text-accent">
              <CheckCircle2 className="h-3.5 w-3.5" /> Completa
            </Button>
          )}
          {onArchive && (
            <Button size="sm" variant="ghost" onClick={() => onArchive(goal)} className="gap-1.5 text-destructive">
              <Archive className="h-3.5 w-3.5" /> Archivia
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
