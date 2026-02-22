import { useState } from "react";
import { useGoals, Goal, useUpdateGoalStatus } from "@/hooks/useGoals";
import { useWorkspace } from "@/hooks/useWorkspace";
import { DEFAULT_WORKSPACE_ID } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Target, Plus } from "lucide-react";
import GoalCard from "@/components/goals/GoalCard";
import GoalFormDialog from "@/components/goals/GoalFormDialog";
import ContributionDialog from "@/components/goals/ContributionDialog";
import { toast } from "sonner";

const workspaceId = DEFAULT_WORKSPACE_ID;

const Obiettivi = () => {
  const { data: goals = [], isLoading } = useGoals(workspaceId);
  const { data: ws } = useWorkspace(workspaceId);
  const updateStatus = useUpdateGoalStatus(workspaceId);

  const [showNew, setShowNew] = useState(false);
  const [contribGoal, setContribGoal] = useState<Goal | null>(null);
  const [withdrawGoal, setWithdrawGoal] = useState<Goal | null>(null);

  const handleTogglePause = (g: Goal) => {
    const next = g.status === "paused" ? "active" : "paused";
    updateStatus.mutate({ id: g.id, status: next }, {
      onSuccess: () => toast.success(next === "paused" ? "Obiettivo in pausa" : "Obiettivo riattivato"),
    });
  };

  const handleComplete = (g: Goal) => {
    updateStatus.mutate({ id: g.id, status: "completed" }, {
      onSuccess: () => toast.success("Obiettivo completato! 🎉"),
    });
  };

  const activeGoals = goals.filter((g) => g.status === "active");
  const pausedGoals = goals.filter((g) => g.status === "paused");
  const completedGoals = goals.filter((g) => g.status === "completed");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Obiettivi</h1>
          <p className="text-muted-foreground text-sm mt-1">I tuoi obiettivi di risparmio</p>
        </div>
        <Button onClick={() => setShowNew(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> Nuovo obiettivo
        </Button>
      </div>

      {/* Empty state */}
      {!isLoading && goals.length === 0 && (
        <div className="rounded-xl border bg-card p-12 flex flex-col items-center justify-center gap-4">
          <Target className="h-12 w-12 text-muted-foreground/40" />
          <div className="text-center">
            <p className="font-medium">Nessun obiettivo</p>
            <p className="text-muted-foreground text-sm mt-1">Crea il tuo primo obiettivo di risparmio per iniziare</p>
          </div>
          <Button onClick={() => setShowNew(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Nuovo obiettivo
          </Button>
        </div>
      )}

      {/* Active */}
      {activeGoals.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Attivi</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {activeGoals.map((g) => (
              <GoalCard
                key={g.id}
                goal={g}
                minBalanceThreshold={ws?.min_balance_threshold ?? 0}
                onContribute={setContribGoal}
                onWithdraw={setWithdrawGoal}
                onTogglePause={handleTogglePause}
                onComplete={handleComplete}
              />
            ))}
          </div>
        </section>
      )}

      {/* Paused */}
      {pausedGoals.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">In pausa</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {pausedGoals.map((g) => (
              <GoalCard
                key={g.id}
                goal={g}
                minBalanceThreshold={ws?.min_balance_threshold ?? 0}
                onContribute={setContribGoal}
                onWithdraw={setWithdrawGoal}
                onTogglePause={handleTogglePause}
                onComplete={handleComplete}
              />
            ))}
          </div>
        </section>
      )}

      {/* Completed */}
      {completedGoals.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Completati</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {completedGoals.map((g) => (
              <GoalCard
                key={g.id}
                goal={g}
                minBalanceThreshold={ws?.min_balance_threshold ?? 0}
                onContribute={setContribGoal}
                onWithdraw={setWithdrawGoal}
                onTogglePause={handleTogglePause}
                onComplete={handleComplete}
              />
            ))}
          </div>
        </section>
      )}

      {/* Dialogs */}
      <GoalFormDialog open={showNew} onOpenChange={setShowNew} workspaceId={workspaceId} />
      {contribGoal && (
        <ContributionDialog
          open={!!contribGoal}
          onOpenChange={(v) => !v && setContribGoal(null)}
          workspaceId={workspaceId}
          goalId={contribGoal.id}
          goalName={contribGoal.name}
          mode="contribute"
        />
      )}
      {withdrawGoal && (
        <ContributionDialog
          open={!!withdrawGoal}
          onOpenChange={(v) => !v && setWithdrawGoal(null)}
          workspaceId={workspaceId}
          goalId={withdrawGoal.id}
          goalName={withdrawGoal.name}
          mode="withdraw"
        />
      )}
    </div>
  );
};

export default Obiettivi;
