import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

/**
 * FE-03: 頁面權限守衛 hook
 * 檢查目前使用者是否有該路由的存取權限（透過 core.has_menu_access RPC）。
 * 若無權限，重導至首頁。
 * @param route 路由路徑,例如 "/receivables"
 * @returns { allowed, checking }
 */
export function usePermissionGuard(route: string) {
  const { user, loading: authLoading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    (async () => {
      setChecking(true);
      try {
        const { data, error } = await supabase
          .schema("core" as never)
          .rpc("has_menu_access", { p_route: route });
        if (cancelled) return;
        if (error || !data) {
          setAllowed(false);
          navigate({ to: "/" });
        } else {
          setAllowed(true);
        }
      } catch {
        if (!cancelled) {
          setAllowed(false);
          navigate({ to: "/" });
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, authLoading, route]);

  return { allowed, checking: checking || authLoading };
}
