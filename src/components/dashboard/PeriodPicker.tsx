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

interface PeriodPickerProps {
  value: PeriodRange;
  onChange: (range: PeriodRange) => void;
}

export function usePeriodState() {
  const [range, setRange] = useState<PeriodRange>(() => presetToRange("current_month"));
  const [activePreset, setActivePreset] = useState<PeriodPreset>("current_month");

  const applyPreset = (p: PeriodPreset) => {
    if (p === "custom") return; // handled by dialog
    setActivePreset(p);
    setRange(presetToRange(p));
  };

  const applyCustom = (r: PeriodRange) => {
    setActivePreset("custom");
    setRange(r);
  };

  return { range, activePreset, applyPreset, applyCustom };
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
  const [customFrom, setCustomFrom] = useState<Date | undefined>(undefined);
  const [customTo, setCustomTo] = useState<Date | undefined>(undefined);

  const label =
    activePreset === "custom"
      ? `${format(new Date(value.start), "dd MMM yyyy", { locale: it })} – ${format(new Date(value.end), "dd MMM yyyy", { locale: it })}`
      : PRESETS.find((p) => p.value === activePreset)?.label ?? "Periodo";

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
                  setCustomFrom(new Date(value.start));
                  setCustomTo(new Date(value.end));
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Periodo personalizzato</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Da</p>
              <Calendar
                mode="single"
                selected={customFrom}
                onSelect={setCustomFrom}
                className="p-2 pointer-events-auto"
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">A</p>
              <Calendar
                mode="single"
                selected={customTo}
                onSelect={setCustomTo}
                className="p-2 pointer-events-auto"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={!customFrom || !customTo}
              onClick={() => {
                if (customFrom && customTo) {
                  const s = customFrom < customTo ? customFrom : customTo;
                  const e = customFrom < customTo ? customTo : customFrom;
                  onCustom({ start: fmt(s), end: fmt(e) });
                  setDialogOpen(false);
                }
              }}
            >
              Applica
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
