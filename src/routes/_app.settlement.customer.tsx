import { createFileRoute } from "@tanstack/react-router";
import { SettlementPage } from "@/components/SettlementPage";

export const Route = createFileRoute("/_app/settlement/customer")({
  component: () => <SettlementPage kind="customer" />,
});
