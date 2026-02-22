import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ForecastMonth } from "@/hooks/useForecast";

function fmtEur(v: number) {
  return v.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

interface ForecastWidgetProps {
  data: ForecastMonth[];
  isLoading: boolean;
  minBalanceThreshold?: number;
}

export function ForecastWidget({ data, isLoading, minBalanceThreshold = 0 }: ForecastWidgetProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-5 space-y-3">
        <p className="text-sm font-medium">Forecast saldo — 6 mesi</p>
        <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">
          Caricamento…
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-5 space-y-3">
        <p className="text-sm font-medium">Forecast saldo — 6 mesi</p>
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
      <p className="text-sm font-medium">Forecast saldo — 6 mesi</p>

      {/* Alerts */}
      {hasNegative && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Attenzione: nei prossimi mesi il saldo previsto diventa negativo.
          </AlertDescription>
        </Alert>
      )}
      {hasBelowThreshold && !hasNegative && (
        <Alert className="border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400 [&>svg]:text-amber-500">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Attenzione: nei prossimi mesi il saldo scende sotto la soglia minima impostata.
          </AlertDescription>
        </Alert>
      )}

      {/* Line chart */}
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
          <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
          <Tooltip
            formatter={(v: number) => fmtEur(v)}
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
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mese</TableHead>
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
                  {fmtEur(fm.income)}
                </TableCell>
                <TableCell className="text-right font-mono text-xs">
                  {fmtEur(fm.expense)}
                </TableCell>
                <TableCell
                  className={`text-right font-mono text-xs font-semibold ${
                    isNeg ? "text-destructive" : isBelowThresh ? "text-amber-500" : "text-accent"
                  }`}
                >
                  {fmtEur(fm.balance)}
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
