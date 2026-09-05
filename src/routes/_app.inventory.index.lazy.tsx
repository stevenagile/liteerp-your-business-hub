import { createLazyFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, AlertTriangle, Boxes, CircleDollarSign } from "lucide-react";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ExportExcelButton } from "@/components/ExportExcelButton";
import { PrintReportButton } from "@/components/PrintReportButton";
import { ReportPrintHeader } from "@/components/ReportPrintHeader";

export const Route = createLazyFileRoute("/_app/inventory/")({
  component: InventoryPage,
});
type StockRow = {
  product_id?: string;
  product_code: string;
  product_name: string;
  warehouse_id?: string;
  warehouse_name: string;
  quantity: number | null;
  avg_cost: number | null;
  stock_value: number | null;
  selling_price: number | null;
  expected_margin_pct: number | null;
  safety_stock: number | null;
  is_low: boolean | null;
};

function fmt(n: number | null | undefined, digits = 0) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return Number(n).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function InventoryPage() {
  const { allowed, checking } = usePermissionGuard("/inventory");
  const { profile } = useAuth();
  const [list, setList] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!profile?.company_id) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("v_stock")
        .select(
          "product_id, product_code, product_name, warehouse_id, warehouse_name, quantity, avg_cost, stock_value, selling_price, expected_margin_pct, safety_stock, is_low",
        )
        .eq("company_id", profile?.company_id ?? "")
        .order("product_code", { ascending: true });
      if (error) {
        toast.error("讀取庫存失敗：" + error.message);
      } else {
        setList((data ?? []) as StockRow[]);
      }
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const items = new Set(list.map((r) => r.product_code)).size;
    const totalValue = list.reduce(
      (acc, r) => acc + (Number(r.stock_value) || 0),
      0,
    );
    return { items, totalValue };
  }, [list]);

  if (checking) return <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (!allowed) return null;

  return (
    <div className="space-y-6 print-area">
      <ReportPrintHeader title="庫存總覽" period={`列印日：${new Date().toISOString().slice(0,10)}`} />
      <div className="flex items-start justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">庫存總覽</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            各倉庫即時庫存數量、平均成本與庫存價值。
          </p>
        </div>
        <div className="flex gap-2">
          <ExportExcelButton
            rows={list as unknown as Record<string, unknown>[]}
            filename="庫存總覽"
            columns={[
              { key: "product_code", label: "產品編號" },
              { key: "product_name", label: "產品名稱" },
              { key: "warehouse_name", label: "倉庫" },
              { key: "quantity", label: "數量", type: "number" },
              { key: "avg_cost", label: "平均成本", type: "number" },
              { key: "stock_value", label: "庫存金額", type: "number" },
              { key: "selling_price", label: "售價", type: "number" },
              { key: "expected_margin_pct", label: "預估毛利%", type: "number" },
              { key: "safety_stock", label: "安全存量", type: "number" },
              { key: "is_low", label: "狀態", value: (r: Record<string, unknown>) => (r.is_low ? "低庫存" : "") },
            ]}
          />
          <PrintReportButton />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 no-print">
        <StatCard
          icon={<Boxes className="h-5 w-5" />}
          label="總庫存品項數"
          value={fmt(stats.items)}
        />
        <StatCard
          icon={<CircleDollarSign className="h-5 w-5" />}
          label="總庫存金額"
          value={"$ " + fmt(stats.totalValue)}
        />
      </div>

      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">產品編號</TableHead>
              <TableHead>產品名稱</TableHead>
              <TableHead className="w-32">倉庫</TableHead>
              <TableHead className="w-24 text-right">數量</TableHead>
              <TableHead className="w-24 text-right">平均成本</TableHead>
              <TableHead className="w-28 text-right">庫存金額</TableHead>
              <TableHead className="w-24 text-right">售價</TableHead>
              <TableHead className="w-24 text-right">預估毛利%</TableHead>
              <TableHead className="w-24 text-right">安全存量</TableHead>
              <TableHead className="w-24">狀態</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center">
                  <Loader2 className="inline h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : list.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  尚無庫存資料
                </TableCell>
              </TableRow>
            ) : (
              list.map((r, i) => (
                <TableRow
                  key={`${r.product_code}-${r.warehouse_name}-${i}`}
                  className={cn(
                    r.is_low &&
                      "bg-destructive/5 hover:bg-destructive/10",
                  )}
                >
                  <TableCell className="font-mono">{r.product_code}</TableCell>
                  <TableCell className="font-medium">
                    {r.product_name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.warehouse_name}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmt(r.quantity)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmt(r.avg_cost, 2)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmt(r.stock_value)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmt(r.selling_price)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.expected_margin_pct == null
                      ? "—"
                      : fmt(r.expected_margin_pct, 1) + "%"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmt(r.safety_stock)}
                  </TableCell>
                  <TableCell>
                    {r.is_low && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        低庫存
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-lg border bg-card p-5 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-0.5 text-xl font-semibold tabular-nums">{value}</div>
      </div>
    </div>
  );
}
