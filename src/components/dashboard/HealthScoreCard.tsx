import { useState } from "react";
import { Activity, Info } from "lucide-react";
import { useHealthScore, type HealthStatus } from "@/hooks/useHealthScore";
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

export function HealthScoreCard() {
  const { score, status, label, pills, isLoading, insufficientData } = useHealthScore();
  const { isPrivacy } = usePrivacy();
  const [infoOpen, setInfoOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-6 animate-pulse">
        <div className="h-4 w-24 bg-muted rounded mb-3" />
        <div className="h-10 w-20 bg-muted rounded" />
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Activity className={`h-5 w-5 ${STATUS_STYLE[status]}`} />
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Health Score</p>
          </div>
          <button
            onClick={() => setInfoOpen(true)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Come viene calcolato"
          >
            <Info className="h-4 w-4" />
          </button>
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
            <div className="flex items-baseline gap-3 mb-3">
              <p className={`text-4xl font-bold ft-number ${STATUS_STYLE[status]}`}>
                {isPrivacy ? "••" : score}
                <span className="text-lg text-muted-foreground font-normal">/100</span>
              </p>
              <Badge variant="secondary" className={`text-xs ${BADGE_STYLE[status]}`}>
                {label}
              </Badge>
            </div>

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

      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Come viene calcolato l'Health Score</DialogTitle>
            <DialogDescription>
              Il punteggio 0–100 riflette la salute finanziaria nel periodo selezionato.
            </DialogDescription>
          </DialogHeader>
          <div className="text-sm text-muted-foreground space-y-2 mt-2">
            <p><strong className="text-foreground">Tasso di risparmio (45%)</strong> — Quanto risparmi rispetto alle entrate.</p>
            <p><strong className="text-foreground">Cuscinetto (35%)</strong> — Quanti mesi di spese puoi coprire con il saldo attuale oltre la soglia minima.</p>
            <p><strong className="text-foreground">Peso spese fisse (20%)</strong> — Quanto incidono le uscite ricorrenti sulle entrate. Meno è meglio.</p>
            <p className="text-xs pt-2 border-t">80+ Ottimo · 60–79 Buono · 40–59 Attenzione · &lt;40 Critico</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
