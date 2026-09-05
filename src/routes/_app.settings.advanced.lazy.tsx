import { createLazyFileRoute } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { AdvancedSettingsPanel } from "@/components/AdvancedSettingsPanel";
import { useAuth } from "@/context/AuthContext";

export const Route = createLazyFileRoute("/_app/settings/advanced")({
  component: AdvancedSettingsPage,
});
function AdvancedSettingsPage() {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && profile && profile.role !== "admin") {
      navigate({ to: "/" });
    }
  }, [loading, profile, navigate]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile || profile.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShieldAlert className="h-10 w-10 text-warning" />
        <h2 className="mt-3 text-lg font-semibold">權限不足</h2>
        <p className="text-sm text-muted-foreground">
          僅管理員 (admin) 可進入進階參數。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">進階參數</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          管理公司進階設定與營運參數。
        </p>
      </div>
      <AdvancedSettingsPanel />
    </div>
  );
}
