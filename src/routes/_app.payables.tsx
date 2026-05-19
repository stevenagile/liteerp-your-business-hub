import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_app/payables")({
  component: PayablesPage,
});

type Row = {
  vendor_name: string | null;
  doc_no: string | null;
  doc_date: string;
  due_date: string | null;
  total_amount: number | null;
  paid_amount: number | null;
  balance: number | null;
  payment_status: string | null;
  overdue_days: number | null;
};

function PaymentBadge({ status }: { status: string | null }) {
  const map: Record<string, { label: string; cls: string }> = {
    unpaid: { label: "未付款", cls: "bg-destructive/15 text-destructive" },
    partial: {
      label: "部分付款",
      cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    },
    paid: { label: "已付清", cls: "bg-success/15 text-success" },
  };
  const s = map[status ?? ""] ?? {
    label: status ?? "—",
    cls: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        s.cls,
      )}
    >
      {s.label}
    </span>
  );
}

function PayablesPage() {
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("v_payables")
        .select("*")
        .order("doc_date", { ascending: false });
      if (error) toast.error("讀取應付帳款失敗:" + error.message);
      else setList((data ?? []) as Row[]);
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    let total = 0;
    let overdue = 0;
    for (const r of list) {
      const b = Number(r.balance) || 0;
      total += b;
      if ((r.overdue_days ?? 0) > 0) overdue += b;
    }
    return { total, overdue };
  }, [list]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">應付帳款</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          追蹤廠商未付款項與逾期狀況。
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="text-xs text-muted-foreground">應付總額</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">
            {stats.total.toLocaleString()}
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="text-xs text-muted-foreground">逾期總額</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-destructive">
            {stats.overdue.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>廠商</TableHead>
              <TableHead className="w-36">單號</TableHead>
              <TableHead className="w-28">日期</TableHead>
              <TableHead className="w-28">到期日</TableHead>
              <TableHead className="w-28 text-right">總額</TableHead>
              <TableHead className="w-28 text-right">已付</TableHead>
              <TableHead className="w-28 text-right">餘額</TableHead>
              <TableHead className="w-24">狀態</TableHead>
              <TableHead className="w-28">逾期</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  <Loader2 className="inline h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : list.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  目前無應付帳款
                </TableCell>
              </TableRow>
            ) : (
              list.map((r, i) => {
                const overdue = (r.overdue_days ?? 0) > 0;
                return (
                  <TableRow
                    key={`${r.doc_no}-${i}`}
                    className={cn(overdue && "bg-destructive/5")}
                  >
                    <TableCell className="font-medium">
                      {r.vendor_name ?? "—"}
                    </TableCell>
                    <TableCell className="font-mono">{r.doc_no}</TableCell>
                    <TableCell>{r.doc_date}</TableCell>
                    <TableCell>{r.due_date ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {Number(r.total_amount ?? 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {Number(r.paid_amount ?? 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {Number(r.balance ?? 0).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <PaymentBadge status={r.payment_status} />
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-sm",
                        overdue
                          ? "font-medium text-destructive"
                          : "text-muted-foreground",
                      )}
                    >
                      {overdue ? `逾期 ${r.overdue_days} 天` : "—"}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
