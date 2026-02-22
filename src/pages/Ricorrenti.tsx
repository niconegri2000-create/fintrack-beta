import { useRecurringRules } from "@/hooks/useRecurringRules";
import { RecurringTable } from "@/components/recurring/RecurringTable";
import { RecurringFormDialog } from "@/components/recurring/RecurringFormDialog";
import { GenerateRecurringDialog } from "@/components/recurring/GenerateRecurringDialog";

const Ricorrenti = () => {
  const { data = [], isLoading } = useRecurringRules();

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
          <GenerateRecurringDialog />
          <RecurringFormDialog />
        </div>
      </div>

      <RecurringTable data={data} isLoading={isLoading} />
    </div>
  );
};

export default Ricorrenti;
