import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const MS_TOKEN_KEY = "ms_provider_token";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  msProviderToken: string | null;
  clearMsProviderToken: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  msProviderToken: null,
  clearMsProviderToken: () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  // Restored from localStorage so it survives page refreshes
  const [msProviderToken, setMsProviderToken] = useState<string | null>(
    localStorage.getItem(MS_TOKEN_KEY)
  );

  const clearMsToken = useCallback(() => {
    localStorage.removeItem(MS_TOKEN_KEY);
    setMsProviderToken(null);
  }, []);

  const syncMsToken = useCallback((token: string | null | undefined, provider?: string) => {
    if (token && provider === "azure") {
      localStorage.setItem(MS_TOKEN_KEY, token);
      setMsProviderToken(token);
      return;
    }

    clearMsToken();
  }, [clearMsToken]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        if (event === "SIGNED_IN") {
          syncMsToken(session?.provider_token, session?.user?.app_metadata?.provider);
        }
        if (event === "SIGNED_OUT") {
          clearMsToken();
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      // Capture token right after redirect back from Microsoft
      syncMsToken(session?.provider_token, session?.user?.app_metadata?.provider);
    });

    return () => subscription.unsubscribe();
  }, [syncMsToken, clearMsToken]);

  const signOut = async () => {
    clearMsToken();
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, msProviderToken, clearMsProviderToken: clearMsToken, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);