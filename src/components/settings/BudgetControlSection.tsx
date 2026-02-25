import { useState, useEffect } from "react";
import { useBudgetSettings } from "@/hooks/useBudgetSettings";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { getThresholds, saveBudgetThresholds, validateThresholds } from "@/lib/budgetThresholds";

export function BudgetControlSection() {
  const { data: settings, isLoading, update } = useBudgetSettings();
  const [thresholds, setThresholds] = useState(getThresholds);
  const [w1, setW1] = useState(String(thresholds.warning1Percent));
  const [w2, setW2] = useState(String(thresholds.warning2Percent));

  useEffect(() => {
    const t = getThresholds();
    setThresholds(t);
    setW1(String(t.warning1Percent));
    setW2(String(t.warning2Percent));
  }, []);

  if (isLoading || !settings) return null;

  const handleUpdate = (field: string, value: any) => {
    update.mutate(
      { [field]: value } as any,
      { onError: () => toast.error("Errore nel salvataggio") }
    );
  };

  const handleSaveThresholds = () => {
    const v1 = parseInt(w1);
    const v2 = parseInt(w2);
    if (isNaN(v1) || isNaN(v2)) {
      toast.error("Inserisci valori numerici validi");
      return;
    }
    const validated = validateThresholds({ warning1Percent: v1, warning2Percent: v2 });
    saveBudgetThresholds(validated);
    setThresholds(validated);
    setW1(String(validated.warning1Percent));
    setW2(String(validated.warning2Percent));
    toast.success("Soglie salvate");
    // Force dashboard to re-render with new thresholds
    window.dispatchEvent(new Event("budget-thresholds-changed"));
  };

  const alertsLabel = settings.alerts_enabled
    ? `ON (${thresholds.warning1Percent}% / ${thresholds.warning2Percent}%)`
    : "OFF";

  return (
    <div className="rounded-xl border bg-card p-6 space-y-6">
      <div>
        <h2 className="text-base font-semibold">Budget & Controllo</h2>
        <p className="text-muted-foreground text-sm">
          Imposta limiti e avvisi per tenere sotto controllo le spese.
        </p>
      </div>

      {/* Avvisi toggle */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Avvisi</p>
            <p className="text-muted-foreground text-xs">
              Avvisa quando supero una soglia
            </p>
          </div>
          <Switch
            checked={settings.alerts_enabled}
            onCheckedChange={(v) => handleUpdate("alerts_enabled", v)}
          />
        </div>

        {/* Soglie personalizzabili */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Soglie avvisi budget</p>
          <p className="text-muted-foreground text-xs">
            OVER scatta sempre a 100%. Imposta 2 soglie crescenti (es. 60 e 85).
          </p>
          <div className="flex items-center gap-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Primo avviso (%)</p>
              <Input
                type="number"
                min={1}
                max={98}
                className="h-8 w-20 font-mono text-sm"
                value={w1}
                onChange={(e) => setW1(e.target.value)}
                onBlur={handleSaveThresholds}
                onKeyDown={(e) => { if (e.key === "Enter") handleSaveThresholds(); }}
                disabled={!settings.alerts_enabled}
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Secondo avviso (%)</p>
              <Input
                type="number"
                min={2}
                max={99}
                className="h-8 w-20 font-mono text-sm"
                value={w2}
                onChange={(e) => setW2(e.target.value)}
                onBlur={handleSaveThresholds}
                onKeyDown={(e) => { if (e.key === "Enter") handleSaveThresholds(); }}
                disabled={!settings.alerts_enabled}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Riepilogo */}
      <div className="rounded-lg bg-muted/50 px-4 py-2.5">
        <p className="text-xs text-muted-foreground">
          Budget: <span className="font-medium text-foreground">Mensile</span>
          {" | "}Avvisi: <span className="font-medium text-foreground">{alertsLabel}</span>
        </p>
      </div>
    </div>
  );
}
