import { useTheme } from "next-themes";
import { usePreferences } from "@/hooks/usePreferences";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RotateCcw, Sun, Moon, Monitor } from "lucide-react";

const CURRENCIES = [
  { value: "EUR", label: "€ Euro (EUR)" },
  { value: "USD", label: "$ Dollaro (USD)" },
  { value: "GBP", label: "£ Sterlina (GBP)" },
  { value: "CHF", label: "CHF Franco svizzero" },
];

const pillActive =
  "bg-primary text-primary-foreground font-semibold shadow-sm";
const pillInactive = "text-muted-foreground";

const Row = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-muted-foreground text-xs">{hint}</p>
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

export const GeneralPreferencesSection = () => {
  const { theme, setTheme } = useTheme();
  const { prefs, update, reset } = usePreferences();

  return (
    <div className="rounded-xl border bg-card p-6 space-y-5">
      <div>
        <h2 className="text-base font-semibold">Preferenze generali</h2>
        <p className="text-muted-foreground text-sm">
          Scegli come visualizzare i dati.
        </p>
      </div>

      {/* Tema */}
      <Row label="Tema" hint="Chiaro, scuro o in base al sistema.">
        <ToggleGroup
          type="single"
          value={theme ?? "system"}
          onValueChange={(v) => v && setTheme(v)}
          className="rounded-lg border bg-muted/50 p-0.5"
        >
          <ToggleGroupItem
            value="system"
            className={`rounded-md px-3 py-1.5 text-xs ${theme === "system" ? pillActive : pillInactive}`}
          >
            <Monitor className="mr-1 h-3.5 w-3.5" />
            Sistema
          </ToggleGroupItem>
          <ToggleGroupItem
            value="light"
            className={`rounded-md px-3 py-1.5 text-xs ${theme === "light" ? pillActive : pillInactive}`}
          >
            <Sun className="mr-1 h-3.5 w-3.5" />
            Chiaro
          </ToggleGroupItem>
          <ToggleGroupItem
            value="dark"
            className={`rounded-md px-3 py-1.5 text-xs ${theme === "dark" ? pillActive : pillInactive}`}
          >
            <Moon className="mr-1 h-3.5 w-3.5" />
            Scuro
          </ToggleGroupItem>
        </ToggleGroup>
      </Row>

      {/* Valuta */}
      <Row label="Valuta" hint="Usata per importi e report.">
        <Select
          value={prefs.currency}
          onValueChange={(v) => update("currency", v)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Seleziona valuta" />
          </SelectTrigger>
          <SelectContent>
            {CURRENCIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Row>

      {/* Primo giorno della settimana */}
      <Row
        label="Primo giorno della settimana"
        hint="Influenza calendario e report."
      >
        <ToggleGroup
          type="single"
          value={prefs.firstDayOfWeek}
          onValueChange={(v) =>
            v && update("firstDayOfWeek", v as "monday" | "sunday")
          }
          className="rounded-lg border bg-muted/50 p-0.5"
        >
          <ToggleGroupItem
            value="monday"
            className={`rounded-md px-3 py-1.5 text-xs ${prefs.firstDayOfWeek === "monday" ? pillActive : pillInactive}`}
          >
            Lunedì
          </ToggleGroupItem>
          <ToggleGroupItem
            value="sunday"
            className={`rounded-md px-3 py-1.5 text-xs ${prefs.firstDayOfWeek === "sunday" ? pillActive : pillInactive}`}
          >
            Domenica
          </ToggleGroupItem>
        </ToggleGroup>
      </Row>

      {/* Formato data */}
      <Row label="Formato data" hint="Usato nelle tabelle e nei filtri.">
        <ToggleGroup
          type="single"
          value={prefs.dateFormat}
          onValueChange={(v) =>
            v && update("dateFormat", v as "dd/mm/yyyy" | "mm/dd/yyyy")
          }
          className="rounded-lg border bg-muted/50 p-0.5"
        >
          <ToggleGroupItem
            value="dd/mm/yyyy"
            className={`rounded-md px-3 py-1.5 text-xs ${prefs.dateFormat === "dd/mm/yyyy" ? pillActive : pillInactive}`}
          >
            GG/MM/AAAA
          </ToggleGroupItem>
          <ToggleGroupItem
            value="mm/dd/yyyy"
            className={`rounded-md px-3 py-1.5 text-xs ${prefs.dateFormat === "mm/dd/yyyy" ? pillActive : pillInactive}`}
          >
            MM/DD/YYYY
          </ToggleGroupItem>
        </ToggleGroup>
      </Row>

      {/* Formato numeri */}
      <Row label="Formato numeri" hint="Separatore migliaia e decimali.">
        <ToggleGroup
          type="single"
          value={prefs.numberFormat}
          onValueChange={(v) =>
            v && update("numberFormat", v as "1.000,00" | "1,000.00")
          }
          className="rounded-lg border bg-muted/50 p-0.5"
        >
          <ToggleGroupItem
            value="1.000,00"
            className={`rounded-md px-3 py-1.5 text-xs ${prefs.numberFormat === "1.000,00" ? pillActive : pillInactive}`}
          >
            1.000,00
          </ToggleGroupItem>
          <ToggleGroupItem
            value="1,000.00"
            className={`rounded-md px-3 py-1.5 text-xs ${prefs.numberFormat === "1,000.00" ? pillActive : pillInactive}`}
          >
            1,000.00
          </ToggleGroupItem>
        </ToggleGroup>
      </Row>

      {/* Reset */}
      <div className="pt-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => {
            reset();
            setTheme("system");
          }}
        >
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          Ripristina impostazioni predefinite
        </Button>
        <p className="text-muted-foreground text-xs mt-1">
          Valuta, tema e formati torneranno ai valori iniziali.
        </p>
      </div>
    </div>
  );
};
