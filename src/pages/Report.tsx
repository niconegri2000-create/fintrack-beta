import { useState, useMemo, useCallback, useEffect } from "react";
import { format, subYears, startOfMonth, endOfMonth } from "date-fns";
import { it } from "date-fns/locale";
import { useReport, type DateRange } from "@/hooks/useReport";
import { useAccountContext } from "@/contexts/AccountContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpDown,
  BarChart3,
  Calendar as CalendarIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

function toDateStr(d: Date) {
  return format(d, "yyyy-MM-dd");
}

function fmtLabel(d: Date) {
  return format(d, "dd MMM yyyy", { locale: it });
}


// ── persistence ──

const STORAGE_KEY = "confronto_ranges";

interface StoredRanges {
  aFrom: string;
  aTo: string;
  bPreset: string;
  bFrom: string;
  bTo: string;
}

function loadStored(): StoredRanges | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p.aFrom && p.aTo && p.bFrom && p.bTo) return p as StoredRanges;
    }
  } catch { /* ignore */ }
  return null;
}

function saveStored(s: StoredRanges) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

// ── preset helpers for Periodo B ──

type BPreset = "year_ago" | "custom";

const B_PRESETS: { value: BPreset; label: string }[] = [
  { value: "year_ago", label: "Stesso periodo anno scorso" },
  { value: "custom", label: "Personalizzato" },
];

function computeB(aFrom: Date, aTo: Date): { from: Date; to: Date } {
  return { from: subYears(aFrom, 1), to: subYears(aTo, 1) };
}

// ── sub-components ──

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
            {value ? fmtLabel(value) : "Seleziona data"}
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

// ── main component ──

function getDefaults() {
  const stored = loadStored();
  const now = new Date();
  const defAFrom = startOfMonth(now);
  const defATo = endOfMonth(now);

  if (stored) {
    const aF = new Date(stored.aFrom);
    const aT = new Date(stored.aTo);
    const bF = new Date(stored.bFrom);
    const bT = new Date(stored.bTo);
    return {
      aFrom: aF, aTo: aT,
      bFrom: bF, bTo: bT,
      bPreset: (stored.bPreset === "year_ago" ? "year_ago" : "custom") as BPreset,
    };
  }

  const b = computeB(defAFrom, defATo);
  return {
    aFrom: defAFrom, aTo: defATo,
    bFrom: b.from, bTo: b.to,
    bPreset: "year_ago" as BPreset,
  };
}

const Report = () => {
  const { formatAmount: fmtAmount, isPrivacy } = usePrivacy();
  const { selectedAccountId } = useAccountContext();

  const defaults = useMemo(getDefaults, []);

  // ── Draft state (editable, not yet applied) ──
  const [aFrom, setAFrom] = useState<Date>(defaults.aFrom);
  const [aTo, setATo] = useState<Date>(defaults.aTo);
  const [bFrom, setBFrom] = useState<Date>(defaults.bFrom);
  const [bTo, setBTo] = useState<Date>(defaults.bTo);
  const [bPreset, setBPreset] = useState<BPreset>(defaults.bPreset);

  // ── Applied state (what the query uses) ──
  const [appliedA, setAppliedA] = useState<DateRange>({
    startDate: toDateStr(defaults.aFrom),
    endDate: toDateStr(defaults.aTo),
  });
  const [appliedB, setAppliedB] = useState<DateRange>({
    startDate: toDateStr(defaults.bFrom),
    endDate: toDateStr(defaults.bTo),
  });

  // ── Auto-update B when preset changes or A changes (only for non-custom) ──
  const updateBFromPreset = useCallback((preset: BPreset, fromA: Date, toA: Date) => {
    if (preset === "custom") return;
    const b = computeB(fromA, toA);
    setBFrom(b.from);
    setBTo(b.to);
  }, []);

  const handleBPresetChange = (v: string) => {
    const preset = v as BPreset;
    setBPreset(preset);
    updateBFromPreset(preset, aFrom, aTo);
  };

  const handleAFromChange = (d: Date) => {
    setAFrom(d);
    if (d > aTo) setATo(d);
    if (bPreset !== "custom") {
      const effectiveTo = d > aTo ? d : aTo;
      updateBFromPreset(bPreset, d, effectiveTo);
    }
  };

  const handleAToChange = (d: Date) => {
    setATo(d);
    if (d < aFrom) setAFrom(d);
    if (bPreset !== "custom") {
      const effectiveFrom = d < aFrom ? d : aFrom;
      updateBFromPreset(bPreset, effectiveFrom, d);
    }
  };

  const handleBFromChange = (d: Date) => {
    setBFrom(d);
    if (d > bTo) setBTo(d);
    setBPreset("custom");
  };

  const handleBToChange = (d: Date) => {
    setBTo(d);
    if (d < bFrom) setBFrom(d);
    setBPreset("custom");
  };

  // ── Validation ──
  const aValid = aFrom <= aTo;
  const bValid = bFrom <= bTo;
  const canApply = aValid && bValid;

  // ── Apply ──
  const handleApply = () => {
    if (!canApply) return;
    const newA: DateRange = {
      startDate: toDateStr(aFrom <= aTo ? aFrom : aTo),
      endDate: toDateStr(aFrom <= aTo ? aTo : aFrom),
    };
    const newB: DateRange = {
      startDate: toDateStr(bFrom <= bTo ? bFrom : bTo),
      endDate: toDateStr(bFrom <= bTo ? bTo : bFrom),
    };
    setAppliedA(newA);
    setAppliedB(newB);
    saveStored({
      aFrom: newA.startDate,
      aTo: newA.endDate,
      bPreset,
      bFrom: newB.startDate,
      bTo: newB.endDate,
    });
  };

  // Auto-apply on mount
  useEffect(() => {
    handleApply();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Data ──
  const { data, isLoading } = useReport(appliedA, appliedB, selectedAccountId);

  // ── Loading ──
  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Confronto</h1>
          <p className="text-muted-foreground text-sm mt-1">Confronta due periodi</p>
        </div>
        <SectionSkeleton />
        <SectionSkeleton />
        <SectionSkeleton />
      </div>
    );
  }

  const { period: p, compare: cmp, diff } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Confronto</h1>
        <p className="text-muted-foreground text-sm mt-1">Confronta due periodi</p>
      </div>

      {/* ── Filter Card ── */}
      <Card>
        <CardContent className="py-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Periodo A */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 h-7">
                <BarChart3 className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Periodo A</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <DateField label="Da" value={aFrom} onChange={handleAFromChange} />
                <DateField label="A" value={aTo} onChange={handleAToChange} />
              </div>
              {!aValid && (
                <p className="text-xs text-destructive">La data "Da" deve essere prima di "A"</p>
              )}
            </div>

            {/* Periodo B */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 h-7">
                <ArrowUpDown className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Periodo B</span>
                <Select value={bPreset} onValueChange={handleBPresetChange}>
                  <SelectTrigger className="w-auto min-w-[200px] h-7 text-xs ml-auto">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {B_PRESETS.map(({ value, label }) => (
                      <SelectItem key={value} value={value} className="text-xs">{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <DateField label="Da" value={bFrom} onChange={handleBFromChange} />
                <DateField label="A" value={bTo} onChange={handleBToChange} />
              </div>
              {!bValid && (
                <p className="text-xs text-destructive">La data "Da" deve essere prima di "A"</p>
              )}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-5 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              <span>A: <strong className="text-foreground">{fmtLabel(aFrom)} – {fmtLabel(aTo)}</strong></span>
              <span className="mx-3">·</span>
              <span>B: <strong className="text-foreground">{fmtLabel(bFrom)} – {fmtLabel(bTo)}</strong></span>
            </div>
            <Button onClick={handleApply} disabled={!canApply} size="sm">
              Confronta
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Card 1 – Periodo A ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Periodo A
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <StatCard label="Entrate" value={fmtAmount(p.income)} colorClass="text-green-600 dark:text-green-400" />
          <StatCard label="Uscite" value={fmtAmount(p.expense)} colorClass="text-red-600 dark:text-red-400" />
          <StatCard label="Risparmio netto" value={fmtAmount(p.savings)} />
          <StatCard label="% Risparmio" value={isPrivacy ? "••••" : `${p.savingsRate.toFixed(1)}%`} />
        </CardContent>
      </Card>

      {/* ── Card 2 – Periodo B ── */}
      {cmp && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-primary" />
              Periodo B
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <StatCard label="Entrate" value={fmtAmount(cmp.income)} colorClass="text-green-600 dark:text-green-400" />
            <StatCard label="Uscite" value={fmtAmount(cmp.expense)} colorClass="text-red-600 dark:text-red-400" />
            <StatCard label="Risparmio netto" value={fmtAmount(cmp.savings)} />
            <StatCard label="% Risparmio" value={isPrivacy ? "••••" : `${cmp.savingsRate.toFixed(1)}%`} />
          </CardContent>
        </Card>
      )}

      {/* ── Card 3 – Confronto ── */}
      {cmp && (() => {
        const diffIncome = p.income - cmp.income;
        const diffExpense = p.expense - cmp.expense;
        const diffSavings = p.savings - cmp.savings;
        const diffSavingsPercent = cmp.savings !== 0 ? ((p.savings - cmp.savings) / Math.abs(cmp.savings)) * 100 : 0;

        const colorFor = (v: number) =>
          v > 0 ? "text-green-600 dark:text-green-400" : v < 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground";
        const prefix = (v: number) => (v > 0 ? "+" : "");
        const fmtDiff = (v: number) => `${prefix(v)}${fmtAmount(v)}`;
        const fmtPctDiff = (v: number) => isPrivacy ? "••••" : `${prefix(v)}${v.toFixed(1)}%`;

        return (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Confronto
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <StatCard label="Differenza entrate" value={fmtDiff(diffIncome)} colorClass={colorFor(diffIncome)} />
              <StatCard label="Differenza uscite" value={fmtDiff(diffExpense)} colorClass={colorFor(diffExpense)} />
              <StatCard label="Differenza risparmio" value={fmtDiff(diffSavings)} colorClass={colorFor(diffSavings)} />
              <StatCard label="% Differenza risparmio" value={fmtPctDiff(diffSavingsPercent)} colorClass={colorFor(diffSavingsPercent)} />
            </CardContent>
          </Card>
        );
      })()}

    </div>
  );
};

export default Report;
