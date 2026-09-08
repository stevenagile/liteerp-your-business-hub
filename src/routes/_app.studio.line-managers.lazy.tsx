import { createLazyFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { RefreshCw, Loader2, Trash2, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";
import { useCompanyId } from "@/hooks/useCompanyId";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export const Route = createLazyFileRoute("/_app/studio/line-managers")({
  component: LineManagersPage,
});

type Kind = "user" | "group";

interface ManagerRow {
  line_user_id: string;
  display_name: string | null;
  is_active: boolean;
  created_at: string;
  kind: Kind | null;
}

const USER_RE = /^U[0-9a-f]{32}$/;
const GROUP_RE = /^[CR][0-9a-f]{32}$/;

function maskId(id: string): string {
  if (id.length <= 10) return id;
  return `${id.slice(0, 5)}…${id.slice(-4)}`;
}

function inferKind(id: string): Kind {
  return /^[CR]/.test(id) ? "group" : "user";
}

function LineManagersPage() {
  usePermissionGuard("/studio");
  const companyId = useCompanyId();
  const [rows, setRows] = useState<ManagerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  const [kind, setKind] = useState<Kind>("user");
  const [displayName, setDisplayName] = useState("");
  const [lineUserId, setLineUserId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const { data, error } = await supabase
      .schema("channel" as never)
      .from("managers")
      .select("line_user_id, display_name, is_active, created_at, kind")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) { toast.error(`載入失敗:${error.message}`); return; }
    setRows((data ?? []) as ManagerRow[]);
  }, [companyId]);

  useEffect(() => { void load(); }, [load]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const name = displayName.trim();
    const id = lineUserId.trim();
    if (!id) { toast.error("請填入 LINE ID"); return; }
    if (!companyId) { toast.error("無法取得 company_id"); return; }
    const re = kind === "user" ? USER_RE : GROUP_RE;
    if (!re.test(id)) {
      toast.error(
        kind === "user"
          ? "LINE userId 格式錯誤(應為 U 開頭加 32 碼十六進位)"
          : "LINE 群組 ID 格式錯誤(應為 C 或 R 開頭加 32 碼十六進位)",
      );
      return;
    }
    setSubmitting(true);
    const { error } = await supabase
      .schema("channel" as never)
      .from("managers")
      .upsert(
        { line_user_id: id, display_name: name || null, is_active: true, kind, company_id: companyId },
        { onConflict: "line_user_id" },
      );
    setSubmitting(false);
    if (error) { toast.error(`新增失敗:${error.message}`); return; }
    toast.success("已新增/更新");
    setDisplayName("");
    setLineUserId("");
    void load();
  };

  const toggleActive = async (row: ManagerRow, next: boolean) => {
    setBusy((s) => ({ ...s, [row.line_user_id]: true }));
    const { error } = await supabase
      .schema("channel" as never)
      .from("managers")
      .update({ is_active: next })
      .eq("line_user_id", row.line_user_id);
    setBusy((s) => ({ ...s, [row.line_user_id]: false }));
    if (error) { toast.error(`更新失敗:${error.message}`); return; }
    setRows((prev) =>
      prev.map((r) => (r.line_user_id === row.line_user_id ? { ...r, is_active: next } : r)),
    );
  };

  const remove = async (row: ManagerRow) => {
    if (!confirm(`確定刪除「${row.display_name ?? row.line_user_id}」?`)) return;
    setBusy((s) => ({ ...s, [row.line_user_id]: true }));
    const { error } = await supabase
      .schema("channel" as never)
      .from("managers")
      .delete()
      .eq("line_user_id", row.line_user_id);
    setBusy((s) => ({ ...s, [row.line_user_id]: false }));
    if (error) { toast.error(`刪除失敗:${error.message}`); return; }
    setRows((prev) => prev.filter((r) => r.line_user_id !== row.line_user_id));
    toast.success("已刪除");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">LINE 審核管理者</h1>
        <p className="text-sm text-muted-foreground">維護可在 LINE 上核准 / 退回訂單的管理者名單</p>
      </div>

      <Card className="border-primary/30 bg-primary/5 p-4 text-sm">
        <div className="flex gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="space-y-2">
            <div className="font-medium">如何取得 LINE ID</div>
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">可審核的人(user):</span>
              請該員先將公司 LINE 官方帳號加為好友,並對它傳送「我的ID」,
              機器人會回覆一串以 U 開頭的 LINE userId,把它複製貼到下方「新增」即可。
            </p>
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">管理群(group):</span>
              請把官方帳號拉進群後,在群裡傳「群組ID」,機器人會回一串 C 開頭的字串,複製貼到下方即可。
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="mb-3 text-sm font-medium">新增</div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="sm:w-44">
            <label className="mb-1 block text-xs text-muted-foreground">類型</label>
            <Select value={kind} onValueChange={(v) => setKind(v as Kind)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="user">可審核的人(user)</SelectItem>
                <SelectItem value="group">管理群(group)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-xs text-muted-foreground">顯示名稱</label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="例:老闆、出貨組長、出貨群" />
          </div>
          <div className="flex-[2]">
            <label className="mb-1 block text-xs text-muted-foreground">LINE ID</label>
            <Input value={lineUserId} onChange={(e) => setLineUserId(e.target.value)}
              placeholder={kind === "user" ? "U 開頭 + 32 碼十六進位" : "C 開頭 + 32 碼十六進位(群組 ID)"}
              autoCapitalize="off" autoCorrect="off" spellCheck={false} />
          </div>
          <Button type="submit" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "新增"}
          </Button>
        </form>
      </Card>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-medium">管理者清單</div>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">類型</TableHead>
              <TableHead>顯示名稱</TableHead>
              <TableHead>LINE ID</TableHead>
              <TableHead className="w-24">啟用</TableHead>
              <TableHead className="w-44">建立時間</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">尚無資料</TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const shown = revealed[row.line_user_id];
                const k = row.kind ?? inferKind(row.line_user_id);
                return (
                  <TableRow key={row.line_user_id}>
                    <TableCell><Badge variant={k === "group" ? "default" : "secondary"}>{k}</Badge></TableCell>
                    <TableCell>{row.display_name ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{shown ? row.line_user_id : maskId(row.line_user_id)}</code>
                        <Button variant="ghost" size="sm" className="h-6 px-2"
                          onClick={() => setRevealed((s) => ({ ...s, [row.line_user_id]: !shown }))}>
                          {shown ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch checked={row.is_active} disabled={busy[row.line_user_id]}
                        onCheckedChange={(v) => void toggleActive(row, v)} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString()}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" disabled={busy[row.line_user_id]} onClick={() => void remove(row)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
