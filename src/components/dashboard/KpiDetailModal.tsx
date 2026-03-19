import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Printer, FileDown, Share2, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { toast } from "sonner";
import type { DashboardData } from "@/hooks/useDashboardData";
import type { BudgetSummaryRow } from "@/hooks/useCategoryBudgets";
import type { TransactionRow } from "@/hooks/useTransactions";

interface KpiDetailModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  data: DashboardData | undefined;
  budgetRows: BudgetSummaryRow[];
  accountLabel: string;
  periodLabel: string;
  workspaceName?: string;
  transactions?: TransactionRow[];
}

function fmtEur(v: number) {
  return v.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

function fmtDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

async function generatePdf(
  data: DashboardData,
  budgetRows: BudgetSummaryRow[],
  transactions: TransactionRow[],
  accountLabel: string,
  periodLabel: string,
  workspaceName: string,
) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const marginL = 15;
  const marginR = pw - 15;
  const exportDate = new Date().toLocaleDateString("it-IT");

  const addHeader = () => {
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(workspaceName, marginL, 12);
    doc.text(`Periodo: ${periodLabel}`, marginL, 17);
    doc.text(`Esportato: ${exportDate}`, marginR, 12, { align: "right" });
    doc.setDrawColor(200);
    doc.line(marginL, 20, marginR, 20);
    return 28;
  };

  // ── Page 1: Riepilogo ──
  let y = addHeader();
  doc.setFontSize(16);
  doc.setTextColor(30);
  doc.text("Riepilogo", marginL, y);
  y += 12;

  const summaryItems = [
    { label: "Entrate", value: fmtEur(data.income) },
    { label: "Uscite", value: fmtEur(data.expense) },
    { label: "Netto", value: fmtEur(data.balance) },
    { label: "% Risparmio", value: `${data.savingsRate.toFixed(1)}%` },
  ];

  doc.setFontSize(11);
  for (const item of summaryItems) {
    doc.setTextColor(100);
    doc.text(item.label, marginL, y);
    doc.setTextColor(30);
    doc.text(item.value, marginR, y, { align: "right" });
    y += 8;
  }

  if (data.byMonth.length > 1) {
    y += 6;
    doc.setFontSize(12);
    doc.setTextColor(30);
    doc.text("Dettaglio mensile", marginL, y);
    y += 8;
    doc.setFontSize(10);
    for (const m of data.byMonth) {
      doc.setTextColor(80);
      doc.text(m.month, marginL, y);
      doc.setTextColor(30);
      doc.text(
        `${fmtEur(m.income)}  |  ${fmtEur(m.expense)}  |  ${fmtEur(m.income - m.expense)}`,
        marginR, y, { align: "right" },
      );
      y += 7;
      if (y > 270) { doc.addPage(); y = addHeader(); }
    }
  }

  // ── Page 2: Top categorie ──
  doc.addPage();
  y = addHeader();
  doc.setFontSize(16);
  doc.setTextColor(30);
  doc.text("Top categorie", marginL, y);
  y += 12;

  if (data.byCategory.length === 0) {
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text("Nessuna spesa nel periodo", marginL, y);
  } else {
    doc.setFontSize(11);
    for (let i = 0; i < data.byCategory.length; i++) {
      const c = data.byCategory[i];
      doc.setTextColor(80);
      doc.text(`${i + 1}. ${c.name}`, marginL, y);
      doc.setTextColor(30);
      doc.text(fmtEur(c.amount), marginR, y, { align: "right" });
      y += 7;
      if (y > 270) { doc.addPage(); y = addHeader(); }
    }
  }

  // ── Page 3: Critiche ──
  doc.addPage();
  y = addHeader();
  doc.setFontSize(16);
  doc.setTextColor(30);
  doc.text("Categorie critiche", marginL, y);
  y += 12;

  const criticals = budgetRows.filter(
    (b) => b.monthly_limit > 0 && b.status === "over",
  );

  if (criticals.length === 0) {
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text("Nessuna categoria critica nel periodo", marginL, y);
  } else {
    doc.setFontSize(11);
    for (const b of criticals) {
      doc.setTextColor(180, 40, 40);
      doc.text(b.category_name, marginL, y);
      doc.text(`${fmtEur(b.spent)} / ${fmtEur(b.monthly_limit)}`, marginR, y, { align: "right" });
      y += 7;
      if (y > 270) { doc.addPage(); y = addHeader(); }
    }
  }

  // ── Page 4+: Transazioni ──
  doc.addPage();
  y = addHeader();
  doc.setFontSize(16);
  doc.setTextColor(30);
  doc.text("Transazioni", marginL, y);
  y += 10;

  // Column headers
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text("Data", marginL, y);
  doc.text("Descrizione", marginL + 22, y);
  doc.text("Categoria", marginL + 90, y);
  doc.text("Tipo", marginL + 130, y);
  doc.text("Importo", marginR, y, { align: "right" });
  y += 2;
  doc.setDrawColor(200);
  doc.line(marginL, y, marginR, y);
  y += 5;

  doc.setFontSize(9);
  const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date));

  for (const tx of sorted) {
    if (y > 275) { doc.addPage(); y = addHeader(); }
    doc.setTextColor(60);
    doc.text(fmtDate(tx.date), marginL, y);
    const desc = (tx.description ?? "—").substring(0, 35);
    doc.text(desc, marginL + 22, y);
    doc.text((tx.category?.name ?? "—").substring(0, 20), marginL + 90, y);

    const typeLabel = tx.type === "income" ? "Entrata" : tx.source === "recurring_generated" ? "Ricorrente" : "Uscita";
    doc.text(typeLabel, marginL + 130, y);

    doc.setTextColor(tx.type === "income" ? 40 : 180, tx.type === "income" ? 140 : 40, tx.type === "income" ? 80 : 40);
    doc.text(fmtEur(tx.amount), marginR, y, { align: "right" });
    y += 6;
  }

  if (sorted.length === 0) {
    doc.setTextColor(100);
    doc.text("Nessuna transazione nel periodo", marginL, y);
  }

  return doc;
}

export function KpiDetailModal({
  open,
  onOpenChange,
  data,
  budgetRows,
  accountLabel,
  periodLabel,
  workspaceName = "Workspace",
  transactions = [],
}: KpiDetailModalProps) {
  const { formatAmount, isPrivacy } = usePrivacy();

  if (!data) return null;

  const topCategories = data.byCategory.slice(0, 5);
  const criticalBudgets = budgetRows.filter(
    (b) => b.monthly_limit > 0 && (b.status === "over" || b.status === "warn2")
  );

  const handlePrint = () => window.print();

  const handleSavePdf = async () => {
    try {
      const doc = await generatePdf(data, budgetRows, transactions, accountLabel, periodLabel, workspaceName);
      doc.save(`report_${periodLabel.replace(/\s/g, "_")}.pdf`);
      toast.success("PDF scaricato");
    } catch (err) {
      console.error(err);
      toast.error("Errore nella generazione del PDF");
    }
  };

  const handleShare = async () => {
    const summary = [
      `📊 Report ${accountLabel} — ${periodLabel}`,
      `Entrate: ${fmtEur(data.income)}`,
      `Uscite: ${fmtEur(data.expense)}`,
      `Netto: ${fmtEur(data.balance)}`,
      `% Risparmio: ${data.savingsRate.toFixed(1)}%`,
    ].join("\n");

    if (navigator.share) {
      try {
        await navigator.share({ title: `Report ${periodLabel}`, text: summary });
      } catch {
        /* user cancelled */
      }
    } else {
      try {
        await navigator.clipboard.writeText(summary);
        toast.success("Copiato negli appunti");
      } catch {
        toast.error("Impossibile copiare negli appunti");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto print:max-w-full print:shadow-none print:border-none">
        <DialogHeader>
          <DialogTitle className="text-base">
            Dettagli — {accountLabel} — {periodLabel}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="riepilogo" className="mt-2">
          <TabsList className="w-full print:hidden">
            <TabsTrigger value="riepilogo" className="flex-1">Riepilogo</TabsTrigger>
            <TabsTrigger value="categorie" className="flex-1">Top categorie</TabsTrigger>
            <TabsTrigger value="critiche" className="flex-1">Critiche</TabsTrigger>
          </TabsList>

          {/* Riepilogo */}
          <TabsContent value="riepilogo" className="space-y-3 mt-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Entrate", value: data.income, icon: TrendingUp, color: "text-accent" },
                { label: "Uscite", value: data.expense, icon: TrendingDown, color: "text-destructive" },
                { label: "Netto", value: data.balance, color: data.balance >= 0 ? "text-accent" : "text-destructive" },
                { label: "% Risparmio", value: null, display: `${data.savingsRate.toFixed(1)}%` },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className={`text-lg font-semibold ${item.color ?? ""}`}>
                    {isPrivacy
                      ? "••••"
                      : item.display ?? formatAmount(item.value!)}
                  </p>
                </div>
              ))}
            </div>

            {/* Monthly breakdown if multiple months */}
            {data.byMonth.length > 1 && (
              <div className="space-y-2 mt-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Dettaglio mensile
                </h4>
                <div className="space-y-1.5">
                  {data.byMonth.map((m) => (
                    <div key={m.month} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                      <span className="font-medium">{m.month}</span>
                      <div className="flex gap-3">
                        <span className="text-accent">{isPrivacy ? "••" : formatAmount(m.income)}</span>
                        <span className="text-destructive">{isPrivacy ? "••" : formatAmount(m.expense)}</span>
                        <span className="font-semibold">
                          {isPrivacy ? "••" : formatAmount(m.income - m.expense)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Top categorie */}
          <TabsContent value="categorie" className="space-y-2 mt-3">
            {topCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nessuna spesa nel periodo
              </p>
            ) : (
              <div className="space-y-1.5">
                {topCategories.map((c, i) => (
                  <div key={c.name} className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <span className="text-sm font-medium">
                      {i + 1}. {c.name}
                    </span>
                    <span className="text-sm font-semibold">
                      {isPrivacy ? "••••" : formatAmount(c.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Critiche */}
          <TabsContent value="critiche" className="space-y-2 mt-3">
            {criticalBudgets.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nessuna categoria critica nel periodo
              </p>
            ) : (
              <div className="space-y-1.5">
                {criticalBudgets.map((b) => (
                  <div
                    key={b.category_id}
                    className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2"
                  >
                    <span className="text-sm font-medium flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                      {b.category_name}
                    </span>
                    <span className="text-sm font-semibold text-destructive">
                      {isPrivacy ? "••••" : `${formatAmount(b.spent)} / ${formatAmount(b.monthly_limit)}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Export CTAs */}
        <div className="flex justify-end gap-2 mt-4 print:hidden">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1.5" />
            Stampa
          </Button>
          <Button size="sm" onClick={handleSavePdf}>
            <FileDown className="h-4 w-4 mr-1.5" />
            Salva PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-1.5" />
            Condividi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
