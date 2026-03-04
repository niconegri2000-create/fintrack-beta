import { useState, useMemo } from "react";
import { useRecurringRules } from "@/hooks/useRecurringRules";
import { useAccountContext } from "@/contexts/AccountContext";
import { RecurringTable } from "@/components/recurring/RecurringTable";
import { RecurringFormDialog } from "@/components/recurring/RecurringFormDialog";
import { FilterBar } from "@/components/filters/FilterBar";
import { useRecurringTagsMap } from "@/hooks/useBatchTags";
import { TrendingUp, TrendingDown } from "lucide-react";

const Ricorrenti = () => {
  const { selectedAccountId } = useAccountContext();
  const { data = [], isLoading } = useRecurringRules(selectedAccountId);

  const [filterCategoryId, setFilterCategoryId] = useState<string | null>(null);
  const [filterTagIds, setFilterTagIds] = useState<string[]>([]);

  const allIds = useMemo(() => data.map((r) => r.id), [data]);
  const { data: tagsMap = {} } = useRecurringTagsMap(allIds);

  const filtered = useMemo(() => {
    let result = data;
    if (filterCategoryId) {
      result = result.filter((r) => r.category?.id === filterCategoryId);
    }
    if (filterTagIds.length > 0) {
      result = result.filter((r) => {
        const rTags = tagsMap[r.id] || [];
        return rTags.some((tag) => filterTagIds.includes(tag.id));
      });
    }
    return result;
  }, [data, filterCategoryId, filterTagIds, tagsMap]);

  const income = useMemo(() => filtered.filter((r) => r.type === "income"), [filtered]);
  const expense = useMemo(() => filtered.filter((r) => r.type === "expense"), [filtered]);
  const hasFilters = filterCategoryId !== null || filterTagIds.length > 0;
  const emptyMsg = hasFilters ? "Nessun risultato con i filtri applicati" : "Nessuna entrata ricorrente";
  const emptyMsgExp = hasFilters ? "Nessun risultato con i filtri applicati" : "Nessuna uscita ricorrente";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Ricorrenze</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Movimenti automatici mensili
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RecurringFormDialog />
        </div>
      </div>

      <FilterBar
        selectedCategoryId={filterCategoryId}
        onCategoryChange={setFilterCategoryId}
        selectedTagIds={filterTagIds}
        onTagsChange={setFilterTagIds}
      />

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
          <div className="rounded-xl border bg-card p-6 text-center text-muted-foreground text-sm">{emptyMsg}</div>
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
          <div className="rounded-xl border bg-card p-6 text-center text-muted-foreground text-sm">{emptyMsgExp}</div>
        ) : (
          <RecurringTable data={expense} isLoading={false} />
        )}
      </section>
    </div>
  );
};

export default Ricorrenti;
