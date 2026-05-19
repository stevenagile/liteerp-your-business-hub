import { createFileRoute } from "@tanstack/react-router";
import { StatementPage } from "@/components/StatementPage";

export const Route = createFileRoute("/_app/statements/customer")({
  component: () => <StatementPage kind="customer" />,
});
