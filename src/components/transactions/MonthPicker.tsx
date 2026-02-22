import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const MONTH_NAMES = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

const MONTH_SHORT = [
  "Gen", "Feb", "Mar", "Apr", "Mag", "Giu",
  "Lug", "Ago", "Set", "Ott", "Nov", "Dic",
];

interface MonthPickerProps {
  value: string; // "YYYY-MM"
  onChange: (v: string) => void;
}

function buildValue(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function MonthPicker({ value, onChange }: MonthPickerProps) {
  const [y, m] = value.split("-").map(Number);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(y);

  const shift = (delta: number) => {
    const d = new Date(y, m - 1 + delta, 1);
    onChange(buildValue(d.getFullYear(), d.getMonth() + 1));
  };

  const handleOpenChange = (open: boolean) => {
    if (open) setPickerYear(y);
    setPopoverOpen(open);
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => shift(-1)}>
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Popover open={popoverOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button className="text-sm font-medium min-w-[140px] text-center rounded-md px-3 py-1.5 hover:bg-muted transition-colors">
            {MONTH_NAMES[m - 1]} {y}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-3" align="center">
          {/* Year selector */}
          <div className="flex items-center justify-between mb-3">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPickerYear((v) => v - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold">{pickerYear}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPickerYear((v) => v + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {/* Month grid */}
          <div className="grid grid-cols-3 gap-1.5">
            {MONTH_SHORT.map((label, i) => {
              const isActive = pickerYear === y && i + 1 === m;
              return (
                <button
                  key={i}
                  className={`rounded-md px-2 py-1.5 text-sm transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground font-medium"
                      : "hover:bg-muted"
                  }`}
                  onClick={() => {
                    onChange(buildValue(pickerYear, i + 1));
                    setPopoverOpen(false);
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => shift(1)}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
