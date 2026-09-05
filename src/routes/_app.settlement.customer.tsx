import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";
import { SettlementPage } from "@/components/SettlementPage";

export const Route = createFileRoute("/_app/settlement/customer")({
  component: SettlementCustomerPage,
});

function SettlementCustomerPage() {
  const { allowed, checking } = usePermissionGuard("/settlement/customer");
  if (checking) return <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (!allowed) return null;
  return <SettlementPage kind="customer" />;
}
