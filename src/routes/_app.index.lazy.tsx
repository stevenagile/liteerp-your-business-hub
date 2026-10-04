import { createLazyFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
} from "recharts";

export const Route = createLazyFileRoute("/_app/")({
  component: Dashboard,
});

type RevenueRow = {
  month: string;
  revenue: number | null;
  outstanding: number | null;
};
type PnlRow = {
  month: string;
  revenue: number | null;
  gross_margin_pct: number | null;
};
type InvRow = { quantity: number | null; avg_cost: number | null };
type ArDocRow = {
  contact_name: string | null;
  total_amount: number | null;
  paid_amount: number | null;
  due_date: string | null;
};

const fmtMonth = (m: string) => {
  if (!m) return "";
  const d = new Date(m);
  if (isNaN(d.getTime())) return m.slice(0, 7).replace("-", "/");
  return `${d.getMonth() + 1}/${String(d.getFullYear()).slice(2)}`;
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
  const { profile } = useAuth();
  const companyId = profile?.company_id;
  const [revenueRows, setRevenueRows] = useState<RevenueRow[]>([]);
  const [pnlRows, setPnlRows] = useState<PnlRow[]>([]);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [inventoryValue, setInventoryValue] = useState(0);
  const [overdueAmount, setOverdueAmount] = useState(0);
  const [topDebtors, setTopDebtors] = useState<
    { name: string; amount: number }[]
  >([]);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    (async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const [rev, pnl, stock, inv, ar] = await Promise.all([
          supabase
            .from("v_monthly_revenue")
            .select("month, revenue, outstanding")
            .eq("company_id", companyId)
            .order("month", { ascending: false })
            .limit(12),
          supabase
            .from("v_monthly_pnl")
            .select("month, revenue, gross_margin_pct")
            .eq("company_id", companyId)
            .order("month", { ascending: false })
            .limit(12),
          supabase
            .from("v_stock")
            .select("is_low")
            .eq("company_id", companyId)
            .eq("is_low", true),
          supabase
            .from("inventory")
            .select("quantity, avg_cost")
            .eq("company_id", companyId),
          supabase
            .from("doc_headers")
            .select("contact_name, total_amount, paid_amount, due_date")
            .eq("company_id", companyId)
            .eq("doc_type", "sales_invoice")
            .in("status", ["confirmed", "completed"])
            .neq("payment_status", "paid"),
        ]);
        if (cancelled) return;
        const firstErr = rev.error || pnl.error || stock.error || inv.error || ar.error;
        if (firstErr) toast.error("部分營運數據讀取失敗：" + firstErr.message);
        setRevenueRows((rev.data as RevenueRow[]) ?? []);
        setPnlRows((pnl.data as PnlRow[]) ?? []);
        setLowStockCount(stock.data?.length ?? 0);
        setInventoryValue(
          ((inv.data as InvRow[]) ?? []).reduce(
            (s, r) => s + Number(r.quantity ?? 0) * Number(r.avg_cost ?? 0),
            0,
          ),
        );
        const arRows = (ar.data as ArDocRow[]) ?? [];
        let overdue = 0;
        const byCustomer = new Map<string, number>();
        for (const d of arRows) {
          const bal = Number(d.total_amount ?? 0) - Number(d.paid_amount ?? 0);
          if (bal <= 0) continue;
          if (d.due_date && d.due_date < today) overdue += bal;
          const name = d.contact_name || "（未具名）";
          byCustomer.set(name, (byCustomer.get(name) ?? 0) + bal);
        }
        setOverdueAmount(overdue);
        setTopDebtors(
          [...byCustomer.entries()]
            .map(([name, amount]) => ({ name, amount }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5),
        );
      } catch (e) {
        if (!cancelled)
          toast.error(
            "營運數據讀取失敗：" + (e instanceof Error ? e.message : String(e)),
          );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const ym = currentYearMonth();
  const curRev = matchMonth(revenueRows, ym);
  const curPnl = matchMonth(pnlRows, ym);

  const monthlySales = Number(curRev?.revenue ?? 0);
  const outstanding = Number(curRev?.outstanding ?? 0);
  const grossMarginPct = Number(curPnl?.gross_margin_pct ?? 0);
  const grossProfit = (monthlySales * grossMarginPct) / 100;

  // 與上月比較
  const prevRev = revenueRows.find((r) => r.month && !r.month.startsWith(ym));
  const momPct =
    prevRev && Number(prevRev.revenue ?? 0) > 0
      ? ((monthlySales - Number(prevRev.revenue)) / Number(prevRev.revenue)) * 100
      : null;

  const trendData = [...revenueRows].reverse().map((r) => ({
    month: fmtMonth(r.month),
    revenue: Number(r.revenue ?? 0),
    isCurrent: r.month?.startsWith(ym) ?? false,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">儀表板</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          歡迎使用 LiteERP，以下為今日營運概況。
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="本月營收"
          value={num(monthlySales)}
          sub={
            momPct != null ? (
              <span className={momPct >= 0 ? "text-success" : "text-destructive"}>
                {momPct >= 0 ? "↗" : "↘"} {momPct >= 0 ? "+" : ""}
                {momPct.toFixed(1)}%
              </span>
            ) : undefined
          }
        />
        <KpiCard
          label="月毛利"
          value={num(grossProfit)}
          sub={
            <span className="text-muted-foreground">
              毛利率 <span className="font-semibold text-foreground">{grossMarginPct.toFixed(1)}%</span>
            </span>
          }
        />
        <KpiCard
          label="客戶欠我們"
          value={num(outstanding)}
          valueClass={outstanding > 0 ? "text-destructive" : undefined}
          sub={
            overdueAmount > 0 ? (
              <span className="text-destructive">
                含逾期 <span className="font-semibold">{num(overdueAmount)}</span>
              </span>
            ) : (
              <span className="text-muted-foreground">無逾期款項</span>
            )
          }
        />
        <KpiCard
          label="庫存金額"
          value={num(inventoryValue)}
          sub={
            lowStockCount > 0 ? (
              <span className="text-warning">
                {lowStockCount} 項原料即將耗盡
              </span>
            ) : (
              <span className="text-muted-foreground">庫存水位正常</span>
            )
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border bg-card p-5 shadow-sm lg:col-span-2">
          <div className="mb-1 text-sm font-semibold">營收趨勢</div>
          <div className="mb-4 text-xs text-muted-foreground">近 12 個月</div>
          <div className="h-72">
            {trendData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                尚無資料
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={(v) => Number(v).toLocaleString()} />
                  <Tooltip
                    formatter={(v: number) => Number(v).toLocaleString()}
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 6,
                      fontSize: 13,
                    }}
                  />
                  <Bar dataKey="revenue" name="營收" radius={[4, 4, 0, 0]}>
                    {trendData.map((d, i) => (
                      <Cell
                        key={i}
                        fill={d.isCurrent ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between border-t pt-3 text-sm">
            <span className="text-muted-foreground">本月累計</span>
            <span className="font-semibold">NT$ {num(monthlySales)}</span>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="mb-4 text-sm font-semibold">客戶欠款（Top 5）</div>
          {topDebtors.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
              目前沒有未收款項
            </div>
          ) : (
            <ul className="divide-y">
              {topDebtors.map((d) => (
                <li key={d.name} className="flex items-center justify-between py-3">
                  <span className="text-sm font-medium">{d.name}</span>
                  <span className="text-sm font-semibold">{num(d.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  valueClass,
}: {
  label: string;
  value: string;
  sub?: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`mt-2 text-2xl font-semibold ${valueClass ?? ""}`}>
        {value}
      </div>
      {sub && <div className="mt-1 text-sm">{sub}</div>}
    </div>
  );
}
