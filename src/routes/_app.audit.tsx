import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_app/audit")({
  component: AuditPage,
});

const core = () => supabase.schema("core" as never);

type Log = {
  id: string;
  created_at: string | null;
  agent_name: string | null;
  action: string | null;
  resource: string | null;
  resource_id: string | null;
  response_status: number | null;
  error_message: string | null;
  request_summary: string | null;
};

function fmt(s: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString("zh-TW", { hour12: false });
}

function AuditPage() {
  const navigate = useNavigate();
  const [guardLoading, setGuardLoading] = useState(true);
  const [canView, setCanView] = useState(false);
  const [rows, setRows] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await core().rpc("has_menu_access", {
        p_menu: "audit_log",
        p_action: "view",
      });
      const ok = data === true;
      setCanView(ok);
      setGuardLoading(false);
      if (!ok) {
        toast.error("無權限");
        setTimeout(() => navigate({ to: "/" }), 800);
      }
    })();
  }, [navigate]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("agent_logs")
      .select(
        "id,created_at,agent_name,action,resource,resource_id,response_status,error_message,request_summary",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) toast.error(error.message);
    else setRows((data ?? []) as Log[]);
    setLoading(false);
  };

  useEffect(() => {
    if (canView) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView]);

  if (guardLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!canView) {
    return (
      <div className="rounded-md border bg-card p-6 text-center text-sm text-muted-foreground">
        無權限,正在導回首頁…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">稽核日誌</h1>
          <p className="text-sm text-muted-foreground">
            系統與 API / 代理人的操作軌跡（最近 200 筆）
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className="mr-1 h-4 w-4" />
          重新整理
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-44">時間</TableHead>
              <TableHead className="w-32">來源</TableHead>
              <TableHead className="w-28">動作</TableHead>
              <TableHead>對象</TableHead>
              <TableHead className="w-24">狀態</TableHead>
              <TableHead>說明</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  尚無紀錄
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => {
                const ok = (r.response_status ?? 0) < 400;
                return (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm text-muted-foreground">
                      {fmt(r.created_at)}
                    </TableCell>
                    <TableCell>{r.agent_name ?? "—"}</TableCell>
                    <TableCell>{r.action ?? "—"}</TableCell>
                    <TableCell className="text-sm">
                      {r.resource ?? "—"}
                      {r.resource_id ? (
                        <span className="text-muted-foreground"> #{r.resource_id.slice(0, 8)}</span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={ok ? "default" : "secondary"}
                        className={
                          ok
                            ? "bg-success text-success-foreground hover:bg-success/90"
                            : "bg-destructive text-destructive-foreground"
                        }
                      >
                        {r.response_status ?? "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[360px] truncate text-sm text-muted-foreground">
                      {r.error_message || r.request_summary || "—"}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
