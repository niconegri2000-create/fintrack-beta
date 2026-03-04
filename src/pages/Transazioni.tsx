import { useState, useMemo } from "react";
import { useTransactions } from "@/hooks/useTransactions";
import { useDateRange } from "@/contexts/DateRangeContext";
import { useAccountContext } from "@/contexts/AccountContext";
import { PeriodPicker } from "@/components/dashboard/PeriodPicker";
import { TransactionsTable } from "@/components/transactions/TransactionsTable";
import { TransactionFormDialog } from "@/components/transactions/TransactionFormDialog";
import { TransferFormDialog } from "@/components/transactions/TransferFormDialog";
import { FilterBar } from "@/components/filters/FilterBar";
import { useTransactionTagsMap } from "@/hooks/useBatchTags";
import { CsvImportWizard } from "@/components/csv-import/CsvImportWizard";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, ArrowRightLeft, FileUp } from "lucide-react";

const Transazioni = () => {
  const { dateRange } = useDateRange();
  const { selectedAccountId } = useAccountContext();
  const { data = [], isLoading } = useTransactions(dateRange.from, dateRange.to, selectedAccountId);
  const [csvOpen, setCsvOpen] = useState(false);

  const [filterCategoryId, setFilterCategoryId] = useState<string | null>(null);
  const [filterTagIds, setFilterTagIds] = useState<string[]>([]);

  // Fetch tags for all transactions in period for filtering
  const allTxIds = useMemo(() => data.map((t) => t.id), [data]);
  const { data: tagsMap = {} } = useTransactionTagsMap(allTxIds);

  // Apply filters
  const filtered = useMemo(() => {
    let result = data;
    if (filterCategoryId) {
      result = result.filter((t) => t.category?.id === filterCategoryId);
    }
    if (filterTagIds.length > 0) {
      result = result.filter((t) => {
        const txTags = tagsMap[t.id] || [];
        return txTags.some((tag) => filterTagIds.includes(tag.id));
      });
    }
    return result;
  }, [data, filterCategoryId, filterTagIds, tagsMap]);

  const income = useMemo(() => filtered.filter((t) => t.type === "income"), [filtered]);
  const expense = useMemo(() => filtered.filter((t) => t.type === "expense"), [filtered]);
  const transfers = useMemo(() => filtered.filter((t) => t.type === "transfer_in" || t.type === "transfer_out"), [filtered]);

  const hasFilters = filterCategoryId !== null || filterTagIds.length > 0;
  const emptyMsg = hasFilters ? "Nessun risultato con i filtri applicati" : "Nessuna entrata nel periodo";
  const emptyMsgExp = hasFilters ? "Nessun risultato con i filtri applicati" : "Nessuna uscita nel periodo";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Transazioni</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gestisci le tue entrate e uscite
          </p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
          <PeriodPicker />
          <TransactionFormDialog />
          <TransferFormDialog />
          <Button variant="outline" size="sm" onClick={() => setCsvOpen(true)}>
            <FileUp className="h-4 w-4 mr-1" />
            Importa CSV
          </Button>
        </div>
      </div>

      <CsvImportWizard open={csvOpen} onOpenChange={setCsvOpen} defaultAccountId={selectedAccountId ?? undefined} />

      <FilterBar
        selectedCategoryId={filterCategoryId}
        onCategoryChange={setFilterCategoryId}
        selectedTagIds={filterTagIds}
        onTagsChange={setFilterTagIds}
      />

      <p className="text-sm text-muted-foreground">
        {filtered.length} moviment{filtered.length === 1 ? "o" : "i"}
        {hasFilters && ` (filtrati da ${data.length})`}
      </p>

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
          <div className="rounded-xl border bg-card p-6 text-center text-muted-foreground text-sm">{emptyMsg}</div>
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
          <div className="rounded-xl border bg-card p-6 text-center text-muted-foreground text-sm">{emptyMsgExp}</div>
        ) : (
          <TransactionsTable data={expense} isLoading={false} />
        )}
      </section>

      {/* Trasferimenti */}
      {transfers.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold">Trasferimenti</h2>
            <span className="text-xs text-muted-foreground">({transfers.length})</span>
          </div>
          <TransactionsTable data={transfers} isLoading={false} />
        </section>
      )}
    </div>
  );
};

export default Transazioni;
