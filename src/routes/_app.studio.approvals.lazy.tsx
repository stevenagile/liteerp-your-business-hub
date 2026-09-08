import { createLazyFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";
import { Inbox, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createLazyFileRoute("/_app/studio/approvals")({
  component: ApprovalsPage,
});

interface ApprovalRequest {
  id: string;
  audit_id: number;
  agent_id: string;
  agent_name: string;
  skill_name: string;
  risk_level: "low" | "medium" | "high" | string;
  inputs: Record<string, unknown> | null;
  reasoning: string | null;
  requested_by: string | null;
  requested_at: string;
  expires_at: string;
  expires_in_seconds: number;
}

const SUPABASE_URL = "https://cqmmbhxldwfaopenphmr.supabase.co";

function riskBadgeClass(level: string) {
  if (level === "high") return "bg-red-600 text-white hover:bg-red-600";
  if (level === "medium") return "bg-orange-500 text-white hover:bg-orange-500";
  return "bg-gray-400 text-white hover:bg-gray-400";
}

function formatRemaining(seconds: number) {
  if (seconds <= 0) return "已過期";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `剩餘 ${h}h ${m}m`;
  const s = seconds % 60;
  return `剩餘 ${m}m ${s}s`;
}

function summarizeResult(data: unknown): string {
  if (Array.isArray(data)) return `回傳 ${data.length} 筆`;
  if (data && typeof data === "object") {
    const str = JSON.stringify(data);
    return str.length > 100 ? str.slice(0, 100) + "…" : str;
  }
  if (data == null) return "完成";
  return String(data).slice(0, 100);
}

function ApprovalsPage() {
  usePermissionGuard("/studio");
  const navigate = useNavigate();
  const [items, setItems] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const loadedOnce = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("list_pending_approvals");
    setLoading(false);
    if (error) {
      console.error("list_pending_approvals error", error);
      toast.error(`載入失敗:${error.message}`);
      return;
    }
    if (data && !Array.isArray(data) && typeof data === "object" && "error" in (data as object)) {
      toast.error("您沒有審核權限,請聯絡管理員");
      navigate({ to: "/" });
      return;
    }
    setItems(Array.isArray(data) ? (data as ApprovalRequest[]) : []);
  }, [navigate]);

  useEffect(() => {
    if (loadedOnce.current) return;
    loadedOnce.current = true;
    void load();
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    setItems((prev) =>
      prev.filter((r) => {
        const remaining = Math.floor((new Date(r.expires_at).getTime() - now) / 1000);
        return remaining > 0;
      }),
    );
  }, [now]);

  const removeItem = (id: string) => setItems((prev) => prev.filter((r) => r.id !== id));

  const handleApprove = async (req: ApprovalRequest) => {
    if (busy[req.id]) return;
    const note = notes[req.id]?.trim() || null;
    setBusy((b) => ({ ...b, [req.id]: true }));
    try {
      const { data, error } = await supabase.rpc("approve_request", {
        p_request_id: req.id,
        p_decision_note: note,
      });
      if (error) { toast.error(`Approve 失敗:${error.message}`); void load(); return; }
      if (data && typeof data === "object" && "error" in (data as object)) {
        toast.error(`Approve 失敗:${(data as { error: string }).error}`); void load(); return;
      }

      removeItem(req.id);

      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/execute_approved_skill`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token ?? ""}`,
          },
          body: JSON.stringify({ request_id: req.id }),
        });
        const result = await res.json().catch(() => ({}));
        if (!res.ok || result?.error) {
          toast.warning(`⚠️ 已 approve 但執行失敗:${result?.error ?? `HTTP ${res.status}`}`);
        } else {
          toast.success(`✅ 已執行:${req.skill_name}\n${summarizeResult(result?.data)}`);
        }
      } catch (e) {
        toast.warning(`⚠️ 已 approve 但執行失敗:${e instanceof Error ? e.message : String(e)}`);
      }
    } finally {
      setBusy((b) => { const next = { ...b }; delete next[req.id]; return next; });
    }
  };

  const handleReject = async (req: ApprovalRequest) => {
    if (busy[req.id]) return;
    const note = notes[req.id]?.trim() || null;
    setBusy((b) => ({ ...b, [req.id]: true }));
    try {
      const { data, error } = await supabase.rpc("reject_request", {
        p_request_id: req.id,
        p_decision_note: note,
      });
      if (error) { toast.error(`Reject 失敗:${error.message}`); return; }
      if (data && typeof data === "object" && "error" in (data as object)) {
        toast.error(`Reject 失敗:${(data as { error: string }).error}`); return;
      }
      removeItem(req.id);
      toast.success("已拒絕");
    } finally {
      setBusy((b) => { const next = { ...b }; delete next[req.id]; return next; });
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">待簽核請求</h1>
          <p className="text-sm text-muted-foreground">Approval Inbox</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />Refresh
        </Button>
      </div>

      {loading && items.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />載入中...
        </div>
      ) : items.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground" />
          <div className="text-base font-medium">目前沒有待簽核請求 🎉</div>
          <div className="text-sm text-muted-foreground">所有簽核都處理完了</div>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((req) => {
            const remaining = Math.max(0, Math.floor((new Date(req.expires_at).getTime() - now) / 1000));
            const isUrgent = remaining < 3600;
            const isBusy = !!busy[req.id];
            return (
              <Card key={req.id} className={cn("relative p-5 transition-opacity", isBusy && "pointer-events-none opacity-60")}>
                {isBusy && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="text-lg font-bold">{req.skill_name}</div>
                    <Badge className={riskBadgeClass(req.risk_level)}>{req.risk_level}</Badge>
                  </div>
                  <div className={cn("text-xs font-medium", isUrgent ? "text-red-600" : "text-muted-foreground")}>
                    {formatRemaining(remaining)}
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">Agent</div>
                    <div className="font-medium">{req.agent_name}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">請求時間</div>
                    <div className="font-medium">
                      {formatDistanceToNow(new Date(req.requested_at), { addSuffix: true, locale: zhTW })}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="mb-1 text-xs text-muted-foreground">執行參數</div>
                    {req.inputs && Object.keys(req.inputs).length > 0 ? (
                      <div className="rounded-md border bg-muted/30">
                        <table className="w-full text-xs">
                          <tbody>
                            {Object.entries(req.inputs).map(([k, v]) => (
                              <tr key={k} className="border-b last:border-b-0">
                                <td className="w-1/3 px-3 py-1.5 align-top font-mono text-muted-foreground">{k}</td>
                                <td className="truncate px-3 py-1.5 font-mono">
                                  <div className="truncate" title={typeof v === "string" ? v : JSON.stringify(v)}>
                                    {typeof v === "string" ? v : JSON.stringify(v)}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">(無)</div>
                    )}
                  </div>
                  {req.reasoning && (
                    <div className="col-span-2">
                      <div className="mb-1 text-xs text-muted-foreground">Claude 說明</div>
                      <blockquote className="border-l-4 border-primary/50 bg-muted/30 px-3 py-2 text-sm italic text-muted-foreground">
                        {req.reasoning}
                      </blockquote>
                    </div>
                  )}
                </div>
                <div className="mt-4 space-y-3">
                  <Textarea placeholder="備註(選填)" maxLength={200}
                    value={notes[req.id] ?? ""} onChange={(e) => setNotes((n) => ({ ...n, [req.id]: e.target.value }))}
                    className="min-h-[60px]" />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" className="border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700"
                      onClick={() => void handleReject(req)} disabled={isBusy}>Reject</Button>
                    <Button className="bg-green-600 text-white hover:bg-green-700"
                      onClick={() => void handleApprove(req)} disabled={isBusy}>Approve</Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
