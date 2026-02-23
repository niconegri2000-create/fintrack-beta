import { useMemo } from "react";
import { useRecurringRules } from "@/hooks/useRecurringRules";
import { RecurringTable } from "@/components/recurring/RecurringTable";
import { RecurringFormDialog } from "@/components/recurring/RecurringFormDialog";
import { TrendingUp, TrendingDown } from "lucide-react";

const Ricorrenti = () => {
  const { data = [], isLoading } = useRecurringRules();

  const income = useMemo(() => data.filter((r) => r.type === "income"), [data]);
  const expense = useMemo(() => data.filter((r) => r.type === "expense"), [data]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Ricorrenti</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Movimenti automatici mensili
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RecurringFormDialog />
        </div>
      </div>

      {/* Entrate ricorrenti */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-success" />
          <h2 className="text-base font-semibold">Entrate ricorrenti</h2>
          <span className="text-xs text-muted-foreground">({income.length})</span>
        </div>
        {isLoading ? (
          <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground text-sm">Caricamento…</div>
        ) : income.length === 0 ? (
          <div className="rounded-xl border bg-card p-6 text-center text-muted-foreground text-sm">Nessuna entrata ricorrente</div>
        ) : (
          <RecurringTable data={income} isLoading={false} />
        )}
      </section>

      {/* Uscite ricorrenti */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-destructive" />
          <h2 className="text-base font-semibold">Uscite ricorrenti</h2>
          <span className="text-xs text-muted-foreground">({expense.length})</span>
        </div>
        {isLoading ? (
          <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground text-sm">Caricamento…</div>
        ) : expense.length === 0 ? (
          <div className="rounded-xl border bg-card p-6 text-center text-muted-foreground text-sm">Nessuna uscita ricorrente</div>
        ) : (
          <RecurringTable data={expense} isLoading={false} />
        )}
      </section>
    </div>
  );
};

export default Ricorrenti;
