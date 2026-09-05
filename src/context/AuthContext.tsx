import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

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
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, role, company_id")
      .eq("id", userId)
      .maybeSingle();
    if (error) {
      console.error("[auth] load profile error", error);
      setProfile(null);
      return;
    }
    setProfile((data as Profile) ?? null);
  };

  useEffect(() => {
    // FE-05: 修正 race condition — 在 profile 載入完成前保持 loading 狀態
    let cancelled = false;
    // 1) 先註冊監聽
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      if (cancelled) return;
      setSession(sess);
      if (sess?.user) {
        setLoading(true);
        loadProfile(sess.user.id).finally(() => {
          if (!cancelled) setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    // 2) 再取得目前 session
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      if (data.session?.user) {
        loadProfile(data.session.user.id).finally(() => {
          if (!cancelled) setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (session?.user) await loadProfile(session.user.id);
  };

  return (
    <AuthContext.Provider
      value={{
        loading,
        session,
        user: session?.user ?? null,
        profile,
        signOut,
        refreshProfile,
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
