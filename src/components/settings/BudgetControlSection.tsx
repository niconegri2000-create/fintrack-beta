import { useBudgetSettings } from "@/hooks/useBudgetSettings";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toast } from "sonner";

export function BudgetControlSection() {
  const { data: settings, isLoading, update } = useBudgetSettings();

  if (isLoading || !settings) return null;

  const handleUpdate = (field: string, value: any) => {
    update.mutate(
      { [field]: value } as any,
      { onError: () => toast.error("Errore nel salvataggio") }
    );
  };

  const alertsLabel = settings.alerts_enabled
    ? `ON (${settings.alert_threshold}%)`
    : "OFF";

  return (
    <div className="rounded-xl border bg-card p-6 space-y-6">
      <div>
        <h2 className="text-base font-semibold">Budget & Controllo</h2>
        <p className="text-muted-foreground text-sm">
          Imposta limiti e avvisi per tenere sotto controllo le spese.
        </p>
      </div>

      {/* Avvisi */}
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

        {/* Soglia avviso */}
        <div className="space-y-1.5">
          <p className="text-sm font-medium">Soglia avviso</p>
          <ToggleGroup
            type="single"
            value={String(settings.alert_threshold)}
            onValueChange={(v) => {
              if (v) handleUpdate("alert_threshold", parseInt(v));
            }}
            disabled={!settings.alerts_enabled}
            className="justify-start"
          >
            <ToggleGroupItem value="80" className="text-sm px-4">80%</ToggleGroupItem>
            <ToggleGroupItem value="90" className="text-sm px-4">90%</ToggleGroupItem>
            <ToggleGroupItem value="100" className="text-sm px-4">100%</ToggleGroupItem>
          </ToggleGroup>
          <p className="text-muted-foreground text-xs">
            Gli avvisi si basano sulla percentuale di budget speso per categoria.
          </p>
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
