import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_app/reports/salesperson")({
  component: SalespersonReport,
});

type Row = {
  sales_person_name: string | null;
  month: string;
  invoice_count: number | null;
  total_sales: number | null;
  gross_profit: number | null;
  margin_pct: number | null;
};

const firstOfYear = () => `${new Date().getFullYear()}-01`;
const currentMonth = () => new Date().toISOString().slice(0, 7);
const fmt = (n: number | null | undefined) =>
  Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

type SortKey = "total_sales" | "gross_profit";

function SalespersonReport() {
  const [startMonth, setStartMonth] = useState(firstOfYear());
  const [endMonth, setEndMonth] = useState(currentMonth());
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("total_sales");

  const run = async () => {
    setLoading(true);
    try {
      const startDate = `${startMonth}-01`;
      // end = first day of month after endMonth
      const [y, m] = endMonth.split("-").map(Number);
      const endDate = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("v_salesperson_performance")
        .select("sales_person_name,month,invoice_count,total_sales,gross_profit,margin_pct")
        .gte("month", startDate)
        .lt("month", endDate)
        .order("month", { ascending: false });
      if (error) throw error;
      setRows((data ?? []) as Row[]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => Number(b[sortKey] ?? 0) - Number(a[sortKey] ?? 0));
  }, [rows, sortKey]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">業務績效報表</h1>

      <div className="flex flex-wrap items-end gap-3 rounded-md border bg-card p-4">
        <div className="grid gap-1.5">
          <Label>起月</Label>
          <Input className="w-40" type="month" value={startMonth} onChange={(e) => setStartMonth(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label>迄月</Label>
          <Input className="w-40" type="month" value={endMonth} onChange={(e) => setEndMonth(e.target.value)} />
        </div>
        <Button onClick={run} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}查詢
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>業務員</TableHead>
              <TableHead>月份</TableHead>
              <TableHead className="text-right">張數</TableHead>
              <TableHead className="text-right">
                <button className="inline-flex items-center gap-1" onClick={() => setSortKey("total_sales")}>
                  總銷售額 <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead className="text-right">
                <button className="inline-flex items-center gap-1" onClick={() => setSortKey("gross_profit")}>
                  總毛利 <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead className="text-right">毛利率</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">無資料</TableCell></TableRow>
            )}
            {sorted.map((r, i) => (
              <TableRow key={i}>
                <TableCell>{r.sales_person_name ?? "—"}</TableCell>
                <TableCell>{String(r.month).slice(0, 7)}</TableCell>
                <TableCell className="text-right">{r.invoice_count ?? 0}</TableCell>
                <TableCell className="text-right">{fmt(r.total_sales)}</TableCell>
                <TableCell className="text-right">{fmt(r.gross_profit)}</TableCell>
                <TableCell className="text-right">{Number(r.margin_pct ?? 0).toFixed(2)}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
