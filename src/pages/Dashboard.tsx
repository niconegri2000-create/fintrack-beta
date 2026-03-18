import { TrendingUp, TrendingDown, Wallet, PiggyBank, Landmark, AlertTriangle, Plus, RefreshCw, ArrowRightLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { AccountSwitcher } from "@/components/dashboard/AccountSwitcher";
import { useAccountContext } from "@/contexts/AccountContext";
import { useDashboardData } from "@/hooks/useDashboardData";
import { BudgetWidget } from "@/components/dashboard/BudgetWidget";
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
import { usePrivacy } from "@/contexts/PrivacyContext";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { useState, useMemo, useCallback } from "react";
import { TransactionFormDialog } from "@/components/transactions/TransactionFormDialog";
import { TransferFormDialog } from "@/components/transactions/TransferFormDialog";
import { RecurringFormDialog } from "@/components/recurring/RecurringFormDialog";
import { DashboardPeriodPicker, type DashboardPeriodPreset, presetToLocalRange } from "@/components/dashboard/DashboardPeriodPicker";

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
  const { selectedAccountId, selectedAccount, openingBalance, minBalanceThreshold } = useAccountContext();
  const { formatAmount, isPrivacy, renderSensitiveChart } = usePrivacy();

  // ── A) BALANCE: always all-time ──
  const allTimeEnd = useMemo(() => format(endOfMonth(new Date()), "yyyy-MM-dd"), []);
  const { data: allTimeData, isLoading: balanceLoading } = useDashboardData("2000-01-01", allTimeEnd, selectedAccountId);
  const allTimeBalance = allTimeData ? Number(allTimeData.balance) || 0 : 0;
  const saldoConto = openingBalance + allTimeBalance;

  // ── B) KPI PERIOD: local state, default "current_month" ──
  const [kpiPreset, setKpiPreset] = useState<DashboardPeriodPreset>("current_month");
  const [kpiCustomRange, setKpiCustomRange] = useState<{ from: string; to: string } | null>(null);

  const kpiRange = useMemo(() => {
    if (kpiPreset === "custom" && kpiCustomRange) return kpiCustomRange;
    return presetToLocalRange(kpiPreset === "custom" ? "current_month" : kpiPreset);
  }, [kpiPreset, kpiCustomRange]);

  const handlePresetChange = useCallback((p: DashboardPeriodPreset) => {
    setKpiPreset(p);
    if (p !== "custom") setKpiCustomRange(null);
  }, []);

  const handleCustomChange = useCallback((from: string, to: string) => {
    setKpiPreset("custom");
    setKpiCustomRange({ from, to });
  }, []);

  // KPI data (period-filtered)
  const { data: kpiData, isLoading: kpiLoading } = useDashboardData(kpiRange.from, kpiRange.to, selectedAccountId);

  // Budget: now handled by BudgetWidget component with its own period filter

  const { enabled: healthScoreEnabled } = useHealthScoreEnabled();
  const { enabled: smartInsightsEnabled } = useSmartInsightsEnabled();
  const [kpiDetailOpen, setKpiDetailOpen] = useState(false);
  const { data: workspace } = useWorkspace();
  const updateWorkspace = useUpdateWorkspace();

  const forecastHorizon = workspace?.forecast_horizon_months ?? 6;
  const forecastBaseMonth = format(new Date(), "yyyy-MM");
  const { data: forecastResult, isLoading: forecastLoading } = useForecast(
    forecastBaseMonth, forecastHorizon, selectedAccountId, openingBalance,
  );


  const safeIncome = kpiData ? Number(kpiData.income) || 0 : 0;
  const safeExpense = kpiData ? Number(kpiData.expense) || 0 : 0;
  const safeNetPeriod = kpiData ? Number(kpiData.balance) || 0 : 0;
  const safeSavingsRate = kpiData ? Number(kpiData.savingsRate) || 0 : 0;

  const minThreshold = minBalanceThreshold;

  const kpis = [
    { label: "Entrate", value: kpiLoading ? null : formatAmount(safeIncome), icon: TrendingUp, accent: "text-accent" },
    { label: "Uscite", value: kpiLoading ? null : formatAmount(safeExpense), icon: TrendingDown, accent: "text-destructive" },
    { label: "Netto periodo", value: kpiLoading ? null : formatAmount(safeNetPeriod), icon: Wallet, accent: safeNetPeriod >= 0 ? "text-accent" : "text-destructive" },
    { label: "% Risparmio", value: kpiLoading ? null : (isPrivacy ? "••••" : `${safeSavingsRate.toFixed(1)}%`), icon: PiggyBank, accent: "text-muted-foreground" },
  ];

  const barData = (kpiData?.byMonth ?? []).map((m) => ({
    ...m,
    label: `${MONTH_LABELS[m.month.slice(5)] ?? m.month.slice(5)} ${m.month.slice(2, 4)}`,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
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
        </div>
      </div>

      {/* 1. Hero: Saldo conto — ALWAYS GLOBAL */}
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
              {balanceLoading ? <Skeleton className="h-10 w-40" /> : formatAmount(saldoConto ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Saldo complessivo reale {isMaster ? "(tutti i conti)" : `di "${selectedAccount?.name}"`}
            </p>
          </div>
        );
      })()}

      {/* 2. Period picker for KPIs — LOCAL, default "Mese corrente" */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">Metriche di periodo</p>
        <DashboardPeriodPicker
          preset={kpiPreset}
          customRange={kpiCustomRange}
          onPresetChange={handlePresetChange}
          onCustomChange={handleCustomChange}
        />
      </div>

      {/* 3. KPI cards */}
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
        data={kpiData}
        budgetRows={[]}
        accountLabel={selectedAccount?.name ?? "Master"}
        periodLabel={`${kpiRange.from} — ${kpiRange.to}`}
      />

      {/* 4. Charts — same period as KPIs */}
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
          {(kpiData?.byCategory ?? []).length === 0 ? (
            <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">Nessun dato nel periodo</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={kpiData!.byCategory}
                  dataKey="amount"
                  nameKey="name"
                  cx="50%" cy="45%"
                  outerRadius={80}
                  innerRadius={30}
                  label={({ name, percent, x, y, textAnchor }) => {
                    const pctLabel = `${(percent * 100).toFixed(0)}%`;
                    return (
                      <text x={x} y={y} textAnchor={textAnchor} dominantBaseline="central" fill="hsl(var(--foreground))" fontSize={11}>
                        {`${name} ${pctLabel}`}
                      </text>
                    );
                  }}
                  labelLine={false}
                >
                  {kpiData!.byCategory.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null;
                    const entry = payload[0];
                    const name = entry.name as string;
                    const amount = Number(entry.value);
                    return (
                      <div className="rounded-lg border bg-card p-2.5 text-xs shadow-md space-y-0.5 text-card-foreground">
                        <p className="font-medium">{name}</p>
                        <p>Speso: {formatAmount(amount)}</p>
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

      {/* 5. Health Score — follows KPI period filter */}
      {healthScoreEnabled && <HealthScoreCard startDate={kpiRange.from} endDate={kpiRange.to} />}

      {/* 6. Smart Insights — same period as KPI filter */}
      {smartInsightsEnabled && <SmartInsightsCard startDate={kpiRange.from} endDate={kpiRange.to} />}

      {/* 7. Budget widget — independent period filter */}
      <BudgetWidget />

      {/* 8. Forecast widget */}
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
