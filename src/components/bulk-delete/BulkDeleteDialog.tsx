import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { Trash2, AlertTriangle, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppModal } from "@/components/AppModal";

type Entity = "transactions" | "recurring" | "transfers";

interface BulkDeleteDialogProps {
  entity: Entity;
  sectionKind: string; // 'income' | 'expense' for tx/recurring; ignored for transfers
  sectionLabel: string; // e.g. "Entrate", "Uscite", "Trasferimenti"
  accountId: string | null; // null = all accounts (master)
  trigger?: React.ReactNode;
}

export function BulkDeleteDialog({
  entity,
  sectionKind,
  sectionLabel,
  accountId,
  trigger,
}: BulkDeleteDialogProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"all" | "period">("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const queryClient = useQueryClient();

  const isDeleteAll = tab === "all";
  const datesValid = isDeleteAll || (fromDate !== "" && toDate !== "" && fromDate <= toDate);
  const confirmed = confirmText.trim().toLowerCase() === "elimina";

  const fetchCount = useCallback(async () => {
    if (!datesValid) {
      setCount(null);
      return;
    }
    setLoading(true);
    try {
      const params: Record<string, unknown> = {
        p_delete_all: isDeleteAll,
      };
      if (!isDeleteAll) {
        params.p_from = fromDate;
        params.p_to = toDate;
      }
      if (accountId) {
        params.p_account_id = accountId;
      }

      let rpcName: string;
      if (entity === "transactions") {
        rpcName = "count_transactions_bulk";
        params.p_kind = sectionKind;
      } else if (entity === "recurring") {
        rpcName = "count_recurring_bulk";
        params.p_kind = sectionKind;
      } else {
        rpcName = "count_transfers_bulk";
      }

      const { data, error } = await (supabase.rpc as any)(rpcName, params);
      if (error) throw error;
      setCount(data as number);
    } catch (err: any) {
      console.error("Count error", err);
      setCount(null);
    } finally {
      setLoading(false);
    }
  }, [entity, sectionKind, accountId, isDeleteAll, fromDate, toDate, datesValid]);

  useEffect(() => {
    if (open) {
      fetchCount();
    }
  }, [open, fetchCount]);

  const handleDelete = async () => {
    if (!confirmed || count === 0 || count === null) return;
    setDeleting(true);
    try {
      const params: Record<string, unknown> = {
        p_delete_all: isDeleteAll,
      };
      if (!isDeleteAll) {
        params.p_from = fromDate;
        params.p_to = toDate;
      }
      if (accountId) {
        params.p_account_id = accountId;
      }

      let rpcName: string;
      if (entity === "transactions") {
        rpcName = "delete_transactions_bulk";
        params.p_kind = sectionKind;
      } else if (entity === "recurring") {
        rpcName = "delete_recurring_bulk";
        params.p_kind = sectionKind;
      } else {
        rpcName = "delete_transfers_bulk";
      }

      const { data, error } = await (supabase.rpc as any)(rpcName, params);
      if (error) throw error;
      const deleted = data as number;
      toast.success(`Eliminate ${deleted} righe.`);
      queryClient.invalidateQueries();
      setOpen(false);
    } catch (err: any) {
      console.error("Delete error", err);
      toast.error(`Errore: ${err?.message ?? "Riprova"}`);
    } finally {
      setDeleting(false);
    }
  };

  const reset = () => {
    setTab("all");
    setFromDate("");
    setToDate("");
    setConfirmText("");
    setCount(null);
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) reset();
  };

  const canDelete = confirmed && count !== null && count > 0 && datesValid && !deleting;

  return (
    <>
      {trigger ? (
        <div onClick={() => setOpen(true)}>{trigger}</div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1 h-7 px-2 text-xs"
          onClick={() => setOpen(true)}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Elimina…
        </Button>
      )}

      <AppModal
        open={open}
        onOpenChange={handleOpenChange}
        title={`Elimina ${sectionLabel}`}
        footer={
          <>
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={deleting}>
              Annulla
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!canDelete}
            >
              {deleting ? "Eliminazione…" : "Elimina"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <p className="text-sm text-destructive">
              Questa operazione è irreversibile. I dati eliminati non potranno essere recuperati.
            </p>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as "all" | "period")}>
            <TabsList className="w-full">
              <TabsTrigger value="all" className="flex-1">Elimina tutto</TabsTrigger>
              <TabsTrigger value="period" className="flex-1">Elimina periodo</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-3">
              <p className="text-sm text-muted-foreground">
                Verranno eliminate tutte le righe di <strong>{sectionLabel.toLowerCase()}</strong>
                {accountId ? " per il conto selezionato" : " per tutti i conti"}.
              </p>
            </TabsContent>

            <TabsContent value="period" className="mt-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Da</Label>
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">A</Label>
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                  />
                </div>
              </div>
              {!isDeleteAll && fromDate && toDate && fromDate > toDate && (
                <p className="text-xs text-destructive">La data inizio deve essere ≤ data fine.</p>
              )}
            </TabsContent>
          </Tabs>

          {/* Count preview */}
          <div className="rounded-lg border p-3 text-center">
            {loading ? (
              <p className="text-sm text-muted-foreground">Calcolo in corso…</p>
            ) : count === null ? (
              <p className="text-sm text-muted-foreground">—</p>
            ) : count === 0 ? (
              <p className="text-sm text-muted-foreground">Nessuna riga da eliminare nel criterio selezionato.</p>
            ) : (
              <p className="text-sm">
                Verranno eliminate: <strong className="text-destructive">{count} righe</strong>
              </p>
            )}
          </div>

          {/* Confirmation */}
          <div className="space-y-1.5">
            <Label className="text-xs">
              Digita <strong>ELIMINA</strong> per confermare
            </Label>
            <Input
              placeholder="ELIMINA"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="font-mono"
            />
          </div>
        </div>
      </AppModal>
    </>
  );
}
