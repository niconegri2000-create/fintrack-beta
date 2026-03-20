import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Activity, Hash } from "lucide-react";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { TransactionRow } from "@/hooks/useTransactions";
import { useTags } from "@/hooks/useTags";

interface Props {
  filtered: TransactionRow[];
  selectedTagIds: string[];
}

export function TagSummaryBanner({ filtered, selectedTagIds }: Props) {
  const { isPrivacy } = usePrivacy();
  const { data: allTags = [] } = useTags();

  const tagNames = useMemo(() => {
    const map = Object.fromEntries(allTags.map((t) => [t.id, t.name]));
    return selectedTagIds.map((id) => map[id] || "?");
  }, [allTags, selectedTagIds]);

  const stats = useMemo(() => {
    const income = filtered
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + t.amount, 0);
    const expense = filtered
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);
    return { income, expense, net: income - expense, count: filtered.length };
  }, [filtered]);

  if (selectedTagIds.length === 0) return null;

  const fmt = (v: number) => `€${v.toFixed(2)}`;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Hash className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Riepilogo tag:</span>
          {tagNames.map((name) => (
            <Badge key={name} variant="secondary" className="text-xs">
              {name}
            </Badge>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-success shrink-0" />
            <div>
              <p className="text-[11px] text-muted-foreground">Entrate</p>
              <p className="text-sm font-semibold text-success">
                {isPrivacy ? "••••" : `+${fmt(stats.income)}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-destructive shrink-0" />
            <div>
              <p className="text-[11px] text-muted-foreground">Uscite</p>
              <p className="text-sm font-semibold text-destructive">
                {isPrivacy ? "••••" : `−${fmt(stats.expense)}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary shrink-0" />
            <div>
              <p className="text-[11px] text-muted-foreground">Netto</p>
              <p className={`text-sm font-semibold ${stats.net >= 0 ? "text-success" : "text-destructive"}`}>
                {isPrivacy ? "••••" : `${stats.net >= 0 ? "+" : "−"}${fmt(Math.abs(stats.net))}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-[11px] text-muted-foreground">Transazioni</p>
              <p className="text-sm font-semibold">{stats.count}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
