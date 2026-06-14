import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Check, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_app/line-orders")({
  component: LineOrdersPage,
});

const core = () => supabase.schema("core" as never);
const URL = "https://atzovofxfahrptstnkke.supabase.co/functions/v1/line-orders";

async function call(action: string, payload: Record<string, unknown> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${session?.access_token ?? ""}`, "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.error) throw new Error(j.error || `HTTP ${res.status}`);
  return j;
}

type Intake = {
  id: string; line_user_id: string | null; raw_message: string | null;
  confidence: number | null; issues: string[] | null; status: string;
  erp_doc_id: string | null; created_at: string;
  display_name: string | null; contact_code: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  needs_review: "待複核", failed: "失敗", parsed: "已解析",
  committed: "已成交", dismissed: "已忽略", rejected: "已拒絕",
  requested: "待審核", customer_confirm: "待客戶確認",
};
const PENDING = ["needs_review", "failed", "parsed"];

function fmt(s: string) {
  const d = new Date(s);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString("zh-TW", { hour12: false });
}

function LineOrdersPage() {
  const navigate = useNavigate();
  const [guardLoading, setGuardLoading] = useState(true);
  const [canView, setCanView] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Intake[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [tab, setTab] = useState<"pending" | "committed" | "all">("pending");

  useEffect(() => {
    (async () => {
      const { data } = await core().rpc("has_menu_access", { p_menu: "line_orders", p_action: "view" });
      const ok = data === true;
      setCanView(ok);
      setGuardLoading(false);
      if (!ok) { toast.error("無權限"); setTimeout(() => navigate({ to: "/" }), 800); }
    })();
  }, [navigate]);

  const load = async () => {
    setLoading(true);
    try {
      const status = tab === "pending" ? PENDING : tab === "committed" ? ["committed"] : undefined;
      const r = await call("list", status ? { status } : {});
      setRows(r.intake ?? []);
      setCounts(r.counts ?? {});
    } catch (e) { toast.error(`讀取失敗：${(e as Error).message}`); }
    setLoading(false);
  };

  useEffect(() => {
    if (canView) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView, tab]);

  const act = async (id: string, action: "dismiss" | "reopen") => {
    try {
      await call(action, { id });
      toast.success(action === "dismiss" ? "已標記忽略" : "已重新開啟");
      load();
    } catch (e) { toast.error((e as Error).message); }
  };

  const pendingTotal = useMemo(
    () => PENDING.reduce((s, k) => s + (counts[k] ?? 0), 0),
    [counts],
  );

  if (guardLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }
  if (!canView) {
    return <div className="rounded-md border bg-card p-6 text-center text-sm text-muted-foreground">無權限，正在導回首頁…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">LINE 接單管理</h1>
          <p className="text-sm text-muted-foreground">
            處理 LINE 進來但未成交的訊息（待複核 / 失敗）。共 {pendingTotal} 筆待處理。
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className="mr-1 h-4 w-4" />重新整理
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="pending">待處理 ({pendingTotal})</TabsTrigger>
          <TabsTrigger value="committed">已成交 ({counts.committed ?? 0})</TabsTrigger>
          <TabsTrigger value="all">全部</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead className="w-40">時間</TableHead>
            <TableHead className="w-36">客戶</TableHead>
            <TableHead>原始訊息</TableHead>
            <TableHead>問題 / 單號</TableHead>
            <TableHead className="w-28">狀態</TableHead>
            <TableHead className="w-28 text-right">操作</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">沒有符合的訊息</TableCell></TableRow>
            ) : rows.map((r) => {
              const terminal = ["committed", "dismissed", "rejected"].includes(r.status);
              return (
                <TableRow key={r.id}>
                  <TableCell className="text-sm text-muted-foreground">{fmt(r.created_at)}</TableCell>
                  <TableCell className="text-sm">{r.display_name || r.contact_code || (r.line_user_id ? r.line_user_id.slice(0, 8) + "…" : "—")}</TableCell>
                  <TableCell className="max-w-[280px] truncate" title={r.raw_message ?? ""}>{r.raw_message || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.erp_doc_id ? <span className="font-mono">單 #{r.erp_doc_id.slice(0, 8)}</span>
                      : (r.issues && r.issues.length ? r.issues.join(", ") : "—")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.status === "committed" ? "default" : "secondary"}
                      className={r.status === "committed" ? "bg-success text-success-foreground" : ""}>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {r.status === "dismissed" ? (
                      <Button variant="ghost" size="sm" onClick={() => act(r.id, "reopen")}><RotateCcw className="mr-1 h-3.5 w-3.5" />重開</Button>
                    ) : !terminal ? (
                      <Button variant="ghost" size="sm" onClick={() => act(r.id, "dismiss")}><Check className="mr-1 h-3.5 w-3.5" />忽略</Button>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        說明：「待複核/失敗」是客戶傳來但系統無法自動成單的訊息（如認不出商品、口語綁定）。確認處理完可按「忽略」清掉。實際補單請在銷貨單手建。
      </p>
    </div>
  );
}
