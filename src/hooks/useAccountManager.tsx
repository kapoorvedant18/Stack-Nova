import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Session } from "@supabase/supabase-js";

export interface SavedAccount {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  provider: "email" | "google" | "azure";
  // Full session stored so we can restore it instantly on switch
  session: Session;
}

interface AccountManagerContextType {
  savedAccounts: SavedAccount[];
  activeAccountId: string | null;
  addOrUpdateAccount: (account: SavedAccount) => void;
  removeAccount: (id: string) => void;
  setActiveAccountId: (id: string | null) => void;
  getSession: (id: string) => Session | null;
}

const ACCOUNTS_KEY = "stacknova_accounts_v2";
const ACTIVE_KEY   = "stacknova_active_account";

function load(): SavedAccount[] {
  try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? "[]"); }
  catch { return []; }
}

const Ctx = createContext<AccountManagerContextType>({
  savedAccounts: [],
  activeAccountId: null,
  addOrUpdateAccount: () => {},
  removeAccount: () => {},
  setActiveAccountId: () => {},
  getSession: () => null,
});

export function AccountManagerProvider({ children }: { children: ReactNode }) {
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>(load);
  const [activeAccountId, setActiveAccountIdState] = useState<string | null>(
    localStorage.getItem(ACTIVE_KEY)
  );

  const addOrUpdateAccount = useCallback((account: SavedAccount) => {
    setSavedAccounts(prev => {
      const updated = prev.find(a => a.id === account.id)
        ? prev.map(a => a.id === account.id ? { ...a, ...account } : a)
        : [...prev, account];
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const removeAccount = useCallback((id: string) => {
    setSavedAccounts(prev => {
      const updated = prev.filter(a => a.id !== id);
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const setActiveAccountId = useCallback((id: string | null) => {
    if (id) localStorage.setItem(ACTIVE_KEY, id);
    else localStorage.removeItem(ACTIVE_KEY);
    setActiveAccountIdState(id);
  }, []);

  const getSession = useCallback((id: string): Session | null => {
    return savedAccounts.find(a => a.id === id)?.session ?? null;
  }, [savedAccounts]);

  return (
    <Ctx.Provider value={{
      savedAccounts, activeAccountId,
      addOrUpdateAccount, removeAccount,
      setActiveAccountId, getSession,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAccountManager = () => useContext(Ctx);