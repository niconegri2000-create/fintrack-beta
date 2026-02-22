import { useState } from "react";
import { useReport } from "@/hooks/useReport";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, ArrowUpDown, BarChart3, History } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

function fmt(n: number) {
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

function DiffBadge({ value }: { value: number }) {
  if (value > 0)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-400">
        <TrendingUp className="h-3.5 w-3.5" /> +{fmt(value)}
      </span>
    );
  if (value < 0)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-400">
        <TrendingDown className="h-3.5 w-3.5" /> {fmt(value)}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      <Minus className="h-3.5 w-3.5" /> {fmt(0)}
    </span>
  );
}

function StatCard({
  label,
  value,
  sub,
  colorClass,
}: {
  label: string;
  value: string;
  sub?: React.ReactNode;
  colorClass?: string;
}) {
  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`text-xl font-semibold ${colorClass ?? ""}`}>{value}</p>
      {sub}
    </div>
  );
}

function SectionSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-32" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

const PERIOD_OPTIONS = [3, 6, 12] as const;

const Report = () => {
  const [monthsBack, setMonthsBack] = useState<number>(3);
  const { data, isLoading } = useReport(monthsBack);

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Report</h1>
          <p className="text-muted-foreground text-sm mt-1">Panoramica finanziaria</p>
        </div>
        <SectionSkeleton />
        <SectionSkeleton />
        <SectionSkeleton />
      </div>
    );
  }

  const { currentMonth: cm, avgMonths: avg, comparison: cmp } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Report</h1>
        <p className="text-muted-foreground text-sm mt-1">Panoramica finanziaria</p>
      </div>

      {/* Sezione 1 – Mese corrente */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Mese corrente
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <StatCard label="Entrate" value={fmt(cm.income)} colorClass="text-green-600 dark:text-green-400" />
          <StatCard label="Uscite" value={fmt(cm.expense)} colorClass="text-red-600 dark:text-red-400" />
          <StatCard label="Risparmio netto" value={fmt(cm.savings)} sub={<DiffBadge value={cm.savings} />} />
          <StatCard label="% Risparmio" value={`${cm.savingsRate.toFixed(1)}%`} />
        </CardContent>
      </Card>

      {/* Sezione 2 – Media ultimi X mesi */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              Media ultimi {monthsBack} mesi
            </CardTitle>
            <ToggleGroup
              type="single"
              value={String(monthsBack)}
              onValueChange={(v) => v && setMonthsBack(Number(v))}
              size="sm"
            >
              {PERIOD_OPTIONS.map((p) => (
                <ToggleGroupItem key={p} value={String(p)} className="text-xs px-3">
                  {p}m
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <StatCard label="Media entrate" value={fmt(avg.income)} colorClass="text-green-600 dark:text-green-400" />
          <StatCard label="Media uscite" value={fmt(avg.expense)} colorClass="text-red-600 dark:text-red-400" />
          <StatCard label="Media risparmio" value={fmt(avg.savings)} sub={<DiffBadge value={avg.savings} />} />
        </CardContent>
      </Card>

      {/* Sezione 3 – Confronto mese precedente */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-primary" />
            Confronto mese precedente
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-6">
          <StatCard label="Risparmio mese precedente" value={fmt(cmp.prevSavings)} />
          <StatCard label="Differenza" value={fmt(cmp.diff)} sub={<DiffBadge value={cmp.diff} />} />
        </CardContent>
      </Card>
    </div>
  );
};

export default Report;
