import * as React from "react";
import { useRef, useState, useEffect, useCallback } from "react";
import { format, parse, isValid } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface MaskedDateInputProps {
  value: Date | undefined;
  onChange: (date: Date) => void;
  label?: string;
}

/**
 * A date input with fixed "/" separators. The user types only digits
 * and the cursor auto-advances between DD / MM / YYYY segments.
 * A calendar icon opens a popover picker that stays in sync.
 */
export function MaskedDateInput({ value, onChange, label }: MaskedDateInputProps) {
  const dayRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  const [dd, setDd] = useState("");
  const [mm, setMm] = useState("");
  const [yyyy, setYyyy] = useState("");
  const [hasError, setHasError] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Sync from external value
  useEffect(() => {
    if (value && isValid(value)) {
      setDd(format(value, "dd"));
      setMm(format(value, "MM"));
      setYyyy(format(value, "yyyy"));
      setHasError(false);
    }
  }, [value]);

  const tryCommit = useCallback(
    (d: string, m: string, y: string) => {
      if (d.length === 2 && m.length === 2 && y.length === 4) {
        const str = `${d}/${m}/${y}`;
        const parsed = parse(str, "dd/MM/yyyy", new Date());
        if (isValid(parsed) && format(parsed, "dd/MM/yyyy") === str) {
          setHasError(false);
          onChange(parsed);
        } else {
          setHasError(true);
        }
      } else {
        // Incomplete — show error only if user has typed something
        setHasError(d.length > 0 || m.length > 0 || y.length > 0);
      }
    },
    [onChange],
  );

  const handleSegment = (
    raw: string,
    maxLen: number,
    setter: (v: string) => void,
    nextRef: React.RefObject<HTMLInputElement> | null,
    getAll: (v: string) => [string, string, string],
  ) => {
    const digits = raw.replace(/\D/g, "").slice(0, maxLen);
    setter(digits);
    const [d, m, y] = getAll(digits);
    tryCommit(d, m, y);
    if (digits.length === maxLen && nextRef?.current) {
      nextRef.current.focus();
      nextRef.current.select();
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    currentValue: string,
    prevRef: React.RefObject<HTMLInputElement> | null,
  ) => {
    if (e.key === "Backspace" && currentValue.length === 0 && prevRef?.current) {
      e.preventDefault();
      prevRef.current.focus();
    }
  };

  const handleCalendarSelect = useCallback(
    (d: Date | undefined) => {
      if (d) {
        onChange(d);
        setCalendarOpen(false);
      }
    },
    [onChange],
  );

  const segmentClass =
    "bg-transparent text-center outline-none placeholder:text-muted-foreground text-sm font-normal";

  return (
    <div className="space-y-1">
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <div
          className={cn(
            "flex items-center h-10 w-full rounded-md border bg-background px-3 py-2 ring-offset-background transition-colors",
            "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
            hasError ? "border-destructive" : "border-input",
          )}
        >
          <input
            ref={dayRef}
            value={dd}
            placeholder="GG"
            maxLength={2}
            inputMode="numeric"
            className={cn(segmentClass, "w-6")}
            onChange={(e) =>
              handleSegment(e.target.value, 2, setDd, monthRef, (v) => [v, mm, yyyy])
            }
            onKeyDown={(e) => handleKeyDown(e, dd, null)}
            onFocus={(e) => e.target.select()}
          />
          <span className="text-muted-foreground text-sm select-none">/</span>
          <input
            ref={monthRef}
            value={mm}
            placeholder="MM"
            maxLength={2}
            inputMode="numeric"
            className={cn(segmentClass, "w-7")}
            onChange={(e) =>
              handleSegment(e.target.value, 2, setMm, yearRef, (v) => [dd, v, yyyy])
            }
            onKeyDown={(e) => handleKeyDown(e, mm, dayRef)}
            onFocus={(e) => e.target.select()}
          />
          <span className="text-muted-foreground text-sm select-none">/</span>
          <input
            ref={yearRef}
            value={yyyy}
            placeholder="AAAA"
            maxLength={4}
            inputMode="numeric"
            className={cn(segmentClass, "w-10")}
            onChange={(e) =>
              handleSegment(e.target.value, 4, setYyyy, null, (v) => [dd, mm, v])
            }
            onKeyDown={(e) => handleKeyDown(e, yyyy, monthRef)}
            onFocus={(e) => e.target.select()}
          />

          <PopoverTrigger asChild>
            <button
              type="button"
              className="ml-auto text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <CalendarIcon className="h-4 w-4" />
            </button>
          </PopoverTrigger>
        </div>

        <PopoverContent className="w-auto p-0" align="start" sideOffset={4}>
          <Calendar
            mode="single"
            selected={value}
            onSelect={handleCalendarSelect}
            defaultMonth={value}
            initialFocus
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Optional variant — value can be undefined, clearing is allowed    */
/* ------------------------------------------------------------------ */

interface OptionalMaskedDateInputProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
}

export function OptionalMaskedDateInput({ value, onChange }: OptionalMaskedDateInputProps) {
  const dayRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  const [dd, setDd] = useState(value && isValid(value) ? format(value, "dd") : "");
  const [mm, setMm] = useState(value && isValid(value) ? format(value, "MM") : "");
  const [yyyy, setYyyy] = useState(value && isValid(value) ? format(value, "yyyy") : "");
  const [hasError, setHasError] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => {
    if (value && isValid(value)) {
      setDd(format(value, "dd"));
      setMm(format(value, "MM"));
      setYyyy(format(value, "yyyy"));
      setHasError(false);
    } else if (!value) {
      setDd("");
      setMm("");
      setYyyy("");
      setHasError(false);
    }
  }, [value]);

  const tryCommit = useCallback(
    (d: string, m: string, y: string) => {
      if (d.length === 0 && m.length === 0 && y.length === 0) {
        setHasError(false);
        onChange(undefined);
        return;
      }
      if (d.length === 2 && m.length === 2 && y.length === 4) {
        const str = `${d}/${m}/${y}`;
        const parsed = parse(str, "dd/MM/yyyy", new Date());
        if (isValid(parsed) && format(parsed, "dd/MM/yyyy") === str) {
          setHasError(false);
          onChange(parsed);
        } else {
          setHasError(true);
        }
      } else {
        setHasError(true);
      }
    },
    [onChange],
  );

  const handleSegment = (
    raw: string,
    maxLen: number,
    setter: (v: string) => void,
    nextRef: React.RefObject<HTMLInputElement> | null,
    getAll: (v: string) => [string, string, string],
  ) => {
    const digits = raw.replace(/\D/g, "").slice(0, maxLen);
    setter(digits);
    const [d, m, y] = getAll(digits);
    tryCommit(d, m, y);
    if (digits.length === maxLen && nextRef?.current) {
      nextRef.current.focus();
      nextRef.current.select();
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    currentValue: string,
    prevRef: React.RefObject<HTMLInputElement> | null,
  ) => {
    if (e.key === "Backspace" && currentValue.length === 0 && prevRef?.current) {
      e.preventDefault();
      prevRef.current.focus();
    }
  };

  const handleCalendarSelect = useCallback(
    (d: Date | undefined) => {
      onChange(d || undefined);
      setCalendarOpen(false);
    },
    [onChange],
  );

  const segmentClass =
    "bg-transparent text-center outline-none placeholder:text-muted-foreground text-sm font-normal";

  return (
    <div className="space-y-1">
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <div
          className={cn(
            "flex items-center h-10 w-full rounded-md border bg-background px-3 py-2 ring-offset-background transition-colors",
            "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
            hasError ? "border-destructive" : "border-input",
          )}
        >
          <input
            ref={dayRef}
            value={dd}
            placeholder="GG"
            maxLength={2}
            inputMode="numeric"
            className={cn(segmentClass, "w-6")}
            onChange={(e) =>
              handleSegment(e.target.value, 2, setDd, monthRef, (v) => [v, mm, yyyy])
            }
            onKeyDown={(e) => handleKeyDown(e, dd, null)}
            onFocus={(e) => e.target.select()}
          />
          <span className="text-muted-foreground text-sm select-none">/</span>
          <input
            ref={monthRef}
            value={mm}
            placeholder="MM"
            maxLength={2}
            inputMode="numeric"
            className={cn(segmentClass, "w-7")}
            onChange={(e) =>
              handleSegment(e.target.value, 2, setMm, yearRef, (v) => [dd, v, yyyy])
            }
            onKeyDown={(e) => handleKeyDown(e, mm, dayRef)}
            onFocus={(e) => e.target.select()}
          />
          <span className="text-muted-foreground text-sm select-none">/</span>
          <input
            ref={yearRef}
            value={yyyy}
            placeholder="AAAA"
            maxLength={4}
            inputMode="numeric"
            className={cn(segmentClass, "w-10")}
            onChange={(e) =>
              handleSegment(e.target.value, 4, setYyyy, null, (v) => [dd, mm, v])
            }
            onKeyDown={(e) => handleKeyDown(e, yyyy, monthRef)}
            onFocus={(e) => e.target.select()}
          />

          <PopoverTrigger asChild>
            <button
              type="button"
              className="ml-auto text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <CalendarIcon className="h-4 w-4" />
            </button>
          </PopoverTrigger>
        </div>

        <PopoverContent className="w-auto p-0" align="start" sideOffset={4}>
          <Calendar
            mode="single"
            selected={value}
            onSelect={handleCalendarSelect}
            defaultMonth={value}
            initialFocus
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
  const dayRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  const [dd, setDd] = useState("");
  const [mm, setMm] = useState("");
  const [yyyy, setYyyy] = useState("");
  const [hasError, setHasError] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Sync from external value
  useEffect(() => {
    if (value && isValid(value)) {
      setDd(format(value, "dd"));
      setMm(format(value, "MM"));
      setYyyy(format(value, "yyyy"));
      setHasError(false);
    }
  }, [value]);

  const tryCommit = useCallback(
    (d: string, m: string, y: string) => {
      if (d.length === 2 && m.length === 2 && y.length === 4) {
        const str = `${d}/${m}/${y}`;
        const parsed = parse(str, "dd/MM/yyyy", new Date());
        if (isValid(parsed) && format(parsed, "dd/MM/yyyy") === str) {
          setHasError(false);
          onChange(parsed);
        } else {
          setHasError(true);
        }
      } else {
        // Incomplete — show error only if user has typed something
        setHasError(d.length > 0 || m.length > 0 || y.length > 0);
      }
    },
    [onChange],
  );

  const handleSegment = (
    raw: string,
    maxLen: number,
    setter: (v: string) => void,
    nextRef: React.RefObject<HTMLInputElement> | null,
    getAll: (v: string) => [string, string, string],
  ) => {
    const digits = raw.replace(/\D/g, "").slice(0, maxLen);
    setter(digits);
    const [d, m, y] = getAll(digits);
    tryCommit(d, m, y);
    if (digits.length === maxLen && nextRef?.current) {
      nextRef.current.focus();
      nextRef.current.select();
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    currentValue: string,
    prevRef: React.RefObject<HTMLInputElement> | null,
  ) => {
    if (e.key === "Backspace" && currentValue.length === 0 && prevRef?.current) {
      e.preventDefault();
      prevRef.current.focus();
    }
  };

  const handleCalendarSelect = useCallback(
    (d: Date | undefined) => {
      if (d) {
        onChange(d);
        setCalendarOpen(false);
      }
    },
    [onChange],
  );

  const segmentClass =
    "bg-transparent text-center outline-none placeholder:text-muted-foreground text-sm font-normal";

  return (
    <div className="space-y-1">
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <div
          className={cn(
            "flex items-center h-10 w-full rounded-md border bg-background px-3 py-2 ring-offset-background transition-colors",
            "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
            hasError ? "border-destructive" : "border-input",
          )}
        >
          <input
            ref={dayRef}
            value={dd}
            placeholder="GG"
            maxLength={2}
            inputMode="numeric"
            className={cn(segmentClass, "w-6")}
            onChange={(e) =>
              handleSegment(e.target.value, 2, setDd, monthRef, (v) => [v, mm, yyyy])
            }
            onKeyDown={(e) => handleKeyDown(e, dd, null)}
            onFocus={(e) => e.target.select()}
          />
          <span className="text-muted-foreground text-sm select-none">/</span>
          <input
            ref={monthRef}
            value={mm}
            placeholder="MM"
            maxLength={2}
            inputMode="numeric"
            className={cn(segmentClass, "w-7")}
            onChange={(e) =>
              handleSegment(e.target.value, 2, setMm, yearRef, (v) => [dd, v, yyyy])
            }
            onKeyDown={(e) => handleKeyDown(e, mm, dayRef)}
            onFocus={(e) => e.target.select()}
          />
          <span className="text-muted-foreground text-sm select-none">/</span>
          <input
            ref={yearRef}
            value={yyyy}
            placeholder="AAAA"
            maxLength={4}
            inputMode="numeric"
            className={cn(segmentClass, "w-10")}
            onChange={(e) =>
              handleSegment(e.target.value, 4, setYyyy, null, (v) => [dd, mm, v])
            }
            onKeyDown={(e) => handleKeyDown(e, yyyy, monthRef)}
            onFocus={(e) => e.target.select()}
          />

          <PopoverTrigger asChild>
            <button
              type="button"
              className="ml-auto text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <CalendarIcon className="h-4 w-4" />
            </button>
          </PopoverTrigger>
        </div>

        <PopoverContent className="w-auto p-0" align="start" sideOffset={4}>
          <Calendar
            mode="single"
            selected={value}
            onSelect={handleCalendarSelect}
            defaultMonth={value}
            initialFocus
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
