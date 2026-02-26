import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useHealthScoreEnabled } from "@/hooks/useHealthScoreEnabled";

export function AnalysisSection() {
  const { enabled, setEnabled } = useHealthScoreEnabled();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Analisi avanzate</CardTitle>
        <CardDescription>Funzionalità di analisi e punteggi derivati</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <Label htmlFor="health-score-toggle" className="text-sm font-medium">
              Health Score finanziario
            </Label>
            <p className="text-xs text-muted-foreground">
              Mostra un punteggio 0–100 basato su entrate, uscite, ricorrenze e cuscinetto.
            </p>
          </div>
          <Switch
            id="health-score-toggle"
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </div>
      </CardContent>
    </Card>
  );
}
