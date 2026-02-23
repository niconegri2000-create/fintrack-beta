import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import {
  Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { ForecastMonth, ForecastGranularity } from "@/hooks/useForecast";
import { usePrivacy } from "@/contexts/PrivacyContext";

const PRESET_OPTIONS: { value: string; label: string; months: number }[] = [
  { value: "6m", label: "6 mesi", months: 6 },
  { value: "12m", label: "12 mesi", months: 12 },
  { value: "24m", label: "24 mesi", months: 24 },
  { value: "5y", label: "5 anni", months: 60 },
  { value: "10y", label: "10 anni", months: 120 },
];

const MAX_HORIZON = 360;

function presetKeyFromMonths(months: number): string {
  const found = PRESET_OPTIONS.find((p) => p.months === months);
  return found ? found.value : "custom";
}

interface ForecastWidgetProps {
  data: ForecastMonth[];
  isLoading: boolean;
  minBalanceThreshold?: number;
  granularity: ForecastGranularity;
  horizonMonths: number;
  onHorizonChange: (months: number) => void;
}

export function ForecastWidget({
  data, isLoading, minBalanceThreshold = 0, granularity, horizonMonths, onHorizonChange,
}: ForecastWidgetProps) {
  const { formatAmount, isPrivacy, renderSensitiveChart } = usePrivacy();
  const [selectedKey, setSelectedKey] = useState(() => presetKeyFromMonths(horizonMonths));
  const [customValue, setCustomValue] = useState(() => {
    if (presetKeyFromMonths(horizonMonths) === "custom") return String(horizonMonths);
    return "";
  });
  const [customUnit, setCustomUnit] = useState<"months" | "years">("months");

  // Derive display label
  const displayLabel = (() => {
    if (selectedKey !== "custom") {
      return PRESET_OPTIONS.find((p) => p.value === selectedKey)?.label ?? "";
    }
    const num = parseInt(customValue, 10);
    if (!num || num <= 0) return `${horizonMonths} mesi`;
    if (customUnit === "years") return `${num} ann${num === 1 ? "o" : "i"}`;
    return `${num} mes${num === 1 ? "e" : "i"}`;
  })();

  const handleSelectChange = (val: string) => {
    if (val === "custom") {
      setSelectedKey("custom");
      return;
    }
    setSelectedKey(val);
    const preset = PRESET_OPTIONS.find((p) => p.value === val);
    if (preset) onHorizonChange(preset.months);
  };

  const applyCustom = () => {
    const num = parseInt(customValue, 10);
    if (!num || num <= 0) return;
    let months = customUnit === "years" ? num * 12 : num;
    if (months > MAX_HORIZON) {
      months = MAX_HORIZON;
      toast.info(`Orizzonte massimo: ${MAX_HORIZON / 12} anni (${MAX_HORIZON} mesi)`);
    }
    if (months < 1) months = 1;
    onHorizonChange(months);
  };

  const isYearly = granularity === "yearly";

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-5 space-y-3">
        <p className="text-sm font-medium">Forecast saldo</p>
        <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">
          Caricamento…
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-5 space-y-3">
        <p className="text-sm font-medium">Forecast saldo</p>
        <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">
          Nessun dato disponibile
        </div>
      </div>
    );
  }

  const hasNegative = data.some((fm) => fm.balance < 0);
  const hasBelowThreshold = minBalanceThreshold > 0 && data.some((fm) => fm.balance < minBalanceThreshold && fm.balance >= 0);

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      {/* Header with selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className="text-sm font-medium">Forecast saldo — {displayLabel}</p>
        <div className="flex items-center gap-2">
          <Select value={selectedKey} onValueChange={handleSelectChange}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRESET_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">
                  {o.label}
                </SelectItem>
              ))}
              <SelectItem value="custom" className="text-xs">Custom…</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Custom input */}
      {selectedKey === "custom" && (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={1}
            max={customUnit === "years" ? 30 : 360}
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            placeholder="Valore"
            className="w-20 h-8 text-xs"
          />
          <Select value={customUnit} onValueChange={(v) => setCustomUnit(v as "months" | "years")}>
            <SelectTrigger className="w-[90px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="months" className="text-xs">Mesi</SelectItem>
              <SelectItem value="years" className="text-xs">Anni</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="secondary" className="h-8 text-xs" onClick={applyCustom}>
            Applica
          </Button>
        </div>
      )}

      {/* Alerts */}
      {hasNegative && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Attenzione: il saldo previsto diventa negativo nel periodo selezionato.
          </AlertDescription>
        </Alert>
      )}
      {hasBelowThreshold && !hasNegative && (
        <Alert className="border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400 [&>svg]:text-amber-500">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Attenzione: il saldo scende sotto la soglia minima nel periodo selezionato.
          </AlertDescription>
        </Alert>
      )}

      {/* Line chart */}
      {renderSensitiveChart(
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} className="fill-muted-foreground" interval={isYearly ? 0 : "preserveStartEnd"} />
            <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
            <Tooltip
              formatter={(v: number) => formatAmount(v)}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid hsl(var(--border))",
                background: "hsl(var(--card))",
              }}
            />
            {minBalanceThreshold > 0 && (
              <ReferenceLine
                y={minBalanceThreshold}
                stroke="hsl(38, 92%, 50%)"
                strokeDasharray="6 3"
                label={{ value: "Soglia", position: "right", fontSize: 11, fill: "hsl(38, 92%, 50%)" }}
              />
            )}
            <Line
              type="monotone"
              dataKey="balance"
              name="Saldo cumulativo"
              stroke="hsl(220, 60%, 50%)"
              strokeWidth={2}
              dot={data.length <= 30 ? { r: 3 } : false}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{isYearly ? "Anno" : "Mese"}</TableHead>
            <TableHead className="text-right">Entrate</TableHead>
            <TableHead className="text-right">Uscite</TableHead>
            <TableHead className="text-right">Saldo cum.</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((fm, i) => {
            const isNeg = fm.balance < 0;
            const isBelowThresh = minBalanceThreshold > 0 && fm.balance < minBalanceThreshold && !isNeg;
            return (
              <TableRow key={fm.month}>
                <TableCell className="font-medium">
                  {fm.label}
                  {i === 0 && (
                    <Badge variant="secondary" className="ml-2 text-[10px]">
                      attuale
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {formatAmount(fm.income)}
                </TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {formatAmount(fm.expense)}
                </TableCell>
                <TableCell
                  className={`text-right font-mono text-xs font-semibold ${
                    isNeg ? "text-destructive" : isBelowThresh ? "text-amber-500" : "text-accent"
                  }`}
                >
                  {formatAmount(fm.balance)}
                  {isBelowThresh && (
                    <AlertTriangle className="inline-block h-3 w-3 ml-1 text-amber-500" />
                  )}
                </TableCell>
                <TableCell>
                  {fm.warnings.length > 0 && (
                    <TooltipProvider>
                      <UITooltip>
                        <TooltipTrigger>
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        </TooltipTrigger>
                        <TooltipContent side="left" className="max-w-60">
                          <p className="text-xs font-medium mb-1">Ricorrenze saltate (cat. disattivata):</p>
                          <ul className="text-xs list-disc pl-3">
                            {fm.warnings.map((w) => (
                              <li key={w}>{w}</li>
                            ))}
                          </ul>
                        </TooltipContent>
                      </UITooltip>
                    </TooltipProvider>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
