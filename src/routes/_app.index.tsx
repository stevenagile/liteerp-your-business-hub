import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  CircleCheck,
  CircleAlert,
  Loader2,
  TrendingUp,
  ShoppingCart,
  Boxes,
  Wallet,
} from "lucide-react";

export const Route = createFileRoute("/_app/")({
  component: Dashboard,
});

type Status =
  | { kind: "loading" }
  | { kind: "connected"; name: string }
  | { kind: "disconnected"; reason?: string };

function Dashboard() {
  const [status, setStatus] = useState<Status>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("company")
          .select("name")
          .limit(1)
          .maybeSingle();
        if (cancelled) return;
        if (error || !data?.name) {
          setStatus({ kind: "disconnected", reason: error?.message });
        } else {
          setStatus({ kind: "connected", name: data.name });
        }
      } catch (e) {
        if (!cancelled) {
          setStatus({
            kind: "disconnected",
            reason: e instanceof Error ? e.message : String(e),
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">儀表板</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          歡迎使用 LiteERP,以下為今日營運概況。
        </p>
      </div>

      {/* 連線狀態卡 */}
      <div className="rounded-lg border bg-card p-5 shadow-sm">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          後端連線狀態
        </div>
        <div className="mt-2 flex items-center gap-3">
          {status.kind === "loading" && (
            <>
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="text-base">檢查連線中…</span>
            </>
          )}
          {status.kind === "connected" && (
            <>
              <CircleCheck className="h-5 w-5 text-success" />
              <span className="text-base font-medium">
                已連接:<span className="text-success">{status.name}</span>
              </span>
            </>
          )}
          {status.kind === "disconnected" && (
            <>
              <CircleAlert className="h-5 w-5 text-destructive" />
              <span className="text-base font-medium text-destructive">
                尚未連接 Supabase
              </span>
            </>
          )}
        </div>
        {status.kind === "disconnected" && status.reason && (
          <p className="mt-2 text-xs text-muted-foreground">
            錯誤訊息:{status.reason}
          </p>
        )}
      </div>

      {/* KPI 占位卡 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="本月營收"
          value="NT$ —"
          icon={<TrendingUp className="h-5 w-5 text-success" />}
        />
        <KpiCard
          label="待出貨訂單"
          value="—"
          icon={<ShoppingCart className="h-5 w-5 text-primary" />}
        />
        <KpiCard
          label="低於安全庫存"
          value="—"
          icon={<Boxes className="h-5 w-5 text-warning" />}
        />
        <KpiCard
          label="應收帳款"
          value="NT$ —"
          icon={<Wallet className="h-5 w-5 text-primary" />}
        />
      </div>

      <div className="rounded-lg border bg-card p-5 text-sm text-muted-foreground shadow-sm">
        其他功能(訂單、庫存、報表等)將於後續迭代開放。
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        {icon}
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}
