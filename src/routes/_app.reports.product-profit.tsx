import { createFileRoute } from "@tanstack/react-router";
import { ExportExcelButton } from "@/components/ExportExcelButton";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ArrowDownAZ } from "lucide-react";

export const Route = createFileRoute("/_app/reports/product-profit")({
  component: ProductProfitReport,
});

type Row = {
  product_code: string | null;
  product_name: string | null;
  total_qty_sold: number | null;
  total_revenue: number | null;
  total_cost: number | null;
  total_profit: number | null;
  avg_margin_pct: number | null;
  avg_selling_price: number | null;
  avg_unit_cost: number | null;
};

const num = (n: number | null | undefined) =>
  n == null ? "-" : Number(n).toLocaleString();
const pct = (n: number | null | undefined) =>
  n == null ? "-" : `${Number(n).toFixed(2)}%`;

type SortKey = "total_profit" | "avg_margin_pct";

function ProductProfitReport() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("total_profit");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("v_product_profitability")
        .select("*");
      if (error) console.error(error);
      setRows((data as Row[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const sorted = useMemo(
    () =>
      [...rows].sort(
        (a, b) => (Number(b[sortKey] ?? 0)) - (Number(a[sortKey] ?? 0)),
      ),
    [rows, sortKey],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">產品利潤排行</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            點擊欄位標頭切換排序依據
          </p>
        </div>
        <ExportExcelButton
          rows={sorted as unknown as Record<string, unknown>[]}
          filename="產品利潤"
          columns={[
            { key: "product_code", label: "產品編號" },
            { key: "product_name", label: "產品名稱" },
            { key: "total_qty_sold", label: "銷售數量", type: "number" },
            { key: "total_revenue", label: "營收", type: "number" },
            { key: "total_cost", label: "成本", type: "number" },
            { key: "total_profit", label: "毛利", type: "number" },
            { key: "avg_margin_pct", label: "平均毛利率(%)", type: "number" },
            { key: "avg_selling_price", label: "平均售價", type: "number" },
            { key: "avg_unit_cost", label: "平均成本", type: "number" },
          ]}
        />
      </div>
      <div className="rounded-lg border bg-card shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">產品編號</th>
              <th className="px-4 py-3 text-left">產品名稱</th>
              <th className="px-4 py-3 text-right">銷售數量</th>
              <th className="px-4 py-3 text-right">營收</th>
              <th className="px-4 py-3 text-right">成本</th>
              <th
                className="px-4 py-3 text-right cursor-pointer hover:text-foreground"
                onClick={() => setSortKey("total_profit")}
              >
                <span className="inline-flex items-center gap-1">
                  毛利 {sortKey === "total_profit" && <ArrowDownAZ className="h-3 w-3" />}
                </span>
              </th>
              <th
                className="px-4 py-3 text-right cursor-pointer hover:text-foreground"
                onClick={() => setSortKey("avg_margin_pct")}
              >
                <span className="inline-flex items-center gap-1">
                  平均毛利率 {sortKey === "avg_margin_pct" && <ArrowDownAZ className="h-3 w-3" />}
                </span>
              </th>
              <th className="px-4 py-3 text-right">平均售價</th>
              <th className="px-4 py-3 text-right">平均成本</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                  載入中...
                </td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                  尚無資料
                </td>
              </tr>
            ) : (
              sorted.map((r, i) => (
                <tr key={`${r.product_code}-${i}`} className="border-t">
                  <td className="px-4 py-2.5 font-mono text-xs">{r.product_code}</td>
                  <td className="px-4 py-2.5">{r.product_name}</td>
                  <td className="px-4 py-2.5 text-right">{num(r.total_qty_sold)}</td>
                  <td className="px-4 py-2.5 text-right">{num(r.total_revenue)}</td>
                  <td className="px-4 py-2.5 text-right">{num(r.total_cost)}</td>
                  <td className="px-4 py-2.5 text-right font-medium">{num(r.total_profit)}</td>
                  <td className="px-4 py-2.5 text-right">{pct(r.avg_margin_pct)}</td>
                  <td className="px-4 py-2.5 text-right">{num(r.avg_selling_price)}</td>
                  <td className="px-4 py-2.5 text-right">{num(r.avg_unit_cost)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
