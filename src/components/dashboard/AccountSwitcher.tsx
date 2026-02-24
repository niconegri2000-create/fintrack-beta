import { ChevronsUpDown, Landmark, Layers } from "lucide-react";
import { useAccountContext } from "@/contexts/AccountContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AccountSwitcher() {
  const { selectedAccountId, setSelectedAccountId, selectedAccount, accounts } =
    useAccountContext();

  const label = selectedAccount ? selectedAccount.name : "Conto Master";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          {selectedAccountId ? (
            <Landmark className="h-4 w-4" />
          ) : (
            <Layers className="h-4 w-4" />
          )}
          {label}
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px]">
        <DropdownMenuItem
          className={!selectedAccountId ? "font-medium bg-accent" : ""}
          onSelect={() => setSelectedAccountId(null)}
        >
          <Layers className="h-4 w-4 mr-2" />
          Conto Master
        </DropdownMenuItem>
        {accounts.length > 0 && <DropdownMenuSeparator />}
        {accounts.map((a) => (
          <DropdownMenuItem
            key={a.id}
            className={selectedAccountId === a.id ? "font-medium bg-accent" : ""}
            onSelect={() => setSelectedAccountId(a.id)}
          >
            <Landmark className="h-4 w-4 mr-2" />
            {a.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
