import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

/* ── Brand colors for PDF ── */
const PDF_GREEN_DARK = [26, 58, 42] as const;   // #1a3a2a header bg
const PDF_GREEN = [45, 122, 79] as const;        // #2d7a4f titles & positive
const PDF_RED = [180, 40, 40] as const;           // negative / critical
const PDF_GRAY_ROW = [245, 245, 245] as const;   // alternating row bg
const PDF_GRAY_TEXT = [100, 100, 100] as const;
const PDF_DARK_TEXT = [30, 30, 30] as const;
const APP_URL = "fintrack-beta.lovable.app";

function fmtEur(v: number) {
  return v.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

function fmtDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

/** Convert "2025-03-01" → "01-03-2025" for filename */
function dateToFilename(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}-${m}-${y}`;
}

function buildDefaultFilename(periodLabel: string) {
  const parts = periodLabel.split("—").map((s) => s.trim());
  if (parts.length === 2) {
    return `Report_${dateToFilename(parts[0])}_${dateToFilename(parts[1])}`;
  }
  return `Report_${periodLabel.replace(/\s/g, "_")}`;
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
  const ph = doc.internal.pageSize.getHeight();
  const marginL = 15;
  const marginR = pw - 15;
  const contentW = marginR - marginL;
  const exportDate = new Date().toLocaleDateString("it-IT");
  let pageNum = 0;

  const addHeader = () => {
    pageNum++;
    // Dark green header bar
    doc.setFillColor(...PDF_GREEN_DARK);
    doc.rect(0, 0, pw, 22, "F");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text(workspaceName, marginL, 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Periodo: ${periodLabel}`, pw / 2, 10, { align: "center" });
    doc.text(`Esportato: ${exportDate}`, marginR, 10, { align: "right" });
    // Second line with account
    doc.setFontSize(8);
    doc.text(`Conto: ${accountLabel}`, marginL, 17);
    return 30;
  };

  const addFooter = () => {
    doc.setFontSize(8);
    doc.setTextColor(...PDF_GRAY_TEXT);
    doc.text(APP_URL, marginL, ph - 8);
    doc.text(`Pagina ${pageNum}`, marginR, ph - 8, { align: "right" });
  };

  const addSectionTitle = (title: string, yPos: number) => {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PDF_GREEN);
    doc.text(title, marginL, yPos);
    // Green underline
    doc.setDrawColor(...PDF_GREEN);
    doc.setLineWidth(0.5);
    doc.line(marginL, yPos + 2, marginR, yPos + 2);
    doc.setFont("helvetica", "normal");
    return yPos + 10;
  };

  const checkPageBreak = (y: number, needed = 12) => {
    if (y > ph - 20 - needed) {
      addFooter();
      doc.addPage();
      return addHeader();
    }
    return y;
  };

  // ── Page 1: Riepilogo ──
  let y = addHeader();
  y = addSectionTitle("Riepilogo", y);

  const summaryItems = [
    { label: "Entrate", value: data.income, positive: true },
    { label: "Uscite", value: data.expense, positive: false },
    { label: "Netto", value: data.balance, positive: data.balance >= 0 },
    { label: "% Risparmio", value: null, display: `${data.savingsRate.toFixed(1)}%`, positive: data.savingsRate >= 0 },
  ];

  doc.setFontSize(11);
  for (let i = 0; i < summaryItems.length; i++) {
    const item = summaryItems[i];
    // Alternating row bg
    if (i % 2 === 0) {
      doc.setFillColor(...PDF_GRAY_ROW);
      doc.rect(marginL, y - 5, contentW, 8, "F");
    }
    doc.setTextColor(...PDF_GRAY_TEXT);
    doc.text(item.label, marginL + 2, y);
    doc.setTextColor(item.positive ? PDF_GREEN[0] : PDF_RED[0], item.positive ? PDF_GREEN[1] : PDF_RED[1], item.positive ? PDF_GREEN[2] : PDF_RED[2]);
    doc.setFont("helvetica", "bold");
    doc.text(item.display ?? fmtEur(item.value!), marginR - 2, y, { align: "right" });
    doc.setFont("helvetica", "normal");
    y += 9;
  }

  if (data.byMonth.length > 1) {
    y += 6;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PDF_GREEN);
    doc.text("Dettaglio mensile", marginL, y);
    doc.setFont("helvetica", "normal");
    y += 8;
    doc.setFontSize(10);
    for (let i = 0; i < data.byMonth.length; i++) {
      y = checkPageBreak(y);
      const m = data.byMonth[i];
      if (i % 2 === 0) {
        doc.setFillColor(...PDF_GRAY_ROW);
        doc.rect(marginL, y - 4, contentW, 7, "F");
      }
      doc.setTextColor(...PDF_DARK_TEXT);
      doc.setFont("helvetica", "bold");
      doc.text(m.month, marginL + 2, y);
      doc.setFont("helvetica", "normal");
      const net = m.income - m.expense;
      doc.setTextColor(...PDF_GREEN);
      doc.text(fmtEur(m.income), marginL + 55, y);
      doc.setTextColor(...PDF_RED);
      doc.text(fmtEur(m.expense), marginL + 95, y);
      doc.setTextColor(net >= 0 ? PDF_GREEN[0] : PDF_RED[0], net >= 0 ? PDF_GREEN[1] : PDF_RED[1], net >= 0 ? PDF_GREEN[2] : PDF_RED[2]);
      doc.setFont("helvetica", "bold");
      doc.text(fmtEur(net), marginR - 2, y, { align: "right" });
      doc.setFont("helvetica", "normal");
      y += 7;
    }
  }
  addFooter();

  // ── Page 2: Top categorie ──
  doc.addPage();
  y = addHeader();
  y = addSectionTitle("Top categorie", y);

  if (data.byCategory.length === 0) {
    doc.setFontSize(11);
    doc.setTextColor(...PDF_GRAY_TEXT);
    doc.text("Nessuna spesa nel periodo", marginL, y);
  } else {
    doc.setFontSize(11);
    for (let i = 0; i < data.byCategory.length; i++) {
      y = checkPageBreak(y);
      const c = data.byCategory[i];
      if (i % 2 === 0) {
        doc.setFillColor(...PDF_GRAY_ROW);
        doc.rect(marginL, y - 4, contentW, 7, "F");
      }
      doc.setTextColor(...PDF_DARK_TEXT);
      doc.text(`${i + 1}. ${c.name}`, marginL + 2, y);
      doc.setTextColor(...PDF_RED);
      doc.setFont("helvetica", "bold");
      doc.text(fmtEur(c.amount), marginR - 2, y, { align: "right" });
      doc.setFont("helvetica", "normal");
      y += 7;
    }
  }
  addFooter();

  // ── Page 3: Critiche ──
  doc.addPage();
  y = addHeader();
  y = addSectionTitle("Categorie critiche", y);

  const criticals = budgetRows.filter(
    (b) => b.monthly_limit > 0 && b.status === "over",
  );

  if (criticals.length === 0) {
    doc.setFontSize(11);
    doc.setTextColor(...PDF_GRAY_TEXT);
    doc.text("Nessuna categoria critica nel periodo", marginL, y);
  } else {
    doc.setFontSize(11);
    for (let i = 0; i < criticals.length; i++) {
      y = checkPageBreak(y);
      const b = criticals[i];
      if (i % 2 === 0) {
        doc.setFillColor(...PDF_GRAY_ROW);
        doc.rect(marginL, y - 4, contentW, 7, "F");
      }
      doc.setTextColor(...PDF_RED);
      doc.setFont("helvetica", "bold");
      doc.text(b.category_name, marginL + 2, y);
      doc.setFont("helvetica", "normal");
      doc.text(`${fmtEur(b.spent)} / ${fmtEur(b.monthly_limit)}`, marginR - 2, y, { align: "right" });
      y += 7;
    }
  }
  addFooter();

  // ── Page 4+: Transazioni ──
  doc.addPage();
  y = addHeader();
  y = addSectionTitle("Transazioni", y);

  // Column headers with green bg
  doc.setFillColor(...PDF_GREEN);
  doc.rect(marginL, y - 4, contentW, 7, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("Data", marginL + 2, y);
  doc.text("Descrizione", marginL + 24, y);
  doc.text("Categoria", marginL + 88, y);
  doc.text("Tipo", marginL + 125, y);
  doc.text("Importo", marginR - 2, y, { align: "right" });
  doc.setFont("helvetica", "normal");
  y += 7;

  const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date));

  for (let i = 0; i < sorted.length; i++) {
    y = checkPageBreak(y, 8);
    const tx = sorted[i];

    // Alternating row
    if (i % 2 === 0) {
      doc.setFillColor(...PDF_GRAY_ROW);
      doc.rect(marginL, y - 4, contentW, 6.5, "F");
    }

    doc.setFontSize(8.5);
    doc.setTextColor(...PDF_DARK_TEXT);
    doc.text(fmtDate(tx.date), marginL + 2, y);
    doc.text((tx.description ?? "—").substring(0, 32), marginL + 24, y);
    doc.text((tx.category?.name ?? "—").substring(0, 18), marginL + 88, y);

    // Type badge
    const isIncome = tx.type === "income";
    const isRecurring = tx.source === "recurring_generated";
    const typeLabel = isIncome ? "Entrata" : isRecurring ? "Ricorrente" : "Uscita";

    // Badge background
    const badgeX = marginL + 123;
    const badgeW = doc.getTextWidth(typeLabel) + 4;
    if (isIncome) {
      doc.setFillColor(220, 245, 230);
      doc.setTextColor(...PDF_GREEN);
    } else if (isRecurring) {
      doc.setFillColor(220, 245, 230);
      doc.setTextColor(45, 122, 79);
    } else {
      doc.setFillColor(255, 225, 225);
      doc.setTextColor(...PDF_RED);
    }
    doc.roundedRect(badgeX, y - 3.5, badgeW, 4.5, 1, 1, "F");
    doc.setFontSize(7.5);
    doc.text(typeLabel, badgeX + 2, y);

    // Amount
    doc.setFontSize(8.5);
    doc.setTextColor(isIncome ? PDF_GREEN[0] : PDF_RED[0], isIncome ? PDF_GREEN[1] : PDF_RED[1], isIncome ? PDF_GREEN[2] : PDF_RED[2]);
    doc.setFont("helvetica", "bold");
    doc.text(fmtEur(tx.amount), marginR - 2, y, { align: "right" });
    doc.setFont("helvetica", "normal");
    y += 6.5;
  }

  if (sorted.length === 0) {
    doc.setTextColor(...PDF_GRAY_TEXT);
    doc.setFontSize(11);
    doc.text("Nessuna transazione nel periodo", marginL, y);
  }
  addFooter();

  return doc;
}

/* ── Filename dialog ── */
function PdfFilenameDialog({
  open,
  onOpenChange,
  defaultName,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultName: string;
  onConfirm: (name: string) => void;
}) {
  const [name, setName] = useState(defaultName);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Nome file PDF</DialogTitle>
        </DialogHeader>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome file"
          className="mt-2"
        />
        <DialogFooter className="mt-4">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button
            size="sm"
            onClick={() => {
              const finalName = name.trim() || defaultName;
              onConfirm(finalName.endsWith(".pdf") ? finalName : `${finalName}.pdf`);
              onOpenChange(false);
            }}
          >
            <FileDown className="h-4 w-4 mr-1.5" />
            Scarica
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
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
  const [filenameOpen, setFilenameOpen] = useState(false);
  const [pendingDoc, setPendingDoc] = useState<any>(null);
  const defaultFilename = buildDefaultFilename(periodLabel);

  if (!data) return null;

  const topCategories = data.byCategory.slice(0, 5);
  const criticalBudgets = budgetRows.filter(
    (b) => b.monthly_limit > 0 && (b.status === "over" || b.status === "warn2")
  );

  const handlePrint = () => window.print();

  const handleSavePdf = async () => {
    try {
      const doc = await generatePdf(data, budgetRows, transactions, accountLabel, periodLabel, workspaceName);
      setPendingDoc(doc);
      setFilenameOpen(true);
    } catch (err) {
      console.error(err);
      toast.error("Errore nella generazione del PDF");
    }
  };

  const handleFilenameConfirm = (filename: string) => {
    if (pendingDoc) {
      pendingDoc.save(filename);
      setPendingDoc(null);
      toast.success("PDF scaricato");
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
    <>
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

      <PdfFilenameDialog
        open={filenameOpen}
        onOpenChange={setFilenameOpen}
        defaultName={defaultFilename}
        onConfirm={handleFilenameConfirm}
      />
    </>
  );
}
