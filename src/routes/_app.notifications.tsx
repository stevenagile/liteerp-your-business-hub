import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  eventTypeMeta,
  notificationLink,
  type Notification,
} from "@/components/NotificationBell";

export const Route = createFileRoute("/_app/notifications")({
  component: NotificationsPage,
});

const PAGE_SIZE = 20;

function NotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rows, setRows] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [readFilter, setReadFilter] = useState<string>("all");

  const load = async () => {
    if (!user) return;
    setLoading(true);
    let q = supabase
      .from("notifications")
      .select("id,title,message,event_type,is_read,created_at,payload", {
        count: "exact",
      })
      // FE-01: 加上 user 過濾作為縱深防禦
      .eq("target_user_id", user.id)
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    if (typeFilter !== "all") q = q.eq("event_type", typeFilter);
    if (readFilter === "read") q = q.eq("is_read", true);
    if (readFilter === "unread") q = q.eq("is_read", false);
    const { data, count, error } = await q;
    if (error) toast.error(error.message);
    setRows((data ?? []) as Notification[]);
    setTotal(count ?? 0);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, typeFilter, readFilter]);

  const markAllRead = async () => {
    if (!user) return;
    // FE-02: 加上 target_user_id 過濾,避免影響其他用戶的通知
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("is_read", false)
      .eq("target_user_id", user.id);
    if (error) return toast.error(error.message);
    toast.success("已全部標示為已讀");
    load();
  };

  const onClickRow = async (n: Notification) => {
    if (!n.is_read) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
    }
    const href = notificationLink(n);
    if (href) navigate({ to: href });
    else load();
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">通知中心</h1>
        <Button variant="outline" onClick={markAllRead}>
          全部標示已讀
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={typeFilter} onValueChange={(v) => { setPage(0); setTypeFilter(v); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="類型" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部類型</SelectItem>
            <SelectItem value="low_stock">庫存</SelectItem>
            <SelectItem value="ar_overdue">帳款</SelectItem>
            <SelectItem value="monthly_summary">報表</SelectItem>
            <SelectItem value="system">系統</SelectItem>
          </SelectContent>
        </Select>
        <Select value={readFilter} onValueChange={(v) => { setPage(0); setReadFilter(v); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="狀態" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="unread">未讀</SelectItem>
            <SelectItem value="read">已讀</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border bg-card">
        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">沒有通知</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">類型</TableHead>
                <TableHead>標題 / 訊息</TableHead>
                <TableHead className="w-44">時間</TableHead>
                <TableHead className="w-20">狀態</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((n) => {
                const meta = eventTypeMeta(n.event_type);
                return (
                  <TableRow
                    key={n.id}
                    onClick={() => onClickRow(n)}
                    className={cn("cursor-pointer", !n.is_read && "bg-blue-50/60")}
                  >
                    <TableCell>
                      <span className={cn("inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs", meta.bg, meta.color)}>
                        <meta.Icon className="h-3 w-3" />
                        {meta.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{n.title ?? "—"}</div>
                      {n.message && (
                        <div className="text-xs text-muted-foreground">{n.message}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(n.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {n.is_read ? (
                        <span className="text-xs text-muted-foreground">已讀</span>
                      ) : (
                        <span className="text-xs font-medium text-blue-600">未讀</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="text-muted-foreground">共 {total} 筆</div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            上一頁
          </Button>
          <span>{page + 1} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
            下一頁
          </Button>
        </div>
      </div>
    </div>
  );
}
