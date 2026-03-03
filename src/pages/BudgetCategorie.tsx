import { CategoriesSection } from "@/components/settings/CategoriesSection";
import { BudgetSection } from "@/components/settings/BudgetSection";

const BudgetCategorie = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Budget & Categorie</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gestisci categorie e limiti di spesa del tuo workspace
        </p>
      </div>

      <CategoriesSection />
      <BudgetSection />
    </div>
  );
};

export default BudgetCategorie;
