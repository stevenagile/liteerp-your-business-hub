import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { usePermission } from "@/hooks/usePermission";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Payment = {
  id: string;
  payment_date: string | null;
  amount: number | null;
  payment_method: string | null;
  reference: string | null;
  notes: string | null;
  created_at: string | null;
};

const methodLabel: Record<string, string> = {
  cash: "現金",
  transfer: "匯款",
  check: "支票",
  other: "其他",
};

export function PaymentHistoryList({
  docId,
  mode = "receive",
  refreshKey,
  onChanged,
}: {
  docId: string;
  mode?: "receive" | "pay";
  refreshKey?: number;
  onChanged?: () => void;
}) {
  const verb = mode === "pay" ? "付款" : "收款";
  const canWrite = usePermission("finance", "write");
  const [rows, setRows] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [target, setTarget] = useState<Payment | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("payments")
      .select(
        "id,payment_date,amount,payment_method,reference,notes,created_at",
      )
      .eq("doc_id", docId)
      .order("created_at", { ascending: true });
    setLoading(false);
    if (error) {
      console.error("[PaymentHistoryList] load", error);
      return;
    }
    setRows((data ?? []) as Payment[]);
  };

  useEffect(() => {
    if (docId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId, refreshKey]);

  const reverse = async () => {
    if (!target) return;
    setBusy(true);
    const { error } = await supabase.rpc("reverse_payment", {
      p_payment_id: target.id,
    });
    setBusy(false);
    if (error) {
      toast.error(`沖銷失敗:${error.message}`);
      return;
    }
    toast.success("已沖銷");
    setTarget(null);
    await load();
    onChanged?.();
  };

  return (
    <section className="rounded-lg border">
      <div className="border-b px-4 py-2 text-sm font-medium">
        {verb}明細
      </div>
      {loading ? (
        <div className="p-4 text-sm text-muted-foreground">載入中...</div>
      ) : rows.length === 0 ? (
        <div className="p-4 text-sm text-muted-foreground">
          尚無{verb}紀錄
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>日期</TableHead>
              <TableHead>方式</TableHead>
              <TableHead>參考</TableHead>
              <TableHead>備註</TableHead>
              <TableHead className="text-right">金額</TableHead>
              <TableHead className="w-20 text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => {
              const amt = Number(p.amount ?? 0);
              const isReversal = amt < 0;
              return (
                <TableRow key={p.id}>
                  <TableCell>{p.payment_date ?? "—"}</TableCell>
                  <TableCell>
                    {methodLabel[p.payment_method ?? ""] ?? p.payment_method ?? "—"}
                  </TableCell>
                  <TableCell>{p.reference ?? "—"}</TableCell>
                  <TableCell className="max-w-[240px] truncate">
                    {p.notes ?? "—"}
                  </TableCell>
                  <TableCell
                    className={`text-right tabular-nums ${isReversal ? "text-destructive" : ""}`}
                  >
                    {amt.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {amt > 0 && canWrite && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setTarget(p)}
                      >
                        沖銷
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <AlertDialog
        open={!!target}
        onOpenChange={(o) => !o && setTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>沖銷此筆{verb}?</AlertDialogTitle>
            <AlertDialogDescription>
              將產生一筆反向分錄,單據的{verb}金額會回退。此動作會留下紀錄。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={reverse} disabled={busy}>
              {busy ? "處理中..." : "確認沖銷"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
