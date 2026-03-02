import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from "react";
import { useAccounts, useAllAccounts, type AccountRow } from "@/hooks/useAccounts";
import { useWorkspaceId } from "@/contexts/WorkspaceContext";

/** null = MASTER (aggregated view) */
type SelectedAccountId = string | null;

interface AccountContextValue {
  selectedAccountId: SelectedAccountId;
  setSelectedAccountId: (id: SelectedAccountId) => void;
  selectedAccount: AccountRow | null;
  accounts: AccountRow[];
  allAccounts: AccountRow[];
  openingBalance: number;
  minBalanceThreshold: number;
  isLoading: boolean;
}

const AccountContext = createContext<AccountContextValue | undefined>(undefined);

const STORAGE_PREFIX = "selected_account_";
const DEFAULT_STARTUP_KEY = "fintrack_default_startup_account";

function loadStoredAccountId(workspaceId: string): SelectedAccountId {
  try { const raw = localStorage.getItem(STORAGE_PREFIX + workspaceId); if (raw === "MASTER" || raw === null) return null; return raw; } catch { return null; }
}
function loadDefaultStartupAccountId(): SelectedAccountId {
  try { const raw = localStorage.getItem(DEFAULT_STARTUP_KEY); if (!raw || raw === "MASTER") return null; return raw; } catch { return null; }
}
function saveStoredAccountId(workspaceId: string, id: SelectedAccountId) {
  try { localStorage.setItem(STORAGE_PREFIX + workspaceId, id ?? "MASTER"); } catch { /* noop */ }
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const workspaceId = useWorkspaceId();
  const { data: accounts = [], isLoading: loadingActive } = useAccounts();
  const { data: allAccounts = [], isLoading: loadingAll } = useAllAccounts();
  const isLoading = loadingActive || loadingAll;
  const [selectedAccountId, setSelectedAccountIdRaw] = useState<SelectedAccountId>(() => loadStoredAccountId(workspaceId));

  useEffect(() => {
    if (isLoading || accounts.length === 0) return;
    if (selectedAccountId !== null) {
      const exists = accounts.some((a) => a.id === selectedAccountId);
      if (!exists) {
        const defaultId = loadDefaultStartupAccountId();
        const defaultValid = defaultId !== null && accounts.some((a) => a.id === defaultId);
        const resolved = defaultValid ? defaultId : null;
        setSelectedAccountIdRaw(resolved);
        saveStoredAccountId(workspaceId, resolved);
        if (defaultId !== null && !defaultValid) localStorage.setItem(DEFAULT_STARTUP_KEY, "MASTER");
      }
      return;
    }
    const storedRaw = localStorage.getItem(STORAGE_PREFIX + workspaceId);
    if (storedRaw !== null) return;
    const defaultId = loadDefaultStartupAccountId();
    if (defaultId !== null) {
      const exists = accounts.some((a) => a.id === defaultId);
      if (exists) { setSelectedAccountIdRaw(defaultId); saveStoredAccountId(workspaceId, defaultId); }
      else localStorage.setItem(DEFAULT_STARTUP_KEY, "MASTER");
    }
  }, [accounts, isLoading, selectedAccountId, workspaceId]);

  const setSelectedAccountId = (id: SelectedAccountId) => { setSelectedAccountIdRaw(id); saveStoredAccountId(workspaceId, id); };
  const selectedAccount = useMemo(() => (selectedAccountId ? accounts.find((a) => a.id === selectedAccountId) ?? null : null), [accounts, selectedAccountId]);
  const openingBalance = useMemo(() => { if (selectedAccount) return selectedAccount.opening_balance; return accounts.reduce((sum, a) => sum + a.opening_balance, 0); }, [accounts, selectedAccount]);
  const minBalanceThreshold = useMemo(() => { if (selectedAccount) return selectedAccount.min_balance_threshold ?? 0; return 0; }, [selectedAccount]);

  return (
    <AccountContext.Provider value={{ selectedAccountId, setSelectedAccountId, selectedAccount, accounts, allAccounts, openingBalance, minBalanceThreshold, isLoading }}>
      {children}
    </AccountContext.Provider>
  );
}

export function useAccountContext() {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("useAccountContext must be used within AccountProvider");
  return ctx;
}
