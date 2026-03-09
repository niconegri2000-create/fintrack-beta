import { TrendingUp, TrendingDown, Wallet, PiggyBank, Landmark, AlertTriangle, Plus, RefreshCw, ArrowRightLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { PeriodPicker } from "@/components/dashboard/PeriodPicker";
import { AccountSwitcher } from "@/components/dashboard/AccountSwitcher";
import { useDateRange } from "@/contexts/DateRangeContext";
import { useAccountContext } from "@/contexts/AccountContext";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useBudgetSummary, type BudgetSummaryRow } from "@/hooks/useCategoryBudgets";
import { useForecast } from "@/hooks/useForecast";
import { useWorkspace, useUpdateWorkspace } from "@/hooks/useWorkspace";
import { ForecastWidget } from "@/components/dashboard/ForecastWidget";
import { HealthScoreCard } from "@/components/dashboard/HealthScoreCard";
import { SmartInsightsCard } from "@/components/dashboard/SmartInsightsCard";
import { useHealthScoreEnabled } from "@/hooks/useHealthScoreEnabled";
import { useSmartInsightsEnabled } from "@/hooks/useSmartInsightsEnabled";
import { KpiDetailModal } from "@/components/dashboard/KpiDetailModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { useState } from "react";
import { TransactionFormDialog } from "@/components/transactions/TransactionFormDialog";
import { TransferFormDialog } from "@/components/transactions/TransferFormDialog";
import { RecurringFormDialog } from "@/components/recurring/RecurringFormDialog";

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
  const { dateRange } = useDateRange();
  const { selectedAccountId, selectedAccount, openingBalance, minBalanceThreshold } = useAccountContext();
  const { data, isLoading } = useDashboardData(dateRange.from, dateRange.to, selectedAccountId);

  // Budget always on the month of "from"
  const budgetMonthStart = format(startOfMonth(new Date(dateRange.from)), "yyyy-MM-dd");
  const budgetMonthEnd = format(endOfMonth(new Date(dateRange.from)), "yyyy-MM-dd");
  const { data: budgetRows } = useBudgetSummary(budgetMonthStart, budgetMonthEnd, selectedAccountId);

  const { enabled: healthScoreEnabled } = useHealthScoreEnabled();
  const { enabled: smartInsightsEnabled } = useSmartInsightsEnabled();
  const [kpiDetailOpen, setKpiDetailOpen] = useState(false);
  const { data: workspace } = useWorkspace();
  const updateWorkspace = useUpdateWorkspace();
  const { formatAmount, isPrivacy, renderSensitiveChart } = usePrivacy();

  const forecastHorizon = workspace?.forecast_horizon_months ?? 6;

  // Forecast always starts from the current month (today), not the selected date range
  const forecastBaseMonth = format(new Date(), "yyyy-MM");
  const { data: forecastResult, isLoading: forecastLoading } = useForecast(
    forecastBaseMonth, forecastHorizon, selectedAccountId, openingBalance,
  );

  const budgetMap = new Map<string, BudgetSummaryRow>();
  for (const b of budgetRows) budgetMap.set(b.category_name, b);

  const safeIncome = data ? Number(data.income) || 0 : 0;
  const safeExpense = data ? Number(data.expense) || 0 : 0;
  const safeBalance = data ? Number(data.balance) || 0 : 0;
  const safeSavingsRate = data ? Number(data.savingsRate) || 0 : 0;

  const saldoConto = openingBalance + safeBalance;
  const minThreshold = minBalanceThreshold;

  const kpis = [
    { label: "Entrate", value: isLoading ? null : formatAmount(safeIncome), icon: TrendingUp, accent: "text-accent" },
    { label: "Uscite", value: isLoading ? null : formatAmount(safeExpense), icon: TrendingDown, accent: "text-destructive" },
    { label: "Netto periodo", value: isLoading ? null : formatAmount(safeBalance), icon: Wallet, accent: safeBalance >= 0 ? "text-accent" : "text-destructive" },
    { label: "% Risparmio", value: isLoading ? null : (isPrivacy ? "••••" : `${safeSavingsRate.toFixed(1)}%`), icon: PiggyBank, accent: "text-muted-foreground" },
  ];

  const barData = (data?.byMonth ?? []).map((m) => ({
    ...m,
    label: `${MONTH_LABELS[m.month.slice(5)] ?? m.month.slice(5)} ${m.month.slice(2, 4)}`,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Panoramica delle tue finanze personali
          </p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
          <TransactionFormDialog
            trigger={
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" />
                Nuova transazione
              </Button>
            }
          />
          <RecurringFormDialog
            trigger={
              <Button size="sm" className="gap-1.5">
                <RefreshCw className="h-4 w-4" />
                Nuova ricorrenza
              </Button>
            }
          />
          <TransferFormDialog
            trigger={
              <Button size="sm" className="gap-1.5">
                <ArrowRightLeft className="h-4 w-4" />
                Nuovo trasferimento
              </Button>
            }
          />
          <AccountSwitcher />
          <PeriodPicker />
        </div>
      </div>

      {/* Hero: Saldo conto */}
      {(() => {
        const isMaster = !selectedAccountId;
        const isNegative = saldoConto < 0;
        const isBelowThreshold = !isNegative && !isMaster && minThreshold > 0 && saldoConto < minThreshold;
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
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                {isMaster ? "Saldo Master" : "Saldo conto"}
              </p>
              {isMaster && (
                <span className="text-[10px] text-muted-foreground" title="Vista aggregata di tutti i conti">
                  (tutti i conti)
                </span>
              )}
              {isNegative && <Badge variant="destructive" className="text-[10px]">Negativo</Badge>}
              {isBelowThreshold && <Badge className="text-[10px] bg-amber-500/20 text-amber-600 border-amber-500/30">Sotto soglia</Badge>}
            </div>
            <p className={`text-4xl font-bold ft-number ${heroColor}`}>
              {isLoading ? <Skeleton className="h-10 w-40" /> : formatAmount(saldoConto ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {isMaster ? "Saldo iniziale aggregato" : "Saldo iniziale"}: {formatAmount(openingBalance)} • Netto periodo: {formatAmount(safeBalance)}
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
            {kpi.value === null ? <Skeleton className="h-7 w-24" /> : <p className="text-2xl font-semibold ft-number">{kpi.value}</p>}
          </div>
        ))}
      </div>

      {/* Dettagli CTA */}
      <div className="flex justify-end -mt-2">
        <button
          onClick={() => setKpiDetailOpen(true)}
          className="text-xs text-primary hover:underline cursor-pointer"
        >
          Dettagli periodo →
        </button>
      </div>

      <KpiDetailModal
        open={kpiDetailOpen}
        onOpenChange={setKpiDetailOpen}
        data={data}
        budgetRows={budgetRows}
        accountLabel={selectedAccount?.name ?? "Master"}
        periodLabel={`${dateRange.from} — ${dateRange.to}`}
      />

      {/* Health Score */}
      {healthScoreEnabled && <HealthScoreCard />}

      {/* Smart Insights */}
      {smartInsightsEnabled && <SmartInsightsCard />}

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
                <Tooltip
                  formatter={(v: number) => formatAmount(v)}
                  contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--popover))" }}
                  labelStyle={{ color: "hsl(var(--popover-foreground))" }}
                  itemStyle={{ color: "hsl(var(--popover-foreground))" }}
                  cursor={{ fill: "hsl(var(--muted))", fillOpacity: 0.25 }}
                />
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
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={data!.byCategory}
                  dataKey="amount"
                  nameKey="name"
                  cx="50%" cy="45%"
                  outerRadius={80}
                  innerRadius={30}
                  label={({ name, percent, x, y, textAnchor }) => {
                    const b = budgetMap.get(name);
                    const pctLabel = `${(percent * 100).toFixed(0)}%`;
                    const over = b && b.status === "over" ? " ⚠️" : "";
                    return (
                      <text x={x} y={y} textAnchor={textAnchor} dominantBaseline="central" fill="hsl(var(--foreground))" fontSize={11}>
                        {`${name} ${pctLabel}${over}`}
                      </text>
                    );
                  }}
                  labelLine={false}
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
                      <div className="rounded-lg border bg-card p-2.5 text-xs shadow-md space-y-0.5 text-card-foreground">
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
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                  formatter={(value) => <span style={{ color: "hsl(var(--foreground))" }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Budget widget */}
      {budgetRows.length > 0 && (
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <p className="text-sm font-medium">Budget per categoria</p>
          <div className="space-y-3">
            {budgetRows
              .filter((b) => b.monthly_limit > 0)
              .sort((a, b) => {
                const statusOrder: Record<string, number> = { over: 4, warn2: 3, warn1: 2, ok: 1 };
                const sa = statusOrder[a.status] ?? 0;
                const sb = statusOrder[b.status] ?? 0;
                if (sb !== sa) return sb - sa;
                return (b.percent ?? 0) - (a.percent ?? 0);
              })
              .map((b) => {
                const rawPct = (b.percent ?? 0) * 100;
                const barPct = Math.min(rawPct, 100);
                return (
                  <div key={b.category_id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{b.category_name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground ft-number">
                          {formatAmount(b.spent)} / {formatAmount(b.monthly_limit)}
                        </span>
                        <span className="ft-number font-semibold w-12 text-right">
                          {isPrivacy ? "••" : `${rawPct.toFixed(0)}%`}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={isPrivacy ? 0 : barPct}
                        className={`h-2 flex-1 ${
                          b.status === "over"
                            ? "[&>div]:bg-destructive"
                            : b.status === "warn2"
                            ? "[&>div]:bg-amber-500"
                            : b.status === "warn1"
                            ? "[&>div]:bg-yellow-500"
                            : ""
                        }`}
                      />
                      <Badge
                        variant={b.status === "over" ? "destructive" : "secondary"}
                        className={`text-[10px] w-14 justify-center ${
                          b.status === "warn2" ? "bg-amber-500/20 text-amber-600 border-amber-500/30" :
                          b.status === "warn1" ? "bg-yellow-500/20 text-yellow-600 border-yellow-500/30" : ""
                        }`}
                      >
                        {b.status === "over" ? "OVER" : b.status === "warn2" ? "WARN" : b.status === "warn1" ? "WARN" : "OK"}
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
