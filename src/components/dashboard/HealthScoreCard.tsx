import { useState } from "react";
import { Activity, Info, TrendingUp, TrendingDown, Minus, ChevronRight } from "lucide-react";
import { useHealthScore, type HealthStatus, type TrendDirection } from "@/hooks/useHealthScore";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const STATUS_STYLE: Record<HealthStatus, string> = {
  ottimo: "text-accent",
  buono: "text-primary",
  attenzione: "text-amber-500",
  critico: "text-destructive",
  insufficiente: "text-muted-foreground",
};

const BADGE_STYLE: Record<HealthStatus, string> = {
  ottimo: "bg-accent/15 text-accent border-accent/30",
  buono: "bg-primary/15 text-primary border-primary/30",
  attenzione: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  critico: "bg-destructive/15 text-destructive border-destructive/30",
  insufficiente: "bg-muted/40 text-muted-foreground border-muted",
};

const TREND_CONFIG: Record<Exclude<TrendDirection, "unavailable">, { icon: typeof TrendingUp; color: string; label: string }> = {
  improving: { icon: TrendingUp, color: "text-accent", label: "In miglioramento" },
  declining: { icon: TrendingDown, color: "text-destructive", label: "In peggioramento" },
  stable: { icon: Minus, color: "text-muted-foreground", label: "Stabile" },
};

const MONTH_LABELS: Record<string, string> = {
  "01": "Gen", "02": "Feb", "03": "Mar", "04": "Apr",
  "05": "Mag", "06": "Giu", "07": "Lug", "08": "Ago",
  "09": "Set", "10": "Ott", "11": "Nov", "12": "Dic",
};

function formatMonth(m: string) {
  const [y, mo] = m.split("-");
  return `${MONTH_LABELS[mo] ?? mo} ${y}`;
}

export function HealthScoreCard() {
  const { score, status, label, pills, isLoading, insufficientData, trend } = useHealthScore();
  const { isPrivacy } = usePrivacy();
  const [infoOpen, setInfoOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-6 animate-pulse">
        <div className="h-4 w-24 bg-muted rounded mb-3" />
        <div className="h-10 w-20 bg-muted rounded" />
      </div>
    );
  }

  const hasTrend = trend.direction !== "unavailable";
  const trendCfg = hasTrend ? TREND_CONFIG[trend.direction as Exclude<TrendDirection, "unavailable">] : null;

  return (
    <>
      <div
        className="rounded-xl border bg-card p-6 cursor-pointer hover:border-primary/30 transition-colors"
        onClick={() => setDetailOpen(true)}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Activity className={`h-5 w-5 ${STATUS_STYLE[status]}`} />
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Health Score</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); setInfoOpen(true); }}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Come viene calcolato"
            >
              <Info className="h-4 w-4" />
            </button>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        {insufficientData ? (
          <div className="py-2">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {pills.length > 0 ? pills[0] : "Aggiungi entrate e uscite per calcolare il punteggio."}
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-baseline gap-3 mb-2">
              <p className={`text-4xl font-bold ft-number ${STATUS_STYLE[status]}`}>
                {isPrivacy ? "••" : score}
                <span className="text-lg text-muted-foreground font-normal">/100</span>
              </p>
              <Badge variant="secondary" className={`text-xs ${BADGE_STYLE[status]}`}>
                {label}
              </Badge>
            </div>

            {/* Trend indicator */}
            {hasTrend && trendCfg && !isPrivacy && (
              <div className={`flex items-center gap-1.5 mb-3 ${trendCfg.color}`}>
                <trendCfg.icon className="h-3.5 w-3.5" />
                <span className="text-xs font-medium ft-number">
                  {trend.delta > 0 ? "+" : ""}{trend.delta} vs mesi precedenti
                </span>
                <span className="text-xs text-muted-foreground">· {trendCfg.label}</span>
              </div>
            )}
            {!hasTrend && !isPrivacy && (
              <p className="text-[11px] text-muted-foreground mb-3">
                Trend disponibile dopo alcuni mesi di utilizzo
              </p>
            )}

            <div className="flex flex-wrap gap-1.5">
              {pills.map((pill) => (
                <span
                  key={pill}
                  className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground ft-number"
                >
                  {isPrivacy ? "••••" : pill}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Info modal — how it's calculated */}
      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Come viene calcolato l'Health Score</DialogTitle>
            <DialogDescription>
              Il punteggio 0–100 riflette la salute finanziaria nel periodo selezionato.
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm text-muted-foreground space-y-2 mt-2">
            <p><strong className="text-foreground">Risparmio reale (40%)</strong> — Quanto risparmi rispetto alle entrate.</p>
            <p><strong className="text-foreground">Stabilità spese (25%)</strong> — Variazione delle spese rispetto alla media degli ultimi mesi.</p>
            <p><strong className="text-foreground">Pressione ricorrenze (20%)</strong> — Quanto incidono le uscite fisse sulle entrate.</p>
            <p><strong className="text-foreground">Liquidità / buffer (15%)</strong> — Quanti mesi di spese puoi coprire con il saldo.</p>
            <p className="text-xs pt-2 border-t">80+ Ottimo · 60–79 Buono · 40–59 Attenzione · &lt;40 Critico</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail modal — trend breakdown */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Dettaglio Health Score</DialogTitle>
            <DialogDescription>
              Andamento della tua salute finanziaria nel tempo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Current score */}
            <div className="flex items-center justify-between rounded-lg bg-muted/30 p-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Score attuale</p>
                <p className={`text-3xl font-bold ft-number ${STATUS_STYLE[status]}`}>
                  {isPrivacy ? "••" : score}<span className="text-sm text-muted-foreground font-normal">/100</span>
                </p>
              </div>
              <Badge variant="secondary" className={`text-xs ${BADGE_STYLE[status]}`}>{label}</Badge>
            </div>

            {/* Historical scores */}
            {trend.previousScores.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Mesi precedenti</p>
                <div className="space-y-1.5">
                  {trend.previousScores.map((p) => {
                    const pStatus = getStatusForScore(p.score);
                    return (
                      <div key={p.month} className="flex items-center justify-between rounded-lg bg-muted/20 px-3 py-2">
                        <span className="text-sm text-foreground">{formatMonth(p.month)}</span>
                        <span className={`text-sm font-semibold ft-number ${STATUS_STYLE[pStatus]}`}>
                          {isPrivacy ? "••" : p.score}/100
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Trend summary */}
            {hasTrend && trendCfg && (
              <div className={`flex items-center gap-2 rounded-lg border p-3 ${
                trend.direction === "improving" ? "border-accent/30 bg-accent/5" :
                trend.direction === "declining" ? "border-destructive/30 bg-destructive/5" :
                "border-muted bg-muted/10"
              }`}>
                <trendCfg.icon className={`h-5 w-5 ${trendCfg.color}`} />
                <div className="min-w-0">
                  <p className={`text-sm font-medium ${trendCfg.color}`}>
                    {trendCfg.label} ({trend.delta > 0 ? "+" : ""}{trend.delta} punti)
                  </p>
                  {trend.dominantCause && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Motivo principale: {isPrivacy ? "••••••" : trend.dominantCause}
                    </p>
                  )}
                </div>
              </div>
            )}

            {!hasTrend && (
              <div className="rounded-lg border border-muted bg-muted/10 p-3">
                <p className="text-sm text-muted-foreground">
                  Trend disponibile dopo alcuni mesi di utilizzo.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function getStatusForScore(score: number): HealthStatus {
  if (score >= 80) return "ottimo";
  if (score >= 60) return "buono";
  if (score >= 40) return "attenzione";
  return "critico";
}
