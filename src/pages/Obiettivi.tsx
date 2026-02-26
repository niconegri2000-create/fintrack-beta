import { useState, useMemo } from "react";
import { useGoals, Goal, useUpdateGoalStatus, useDeleteGoal } from "@/hooks/useGoals";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAccountContext } from "@/contexts/AccountContext";
import { DEFAULT_WORKSPACE_ID } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Target, Plus, ChevronDown } from "lucide-react";
import GoalCard from "@/components/goals/GoalCard";
import GoalFormDialog from "@/components/goals/GoalFormDialog";
import ContributionDialog from "@/components/goals/ContributionDialog";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const workspaceId = DEFAULT_WORKSPACE_ID;

const Obiettivi = () => {
  const { selectedAccountId, accounts } = useAccountContext();
  // Pass accountId to filter: null = Master (all), string = specific account
  const { data: goals = [], isLoading } = useGoals(workspaceId, selectedAccountId);
  const { data: ws } = useWorkspace(workspaceId);
  const updateStatus = useUpdateGoalStatus(workspaceId);
  const deleteGoal = useDeleteGoal(workspaceId);

  const [showNew, setShowNew] = useState(false);
  const [contribGoal, setContribGoal] = useState<Goal | null>(null);
  const [withdrawGoal, setWithdrawGoal] = useState<Goal | null>(null);
  const [archiveGoal, setArchiveGoal] = useState<Goal | null>(null);
  const [deleteGoalTarget, setDeleteGoalTarget] = useState<Goal | null>(null);
  const [archivedOpen, setArchivedOpen] = useState(false);

  const isMaster = selectedAccountId === null;

  // Build account name map for Master view badges
  const accountNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    accounts.forEach((a) => { map[a.id] = a.name; });
    return map;
  }, [accounts]);

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

  const handleArchiveConfirm = () => {
    if (!archiveGoal) return;
    updateStatus.mutate({ id: archiveGoal.id, status: "archived" }, {
      onSuccess: () => { toast.success("Obiettivo archiviato"); setArchiveGoal(null); },
    });
  };

  const handleRestore = (g: Goal) => {
    updateStatus.mutate({ id: g.id, status: "active" }, {
      onSuccess: () => toast.success("Obiettivo ripristinato"),
    });
  };

  const handleDeleteConfirm = () => {
    if (!deleteGoalTarget) return;
    deleteGoal.mutate(deleteGoalTarget.id, {
      onSuccess: () => { toast.success("Obiettivo eliminato definitivamente"); setDeleteGoalTarget(null); },
    });
  };

  const visibleGoals = goals.filter((g) => g.status !== "archived");
  const activeGoals = goals.filter((g) => g.status === "active");
  const pausedGoals = goals.filter((g) => g.status === "paused");
  const completedGoals = goals.filter((g) => g.status === "completed");
  const archivedGoals = goals.filter((g) => g.status === "archived");

  const cardProps = (g: Goal) => ({
    key: g.id,
    goal: g,
    minBalanceThreshold: ws?.min_balance_threshold ?? 0,
    onContribute: setContribGoal,
    onWithdraw: setWithdrawGoal,
    onTogglePause: handleTogglePause,
    onComplete: handleComplete,
    onArchive: setArchiveGoal,
    onRestore: handleRestore,
    onDeletePermanently: setDeleteGoalTarget,
    accountName: isMaster ? accountNameMap[g.account_id] : undefined,
  });

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
      {!isLoading && visibleGoals.length === 0 && (
        <div className="rounded-xl border bg-card p-12 flex flex-col items-center justify-center gap-4">
          <Target className="h-12 w-12 text-muted-foreground/40" />
          <div className="text-center">
            <p className="font-medium">Nessun obiettivo</p>
            <p className="text-muted-foreground text-sm mt-1">Crea il tuo primo obiettivo di risparmio per iniziare</p>
          </div>
        </div>
      )}

      {/* Active */}
      {activeGoals.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Attivi</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {activeGoals.map((g) => <GoalCard {...cardProps(g)} />)}
          </div>
        </section>
      )}

      {/* Paused */}
      {pausedGoals.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">In pausa</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {pausedGoals.map((g) => <GoalCard {...cardProps(g)} />)}
          </div>
        </section>
      )}

      {/* Completed */}
      {completedGoals.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Completati</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {completedGoals.map((g) => <GoalCard {...cardProps(g)} />)}
          </div>
        </section>
      )}

      {/* Archived - collapsible */}
      {archivedGoals.length > 0 && (
        <Collapsible open={archivedOpen} onOpenChange={setArchivedOpen}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors">
              <ChevronDown className={`h-4 w-4 transition-transform ${archivedOpen ? "rotate-180" : ""}`} />
              Archiviati ({archivedGoals.length})
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <div className="grid gap-4 md:grid-cols-2">
              {archivedGoals.map((g) => <GoalCard {...cardProps(g)} />)}
            </div>
          </CollapsibleContent>
        </Collapsible>
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

      {/* Archive confirmation */}
      <AlertDialog open={!!archiveGoal} onOpenChange={(v) => !v && setArchiveGoal(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archivia obiettivo</AlertDialogTitle>
            <AlertDialogDescription>
              Vuoi archiviare "{archiveGoal?.name}"? L'obiettivo non sarà più visibile nelle sezioni principali ma resterà consultabile nella sezione Archiviati.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchiveConfirm}>Archivia</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteGoalTarget} onOpenChange={(v) => !v && setDeleteGoalTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina definitivamente</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione è irreversibile. L'obiettivo "{deleteGoalTarget?.name}" e tutti i suoi contributi verranno eliminati permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Elimina definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Obiettivi;
