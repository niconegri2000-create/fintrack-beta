import { useState, useEffect } from "react";

export function CurrentDateBadge() {
  const [label, setLabel] = useState("");

  useEffect(() => {
    const compute = () => {
      const now = new Date();
      const formatted = new Intl.DateTimeFormat("it-IT", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(now);
      // Capitalize first letter
      setLabel(formatted.charAt(0).toUpperCase() + formatted.slice(1));
    };

    compute();

    // Recalculate at next midnight
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    const timeout = setTimeout(() => {
      compute();
      // Then every 24h
      const interval = setInterval(compute, 86400000);
      return () => clearInterval(interval);
    }, msUntilMidnight);

    return () => clearTimeout(timeout);
  }, []);

  if (!label) return null;

  return (
    <span className="inline-flex items-center rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px] sm:max-w-none">
      {label}
    </span>
  );
}
