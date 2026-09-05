import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";
import { StatementPage } from "@/components/StatementPage";

export const Route = createFileRoute("/_app/statements/vendor")({
  component: StatementsVendorPage,
});

function StatementsVendorPage() {
  const { allowed, checking } = usePermissionGuard("/statements/vendor");
  if (checking) return <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (!allowed) return null;
  return <StatementPage kind="vendor" />;
}
