import { CategoriesSection } from "@/components/settings/CategoriesSection";
import { BudgetSection } from "@/components/settings/BudgetSection";
import { OpeningBalanceSection } from "@/components/settings/OpeningBalanceSection";
import { MinBalanceThresholdSection } from "@/components/settings/MinBalanceThresholdSection";

const Impostazioni = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Impostazioni</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configura il tuo workspace
        </p>
      </div>

      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div>
          <p className="text-sm font-medium">Workspace attivo</p>
          <p className="text-muted-foreground text-sm">Personale</p>
        </div>
      </div>

      <OpeningBalanceSection />
      <MinBalanceThresholdSection />
      <CategoriesSection />
      <BudgetSection />
    </div>
  );
};

export default Impostazioni;
