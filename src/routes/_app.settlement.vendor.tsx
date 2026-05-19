import { createFileRoute } from "@tanstack/react-router";
import { SettlementPage } from "@/components/SettlementPage";

export const Route = createFileRoute("/_app/settlement/vendor")({
  component: () => <SettlementPage kind="vendor" />,
});
