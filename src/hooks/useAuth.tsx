import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const MS_TOKEN_KEY = "ms_provider_token";
const GOOGLE_TOKEN_KEY = "google_provider_token";
const GOOGLE_TOKENS_KEY = "google_provider_tokens";
const IDENTITY_LINKING_UNSUPPORTED_KEY = "identity_linking_unsupported";

const IDENTITY_LINKING_UNSUPPORTED_MESSAGE =
  "Your Supabase project does not support account linking yet. Enable Identity Linking in Supabase Auth settings, then try Add Google Account again.";

function readStoredGoogleTokens(): string[] {
  const multiRaw = localStorage.getItem(GOOGLE_TOKENS_KEY);
  if (multiRaw) {
    try {
      const parsed = JSON.parse(multiRaw) as unknown;
      if (Array.isArray(parsed)) {
        return Array.from(new Set(parsed.filter((item): item is string => typeof item === "string" && item.length > 0)));
      }
    } catch {
      // ignore parse errors and fallback to legacy key
    }
  }

  const legacy = localStorage.getItem(GOOGLE_TOKEN_KEY);
  return legacy ? [legacy] : [];
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  msProviderToken: string | null;
  googleProviderTokens: string[];
  googleProviderToken: string | null;
  googleAccountCount: number;
  identityLinkingSupported: boolean;
  resetIdentityLinkingSupport: () => void;
  isGoogleLinked: boolean;
  isMicrosoftLinked: boolean;
  clearMsProviderToken: () => void;
  clearGoogleProviderToken: () => void;
  removeGoogleProviderToken: (token: string) => void;
  connectGoogle: () => Promise<void>;
  connectMicrosoft: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  msProviderToken: null,
  googleProviderTokens: [],
  googleProviderToken: null,
  googleAccountCount: 0,
  identityLinkingSupported: true,
  resetIdentityLinkingSupport: () => {},
  isGoogleLinked: false,
  isMicrosoftLinked: false,
  clearMsProviderToken: () => {},
  clearGoogleProviderToken: () => {},
  removeGoogleProviderToken: () => {},
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
  const [googleProviderTokens, setGoogleProviderTokens] = useState<string[]>(() => readStoredGoogleTokens());
  const [identityLinkingSupported, setIdentityLinkingSupported] = useState<boolean>(
    localStorage.getItem(IDENTITY_LINKING_UNSUPPORTED_KEY) !== "1"
  );

  const googleProviderToken = googleProviderTokens[0] ?? null;

  const persistGoogleTokens = useCallback((tokens: string[]) => {
    const normalized = Array.from(new Set(tokens.filter((item) => typeof item === "string" && item.length > 0)));
    setGoogleProviderTokens(normalized);

    if (normalized.length === 0) {
      localStorage.removeItem(GOOGLE_TOKEN_KEY);
      localStorage.removeItem(GOOGLE_TOKENS_KEY);
      return;
    }

    localStorage.setItem(GOOGLE_TOKEN_KEY, normalized[0]);
    localStorage.setItem(GOOGLE_TOKENS_KEY, JSON.stringify(normalized));
  }, []);

  const clearMsToken = useCallback(() => {
    localStorage.removeItem(MS_TOKEN_KEY);
    setMsProviderToken(null);
  }, []);

  const clearGoogleToken = useCallback(() => {
    persistGoogleTokens([]);
  }, [persistGoogleTokens]);

  const removeGoogleToken = useCallback((token: string) => {
    if (!token) return;
    setGoogleProviderTokens((prev) => {
      const next = prev.filter((item) => item !== token);
      if (next.length === 0) {
        localStorage.removeItem(GOOGLE_TOKEN_KEY);
        localStorage.removeItem(GOOGLE_TOKENS_KEY);
      } else {
        localStorage.setItem(GOOGLE_TOKEN_KEY, next[0]);
        localStorage.setItem(GOOGLE_TOKENS_KEY, JSON.stringify(next));
      }
      return next;
    });
  }, []);

  const syncProviderToken = useCallback((token: string | null | undefined, provider?: string) => {
    if (!token) return;

    if (provider === "azure") {
      localStorage.setItem(MS_TOKEN_KEY, token);
      setMsProviderToken(token);
    }

    if (provider === "google") {
      setGoogleProviderTokens((prev) => {
        if (prev.includes(token)) return prev;
        const next = [...prev, token];
        localStorage.setItem(GOOGLE_TOKEN_KEY, next[0]);
        localStorage.setItem(GOOGLE_TOKENS_KEY, JSON.stringify(next));
        return next;
      });
    }
  }, []);

  const markIdentityLinkingUnsupported = useCallback(() => {
    localStorage.setItem(IDENTITY_LINKING_UNSUPPORTED_KEY, "1");
    setIdentityLinkingSupported(false);
  }, []);

  const markIdentityLinkingSupported = useCallback(() => {
    localStorage.removeItem(IDENTITY_LINKING_UNSUPPORTED_KEY);
    setIdentityLinkingSupported(true);
  }, []);

  const isIdentityLinking404 = (error: unknown): boolean => {
    const anyErr = error as { status?: number; message?: string } | null;
    if (anyErr?.status === 404) return true;
    const message = String(anyErr?.message ?? "").toLowerCase();
    return message.includes("/user/identities/authorize") || (message.includes("404") && message.includes("identit"));
  };

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
    if (!identityLinkingSupported) {
      throw new Error(IDENTITY_LINKING_UNSUPPORTED_MESSAGE);
    }
    try {
      const { error } = await supabase.auth.linkIdentity({
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
            prompt: "consent select_account",
            include_granted_scopes: "true",
          },
        },
      });
      if (error) {
        throw error;
      }
      markIdentityLinkingSupported();
    } catch (error) {
      if (isIdentityLinking404(error)) {
        markIdentityLinkingUnsupported();
        throw new Error(IDENTITY_LINKING_UNSUPPORTED_MESSAGE);
      }
      throw error;
    }
  };

  const connectMicrosoft = async () => {
    if (!identityLinkingSupported) {
      throw new Error(IDENTITY_LINKING_UNSUPPORTED_MESSAGE);
    }
    try {
      const { error } = await supabase.auth.linkIdentity({
        provider: "azure",
        options: {
          redirectTo: window.location.origin + "/dashboard",
          scopes: "openid profile email offline_access User.Read Calendars.Read Mail.Read Files.Read",
        },
      });
      if (error) {
        throw error;
      }
      markIdentityLinkingSupported();
    } catch (error) {
      if (isIdentityLinking404(error)) {
        markIdentityLinkingUnsupported();
        throw new Error(IDENTITY_LINKING_UNSUPPORTED_MESSAGE);
      }
      throw error;
    }
  };

  const identities = user?.identities ?? [];
  const isGoogleLinked = identities.some((identity) => identity.provider === "google") || googleProviderTokens.length > 0;
  const isMicrosoftLinked = identities.some((identity) => identity.provider === "azure");

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        msProviderToken,
        googleProviderTokens,
        googleProviderToken,
        googleAccountCount: googleProviderTokens.length,
        identityLinkingSupported,
        resetIdentityLinkingSupport: markIdentityLinkingSupported,
        isGoogleLinked,
        isMicrosoftLinked,
        clearMsProviderToken: clearMsToken,
        clearGoogleProviderToken: clearGoogleToken,
        removeGoogleProviderToken: removeGoogleToken,
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