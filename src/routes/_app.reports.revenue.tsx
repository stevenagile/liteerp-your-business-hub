import { createFileRoute } from "@tanstack/react-router";
import { ExportExcelButton } from "@/components/ExportExcelButton";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export const Route = createFileRoute("/_app/reports/revenue")({
  component: RevenueReport,
});

type Row = {
  month: string;
  invoice_count: number | null;
  revenue: number | null;
  cogs: number | null;
  gross_profit: number | null;
  gross_margin_pct: number | null;
  collected: number | null;
  outstanding: number | null;
};

const fmtMonth = (m: string) => {
  if (!m) return "";
  const d = new Date(m);
  if (isNaN(d.getTime())) return m.slice(0, 7).replace("-", "/");
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const num = (n: number | null | undefined) =>
  n == null ? "-" : Number(n).toLocaleString();
const pct = (n: number | null | undefined) =>
  n == null ? "-" : `${Number(n).toFixed(2)}%`;

function RevenueReport() {
  const { allowed, checking } = usePermissionGuard("/reports/revenue");
  const { profile } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!profile?.company_id) return;
      const { data, error } = await supabase
        .from("v_monthly_revenue")
        .select("*")
        .eq("company_id", profile?.company_id ?? "")
        .order("month", { ascending: false });
      if (error) console.error(error);
      setRows((data as Row[]) ?? []);
      setLoading(false);
    })();
  }, []);

  if (checking) return <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (!allowed) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">月營收報表</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            每月銷售額、成本與收款狀況
          </p>
        </div>
        <ExportExcelButton
          rows={rows as unknown as Record<string, unknown>[]}
          filename="月營收"
          columns={[
            { key: "month", label: "月份", value: (r: Record<string, unknown>) => String(r.month ?? "").slice(0, 7) },
            { key: "invoice_count", label: "單數", type: "number" },
            { key: "revenue", label: "營收", type: "number" },
            { key: "cogs", label: "銷貨成本", type: "number" },
            { key: "gross_profit", label: "毛利", type: "number" },
            { key: "gross_margin_pct", label: "毛利率(%)", type: "number" },
            { key: "collected", label: "已收", type: "number" },
            { key: "outstanding", label: "未收", type: "number" },
          ]}
        />
      </div>
      <div className="rounded-lg border bg-card shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">月份</th>
              <th className="px-4 py-3 text-right">單數</th>
              <th className="px-4 py-3 text-right">營收</th>
              <th className="px-4 py-3 text-right">銷貨成本</th>
              <th className="px-4 py-3 text-right">毛利</th>
              <th className="px-4 py-3 text-right">毛利率</th>
              <th className="px-4 py-3 text-right">已收</th>
              <th className="px-4 py-3 text-right">未收</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  載入中...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  尚無資料
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.month} className="border-t">
                  <td className="px-4 py-2.5 font-medium">{fmtMonth(r.month)}</td>
                  <td className="px-4 py-2.5 text-right">{num(r.invoice_count)}</td>
                  <td className="px-4 py-2.5 text-right">{num(r.revenue)}</td>
                  <td className="px-4 py-2.5 text-right">{num(r.cogs)}</td>
                  <td className="px-4 py-2.5 text-right">{num(r.gross_profit)}</td>
                  <td className="px-4 py-2.5 text-right">{pct(r.gross_margin_pct)}</td>
                  <td className="px-4 py-2.5 text-right">{num(r.collected)}</td>
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
