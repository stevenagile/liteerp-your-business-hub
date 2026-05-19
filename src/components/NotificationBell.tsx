import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, Package, AlertTriangle, BarChart3, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type Notification = {
  id: string;
  title: string | null;
  message: string | null;
  event_type: string | null;
  is_read: boolean;
  created_at: string;
  payload: Record<string, unknown> | null;
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s} 秒前`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} 分鐘前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小時前`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} 天前`;
  return new Date(iso).toLocaleDateString();
}

export function eventTypeMeta(type: string | null) {
  switch (type) {
    case "low_stock":
      return { label: "庫存", Icon: Package, color: "text-orange-500", bg: "bg-orange-100" };
    case "ar_overdue":
      return { label: "帳款", Icon: AlertTriangle, color: "text-red-500", bg: "bg-red-100" };
    case "monthly_summary":
      return { label: "報表", Icon: BarChart3, color: "text-blue-500", bg: "bg-blue-100" };
    default:
      return { label: "系統", Icon: Info, color: "text-gray-500", bg: "bg-gray-100" };
  }
}

export function notificationLink(n: Notification): string | null {
  const p = (n.payload ?? {}) as Record<string, unknown>;
  if (typeof p.url === "string") return p.url;
  switch (n.event_type) {
    case "ar_overdue":
      return "/receivables";
    case "low_stock":
      return "/inventory";
    case "monthly_summary":
      return "/reports/revenue";
    default:
      return null;
  }
}

export function NotificationBell() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [animate, setAnimate] = useState(false);
  const animTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = async () => {
    const { data: list } = await supabase
      .from("notifications")
      .select("id,title,message,event_type,is_read,created_at,payload")
      .order("created_at", { ascending: false })
      .limit(10);
    setItems((list ?? []) as Notification[]);
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("is_read", false);
    setUnread(count ?? 0);
  };

  useEffect(() => {
    if (!user) return;
    load();
    const channel = supabase
      .channel("notif")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const n = payload.new as Notification;
          setItems((prev) => [n, ...prev].slice(0, 10));
          if (!n.is_read) setUnread((u) => u + 1);
          setAnimate(true);
          if (animTimer.current) clearTimeout(animTimer.current);
          animTimer.current = setTimeout(() => setAnimate(false), 1000);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
      if (animTimer.current) clearTimeout(animTimer.current);
    };
  }, [user]);

  const markRead = async (n: Notification) => {
    if (n.is_read) return;
    setItems((prev) =>
      prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)),
    );
    setUnread((u) => Math.max(0, u - 1));
    await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="通知"
        >
          <Bell className={cn("h-5 w-5", animate && "animate-bounce")} />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b px-4 py-2">
          <div className="text-sm font-semibold">通知</div>
          <div className="text-xs text-muted-foreground">{unread} 則未讀</div>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              目前沒有通知
            </div>
          )}
          {items.map((n) => {
            const meta = eventTypeMeta(n.event_type);
            const href = notificationLink(n);
            const content = (
              <div
                className={cn(
                  "flex gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-accent/60",
                  !n.is_read && "bg-blue-50/60",
                )}
              >
                <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", meta.bg)}>
                  <meta.Icon className={cn("h-4 w-4", meta.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {!n.is_read && <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
                    <div className="truncate text-sm font-medium">{n.title ?? meta.label}</div>
                  </div>
                  {n.message && (
                    <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {n.message}
                    </div>
                  )}
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {relativeTime(n.created_at)}
                  </div>
                </div>
              </div>
            );
            const onClick = () => {
              markRead(n);
              setOpen(false);
            };
            return href ? (
              <Link
                key={n.id}
                to={href}
                onClick={onClick}
                className="block"
              >
                {content}
              </Link>
            ) : (
              <button
                key={n.id}
                type="button"
                onClick={onClick}
                className="block w-full"
              >
                {content}
              </button>
            );
          })}
        </div>
        <div className="border-t">
          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-center text-sm font-medium text-primary hover:bg-accent"
          >
            查看全部
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
