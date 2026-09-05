import { createLazyFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";
import { StatementPage } from "@/components/StatementPage";

export const Route = createLazyFileRoute("/_app/statements/customer")({
  component: StatementsCustomerPage,
});
function StatementsCustomerPage() {
  const { allowed, checking } = usePermissionGuard("/statements/customer");
  if (checking) return <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (!allowed) return null;
  return <StatementPage kind="customer" />;
}
