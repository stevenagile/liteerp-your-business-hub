import { createFileRoute } from "@tanstack/react-router";
import { ExportExcelButton } from "@/components/ExportExcelButton";
import { PrintReportButton } from "@/components/PrintReportButton";
import { ReportPrintHeader } from "@/components/ReportPrintHeader";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/reports/pnl")({
  component: PnlReport,
});

type Row = {
  month: string;
  revenue: number | null;
  cogs: number | null;
  gross_profit: number | null;
  gross_margin_pct: number | null;
  fixed_expenses: number | null;
  variable_expenses: number | null;
  total_expenses: number | null;
  net_profit: number | null;
  net_margin_pct: number | null;
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

function PnlReport() {
  const { allowed, checking } = usePermissionGuard("/reports/pnl");
  const { profile } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!profile?.company_id) return;
      const { data, error } = await supabase
        .from("v_monthly_pnl")
        .select("*")
        .eq("company_id", profile?.company_id ?? "")
        .order("month", { ascending: false });
      if (error) console.error(error);
      setRows((data as Row[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const cols: { key: keyof Row | "label"; label: string; isPct?: boolean; emphasis?: "gross" | "net" }[] = [
    { key: "revenue", label: "營收" },
    { key: "cogs", label: "銷貨成本" },
    { key: "gross_profit", label: "毛利", emphasis: "gross" },
    { key: "gross_margin_pct", label: "毛利率", isPct: true },
    { key: "fixed_expenses", label: "固定費用" },
    { key: "variable_expenses", label: "變動費用" },
    { key: "total_expenses", label: "費用合計" },
    { key: "net_profit", label: "淨利", emphasis: "net" },
    { key: "net_margin_pct", label: "淨利率", isPct: true },
  ];

  if (checking) return <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (!allowed) return null;

  return (
    <div className="space-y-4 print-area">
      <ReportPrintHeader title="月損益表" />
      <div className="flex items-start justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">月損益表</h1>
          <p className="mt-1 text-sm text-muted-foreground">每月營收、成本、費用與淨利</p>
        </div>
        <div className="flex gap-2">
          <ExportExcelButton
            rows={rows as unknown as Record<string, unknown>[]}
            filename="月損益表"
            columns={[
              { key: "month", label: "月份", value: (r: Record<string, unknown>) => String(r.month ?? "").slice(0, 7) },
              { key: "revenue", label: "營收", type: "number" },
              { key: "cogs", label: "銷貨成本", type: "number" },
              { key: "gross_profit", label: "毛利", type: "number" },
              { key: "gross_margin_pct", label: "毛利率(%)", type: "number" },
              { key: "fixed_expenses", label: "固定費用", type: "number" },
              { key: "variable_expenses", label: "變動費用", type: "number" },
              { key: "total_expenses", label: "費用合計", type: "number" },
              { key: "net_profit", label: "淨利", type: "number" },
              { key: "net_margin_pct", label: "淨利率(%)", type: "number" },
            ]}
          />
          <PrintReportButton />
        </div>
      </div>
      <div className="rounded-lg border bg-card shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">月份</th>
              {cols.map((c) => (
                <th key={c.label} className="px-4 py-3 text-right">{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={cols.length + 1} className="px-4 py-8 text-center text-muted-foreground">
                  載入中...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={cols.length + 1} className="px-4 py-8 text-center text-muted-foreground">
                  尚無資料
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const negative = (r.net_profit ?? 0) < 0;
                return (
                  <tr
                    key={r.month}
                    className={cn(
                      "border-t",
                      negative && "bg-destructive/5 text-destructive",
                    )}
                  >
                    <td className="px-4 py-2.5 font-medium">{fmtMonth(r.month)}</td>
                    {cols.map((c) => {
                      const v = r[c.key as keyof Row] as number | null;
                      return (
                        <td
                          key={c.label}
                          className={cn(
                            "px-4 py-2.5 text-right tabular-nums",
                            c.emphasis === "net" && "font-semibold",
                            c.emphasis === "gross" && "font-medium",
                          )}
                        >
                          {c.isPct ? pct(v) : num(v)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
