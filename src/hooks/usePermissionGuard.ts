import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/context/PermissionContext";

/**
 * FE-03: 頁面權限守衛 hook
 * 從 PermissionContext 快取中檢查權限（menu 已在 AppLayout 載入），
 * 不再對每個頁面發送 RPC 請求。
 * @param route 路由路徑,例如 "/receivables"
 * @returns { allowed, checking }
 */
export function usePermissionGuard(route: string) {
  const { user, loading: authLoading } = useAuth();
  const { allowedRoutes, ready } = usePermissions();
  const navigate = useNavigate();

  const checking = authLoading || !ready;
  const allowed = ready && allowedRoutes.has(route);

  useEffect(() => {
    if (checking || !user) return;
    if (!allowed) {
      navigate({ to: "/" });
    }
  }, [checking, allowed, user, navigate]);

  return { allowed, checking };
}
