import { useState } from "react";
import { useTransactions } from "@/hooks/useTransactions";
import { MonthPicker } from "@/components/transactions/MonthPicker";
import { TransactionsTable } from "@/components/transactions/TransactionsTable";
import { TransactionFormDialog } from "@/components/transactions/TransactionFormDialog";

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const Transazioni = () => {
  const [month, setMonth] = useState(currentMonth);
  const { data = [], isLoading } = useTransactions(month);

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

      <TransactionsTable data={data} isLoading={isLoading} />
    </div>
  );
};

export default Transazioni;
