import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type SourceLine = {
  id: string;
  product_code: string | null;
  product_name: string | null;
  unit: string | null;
  quantity: number;
  delivered_qty: number | null;
};

type RowState = {
  line: SourceLine;
  remaining: number;
  fullyDone: boolean;
  checked: boolean;
  qty: number;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sourceDocId: string | null;
  sourceDocNo: string | null;
  targetDocType?: "sales_order" | "sales_invoice" | "sales_return" | "purchase_receipt";
  targetLabel?: string; // e.g. "訂單" / "銷貨單" / "進貨單"
  onTransferred?: (newDocId: string, newDocNo: string | null) => void;
};

export function TransferToOrderDialog({
  open,
  onOpenChange,
  sourceDocId,
  sourceDocNo,
  targetDocType = "sales_order",
  targetLabel = "訂單",
  onTransferred,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rows, setRows] = useState<RowState[]>([]);

  useEffect(() => {
    if (!open || !sourceDocId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("doc_lines")
        .select(
          "id, product_code, product_name, unit, quantity, delivered_qty",
        )
        .eq("header_id", sourceDocId)
        .order("line_no");
      if (cancelled) return;
      if (error) {
        toast.error("讀取明細失敗:" + error.message);
        setRows([]);
      } else {
        const list = (data ?? []) as SourceLine[];
        setRows(
          list.map((l) => {
            const remaining =
              Number(l.quantity ?? 0) - Number(l.delivered_qty ?? 0);
            const fullyDone = remaining <= 0;
            return {
              line: l,
              remaining: Math.max(remaining, 0),
              fullyDone,
              checked: !fullyDone,
              qty: Math.max(remaining, 0),
            };
          }),
        );
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, sourceDocId]);

  const updateRow = (idx: number, patch: Partial<RowState>) => {
    setRows((arr) => arr.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const handleConfirm = async () => {
    if (!sourceDocId) return;
    const payload = rows
      .filter((r) => r.checked && !r.fullyDone && r.qty > 0)
      .map((r) => ({
        source_line_id: r.line.id,
        transfer_qty: Number(r.qty),
      }));
    if (payload.length === 0) {
      toast.error("請至少勾選一行有效明細");
      return;
    }
    // 超量檢查
    for (const r of rows) {
      if (r.checked && r.qty > r.remaining) {
        toast.error(`「${r.line.product_name}」本次數量超過剩餘可轉量`);
        return;
      }
    }
    setSubmitting(true);
    const { data, error } = await supabase.rpc("transfer_document", {
      p_source_doc_id: sourceDocId,
      p_target_doc_type: targetDocType,
      p_lines: payload,
    });
    setSubmitting(false);
    if (error) {
      toast.error("轉單失敗:" + error.message);
      return;
    }
    let newId: string | null = null;
    let newNo: string | null = null;
    if (typeof data === "string") {
      newId = data;
    } else if (data && typeof data === "object") {
      const d = data as { id?: string; doc_no?: string };
      newId = d.id ?? null;
      newNo = d.doc_no ?? null;
    }
    toast.success(`已轉為${targetLabel}${newNo ? ` ${newNo}` : ""}`);
    onOpenChange(false);
    if (newId) onTransferred?.(newId, newNo);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            轉{targetLabel}{sourceDocNo ? ` · 來源 ${sourceDocNo}` : ""}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>產品</TableHead>
                <TableHead className="w-16">單位</TableHead>
                <TableHead className="w-24 text-right">訂購量</TableHead>
                <TableHead className="w-24 text-right">已轉</TableHead>
                <TableHead className="w-24 text-right">剩餘</TableHead>
                <TableHead className="w-32 text-right">本次數量</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-20 text-center text-sm text-muted-foreground"
                  >
                    無明細
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r, idx) => (
                  <TableRow
                    key={r.line.id}
                    className={cn(r.fullyDone && "bg-muted/40 text-muted-foreground")}
                  >
                    <TableCell>
                      <Checkbox
                        disabled={r.fullyDone}
                        checked={r.checked}
                        onCheckedChange={(v) =>
                          updateRow(idx, { checked: Boolean(v) })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{r.line.product_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.line.product_code}
                      </div>
                    </TableCell>
                    <TableCell>{r.line.unit ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {Number(r.line.quantity ?? 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {Number(r.line.delivered_qty ?? 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.remaining.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        max={r.remaining}
                        step="0.01"
                        disabled={r.fullyDone || !r.checked}
                        className="h-8 text-right"
                        value={r.qty}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          updateRow(idx, {
                            qty: Math.min(Math.max(v, 0), r.remaining),
                          });
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={submitting || loading}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            確認轉單
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
