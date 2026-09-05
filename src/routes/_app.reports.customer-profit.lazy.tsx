import { createLazyFileRoute } from "@tanstack/react-router";
import { ExportExcelButton } from "@/components/ExportExcelButton";
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export const Route = createLazyFileRoute("/_app/reports/customer-profit")({
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
  const { allowed, checking } = usePermissionGuard("/reports/customer-profit");
  const { profile } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!profile?.company_id) return;
      const { data, error } = await supabase
        .from("v_customer_profitability")
        .select("*")
        .eq("company_id", profile?.company_id ?? "");
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

  if (checking) return <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (!allowed) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">客戶利潤排行</h1>
          <p className="mt-1 text-sm text-muted-foreground">依毛利貢獻排序</p>
        </div>
        <ExportExcelButton
          rows={sorted as unknown as Record<string, unknown>[]}
          filename="客戶利潤"
          columns={[
            { key: "customer_name", label: "客戶" },
            { key: "order_count", label: "訂單數", type: "number" },
            { key: "total_revenue", label: "營收", type: "number" },
            { key: "total_cost", label: "成本", type: "number" },
            { key: "total_profit", label: "毛利", type: "number" },
            { key: "avg_margin_pct", label: "平均毛利率(%)", type: "number" },
            { key: "outstanding", label: "未收款", type: "number" },
          ]}
        />
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
