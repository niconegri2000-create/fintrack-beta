import { useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { WizardState } from "./CsvImportWizard";

interface Props {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
}

const DATE_FORMATS = [
  { value: "dd/mm/yyyy", label: "dd/mm/yyyy" },
  { value: "mm/dd/yyyy", label: "mm/dd/yyyy" },
  { value: "yyyy-mm-dd", label: "yyyy-mm-dd" },
  { value: "dd-mm-yyyy", label: "dd-mm-yyyy" },
  { value: "dd.mm.yyyy", label: "dd.mm.yyyy" },
];

const NONE = "__none__";

export function StepMapping({ state, setState }: Props) {
  const { headers, rawRows, mapping } = state;
  const previewRows = useMemo(() => rawRows.slice(0, 15), [rawRows]);

  const useSeparateColumns = !!(mapping.debit_col || mapping.credit_col);

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
      },
    }));
  };

  return (
    <div className="space-y-4">
      {/* Column mapping */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <MappingSelect label="Data *" value={mapping.date_col} headers={headers} onChange={(v) => setField("date_col", v)} />
        <MappingSelect label="Descrizione *" value={mapping.desc_col} headers={headers} onChange={(v) => setField("desc_col", v)} />

        <div className="sm:col-span-2 flex items-center gap-2">
          <Switch checked={useSeparateColumns} onCheckedChange={toggleSeparateColumns} />
          <span className="text-sm">Entrate e uscite in colonne separate</span>
        </div>

        {useSeparateColumns ? (
          <>
            <MappingSelect label="Colonna Uscite (addebiti)" value={mapping.debit_col ?? ""} headers={headers} onChange={(v) => setField("debit_col", v)} />
            <MappingSelect label="Colonna Entrate (accrediti)" value={mapping.credit_col ?? ""} headers={headers} onChange={(v) => setField("credit_col", v)} />
          </>
        ) : (
          <>
            <MappingSelect label="Importo *" value={mapping.amount_col ?? ""} headers={headers} onChange={(v) => setField("amount_col", v)} />
            <div className="flex items-center gap-2">
              <Switch
                checked={mapping.negative_is_expense ?? true}
                onCheckedChange={(c) => setState((s) => ({ ...s, mapping: { ...s.mapping, negative_is_expense: c } }))}
              />
              <span className="text-sm">Importi negativi = uscite</span>
            </div>
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

      {/* Preview */}
      <div className="space-y-1.5">
        <p className="text-sm font-medium">Anteprima ({Math.min(previewRows.length, 15)} di {rawRows.length} righe)</p>
        <ScrollArea className="h-[200px] rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                {headers.map((h) => (
                  <TableHead key={h} className="text-xs whitespace-nowrap">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewRows.map((row, i) => (
                <TableRow key={i}>
                  {headers.map((h) => (
                    <TableCell key={h} className="text-xs py-1.5 whitespace-nowrap max-w-[200px] truncate">
                      {row[h] || "—"}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </div>
  );
}

function MappingSelect({ label, value, headers, onChange }: { label: string; value: string; headers: string[]; onChange: (v: string) => void }) {
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
    </div>
  );
}
