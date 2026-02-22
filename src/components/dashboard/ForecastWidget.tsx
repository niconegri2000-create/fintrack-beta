import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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
import type { ForecastMonth } from "@/hooks/useForecast";

function fmtEur(v: number) {
  return v.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

interface ForecastWidgetProps {
  data: ForecastMonth[];
  isLoading: boolean;
}

export function ForecastWidget({ data, isLoading }: ForecastWidgetProps) {
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

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <p className="text-sm font-medium">Forecast saldo — 6 mesi</p>

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
          {data.map((fm, i) => (
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
                  fm.balance >= 0 ? "text-accent" : "text-destructive"
                }`}
              >
                {fmtEur(fm.balance)}
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
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
