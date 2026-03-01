import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const MS_TOKEN_KEY = "ms_provider_token";
const GOOGLE_TOKEN_KEY = "google_provider_token";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  msProviderToken: string | null;
  googleProviderToken: string | null;
  isGoogleLinked: boolean;
  isMicrosoftLinked: boolean;
  clearMsProviderToken: () => void;
  clearGoogleProviderToken: () => void;
  connectGoogle: () => Promise<void>;
  connectMicrosoft: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  msProviderToken: null,
  googleProviderToken: null,
  isGoogleLinked: false,
  isMicrosoftLinked: false,
  clearMsProviderToken: () => {},
  clearGoogleProviderToken: () => {},
  connectGoogle: async () => {},
  connectMicrosoft: async () => {},
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
  const [googleProviderToken, setGoogleProviderToken] = useState<string | null>(
    localStorage.getItem(GOOGLE_TOKEN_KEY)
  );

  const clearMsToken = useCallback(() => {
    localStorage.removeItem(MS_TOKEN_KEY);
    setMsProviderToken(null);
  }, []);

  const clearGoogleToken = useCallback(() => {
    localStorage.removeItem(GOOGLE_TOKEN_KEY);
    setGoogleProviderToken(null);
  }, []);

  const syncProviderToken = useCallback((token: string | null | undefined, provider?: string) => {
    if (!token) return;

    if (provider === "azure") {
      localStorage.setItem(MS_TOKEN_KEY, token);
      setMsProviderToken(token);
    }

    if (provider === "google") {
      localStorage.setItem(GOOGLE_TOKEN_KEY, token);
      setGoogleProviderToken(token);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        if (event === "SIGNED_IN") {
          syncProviderToken(session?.provider_token, session?.user?.app_metadata?.provider);
        }
        if (event === "SIGNED_OUT") {
          clearMsToken();
          clearGoogleToken();
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      // Capture token right after redirect back from Microsoft
      syncProviderToken(session?.provider_token, session?.user?.app_metadata?.provider);
    });

    return () => subscription.unsubscribe();
  }, [syncProviderToken, clearMsToken, clearGoogleToken]);

  const signOut = async () => {
    clearMsToken();
    clearGoogleToken();
    await supabase.auth.signOut();
  };

  const connectGoogle = async () => {
    await supabase.auth.linkIdentity({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/dashboard",
        scopes: [
          "https://www.googleapis.com/auth/drive.readonly",
          "https://www.googleapis.com/auth/gmail.readonly",
          "https://www.googleapis.com/auth/calendar.readonly",
        ].join(" "),
        queryParams: {
          access_type: "offline",
          prompt: "consent",
          include_granted_scopes: "true",
        },
      },
    });
  };

  const connectMicrosoft = async () => {
    await supabase.auth.linkIdentity({
      provider: "azure",
      options: {
        redirectTo: window.location.origin + "/dashboard",
        scopes: "openid profile email offline_access User.Read Calendars.Read Mail.Read Files.Read",
      },
    });
  };

  const identities = user?.identities ?? [];
  const isGoogleLinked = identities.some((identity) => identity.provider === "google");
  const isMicrosoftLinked = identities.some((identity) => identity.provider === "azure");

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        msProviderToken,
        googleProviderToken,
        isGoogleLinked,
        isMicrosoftLinked,
        clearMsProviderToken: clearMsToken,
        clearGoogleProviderToken: clearGoogleToken,
        connectGoogle,
        connectMicrosoft,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);