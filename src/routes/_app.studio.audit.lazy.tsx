import { createLazyFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, RefreshCw, Loader2, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export const Route = createLazyFileRoute("/_app/studio/audit")({
  component: AuditLogPage,
});

interface AuditRow {
  id: number;
  created_at: string;
  agent_id: string | null;
  agent_name: string | null;
  user_id: string | null;
  action: string;
  skill_name: string | null;
  status: string;
  error_message: string | null;
  duration_ms: number | null;
  payload: unknown;
  result_summary: unknown;
}

const ACTION_OPTIONS = [
  { value: "__all__", label: "全部" },
  { value: "execute_skill", label: "execute_skill" },
  { value: "request_approval", label: "request_approval" },
  { value: "execute_approved", label: "execute_approved" },
];

const STATUS_OPTIONS = [
  { value: "__all__", label: "全部" },
  { value: "success", label: "success" },
  { value: "error", label: "error" },
  { value: "pending_approval", label: "pending_approval" },
  { value: "denied", label: "denied" },
];

function actionBadgeClass(action: string) {
  switch (action) {
    case "execute_skill": return "bg-blue-500 text-white hover:bg-blue-500";
    case "request_approval": return "bg-orange-500 text-white hover:bg-orange-500";
    case "execute_approved": return "bg-purple-500 text-white hover:bg-purple-500";
    default: return "bg-slate-400 text-white hover:bg-slate-400";
  }
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "success": return "bg-emerald-500 text-white hover:bg-emerald-500";
    case "error": return "bg-red-500 text-white hover:bg-red-500";
    case "pending_approval": return "bg-orange-500 text-white hover:bg-orange-500";
    case "denied": return "bg-slate-500 text-white hover:bg-slate-500";
    default: return "bg-slate-400 text-white hover:bg-slate-400";
  }
}

function DateField({
  value, onChange, placeholder,
}: {
  value: Date | undefined; onChange: (d: Date | undefined) => void; placeholder: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm"
          className={cn("w-[160px] justify-start text-left font-normal", !value && "text-muted-foreground")}>
          <CalendarIcon className="h-4 w-4" />
          {value ? format(value, "yyyy-MM-dd") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={value} onSelect={onChange} initialFocus className={cn("p-3 pointer-events-auto")} />
      </PopoverContent>
    </Popover>
  );
}

function JsonBlock({ data }: { data: unknown }) {
  let text: string;
  try { text = JSON.stringify(data, null, 2); } catch { text = String(data); }
  return (
    <pre className="max-h-[400px] overflow-auto rounded-md border bg-muted/40 p-3 font-mono text-xs leading-relaxed">
      {text}
    </pre>
  );
}

function AuditLogPage() {
  usePermissionGuard("/studio");
  const navigate = useNavigate();
  const loadedOnce = useRef(false);

  const [applied, setApplied] = useState<{
    limit: number; skill_name: string; action: string; status: string;
    from: Date | undefined; to: Date | undefined;
  }>({
    limit: 50, skill_name: "", action: "__all__", status: "__all__",
    from: undefined, to: undefined,
  });

  const [draft, setDraft] = useState(applied);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<AuditRow | null>(null);

  const load = useCallback(async (f: typeof applied) => {
    setLoading(true);
    const params: Record<string, unknown> = {
      p_limit: f.limit,
      p_agent_id: null,
      p_skill_name: f.skill_name.trim() || null,
      p_action: f.action === "__all__" ? null : f.action,
      p_status: f.status === "__all__" ? null : f.status,
      p_from: f.from ? f.from.toISOString() : null,
      p_to: f.to ? f.to.toISOString() : null,
    };
    const { data, error } = await supabase.rpc("list_audit_log", params);
    setLoading(false);
    if (error) {
      console.error("list_audit_log error", error);
      toast.error(`載入失敗:${error.message}`);
      return;
    }
    if (data && !Array.isArray(data) && typeof data === "object" && "error" in (data as object)) {
      toast.error("您沒有審計日誌權限,請聯絡管理員");
      navigate({ to: "/" });
      return;
    }
    setRows(Array.isArray(data) ? (data as AuditRow[]) : []);
  }, [navigate]);

  useEffect(() => {
    if (loadedOnce.current) return;
    loadedOnce.current = true;
    void load(applied);
  }, [applied, load]);

  const applyFilters = () => { setApplied(draft); void load(draft); };

  const resetFilters = () => {
    const next = { limit: 50, skill_name: "", action: "__all__", status: "__all__", from: undefined, to: undefined };
    setDraft(next); setApplied(next); void load(next);
  };

  const quickRange = (kind: "today" | "24h" | "week" | "month") => {
    const now = new Date();
    let from: Date;
    const to = now;
    if (kind === "today") from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    else if (kind === "24h") from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    else if (kind === "week") from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    else from = new Date(now.getFullYear(), now.getMonth(), 1);
    const next = { ...draft, from, to };
    setDraft(next); setApplied(next); void load(next);
  };

  return (
    <div className="mx-auto max-w-7xl p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ListChecks className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">審計日誌</h1>
            <p className="text-sm text-muted-foreground">顯示 {rows.length} 筆</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load(applied)} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />Refresh
        </Button>
      </div>

      {/* Filter bar */}
      <Card className="mb-4 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Skill 名稱</label>
            <Input placeholder="例如 query_stock" value={draft.skill_name}
              onChange={(e) => setDraft((d) => ({ ...d, skill_name: e.target.value }))} className="h-9 w-[180px]" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Action</label>
            <Select value={draft.action} onValueChange={(v) => setDraft((d) => ({ ...d, action: v }))}>
              <SelectTrigger className="h-9 w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACTION_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Status</label>
            <Select value={draft.status} onValueChange={(v) => setDraft((d) => ({ ...d, status: v }))}>
              <SelectTrigger className="h-9 w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">從</label>
            <DateField value={draft.from} onChange={(d) => setDraft((s) => ({ ...s, from: d }))} placeholder="開始日期" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">到</label>
            <DateField value={draft.to} onChange={(d) => setDraft((s) => ({ ...s, to: d }))} placeholder="結束日期" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">筆數</label>
            <Input type="number" min={1} max={500} value={draft.limit}
              onChange={(e) => {
                const n = Number.parseInt(e.target.value, 10);
                setDraft((d) => ({ ...d, limit: Number.isFinite(n) ? Math.min(500, Math.max(1, n)) : 50 }));
              }} className="h-9 w-[100px]" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={applyFilters} disabled={loading}>套用篩選</Button>
            <Button variant="outline" size="sm" onClick={resetFilters} disabled={loading}>重置</Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">快速選擇:</span>
          {([
            { k: "today", label: "今天" },
            { k: "24h", label: "最近 24h" },
            { k: "week", label: "本週" },
            { k: "month", label: "本月" },
          ] as const).map((q) => (
            <Button key={q.k} size="sm" variant="outline" className="h-7 rounded-full px-3 text-xs"
              onClick={() => quickRange(q.k)}>{q.label}</Button>
          ))}
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        {loading && rows.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />載入中...
          </div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">目前沒有符合條件的紀錄</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">時間</TableHead>
                <TableHead className="w-[160px]">Agent</TableHead>
                <TableHead className="w-[150px]">Action</TableHead>
                <TableHead>Skill</TableHead>
                <TableHead className="w-[140px]">Status</TableHead>
                <TableHead className="w-[90px] text-right">耗時</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, idx) => (
                <TableRow key={r.id} className={cn("cursor-pointer", idx % 2 === 1 && "bg-muted/30")}
                  onClick={() => setSelected(r)}>
                  <TableCell className="font-mono text-xs" title={new Date(r.created_at).toISOString()}>
                    {format(new Date(r.created_at), "MM/dd HH:mm:ss")}
                  </TableCell>
                  <TableCell className="text-sm">{r.agent_name ?? "—"}</TableCell>
                  <TableCell><Badge className={actionBadgeClass(r.action)}>{r.action}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{r.skill_name ?? "—"}</TableCell>
                  <TableCell><Badge className={statusBadgeClass(r.status)}>{r.status}</Badge></TableCell>
                  <TableCell className="text-right font-mono text-xs">{r.duration_ms != null ? `${r.duration_ms}ms` : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Detail drawer */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex flex-wrap items-center gap-2">
                  <Badge className={actionBadgeClass(selected.action)}>{selected.action}</Badge>
                  <span className="font-mono text-base">{selected.skill_name ?? "—"}</span>
                  <Badge className={statusBadgeClass(selected.status)}>{selected.status}</Badge>
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-5 text-sm">
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">完整時間</div>
                  <div className="font-mono">{new Date(selected.created_at).toISOString()}</div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <div className="mb-1 text-xs text-muted-foreground">Agent</div>
                    <div className="font-medium">{selected.agent_name ?? "—"}</div>
                    {selected.agent_id && <div className="font-mono text-xs text-muted-foreground">{selected.agent_id}</div>}
                  </div>
                  <div>
                    <div className="mb-1 text-xs text-muted-foreground">User</div>
                    <div className="font-mono text-xs">{selected.user_id ?? "—"}</div>
                  </div>
                  <div>
                    <div className="mb-1 text-xs text-muted-foreground">耗時</div>
                    <div className="font-mono">{selected.duration_ms != null ? `${selected.duration_ms}ms` : "—"}</div>
                  </div>
                </div>
                {selected.error_message && (
                  <div>
                    <div className="mb-1 text-xs text-muted-foreground">錯誤訊息</div>
                    <div className="rounded-md border border-red-500/50 bg-red-500/10 p-3 font-mono text-xs text-red-700 dark:text-red-300">
                      {selected.error_message}
                    </div>
                  </div>
                )}
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Payload</div>
                  <JsonBlock data={selected.payload} />
                </div>
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Result summary</div>
                  <JsonBlock data={selected.result_summary} />
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
