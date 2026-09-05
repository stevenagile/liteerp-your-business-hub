import { createLazyFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";
import { SettlementPage } from "@/components/SettlementPage";

export const Route = createLazyFileRoute("/_app/settlement/vendor")({
  component: SettlementVendorPage,
});
function SettlementVendorPage() {
  const { allowed, checking } = usePermissionGuard("/settlement/vendor");
  if (checking) return <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (!allowed) return null;
  return <SettlementPage kind="vendor" />;
}
