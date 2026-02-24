import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from "react";
import { useAccounts, type AccountRow } from "@/hooks/useAccounts";
import { DEFAULT_WORKSPACE_ID } from "@/lib/constants";

/** null = MASTER (aggregated view) */
type SelectedAccountId = string | null;

interface AccountContextValue {
  selectedAccountId: SelectedAccountId;
  setSelectedAccountId: (id: SelectedAccountId) => void;
  /** The selected account row, or null if MASTER */
  selectedAccount: AccountRow | null;
  /** All accounts for the workspace */
  accounts: AccountRow[];
  /** Aggregated opening balance (sum of all if MASTER, single if account selected) */
  openingBalance: number;
  /** min_balance_threshold for selected account, 0 for MASTER */
  minBalanceThreshold: number;
  isLoading: boolean;
}

const AccountContext = createContext<AccountContextValue | undefined>(undefined);

const STORAGE_PREFIX = "selected_account_";

function loadStoredAccountId(workspaceId: string): SelectedAccountId {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + workspaceId);
    if (raw === "MASTER" || raw === null) return null;
    return raw;
  } catch {
    return null;
  }
}

function saveStoredAccountId(workspaceId: string, id: SelectedAccountId) {
  try {
    localStorage.setItem(STORAGE_PREFIX + workspaceId, id ?? "MASTER");
  } catch { /* noop */ }
}

export function AccountProvider({ children, workspaceId = DEFAULT_WORKSPACE_ID }: { children: ReactNode; workspaceId?: string }) {
  const { data: accounts = [], isLoading } = useAccounts(workspaceId);
  const [selectedAccountId, setSelectedAccountIdRaw] = useState<SelectedAccountId>(() => loadStoredAccountId(workspaceId));

  // Validate: if stored account no longer exists, fallback to MASTER
  useEffect(() => {
    if (!isLoading && accounts.length > 0 && selectedAccountId !== null) {
      const exists = accounts.some((a) => a.id === selectedAccountId);
      if (!exists) {
        setSelectedAccountIdRaw(null);
        saveStoredAccountId(workspaceId, null);
      }
    }
  }, [accounts, isLoading, selectedAccountId, workspaceId]);

  const setSelectedAccountId = (id: SelectedAccountId) => {
    setSelectedAccountIdRaw(id);
    saveStoredAccountId(workspaceId, id);
  };

  const selectedAccount = useMemo(
    () => (selectedAccountId ? accounts.find((a) => a.id === selectedAccountId) ?? null : null),
    [accounts, selectedAccountId],
  );

  const openingBalance = useMemo(() => {
    if (selectedAccount) return selectedAccount.opening_balance;
    return accounts.reduce((sum, a) => sum + a.opening_balance, 0);
  }, [accounts, selectedAccount]);

  const minBalanceThreshold = useMemo(() => {
    if (selectedAccount) return selectedAccount.min_balance_threshold ?? 0;
    return 0; // MASTER: no threshold
  }, [selectedAccount]);

  return (
    <AccountContext.Provider
      value={{
        selectedAccountId,
        setSelectedAccountId,
        selectedAccount,
        accounts,
        openingBalance,
        minBalanceThreshold,
        isLoading,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
}

export function useAccountContext() {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("useAccountContext must be used within AccountProvider");
  return ctx;
}
