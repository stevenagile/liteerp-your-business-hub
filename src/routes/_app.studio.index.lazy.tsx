import { createLazyFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";
import { useCompanyId } from "@/hooks/useCompanyId";

export const Route = createLazyFileRoute("/_app/studio/")({
  component: StudioOverviewPage,
});

function StudioOverviewPage() {
  usePermissionGuard("/studio");
  const companyId = useCompanyId();
  const [agentCount, setAgentCount] = useState<string>("—");
  const [docCount, setDocCount] = useState<string>("—");

  useEffect(() => {
    if (!companyId) return;
    const fetchAll = () => {
      supabase
        .schema("agent" as never)
        .from("agents")
        .select("*", { count: "exact", head: true })
        .eq("company_id", companyId)
        .then(({ count, error }) => {
          if (!error && typeof count === "number") setAgentCount(String(count));
        });
      supabase
        .schema("knowledge" as never)
        .from("documents")
        .select("*", { count: "exact", head: true })
        .eq("company_id", companyId)
        .then(({ count, error }) => {
          if (!error && typeof count === "number") setDocCount(String(count));
        });
    };
    fetchAll();
    const handler = () => fetchAll();
    window.addEventListener("knowledge-docs-changed", handler);
    return () => window.removeEventListener("knowledge-docs-changed", handler);
  }, [companyId]);

  const stats = [
    { label: "Agents", value: agentCount },
    { label: "Knowledge documents", value: docCount },
    { label: "Scopes", value: "—" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI Studio</h1>
        <p className="text-sm text-muted-foreground">AI Agent 模組總覽</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {s.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
