import { useState } from "react";
import { format } from "date-fns";
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
import { useDateRange, type PeriodPreset } from "@/contexts/DateRangeContext";

const PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: "current_month", label: "Mese corrente" },
  { value: "previous_month", label: "Mese precedente" },
  { value: "last_3_months", label: "Ultimi 3 mesi" },
  { value: "last_6_months", label: "Ultimi 6 mesi" },
  { value: "ytd", label: "Da inizio anno" },
  { value: "custom", label: "Personalizzato…" },
];

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

export function PeriodPicker() {
  const { dateRange, applyPreset, applyCustom } = useDateRange();

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState<Date | undefined>(undefined);
  const [draftTo, setDraftTo] = useState<Date | undefined>(undefined);

  const label =
    dateRange.preset === "custom"
      ? `${format(new Date(dateRange.from), "dd MMM yy", { locale: it })} – ${format(new Date(dateRange.to), "dd MMM yy", { locale: it })}`
      : PRESETS.find((p) => p.value === dateRange.preset)?.label ?? "Periodo";

  // When "Da" changes and is after "A", auto-fix "A"
  const handleFromChange = (d: Date) => {
    setDraftFrom(d);
    if (draftTo && d > draftTo) {
      setDraftTo(d);
    }
  };

  const handleToChange = (d: Date) => {
    setDraftTo(d);
    if (draftFrom && d < draftFrom) {
      setDraftFrom(d);
    }
  };

  const handleApply = () => {
    if (!draftFrom || !draftTo) return;
    const s = draftFrom <= draftTo ? draftFrom : draftTo;
    const e = draftFrom <= draftTo ? draftTo : draftFrom;
    applyCustom(format(s, "yyyy-MM-dd"), format(e, "yyyy-MM-dd"));
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
                dateRange.preset === p.value
                  ? "bg-accent text-accent-foreground font-medium"
                  : "hover:bg-muted"
              )}
              onClick={() => {
                if (p.value === "custom") {
                  setDraftFrom(new Date(dateRange.from));
                  setDraftTo(new Date(dateRange.to));
                  setDialogOpen(true);
                } else {
                  applyPreset(p.value as Exclude<PeriodPreset, "custom">);
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
