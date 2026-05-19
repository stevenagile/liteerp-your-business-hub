import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

/**
 * 透過 Supabase RPC `check_permission` 檢查目前使用者對指定模組的權限。
 * 用法:const canWrite = usePermission("sales", "write");
 */
export function usePermission(module: string, action: string): boolean {
  const { user } = useAuth();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setAllowed(false);
      return;
    }
    (async () => {
      const { data, error } = await supabase.rpc("check_permission", {
        p_module: module,
        p_action: action,
      });
      if (cancelled) return;
      if (error) {
        console.error("[usePermission] error", error);
        setAllowed(false);
      } else {
        setAllowed(Boolean(data));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, module, action]);

  return allowed;
}
