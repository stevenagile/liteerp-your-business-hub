import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_app/reports/customer-profit")({
  component: CustomerProfitReport,
});

type Row = {
  customer_name: string | null;
  order_count: number | null;
  total_revenue: number | null;
  total_cost: number | null;
  total_profit: number | null;
  avg_margin_pct: number | null;
  outstanding: number | null;
};

const num = (n: number | null | undefined) =>
  n == null ? "-" : Number(n).toLocaleString();
const pct = (n: number | null | undefined) =>
  n == null ? "-" : `${Number(n).toFixed(2)}%`;

function CustomerProfitReport() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("v_customer_profitability")
        .select("*");
      if (error) console.error(error);
      setRows((data as Row[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const sorted = useMemo(
    () =>
      [...rows].sort(
        (a, b) => Number(b.total_profit ?? 0) - Number(a.total_profit ?? 0),
      ),
    [rows],
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">客戶利潤排行</h1>
        <p className="mt-1 text-sm text-muted-foreground">依毛利貢獻排序</p>
      </div>
      <div className="rounded-lg border bg-card shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">客戶</th>
              <th className="px-4 py-3 text-right">訂單數</th>
              <th className="px-4 py-3 text-right">營收</th>
              <th className="px-4 py-3 text-right">成本</th>
              <th className="px-4 py-3 text-right">毛利</th>
              <th className="px-4 py-3 text-right">平均毛利率</th>
              <th className="px-4 py-3 text-right">未收款</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  載入中...
                </td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  尚無資料
                </td>
              </tr>
            ) : (
              sorted.map((r, i) => (
                <tr key={`${r.customer_name}-${i}`} className="border-t">
                  <td className="px-4 py-2.5 font-medium">{r.customer_name}</td>
                  <td className="px-4 py-2.5 text-right">{num(r.order_count)}</td>
                  <td className="px-4 py-2.5 text-right">{num(r.total_revenue)}</td>
                  <td className="px-4 py-2.5 text-right">{num(r.total_cost)}</td>
                  <td className="px-4 py-2.5 text-right font-medium">{num(r.total_profit)}</td>
                  <td className="px-4 py-2.5 text-right">{pct(r.avg_margin_pct)}</td>
                  <td className="px-4 py-2.5 text-right">
                    {(r.outstanding ?? 0) > 0 ? (
                      <span className="text-warning font-medium">{num(r.outstanding)}</span>
                    ) : (
                      num(r.outstanding)
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
