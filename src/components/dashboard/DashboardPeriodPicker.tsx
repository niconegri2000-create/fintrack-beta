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

export type DashboardPeriodPreset =
  | "current_month"
  | "previous_month"
  | "last_3_months"
  | "last_6_months"
  | "last_12_months"
  | "ytd"
  | "all"
  | "custom";

const PRESETS: { value: DashboardPeriodPreset; label: string }[] = [
  { value: "current_month", label: "Mese corrente" },
  { value: "previous_month", label: "Mese precedente" },
  { value: "last_3_months", label: "Ultimi 3 mesi" },
  { value: "last_6_months", label: "Ultimi 6 mesi" },
  { value: "last_12_months", label: "Ultimi 12 mesi" },
  { value: "ytd", label: "Da inizio anno" },
  { value: "all", label: "Tutto" },
  { value: "custom", label: "Personalizzato…" },
];

function fmt(d: Date) {
  return format(d, "yyyy-MM-dd");
}

export function presetToLocalRange(preset: Exclude<DashboardPeriodPreset, "custom">): { from: string; to: string } {
  const today = new Date();
  switch (preset) {
    case "current_month":
      return { from: fmt(startOfMonth(today)), to: fmt(endOfMonth(today)) };
    case "previous_month": {
      const prev = subMonths(today, 1);
      return { from: fmt(startOfMonth(prev)), to: fmt(endOfMonth(prev)) };
    }
    case "last_3_months":
      return { from: fmt(startOfMonth(subMonths(today, 2))), to: fmt(endOfMonth(today)) };
    case "last_6_months":
      return { from: fmt(startOfMonth(subMonths(today, 5))), to: fmt(endOfMonth(today)) };
    case "last_12_months":
      return { from: fmt(startOfMonth(subMonths(today, 11))), to: fmt(endOfMonth(today)) };
    case "ytd":
      return { from: fmt(startOfYear(today)), to: fmt(endOfMonth(today)) };
    case "all":
      return { from: "2000-01-01", to: fmt(endOfMonth(today)) };
  }
}

/**
 * Count the number of calendar months covered by a date range.
 * E.g. 2025-01-01 to 2025-03-31 = 3 months.
 * Partial months count as 1.
 */
export function countMonthsInRange(from: string, to: string): number {
  const d1 = new Date(from);
  const d2 = new Date(to);
  const months = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth()) + 1;
  return Math.max(1, months);
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

interface DashboardPeriodPickerProps {
  preset: DashboardPeriodPreset;
  customRange: { from: string; to: string } | null;
  onPresetChange: (p: DashboardPeriodPreset) => void;
  onCustomChange: (from: string, to: string) => void;
}

export function DashboardPeriodPicker({ preset, customRange, onPresetChange, onCustomChange }: DashboardPeriodPickerProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState<Date | undefined>(undefined);
  const [draftTo, setDraftTo] = useState<Date | undefined>(undefined);

  const label = (() => {
    if (preset === "custom" && customRange) {
      return `${format(new Date(customRange.from), "dd MMM yy", { locale: it })} – ${format(new Date(customRange.to), "dd MMM yy", { locale: it })}`;
    }
    return PRESETS.find((p) => p.value === preset)?.label ?? "Periodo";
  })();

  const handleFromChange = (d: Date) => {
    setDraftFrom(d);
    if (draftTo && d > draftTo) setDraftTo(d);
  };

  const handleToChange = (d: Date) => {
    setDraftTo(d);
    if (draftFrom && d < draftFrom) setDraftFrom(d);
  };

  const handleApply = () => {
    if (!draftFrom || !draftTo) return;
    const s = draftFrom <= draftTo ? draftFrom : draftTo;
    const e = draftFrom <= draftTo ? draftTo : draftFrom;
    onCustomChange(format(s, "yyyy-MM-dd"), format(e, "yyyy-MM-dd"));
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
                preset === p.value
                  ? "bg-accent text-accent-foreground font-medium"
                  : "hover:bg-muted"
              )}
              onClick={() => {
                if (p.value === "custom") {
                  const currentRange = preset !== "custom"
                    ? presetToLocalRange(preset as Exclude<DashboardPeriodPreset, "custom">)
                    : customRange ?? presetToLocalRange("current_month");
                  setDraftFrom(new Date(currentRange.from));
                  setDraftTo(new Date(currentRange.to));
                  setDialogOpen(true);
                } else {
                  onPresetChange(p.value);
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
            <DateField label="Da" value={draftFrom} onChange={handleFromChange} />
            <DateField label="A" value={draftTo} onChange={handleToChange} />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Annulla
            </Button>
            <Button disabled={!draftFrom || !draftTo} onClick={handleApply}>
              Applica
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
