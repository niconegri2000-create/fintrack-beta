import { useState } from "react";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear } from "date-fns";
import { it } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export type PeriodPreset =
  | "current_month"
  | "previous_month"
  | "last_3_months"
  | "last_6_months"
  | "ytd"
  | "custom";

interface PeriodRange {
  start: string; // YYYY-MM-DD
  end: string;
}

const PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: "current_month", label: "Mese corrente" },
  { value: "previous_month", label: "Mese precedente" },
  { value: "last_3_months", label: "Ultimi 3 mesi" },
  { value: "last_6_months", label: "Ultimi 6 mesi" },
  { value: "ytd", label: "Da inizio anno" },
  { value: "custom", label: "Personalizzato…" },
];

function presetToRange(preset: PeriodPreset): PeriodRange {
  const today = new Date();
  switch (preset) {
    case "current_month":
      return { start: fmt(startOfMonth(today)), end: fmt(endOfMonth(today)) };
    case "previous_month": {
      const prev = subMonths(today, 1);
      return { start: fmt(startOfMonth(prev)), end: fmt(endOfMonth(prev)) };
    }
    case "last_3_months": {
      const from = startOfMonth(subMonths(today, 2));
      return { start: fmt(from), end: fmt(endOfMonth(today)) };
    }
    case "last_6_months": {
      const from = startOfMonth(subMonths(today, 5));
      return { start: fmt(from), end: fmt(endOfMonth(today)) };
    }
    case "ytd":
      return { start: fmt(startOfYear(today)), end: fmt(endOfMonth(today)) };
    default:
      return { start: fmt(startOfMonth(today)), end: fmt(endOfMonth(today)) };
  }
}

function fmt(d: Date) {
  return format(d, "yyyy-MM-dd");
}

export function usePeriodState() {
  const [range, setRange] = useState<PeriodRange>(() => presetToRange("current_month"));
  const [activePreset, setActivePreset] = useState<PeriodPreset>("current_month");

  const applyPreset = (p: PeriodPreset) => {
    if (p === "custom") return;
    setActivePreset(p);
    setRange(presetToRange(p));
  };

  const applyCustom = (r: PeriodRange) => {
    setActivePreset("custom");
    setRange(r);
  };

  return { range, activePreset, applyPreset, applyCustom };
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Date | undefined;
  onChange: (d: Date | undefined) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      <Popover>
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
            onSelect={onChange}
            initialFocus
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function PeriodPicker({
  value,
  activePreset,
  onPreset,
  onCustom,
}: {
  value: PeriodRange;
  activePreset: PeriodPreset;
  onPreset: (p: PeriodPreset) => void;
  onCustom: (r: PeriodRange) => void;
}) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState<Date | undefined>(undefined);
  const [draftTo, setDraftTo] = useState<Date | undefined>(undefined);

  const isValidRange = draftFrom && draftTo;

  const label =
    activePreset === "custom"
      ? `${format(new Date(value.start), "dd MMM yy", { locale: it })} – ${format(new Date(value.end), "dd MMM yy", { locale: it })}`
      : PRESETS.find((p) => p.value === activePreset)?.label ?? "Periodo";

  const handleApply = () => {
    if (!draftFrom || !draftTo) return;
    const s = draftFrom < draftTo ? draftFrom : draftTo;
    const e = draftFrom < draftTo ? draftTo : draftFrom;
    onCustom({ start: fmt(s), end: fmt(e) });
    setDialogOpen(false);
  };

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <CalendarIcon className="h-4 w-4" />
            {label}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-1" align="end">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              className={cn(
                "w-full text-left px-3 py-2 text-sm rounded-md transition-colors",
                activePreset === p.value
                  ? "bg-accent text-accent-foreground font-medium"
                  : "hover:bg-muted"
              )}
              onClick={() => {
                if (p.value === "custom") {
                  setDraftFrom(new Date(value.start));
                  setDraftTo(new Date(value.end));
                  setDialogOpen(true);
                } else {
                  onPreset(p.value);
                }
                setPopoverOpen(false);
              }}
            >
              {p.label}
            </button>
          ))}
        </PopoverContent>
      </Popover>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Periodo personalizzato</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <DateField label="Da" value={draftFrom} onChange={setDraftFrom} />
            <DateField label="A" value={draftTo} onChange={setDraftTo} />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Annulla
            </Button>
            <Button disabled={!isValidRange} onClick={handleApply}>
              Applica
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
