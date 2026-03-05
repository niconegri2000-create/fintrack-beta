import { useMemo, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import type { WizardState } from "./CsvImportWizard";

interface Props {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
}

const DATE_FORMATS = [
  { value: "auto", label: "Auto (consigliato)" },
  { value: "dd/mm/yyyy", label: "dd/mm/yyyy" },
  { value: "mm/dd/yyyy", label: "mm/dd/yyyy" },
  { value: "yyyy-mm-dd", label: "yyyy-mm-dd" },
  { value: "dd-mm-yyyy", label: "dd-mm-yyyy" },
  { value: "dd.mm.yyyy", label: "dd.mm.yyyy" },
  { value: "d-mmmm-yyyy-it", label: "d MMMM yyyy (IT) — es. 27 febbraio 2026" },
];

const NONE = "__none__";

export function StepMapping({ state, setState }: Props) {
  const { headers, rawRows, mapping } = state;
  const previewRows = useMemo(() => rawRows.slice(0, 15), [rawRows]);
  const sampleRows = useMemo(() => rawRows.slice(0, 3), [rawRows]);

  const useSeparateColumns = !!(mapping.debit_col || mapping.credit_col);
  const useDirectionCol = !!mapping.direction_col;

  const setField = (field: string, value: string) => {
    setState((s) => ({
      ...s,
      mapping: { ...s.mapping, [field]: value === NONE ? undefined : value },
    }));
  };

  const toggleSeparateColumns = (checked: boolean) => {
    setState((s) => ({
      ...s,
      mapping: {
        ...s.mapping,
        amount_col: checked ? undefined : (s.headers[0] ?? ""),
        debit_col: checked ? (s.headers[0] ?? "") : undefined,
        credit_col: checked ? (s.headers[1] ?? "") : undefined,
        direction_col: checked ? undefined : s.mapping.direction_col,
      },
    }));
  };

  // Auto-detect direction column (e.g. "Stato" with values like D/A)
  useEffect(() => {
    if (useSeparateColumns || mapping.direction_col) return;
    const statoCol = headers.find((h) => /^stato$/i.test(h.trim()));
    if (!statoCol) return;
    const vals = rawRows.slice(0, 20).map((r) => (r[statoCol] ?? "").trim().toUpperCase()).filter(Boolean);
    const singleLetters = vals.filter((v) => v.length === 1);
    if (singleLetters.length >= vals.length * 0.7 && vals.length >= 3) {
      setState((s) => ({
        ...s,
        mapping: {
          ...s.mapping,
          direction_col: statoCol,
          debit_values: ["D"],
          credit_values: ["A"],
        },
      }));
    }
  }, [headers, rawRows, useSeparateColumns]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      {/* Column mapping */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <MappingSelect label="Data *" value={mapping.date_col} headers={headers} sampleRows={sampleRows} onChange={(v) => setField("date_col", v)} />
        <MappingSelect label="Descrizione *" value={mapping.desc_col} headers={headers} sampleRows={sampleRows} onChange={(v) => setField("desc_col", v)} />

        <div className="sm:col-span-2 flex items-center gap-2">
          <Switch checked={useSeparateColumns} onCheckedChange={toggleSeparateColumns} />
          <span className="text-sm">Entrate e uscite in colonne separate</span>
        </div>

        {useSeparateColumns ? (
          <>
            <MappingSelect label="Colonna Uscite (addebiti)" value={mapping.debit_col ?? ""} headers={headers} sampleRows={sampleRows} onChange={(v) => setField("debit_col", v)} />
            <MappingSelect label="Colonna Entrate (accrediti)" value={mapping.credit_col ?? ""} headers={headers} sampleRows={sampleRows} onChange={(v) => setField("credit_col", v)} />
          </>
        ) : (
          <>
            <MappingSelect label="Importo *" value={mapping.amount_col ?? ""} headers={headers} sampleRows={sampleRows} onChange={(v) => setField("amount_col", v)} />

            <MappingSelect
              label="Direzione / Stato (opzionale)"
              value={mapping.direction_col ?? ""}
              headers={headers}
              sampleRows={sampleRows}
              onChange={(v) => {
                setState((s) => ({
                  ...s,
                  mapping: {
                    ...s.mapping,
                    direction_col: v === NONE ? undefined : v,
                    debit_values: v === NONE ? undefined : (s.mapping.debit_values ?? ["D"]),
                    credit_values: v === NONE ? undefined : (s.mapping.credit_values ?? ["A"]),
                  },
                }));
              }}
            />

            {useDirectionCol ? (
              <div className="sm:col-span-2 grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Valori Uscita (Debit)</label>
                  <Input
                    placeholder="D"
                    value={(mapping.debit_values ?? ["D"]).join(", ")}
                    onChange={(e) => {
                      const vals = e.target.value.split(",").map((v) => v.trim()).filter(Boolean);
                      setState((s) => ({ ...s, mapping: { ...s.mapping, debit_values: vals.length > 0 ? vals : ["D"] } }));
                    }}
                  />
                  <p className="text-[10px] text-muted-foreground">Separati da virgola, es: D, DARE</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Valori Entrata (Credit)</label>
                  <Input
                    placeholder="A"
                    value={(mapping.credit_values ?? ["A"]).join(", ")}
                    onChange={(e) => {
                      const vals = e.target.value.split(",").map((v) => v.trim()).filter(Boolean);
                      setState((s) => ({ ...s, mapping: { ...s.mapping, credit_values: vals.length > 0 ? vals : ["A"] } }));
                    }}
                  />
                  <p className="text-[10px] text-muted-foreground">Separati da virgola, es: A, AVERE</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Switch
                  checked={mapping.negative_is_expense ?? true}
                  onCheckedChange={(c) => setState((s) => ({ ...s, mapping: { ...s.mapping, negative_is_expense: c } }))}
                />
                <span className="text-sm">Importi negativi = uscite</span>
              </div>
            )}
          </>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Formato data</label>
          <Select value={mapping.date_format} onValueChange={(v) => setField("date_format", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_FORMATS.map((f) => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Preview — responsive: cards on mobile, table on desktop */}
      <div className="space-y-1.5">
        <p className="text-sm font-medium">Anteprima ({Math.min(previewRows.length, 15)} di {rawRows.length} righe)</p>

        {/* Desktop table — hidden on small screens */}
        <div className="hidden md:block rounded-lg border overflow-hidden">
          <div className="max-h-[200px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 sticky top-0 z-10">
                <tr>
                  {headers.map((h) => (
                    <th key={h} className="text-left px-2 py-1.5 font-medium whitespace-nowrap border-b">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => (
                  <tr key={i} className="border-b last:border-b-0 hover:bg-muted/30">
                    {headers.map((h) => (
                      <td key={h} className="px-2 py-1 max-w-[180px] truncate">
                        {row[h] || "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile cards — visible only on small screens */}
        <div className="md:hidden space-y-1.5 max-h-[250px] overflow-y-auto rounded-lg border p-2">
          {previewRows.slice(0, 10).map((row, i) => {
            // Show mapped columns prominently, rest in collapsible
            const dateVal = mapping.date_col ? row[mapping.date_col] : null;
            const descVal = mapping.desc_col ? row[mapping.desc_col] : null;
            const amountVal = mapping.amount_col ? row[mapping.amount_col] : (mapping.debit_col ? (row[mapping.debit_col] || row[mapping.credit_col ?? ""]) : null);
            const otherHeaders = headers.filter((h) => h !== mapping.date_col && h !== mapping.desc_col && h !== mapping.amount_col && h !== mapping.debit_col && h !== mapping.credit_col);

            return (
              <Collapsible key={i}>
                <div className="rounded-md border bg-card p-2 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {dateVal && <span className="text-muted-foreground mr-2">{dateVal}</span>}
                      <span className="font-medium break-words">{descVal || `Riga ${i + 1}`}</span>
                    </div>
                    {amountVal && (
                      <span className="font-mono shrink-0 font-medium">{amountVal}</span>
                    )}
                  </div>
                  {otherHeaders.length > 0 && (
                    <>
                      <CollapsibleTrigger className="flex items-center gap-1 text-muted-foreground mt-1 hover:text-foreground transition-colors">
                        <ChevronDown className="h-3 w-3" />
                        <span>dettagli</span>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="mt-1 space-y-0.5 pl-1 border-l-2 border-muted ml-1">
                          {otherHeaders.map((h) => (
                            <div key={h} className="flex gap-1">
                              <span className="text-muted-foreground shrink-0">{h}:</span>
                              <span className="break-all">{row[h] || "—"}</span>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </>
                  )}
                </div>
              </Collapsible>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Mapping select with micro-preview ──────────────────────── */

function MappingSelect({
  label,
  value,
  headers,
  sampleRows,
  onChange,
}: {
  label: string;
  value: string;
  headers: string[];
  sampleRows: Record<string, string>[];
  onChange: (v: string) => void;
}) {
  const preview = value && value !== NONE
    ? sampleRows.slice(0, 3).map((r) => r[value] ?? "").filter(Boolean)
    : [];

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <Select value={value || NONE} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Seleziona colonna" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>— Nessuna —</SelectItem>
          {headers.map((h) => (
            <SelectItem key={h} value={h}>{h}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {preview.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {preview.map((v, i) => (
            <Badge key={i} variant="secondary" className="text-[10px] font-normal max-w-[150px] truncate">
              {v}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
