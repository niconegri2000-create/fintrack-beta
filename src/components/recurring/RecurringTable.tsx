import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { RecurringRow } from "@/hooks/useRecurringRules";
import { capitalizeFirst } from "@/lib/normalize";
import { usePrivacy } from "@/contexts/PrivacyContext";
import { useAccountContext } from "@/contexts/AccountContext";
import { RecurringEditDialog } from "./RecurringEditDialog";
import { RecurringDeleteDialog } from "./RecurringDeleteDialog";

interface Props {
  data: RecurringRow[];
  isLoading: boolean;
}

export function RecurringTable({ data, isLoading }: Props) {
  const { isPrivacy } = usePrivacy();
  const { accounts, selectedAccountId } = useAccountContext();
  const accountMap = useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, a.name])), [accounts]);
  const [editRule, setEditRule] = useState<RecurringRow | null>(null);
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground text-sm">
        Caricamento…
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground text-sm">
        Nessuna ricorrenza configurata
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border bg-card overflow-x-auto">
        <Table className="min-w-[700px]">
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="w-[90px]">Tipo</TableHead>
              <TableHead className="text-right w-[110px]">Importo</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="w-[80px] text-center">Giorno</TableHead>
              <TableHead className="w-[120px]">Frequenza</TableHead>
              <TableHead className="w-[100px]">Fine</TableHead>
              <TableHead className="w-[80px] text-center">Attiva</TableHead>
              {!selectedAccountId && <TableHead className="w-[110px]">Conto</TableHead>}
              <TableHead className="w-[80px] text-center">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{capitalizeFirst(r.name) || "—"}</TableCell>
                <TableCell>
                  <Badge className={`text-[11px] ${r.type === "income" ? "bg-success text-success-foreground hover:bg-success/80" : "bg-destructive text-destructive-foreground hover:bg-destructive/80"}`}>
                    {r.type === "income" ? "Entrata" : "Uscita"}
                  </Badge>
                </TableCell>
                <TableCell className={`text-right font-mono font-medium ${r.type === "income" ? "text-success" : "text-destructive"}`}>
                  {isPrivacy ? "••••" : `€${r.amount.toFixed(2)}`}
                </TableCell>
                <TableCell className="text-muted-foreground">{r.category?.name || "—"}</TableCell>
                <TableCell className="text-center font-mono">{r.day_of_month ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {(r.interval_months ?? 1) === 1 ? "Mensile" : `Ogni ${r.interval_months} mesi`}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {r.end_date ? new Date(r.end_date).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—"}
                </TableCell>
                <TableCell className="text-center">
                  <span className={`inline-block h-2 w-2 rounded-full ${r.is_active ? "bg-success" : "bg-muted-foreground"}`} />
                </TableCell>
                {!selectedAccountId && (
                  <TableCell className="text-xs text-muted-foreground">{r.account_id ? accountMap[r.account_id] || "—" : "—"}</TableCell>
                )}
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditRule(r)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteRuleId(r.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {editRule && (
        <RecurringEditDialog rule={editRule} open={!!editRule} onOpenChange={(o) => !o && setEditRule(null)} />
      )}
      {deleteRuleId && (
        <RecurringDeleteDialog ruleId={deleteRuleId} open={!!deleteRuleId} onOpenChange={(o) => !o && setDeleteRuleId(null)} />
      )}
    </>
  );
}
