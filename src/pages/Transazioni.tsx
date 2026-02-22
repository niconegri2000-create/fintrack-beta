import { useState, useMemo } from "react";
import { useTransactions } from "@/hooks/useTransactions";
import { MonthPicker } from "@/components/transactions/MonthPicker";
import { TransactionsTable } from "@/components/transactions/TransactionsTable";
import { TransactionFormDialog } from "@/components/transactions/TransactionFormDialog";
import { TrendingUp, TrendingDown } from "lucide-react";

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const Transazioni = () => {
  const [month, setMonth] = useState(currentMonth);
  const { data = [], isLoading } = useTransactions(month);

  const income = useMemo(() => data.filter((t) => t.type === "income"), [data]);
  const expense = useMemo(() => data.filter((t) => t.type === "expense"), [data]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Transazioni</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gestisci le tue entrate e uscite
          </p>
        </div>
        <TransactionFormDialog />
      </div>

      <div className="flex items-center justify-between">
        <MonthPicker value={month} onChange={setMonth} />
        <p className="text-sm text-muted-foreground">
          {data.length} moviment{data.length === 1 ? "o" : "i"}
        </p>
      </div>

      {/* Entrate */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-success" />
          <h2 className="text-base font-semibold">Entrate</h2>
          <span className="text-xs text-muted-foreground">({income.length})</span>
        </div>
        {isLoading ? (
          <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground text-sm">Caricamento…</div>
        ) : income.length === 0 ? (
          <div className="rounded-xl border bg-card p-6 text-center text-muted-foreground text-sm">Nessuna entrata nel periodo</div>
        ) : (
          <TransactionsTable data={income} isLoading={false} />
        )}
      </section>

      {/* Uscite */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-destructive" />
          <h2 className="text-base font-semibold">Uscite</h2>
          <span className="text-xs text-muted-foreground">({expense.length})</span>
        </div>
        {isLoading ? (
          <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground text-sm">Caricamento…</div>
        ) : expense.length === 0 ? (
          <div className="rounded-xl border bg-card p-6 text-center text-muted-foreground text-sm">Nessuna uscita nel periodo</div>
        ) : (
          <TransactionsTable data={expense} isLoading={false} />
        )}
      </section>
    </div>
  );
};

export default Transazioni;
