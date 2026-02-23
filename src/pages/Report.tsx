import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useReport, type DateRange } from "@/hooks/useReport";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpDown,
  BarChart3,
  History,
  Calendar as CalendarIcon,
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { usePrivacy } from "@/contexts/PrivacyContext";

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

function buildPresetRange(preset: string): DateRange {
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

function rangeMonthCount(range: DateRange): number {
  const [sy, sm] = range.startDate.split("-").map(Number);
  const [ey, em] = range.endDate.split("-").map(Number);
  return (ey - sy) * 12 + (em - sm) + 1;
}

// ── compare mode helpers ──

type CompareMode = "prev_month" | "prev_period" | "year_ago" | "custom" | "none";

function getAvailableModes(months: number): { value: CompareMode; label: string }[] {
  if (months === 1) {
    return [
      { value: "prev_month", label: "Mese precedente" },
      { value: "year_ago", label: "Stesso periodo anno precedente" },
      { value: "custom", label: "Personalizzato" },
      { value: "none", label: "Nessuno" },
    ];
  }
  return [
    { value: "prev_period", label: "Periodo precedente (stessa durata)" },
    { value: "year_ago", label: "Stesso periodo anno precedente" },
    { value: "custom", label: "Personalizzato" },
    { value: "none", label: "Nessuno" },
  ];
}

function defaultCompareMode(months: number): CompareMode {
  return months === 1 ? "prev_month" : "prev_period";
}

function computeCompareRange(mode: CompareMode, range: DateRange): DateRange | null {
  const months = rangeMonthCount(range);
  switch (mode) {
    case "prev_month": {
      const now = new Date();
      const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return {
        startDate: monthStart(d.getFullYear(), d.getMonth() + 1),
        endDate: monthEnd(d.getFullYear(), d.getMonth() + 1),
      };
    }
    case "prev_period":
      return offsetRange(range, months);
    case "year_ago":
      return offsetRange(range, 12);
    case "none":
      return null;
    default:
      return null; // custom is handled externally
  }
}

// ── sub-components ──

function DiffBadge({ value, formatter }: { value: number; formatter?: (v: number) => string }) {
  const f = formatter ?? fmt;
  if (value > 0)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-400">
        <TrendingUp className="h-3.5 w-3.5" /> +{f(value)}
      </span>
    );
  if (value < 0)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-400">
        <TrendingDown className="h-3.5 w-3.5" /> {f(value)}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      <Minus className="h-3.5 w-3.5" /> {f(0)}
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
      <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
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

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Date | undefined;
  onChange: (d: Date) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, "dd MMM yyyy", { locale: it }) : "Seleziona data"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start" sideOffset={4}>
          <Calendar
            mode="single"
            selected={value}
            onSelect={(d) => {
              if (d) {
                onChange(d);
                setOpen(false);
              }
            }}
            initialFocus
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ── main component ──

const Report = () => {
  const { formatAmount: fmtAmount, isPrivacy } = usePrivacy();
  // ── Period state ──
  const [periodPreset, setPeriodPreset] = useState<string>("3");
  const [customPeriodOpen, setCustomPeriodOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState<Date | undefined>(undefined);
  const [draftTo, setDraftTo] = useState<Date | undefined>(undefined);
  const [appliedCustomRange, setAppliedCustomRange] = useState<DateRange | null>(null);

  // ── Compare state ──
  const [compareMode, setCompareMode] = useState<CompareMode>("prev_month");
  const [customCompareOpen, setCustomCompareOpen] = useState(false);
  const [draftCmpFrom, setDraftCmpFrom] = useState<Date | undefined>(undefined);
  const [draftCmpTo, setDraftCmpTo] = useState<Date | undefined>(undefined);
  const [appliedCustomCompare, setAppliedCustomCompare] = useState<DateRange | null>(null);

  // ── Computed range ──
  const range: DateRange = useMemo(() => {
    if (periodPreset === "custom" && appliedCustomRange) return appliedCustomRange;
    return buildPresetRange(periodPreset === "custom" ? "3" : periodPreset);
  }, [periodPreset, appliedCustomRange]);

  const months = rangeMonthCount(range);
  const availableModes = useMemo(() => getAvailableModes(months), [months]);

  // ── Auto-correct compare mode when period changes ──
  useEffect(() => {
    if (compareMode === "custom") return;
    if (compareMode === "none") return;
    const valid = availableModes.some((m) => m.value === compareMode);
    if (!valid) {
      setCompareMode(defaultCompareMode(months));
    }
  }, [months, availableModes, compareMode]);

  // ── Computed compare range ──
  const compareRange: DateRange | null = useMemo(() => {
    if (compareMode === "none") return null;
    if (compareMode === "custom") return appliedCustomCompare;
    return computeCompareRange(compareMode, range);
  }, [compareMode, range, appliedCustomCompare]);

  const compareModeLabel = availableModes.find((m) => m.value === compareMode)?.label ?? "";

  // ── Data ──
  const { data, isLoading } = useReport(range, compareRange);

  // ── Handlers ──
  function handlePeriodPreset(v: string) {
    if (!v) return;
    if (v === "custom") {
      setDraftFrom(new Date(range.startDate));
      setDraftTo(new Date(range.endDate));
      setCustomPeriodOpen(true);
    } else {
      setPeriodPreset(v);
    }
  }

  function applyCustomPeriod() {
    if (!draftFrom || !draftTo) return;
    const s = draftFrom <= draftTo ? draftFrom : draftTo;
    const e = draftFrom <= draftTo ? draftTo : draftFrom;
    setAppliedCustomRange({
      startDate: format(s, "yyyy-MM-dd"),
      endDate: format(e, "yyyy-MM-dd"),
    });
    setPeriodPreset("custom");
    setCustomPeriodOpen(false);
  }

  function handleCompareMode(v: string) {
    const mode = v as CompareMode;
    if (mode === "custom") {
      const cr = compareRange ?? range;
      setDraftCmpFrom(new Date(cr.startDate));
      setDraftCmpTo(new Date(cr.endDate));
      setCustomCompareOpen(true);
    }
    setCompareMode(mode);
  }

  function applyCustomCompare() {
    if (!draftCmpFrom || !draftCmpTo) return;
    const s = draftCmpFrom <= draftCmpTo ? draftCmpFrom : draftCmpTo;
    const e = draftCmpFrom <= draftCmpTo ? draftCmpTo : draftCmpFrom;
    setAppliedCustomCompare({
      startDate: format(s, "yyyy-MM-dd"),
      endDate: format(e, "yyyy-MM-dd"),
    });
    setCustomCompareOpen(false);
  }

  // ── Loading ──
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

      {/* ── Filter Bar ── */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* Period */}
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium whitespace-nowrap">Periodo:</span>
              <ToggleGroup type="single" value={periodPreset} onValueChange={handlePeriodPreset} size="sm" className="bg-muted/50 rounded-lg p-0.5">
                {["1", "3", "6", "12"].map((v) => (
                  <ToggleGroupItem
                    key={v}
                    value={v}
                    className="text-xs px-3 rounded-md data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:font-semibold data-[state=on]:shadow-sm data-[state=off]:text-muted-foreground data-[state=off]:hover:text-foreground"
                  >
                    {v}m
                  </ToggleGroupItem>
                ))}
                <ToggleGroupItem
                  value="custom"
                  className="text-xs px-3 rounded-md data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:font-semibold data-[state=on]:shadow-sm data-[state=off]:text-muted-foreground data-[state=off]:hover:text-foreground"
                >
                  <CalendarIcon className="h-3.5 w-3.5 mr-1" />Personalizza
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Compare */}
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium whitespace-nowrap">Confronto:</span>
              <Select value={compareMode} onValueChange={handleCompareMode}>
                <SelectTrigger className="w-auto min-w-[220px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableModes.map(({ value, label }) => (
                    <SelectItem key={value} value={value} className="text-xs">{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Summary */}
          <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-xs text-muted-foreground">
            <span>
              Periodo: <strong className="text-foreground">{fmtMonth(range.startDate)} – {fmtMonth(range.endDate)}</strong>
            </span>
            {compareRange && (
              <span>
                Confronto: <strong className="text-foreground">{fmtMonth(compareRange.startDate)} – {fmtMonth(compareRange.endDate)}</strong>
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Card 1 – Periodo selezionato ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Periodo selezionato
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <StatCard label="Entrate" value={fmtAmount(p.income)} colorClass="text-green-600 dark:text-green-400" />
          <StatCard label="Uscite" value={fmtAmount(p.expense)} colorClass="text-red-600 dark:text-red-400" />
          <StatCard label="Risparmio netto" value={fmtAmount(p.savings)} sub={<DiffBadge value={p.savings} formatter={fmtAmount} />} />
          <StatCard label="% Risparmio" value={isPrivacy ? "••••" : `${p.savingsRate.toFixed(1)}%`} />
        </CardContent>
      </Card>

      {/* ── Card 2 – Confronto (only if active) ── */}
      {cmp && diff && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-primary" />
              Confronto: {compareModeLabel}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <StatCard label="Entrate (confronto)" value={fmtAmount(cmp.income)} colorClass="text-green-600 dark:text-green-400" />
            <StatCard label="Uscite (confronto)" value={fmtAmount(cmp.expense)} colorClass="text-red-600 dark:text-red-400" />
            <StatCard label="Risparmio (confronto)" value={fmtAmount(cmp.savings)} />
            <StatCard label="Differenza risparmio" value={fmtAmount(diff.savings)} sub={<DiffBadge value={diff.savings} formatter={fmtAmount} />} />
          </CardContent>
        </Card>
      )}

      {/* ── Card 3 – Media mensile ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            Media mensile
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Calcolata sul periodo selezionato ({avg.monthCount} {avg.monthCount === 1 ? "mese" : "mesi"})
          </p>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <StatCard label="Media entrate" value={fmtAmount(avg.income)} colorClass="text-green-600 dark:text-green-400" />
          <StatCard label="Media uscite" value={fmtAmount(avg.expense)} colorClass="text-red-600 dark:text-red-400" />
          <StatCard label="Media risparmio" value={fmtAmount(avg.savings)} sub={<DiffBadge value={avg.savings} formatter={fmtAmount} />} />
        </CardContent>
      </Card>

      {/* ── Custom Period Dialog ── */}
      <Dialog open={customPeriodOpen} onOpenChange={setCustomPeriodOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Periodo personalizzato</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <DateField label="Da" value={draftFrom} onChange={(d) => { setDraftFrom(d); if (draftTo && d > draftTo) setDraftTo(d); }} />
            <DateField label="A" value={draftTo} onChange={(d) => { setDraftTo(d); if (draftFrom && d < draftFrom) setDraftFrom(d); }} />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setCustomPeriodOpen(false)}>Annulla</Button>
            <Button onClick={applyCustomPeriod} disabled={!draftFrom || !draftTo}>Applica</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Custom Compare Dialog ── */}
      <Dialog open={customCompareOpen} onOpenChange={setCustomCompareOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Periodo di confronto personalizzato</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <DateField label="Da" value={draftCmpFrom} onChange={(d) => { setDraftCmpFrom(d); if (draftCmpTo && d > draftCmpTo) setDraftCmpTo(d); }} />
            <DateField label="A" value={draftCmpTo} onChange={(d) => { setDraftCmpTo(d); if (draftCmpFrom && d < draftCmpFrom) setDraftCmpFrom(d); }} />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setCustomCompareOpen(false)}>Annulla</Button>
            <Button onClick={applyCustomCompare} disabled={!draftCmpFrom || !draftCmpTo}>Applica</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Report;
