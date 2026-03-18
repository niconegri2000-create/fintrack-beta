import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { format, parse, isValid } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateInputProps {
  value: Date;
  onChange: (date: Date) => void;
  placeholder?: string;
}

export function DateInput({ value, onChange, placeholder = "GG/MM/AAAA" }: DateInputProps) {
  const [text, setText] = useState(format(value, "dd/MM/yyyy"));
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  // Sync text when value changes externally (e.g. calendar pick)
  useEffect(() => {
    setText(format(value, "dd/MM/yyyy"));
    setError(null);
  }, [value]);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setText(raw);

    if (raw.length === 0) {
      setError(null);
      return;
    }

    // Auto-format: allow only digits and slashes
    if (raw.length === 10) {
      const parsed = parse(raw, "dd/MM/yyyy", new Date());
      if (isValid(parsed) && format(parsed, "dd/MM/yyyy") === raw) {
        setError(null);
        onChange(parsed);
      } else {
        setError("Data non valida. Usa il formato GG/MM/AAAA.");
      }
    } else if (raw.length > 10) {
      setError("Data non valida. Usa il formato GG/MM/AAAA.");
    } else {
      setError(null);
    }
  }, [onChange]);

  const handleCalendarSelect = useCallback((d: Date | undefined) => {
    if (d) {
      onChange(d);
      setOpen(false);
    }
  }, [onChange]);

  return (
    <div className="space-y-1">
      <Popover open={open} onOpenChange={setOpen}>
        <div className="relative">
          <Input
            value={text}
            onChange={handleTextChange}
            placeholder={placeholder}
            maxLength={10}
            className={cn("pr-10", error && "border-destructive")}
          />
          <PopoverTrigger asChild>
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <CalendarIcon className="h-4 w-4" />
            </button>
          </PopoverTrigger>
        </div>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={handleCalendarSelect}
            initialFocus
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
