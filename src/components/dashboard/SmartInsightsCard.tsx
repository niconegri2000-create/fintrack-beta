import { Lightbulb, AlertTriangle, TrendingDown, TrendingUp, Sparkles } from "lucide-react";
import { useSmartInsights, type InsightLevel } from "@/hooks/useSmartInsights";
import { usePrivacy } from "@/contexts/PrivacyContext";

const LEVEL_ICON: Record<InsightLevel, React.ReactNode> = {
  critical: <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />,
  warning: <TrendingDown className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />,
  positive: <TrendingUp className="h-4 w-4 text-accent shrink-0 mt-0.5" />,
};

const LEVEL_BORDER: Record<InsightLevel, string> = {
  critical: "border-l-destructive",
  warning: "border-l-amber-500",
  positive: "border-l-accent",
};

export function SmartInsightsCard() {
  const { insights, isLoading } = useSmartInsights();
  const { isPrivacy } = usePrivacy();

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-6 animate-pulse">
        <div className="h-4 w-28 bg-muted rounded mb-3" />
        <div className="space-y-2">
          <div className="h-12 bg-muted rounded" />
          <div className="h-12 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-5 w-5 text-primary" />
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Smart Insights</p>
      </div>

      {insights.length === 0 ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
          <Lightbulb className="h-4 w-4" />
          <span>Nessun insight rilevante in questo periodo.</span>
        </div>
      ) : (
        <div className="space-y-2.5">
          {insights.map((ins) => (
            <div
              key={ins.id}
              className={`rounded-lg border border-l-4 ${LEVEL_BORDER[ins.level]} bg-muted/30 px-4 py-3`}
            >
              <div className="flex gap-3">
                {LEVEL_ICON[ins.level]}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground leading-snug">
                    {isPrivacy ? "••••••••" : ins.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {isPrivacy ? "••••" : ins.detail}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
