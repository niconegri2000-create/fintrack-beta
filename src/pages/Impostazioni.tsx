import { CategoriesSection } from "@/components/settings/CategoriesSection";
import { BudgetSection } from "@/components/settings/BudgetSection";
import { BudgetControlSection } from "@/components/settings/BudgetControlSection";
import { GeneralPreferencesSection } from "@/components/settings/GeneralPreferencesSection";
import { AccountManagementSection } from "@/components/settings/AccountManagementSection";

const Impostazioni = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Impostazioni</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configura il tuo workspace
        </p>
      </div>

      <GeneralPreferencesSection />
      <AccountManagementSection />

      <BudgetControlSection />

      <CategoriesSection />

      <BudgetSection />
    </div>
  );
};

export default Impostazioni;
