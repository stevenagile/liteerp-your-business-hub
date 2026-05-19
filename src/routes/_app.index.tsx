import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  CircleCheck,
  CircleAlert,
  Loader2,
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertTriangle,
  DollarSign,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";

export const Route = createFileRoute("/_app/")({
  component: Dashboard,
});

type Status =
  | { kind: "loading" }
  | { kind: "connected"; name: string }
  | { kind: "disconnected"; reason?: string };

type RevenueRow = {
  month: string;
  revenue: number | null;
  outstanding: number | null;
};
type PnlRow = {
  month: string;
  revenue: number | null;
  net_profit: number | null;
  gross_margin_pct: number | null;
  net_margin_pct: number | null;
};
type StockRow = { is_low: boolean | null };

const fmtMonth = (m: string) => {
  if (!m) return "";
  const d = new Date(m);
  if (isNaN(d.getTime())) return m.slice(0, 7).replace("-", "/");
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const currentYearMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const matchMonth = <T extends { month: string }>(rows: T[], ym: string) =>
  rows.find((r) => r.month && r.month.startsWith(ym));

const num = (n: number | null | undefined) =>
  n == null ? "0" : Number(n).toLocaleString();

function Dashboard() {
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [revenueRows, setRevenueRows] = useState<RevenueRow[]>([]);
  const [pnlRows, setPnlRows] = useState<PnlRow[]>([]);
  const [lowStockCount, setLowStockCount] = useState(0);

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
        if (!cancelled)
          setStatus({
            kind: "disconnected",
            reason: e instanceof Error ? e.message : String(e),
          });
      }
    })();

    (async () => {
      const [rev, pnl, stock] = await Promise.all([
        supabase
          .from("v_monthly_revenue")
          .select("month, revenue, outstanding")
          .order("month", { ascending: false })
          .limit(12),
        supabase
          .from("v_monthly_pnl")
          .select("month, revenue, net_profit, gross_margin_pct, net_margin_pct")
          .order("month", { ascending: false })
          .limit(12),
        supabase.from("v_stock").select("is_low").eq("is_low", true),
      ]);
      if (cancelled) return;
      setRevenueRows((rev.data as RevenueRow[]) ?? []);
      setPnlRows((pnl.data as PnlRow[]) ?? []);
      setLowStockCount(stock.data?.length ?? 0);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const ym = currentYearMonth();
  const curRev = matchMonth(revenueRows, ym);
  const curPnl = matchMonth(pnlRows, ym);

  const monthlySales = curRev?.revenue ?? 0;
  const netProfit = curPnl?.net_profit ?? 0;
  const outstanding = curRev?.outstanding ?? 0;
  const grossMarginPct = curPnl?.gross_margin_pct ?? 0;
  const netMarginPct = curPnl?.net_margin_pct ?? 0;

  const trendData = [...pnlRows]
    .slice(0, 6)
    .reverse()
    .map((r) => ({
      month: fmtMonth(r.month),
      revenue: Number(r.revenue ?? 0),
      net_profit: Number(r.net_profit ?? 0),
    }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">儀表板</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          歡迎使用 LiteERP,以下為今日營運概況。
        </p>
      </div>

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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="本月銷售額"
          value={`NT$ ${num(monthlySales)}`}
          icon={<DollarSign className="h-5 w-5 text-success" />}
          valueClass="text-success"
        />
        <KpiCard
          label="本月淨利"
          value={`NT$ ${num(netProfit)}`}
          icon={
            netProfit < 0 ? (
              <TrendingDown className="h-5 w-5 text-destructive" />
            ) : (
              <TrendingUp className="h-5 w-5 text-success" />
            )
          }
          valueClass={netProfit < 0 ? "text-destructive" : "text-success"}
        />
        <KpiCard
          label="未收款金額"
          value={`NT$ ${num(outstanding)}`}
          icon={<Wallet className={`h-5 w-5 ${outstanding > 0 ? "text-warning" : "text-muted-foreground"}`} />}
          valueClass={outstanding > 0 ? "text-warning" : undefined}
        />
        <KpiCard
          label="低庫存品項"
          value={String(lowStockCount)}
          icon={<AlertTriangle className={`h-5 w-5 ${lowStockCount > 0 ? "text-destructive" : "text-muted-foreground"}`} />}
          valueClass={lowStockCount > 0 ? "text-destructive" : undefined}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border bg-card p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 text-sm font-semibold">近 6 個月 營收 vs 淨利</div>
          <div className="h-72">
            {trendData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                尚無資料
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={(v) => Number(v).toLocaleString()} />
                  <Tooltip
                    formatter={(v: number) => Number(v).toLocaleString()}
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="營收"
                    stroke="hsl(var(--success))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="net_profit"
                    name="淨利"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="mb-4 text-sm font-semibold">本月利潤率</div>
          <div className="space-y-6">
            <MarginStat label="毛利率" value={grossMarginPct} accent="text-success" />
            <MarginStat
              label="淨利率"
              value={netMarginPct}
              accent={netMarginPct < 0 ? "text-destructive" : "text-primary"}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
  valueClass,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        {icon}
      </div>
      <div className={`mt-2 text-2xl font-semibold ${valueClass ?? ""}`}>
        {value}
      </div>
    </div>
  );
}

function MarginStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-3xl font-bold ${accent}`}>
        {Number(value ?? 0).toFixed(2)}%
      </div>
    </div>
  );
}
