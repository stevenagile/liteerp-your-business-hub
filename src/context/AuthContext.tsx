import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { withAuthTimeout } from "@/lib/auth-loading";

export type Profile = {
  id: string;
  display_name: string | null;
  role: string | null;
  company_id: string | null;
};

type AuthState = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  error: string | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  retryAuth: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [profileAttempt, setProfileAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let receivedEvent = false;
    setLoading(true);
    setError(null);
    // Never start Supabase reads inside this callback: it runs while the
    // auth lock is held. Profile reads happen in the separate effect below.
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      if (cancelled) return;
      receivedEvent = true;
      setSession(sess);
      setError(null);
      setLoading(false);
    });

    withAuthTimeout(supabase.auth.getSession()).then(({ data, error: sessionError }) => {
      if (cancelled || receivedEvent) return;
      if (sessionError) throw sessionError;
      setSession(data.session);
      setLoading(false);
    }).catch((cause: unknown) => {
      if (!cancelled && !receivedEvent) {
        console.error("[auth] session error", cause);
        setError(cause instanceof Error ? cause.message : "無法讀取登入資料，請重試。");
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [attempt]);

  const userId = session?.user.id;
  const [profileLoading, setProfileLoading] = useState(false);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setProfile(null);
    setLoadedUserId(null);
    if (!userId) {
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    setError(null);
    withAuthTimeout(supabase.from("profiles")
      .select("id, display_name, role, company_id")
      .eq("id", userId).maybeSingle()).then(({ data, error: profileError }) => {
        if (cancelled) return;
        if (profileError) throw profileError;
        setProfile((data as Profile) ?? null);
      }).catch((cause: unknown) => {
        if (cancelled) return;
        console.error("[auth] profile error", cause);
        setError(cause instanceof Error ? cause.message : "無法讀取使用者資料，請重試。");
      }).finally(() => {
        if (!cancelled) {
          setLoadedUserId(userId);
          setProfileLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [userId, profileAttempt]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const refreshProfile = async () => {
    setProfileAttempt((value) => value + 1);
  };

  return (
    <AuthContext.Provider
      value={{
        loading: loading || profileLoading || Boolean(userId && loadedUserId !== userId),
        session,
        user: session?.user ?? null,
        profile,
        error,
        signOut,
        refreshProfile,
        retryAuth: () => {
          setAttempt((value) => value + 1);
          setProfileAttempt((value) => value + 1);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
