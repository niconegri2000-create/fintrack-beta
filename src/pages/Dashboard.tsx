import { TrendingUp, TrendingDown, Wallet, PiggyBank, Landmark, AlertTriangle } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { PeriodPicker, usePeriodState } from "@/components/dashboard/PeriodPicker";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useBudgetSummary, type BudgetSummaryRow } from "@/hooks/useCategoryBudgets";
import { useForecast } from "@/hooks/useForecast";
import { useWorkspace, useUpdateWorkspace } from "@/hooks/useWorkspace";
import { ForecastWidget } from "@/components/dashboard/ForecastWidget";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { usePrivacy } from "@/contexts/PrivacyContext";

const MONTH_LABELS: Record<string, string> = {
  "01": "Gen", "02": "Feb", "03": "Mar", "04": "Apr",
  "05": "Mag", "06": "Giu", "07": "Lug", "08": "Ago",
  "09": "Set", "10": "Ott", "11": "Nov", "12": "Dic",
};

const PIE_COLORS = [
  "hsl(220, 60%, 20%)", "hsl(160, 60%, 40%)", "hsl(38, 92%, 50%)", "hsl(0, 72%, 51%)",
  "hsl(260, 50%, 50%)", "hsl(190, 70%, 45%)", "hsl(330, 60%, 50%)", "hsl(80, 55%, 45%)",
];

const Dashboard = () => {
  const { range, activePreset, applyPreset, applyCustom } = usePeriodState();
  const { data, isLoading } = useDashboardData(range.start, range.end);
  const { data: budgetRows } = useBudgetSummary(range.start, range.end);
  const { data: workspace } = useWorkspace();
  const updateWorkspace = useUpdateWorkspace();
  const { formatAmount, isPrivacy, renderSensitiveChart } = usePrivacy();

  const openingBalance = workspace?.opening_balance ?? 0;
  const minThreshold = workspace?.min_balance_threshold ?? 0;
  const forecastHorizon = workspace?.forecast_horizon_months ?? 6;

  const currentMonth = range.start.slice(0, 7);
  const { data: forecastResult, isLoading: forecastLoading } = useForecast(currentMonth, forecastHorizon);

  const budgetMap = new Map<string, BudgetSummaryRow>();
  for (const b of budgetRows) budgetMap.set(b.category_name, b);

  const saldoConto = data ? openingBalance + data.balance : null;

  const kpis = [
    { label: "Entrate", value: data ? formatAmount(data.income) : "—", icon: TrendingUp, accent: "text-accent" },
    { label: "Uscite", value: data ? formatAmount(data.expense) : "—", icon: TrendingDown, accent: "text-destructive" },
    { label: "Netto periodo", value: data ? formatAmount(data.balance) : "—", icon: Wallet, accent: data && data.balance >= 0 ? "text-accent" : "text-destructive" },
    { label: "% Risparmio", value: isPrivacy ? "••••" : (data ? `${data.savingsRate.toFixed(1)}%` : "—"), icon: PiggyBank, accent: "text-muted-foreground" },
  ];

  const barData = (data?.byMonth ?? []).map((m) => ({
    ...m,
    label: `${MONTH_LABELS[m.month.slice(5)] ?? m.month.slice(5)} ${m.month.slice(2, 4)}`,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Panoramica delle tue finanze personali
          </p>
        </div>
        <PeriodPicker
          value={range}
          activePreset={activePreset}
          onPreset={applyPreset}
          onCustom={applyCustom}
        />
      </div>

      {/* Hero: Saldo conto */}
      {(() => {
        const isNegative = saldoConto !== null && saldoConto < 0;
        const isBelowThreshold = saldoConto !== null && !isNegative && saldoConto < minThreshold;
        const heroColor = isNegative ? "text-destructive" : "text-foreground";
        const iconColor = isNegative ? "text-destructive" : isBelowThreshold ? "text-amber-500" : "text-accent";
        return (
          <div className="rounded-xl border bg-card p-6">
            <div className="flex items-center gap-2 mb-1">
              {isBelowThreshold ? (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              ) : (
                <Landmark className={`h-5 w-5 ${iconColor}`} />
              )}
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Saldo conto</p>
              {isNegative && <Badge variant="destructive" className="text-[10px]">Negativo</Badge>}
              {isBelowThreshold && <Badge className="text-[10px] bg-amber-500/20 text-amber-600 border-amber-500/30">Sotto soglia</Badge>}
            </div>
            <p className={`text-4xl font-bold font-mono ${heroColor}`}>
              {saldoConto !== null ? formatAmount(saldoConto) : "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Saldo iniziale: {formatAmount(openingBalance)} • Netto periodo: {data ? formatAmount(data.balance) : "—"}
            </p>
          </div>
        );
      })()}

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-xl border bg-card p-5 space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{kpi.label}</p>
              <kpi.icon className={`h-4 w-4 ${kpi.accent}`} />
            </div>
            <p className="text-2xl font-semibold font-mono">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <p className="text-sm font-medium">Entrate vs Uscite</p>
          {barData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">Nessun dato nel periodo</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={barData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" hide={isPrivacy} />
                <Tooltip formatter={(v: number) => formatAmount(v)} contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                <Bar dataKey="income" name="Entrate" fill="hsl(160, 60%, 40%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Uscite" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border bg-card p-5 space-y-3">
          <p className="text-sm font-medium">Spese per categoria</p>
          {(data?.byCategory ?? []).length === 0 ? (
            <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">Nessun dato nel periodo</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={data!.byCategory}
                  dataKey="amount"
                  nameKey="name"
                  cx="50%" cy="50%"
                  outerRadius={90}
                  label={({ name, percent }) => {
                    const b = budgetMap.get(name);
                    const pctLabel = `${(percent * 100).toFixed(0)}%`;
                    const over = b && b.status === "over" ? " ⚠️" : "";
                    return `${name} ${pctLabel}${over}`;
                  }}
                  labelLine={false}
                  style={{ fontSize: 11 }}
                >
                  {data!.byCategory.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null;
                    const entry = payload[0];
                    const name = entry.name as string;
                    const amount = Number(entry.value);
                    const b = budgetMap.get(name);
                    return (
                      <div className="rounded-lg border bg-card p-2.5 text-xs shadow-md space-y-0.5">
                        <p className="font-medium">{name}</p>
                        <p>Speso: {formatAmount(amount)}</p>
                        {b && b.monthly_limit > 0 && (
                          <>
                            <p>Limite: {formatAmount(b.monthly_limit)}</p>
                            <p>Utilizzo: {((b.percent ?? 0) * 100).toFixed(0)}%
                              {b.status === "over" && <span className="text-destructive font-semibold"> OVER</span>}
                            </p>
                          </>
                        )}
                      </div>
                    );
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Budget widget */}
      {budgetRows.length > 0 && (
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <p className="text-sm font-medium">Budget — Top 5 categorie</p>
          <div className="space-y-3">
            {budgetRows
              .filter((b) => b.monthly_limit > 0)
              .sort((a, b) => (b.percent ?? 0) - (a.percent ?? 0))
              .slice(0, 5)
              .map((b) => {
                const pct = Math.min((b.percent ?? 0) * 100, 100);
                return (
                  <div key={b.category_id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{b.category_name}</span>
                      <span className="text-muted-foreground font-mono">
                        {formatAmount(b.spent)} / {formatAmount(b.monthly_limit)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={isPrivacy ? 0 : pct}
                        className={`h-2 flex-1 ${
                          b.status === "over"
                            ? "[&>div]:bg-destructive"
                            : b.status === "warn"
                            ? "[&>div]:bg-amber-500"
                            : ""
                        }`}
                      />
                      <Badge
                        variant={b.status === "over" ? "destructive" : "secondary"}
                        className={`text-[10px] w-12 justify-center ${
                          b.status === "warn" ? "bg-amber-500/20 text-amber-600 border-amber-500/30" : ""
                        }`}
                      >
                        {b.status === "over" ? "OVER" : b.status === "warn" ? "WARN" : "OK"}
                      </Badge>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Forecast widget */}
      <ForecastWidget
        data={forecastResult?.data ?? []}
        isLoading={forecastLoading}
        minBalanceThreshold={minThreshold}
        granularity={forecastResult?.granularity ?? "monthly"}
        horizonMonths={forecastHorizon}
        onHorizonChange={(m) => updateWorkspace.mutate({ forecast_horizon_months: m })}
      />
    </div>
  );
};

export default Dashboard;
