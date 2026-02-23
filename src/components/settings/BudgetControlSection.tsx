import { useBudgetSettings } from "@/hooks/useBudgetSettings";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import { format } from "date-fns";

export function BudgetControlSection() {
  const { data: settings, isLoading, update } = useBudgetSettings();

  if (isLoading || !settings) return null;

  const handleUpdate = (field: string, value: any) => {
    update.mutate(
      { [field]: value } as any,
      { onError: () => toast.error("Errore nel salvataggio") }
    );
  };

  const handleResetPeriod = () => {
    update.mutate(
      { reset_anchor_date: format(new Date(), "yyyy-MM-dd") },
      {
        onSuccess: () => toast.success("Periodo resettato da oggi"),
        onError: () => toast.error("Errore nel reset"),
      }
    );
  };

  const resetLabel = settings.reset_mode === "auto" ? "Automatico" : "Manuale";
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

      {/* Reset budget */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Reset budget</p>
        <RadioGroup
          value={settings.reset_mode}
          onValueChange={(v) => handleUpdate("reset_mode", v)}
          className="flex gap-6"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="auto" id="reset-auto" />
            <Label htmlFor="reset-auto" className="text-sm cursor-pointer">Automatico</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="manual" id="reset-manual" />
            <Label htmlFor="reset-manual" className="text-sm cursor-pointer">Manuale</Label>
          </div>
        </RadioGroup>

        {settings.reset_mode === "manual" && (
          <div className="flex items-center gap-3 pt-1">
            <Button variant="outline" size="sm" onClick={handleResetPeriod}>
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Reset periodo
            </Button>
            {settings.reset_anchor_date && (
              <span className="text-xs text-muted-foreground">
                Dal {format(new Date(settings.reset_anchor_date), "dd/MM/yyyy")}
              </span>
            )}
          </div>
        )}
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
          Reset: <span className="font-medium text-foreground">{resetLabel}</span>
          {" | "}Avvisi: <span className="font-medium text-foreground">{alertsLabel}</span>
        </p>
      </div>
    </div>
  );
}
