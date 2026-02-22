import { useState, useMemo } from "react";
import { useReport, type DateRange } from "@/hooks/useReport";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpDown,
  BarChart3,
  History,
  Calendar,
  SlidersHorizontal,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

// ── helpers ──

function fmt(n: number) {
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

function fmtMonth(dateStr: string) {
  const [y, m] = dateStr.split("-");
  const months = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
  return `${months[Number(m) - 1]} ${y}`;
}

function lastDayOfMonth(y: number, m: number) {
  return new Date(y, m, 0).getDate();
}

function monthStart(y: number, m: number) {
  return `${y}-${String(m).padStart(2, "0")}-01`;
}

function monthEnd(y: number, m: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(lastDayOfMonth(y, m)).padStart(2, "0")}`;
}

function offsetRange(range: DateRange, months: number): DateRange {
  const [sy, sm] = range.startDate.split("-").map(Number);
  const [ey, em] = range.endDate.split("-").map(Number);
  const ns = new Date(sy, sm - 1 - months, 1);
  const ne = new Date(ey, em - 1 - months, 1);
  return {
    startDate: monthStart(ns.getFullYear(), ns.getMonth() + 1),
    endDate: monthEnd(ne.getFullYear(), ne.getMonth() + 1),
  };
}

function yearAgoRange(range: DateRange): DateRange {
  return offsetRange(range, 12);
}

function prevPeriodRange(range: DateRange): DateRange {
  const [sy, sm] = range.startDate.split("-").map(Number);
  const [ey, em] = range.endDate.split("-").map(Number);
  const dur = (ey - sy) * 12 + (em - sm) + 1;
  return offsetRange(range, dur);
}

function prevMonthRange(): DateRange {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return {
    startDate: monthStart(d.getFullYear(), d.getMonth() + 1),
    endDate: monthEnd(d.getFullYear(), d.getMonth() + 1),
  };
}

function buildRange(preset: string): DateRange {
  const now = new Date();
  const curY = now.getFullYear();
  const curM = now.getMonth() + 1;
  const months = Number(preset);
  const start = new Date(curY, curM - months, 1);
  return {
    startDate: monthStart(start.getFullYear(), start.getMonth() + 1),
    endDate: monthEnd(curY, curM),
  };
}

// ── sub-components ──

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

// ── month input helper ──

function MonthInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      <Input type="month" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

// ── compare modes ──

type CompareMode = "prev_month" | "year_ago" | "prev_period" | "custom";

const COMPARE_LABELS: Record<CompareMode, string> = {
  prev_month: "Mese precedente",
  year_ago: "Stesso periodo anno precedente",
  prev_period: "Periodo precedente (stessa durata)",
  custom: "Personalizzato",
};

// ── main component ──

const Report = () => {
  // period state
  const [periodPreset, setPeriodPreset] = useState<string>("3");
  const [customPeriodOpen, setCustomPeriodOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [appliedCustomRange, setAppliedCustomRange] = useState<DateRange | null>(null);

  // compare state
  const [compareMode, setCompareMode] = useState<CompareMode>("prev_month");
  const [customCompareOpen, setCustomCompareOpen] = useState(false);
  const [customCmpFrom, setCustomCmpFrom] = useState("");
  const [customCmpTo, setCustomCmpTo] = useState("");
  const [appliedCustomCompare, setAppliedCustomCompare] = useState<DateRange | null>(null);

  // compute ranges
  const range: DateRange = useMemo(() => {
    if (periodPreset === "custom" && appliedCustomRange) return appliedCustomRange;
    return buildRange(periodPreset === "custom" ? "3" : periodPreset);
  }, [periodPreset, appliedCustomRange]);

  const compareRange: DateRange = useMemo(() => {
    switch (compareMode) {
      case "prev_month":
        return prevMonthRange();
      case "year_ago":
        return yearAgoRange(range);
      case "prev_period":
        return prevPeriodRange(range);
      case "custom":
        return appliedCustomCompare ?? prevMonthRange();
    }
  }, [compareMode, range, appliedCustomCompare]);

  const { data, isLoading } = useReport(range, compareRange);

  // handlers
  function handlePeriodPreset(v: string) {
    if (!v) return;
    if (v === "custom") {
      // pre-fill with current range
      setCustomFrom(range.startDate.slice(0, 7));
      setCustomTo(range.endDate.slice(0, 7));
      setCustomPeriodOpen(true);
    } else {
      setPeriodPreset(v);
    }
  }

  function applyCustomPeriod() {
    if (!customFrom || !customTo) return;
    const [fy, fm] = customFrom.split("-").map(Number);
    const [ty, tm] = customTo.split("-").map(Number);
    setAppliedCustomRange({
      startDate: monthStart(fy, fm),
      endDate: monthEnd(ty, tm),
    });
    setPeriodPreset("custom");
    setCustomPeriodOpen(false);
  }

  function handleCompareMode(v: string) {
    if (v === "custom") {
      setCustomCmpFrom(compareRange.startDate.slice(0, 7));
      setCustomCmpTo(compareRange.endDate.slice(0, 7));
      setCustomCompareOpen(true);
    }
    setCompareMode(v as CompareMode);
  }

  function applyCustomCompare() {
    if (!customCmpFrom || !customCmpTo) return;
    const [fy, fm] = customCmpFrom.split("-").map(Number);
    const [ty, tm] = customCmpTo.split("-").map(Number);
    setAppliedCustomCompare({
      startDate: monthStart(fy, fm),
      endDate: monthEnd(ty, tm),
    });
    setCustomCompareOpen(false);
  }

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

  const { period: p, avgMonths: avg, compare: cmp, diff } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Report</h1>
        <p className="text-muted-foreground text-sm mt-1">Panoramica finanziaria</p>
      </div>

      {/* ── Filter bar ── */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* Period selector */}
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium whitespace-nowrap">Periodo:</span>
              <ToggleGroup
                type="single"
                value={periodPreset}
                onValueChange={handlePeriodPreset}
                size="sm"
              >
                {["3", "6", "12"].map((v) => (
                  <ToggleGroupItem key={v} value={v} className="text-xs px-3">
                    {v}m
                  </ToggleGroupItem>
                ))}
                <ToggleGroupItem value="custom" className="text-xs px-3">
                  <Calendar className="h-3.5 w-3.5 mr-1" />
                  Custom
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Compare selector */}
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium whitespace-nowrap">Confronto:</span>
              <Select value={compareMode} onValueChange={handleCompareMode}>
                <SelectTrigger className="w-auto min-w-[200px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(COMPARE_LABELS) as [CompareMode, string][]).map(([k, l]) => (
                    <SelectItem key={k} value={k} className="text-xs">
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Summary line */}
          <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-xs text-muted-foreground">
            <span>
              Periodo: <strong className="text-foreground">{fmtMonth(range.startDate)} – {fmtMonth(range.endDate)}</strong>
            </span>
            <span>
              Confronto: <strong className="text-foreground">{fmtMonth(compareRange.startDate)} – {fmtMonth(compareRange.endDate)}</strong>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ── Sezione 1 – Periodo selezionato ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Periodo selezionato
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <StatCard label="Entrate" value={fmt(p.income)} colorClass="text-green-600 dark:text-green-400" />
          <StatCard label="Uscite" value={fmt(p.expense)} colorClass="text-red-600 dark:text-red-400" />
          <StatCard label="Risparmio netto" value={fmt(p.savings)} sub={<DiffBadge value={p.savings} />} />
          <StatCard label="% Risparmio" value={`${p.savingsRate.toFixed(1)}%`} />
        </CardContent>
      </Card>

      {/* ── Sezione 2 – Media mensile ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            Media mensile ({avg.monthCount} {avg.monthCount === 1 ? "mese" : "mesi"})
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <StatCard label="Media entrate" value={fmt(avg.income)} colorClass="text-green-600 dark:text-green-400" />
          <StatCard label="Media uscite" value={fmt(avg.expense)} colorClass="text-red-600 dark:text-red-400" />
          <StatCard label="Media risparmio" value={fmt(avg.savings)} sub={<DiffBadge value={avg.savings} />} />
        </CardContent>
      </Card>

      {/* ── Sezione 3 – Confronto ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-primary" />
            Confronto: {COMPARE_LABELS[compareMode]}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <StatCard label="Entrate (confronto)" value={fmt(cmp.income)} colorClass="text-green-600 dark:text-green-400" />
          <StatCard label="Uscite (confronto)" value={fmt(cmp.expense)} colorClass="text-red-600 dark:text-red-400" />
          <StatCard label="Risparmio (confronto)" value={fmt(cmp.savings)} />
          <StatCard
            label="Differenza risparmio"
            value={fmt(diff.savings)}
            sub={
              <DiffBadge value={diff.savings} />
            }
          />
        </CardContent>
      </Card>

      {/* ── Custom Period Dialog ── */}
      <Dialog open={customPeriodOpen} onOpenChange={setCustomPeriodOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Periodo personalizzato</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <MonthInput label="Da" value={customFrom} onChange={setCustomFrom} />
            <MonthInput label="A" value={customTo} onChange={setCustomTo} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomPeriodOpen(false)}>
              Annulla
            </Button>
            <Button onClick={applyCustomPeriod} disabled={!customFrom || !customTo || customFrom > customTo}>
              Applica
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Custom Compare Dialog ── */}
      <Dialog open={customCompareOpen} onOpenChange={setCustomCompareOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Periodo di confronto personalizzato</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <MonthInput label="Da" value={customCmpFrom} onChange={setCustomCmpFrom} />
            <MonthInput label="A" value={customCmpTo} onChange={setCustomCmpTo} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomCompareOpen(false)}>
              Annulla
            </Button>
            <Button onClick={applyCustomCompare} disabled={!customCmpFrom || !customCmpTo || customCmpFrom > customCmpTo}>
              Applica
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Report;
