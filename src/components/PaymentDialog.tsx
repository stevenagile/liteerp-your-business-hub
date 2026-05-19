import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  docId: string | null;
  docNo: string | null;
  totalAmount: number;
  paidAmount: number;
  /** receive = 收款（銷貨）；pay = 付款（進貨）。預設 receive */
  mode?: "receive" | "pay";
  onRecorded?: () => void;
};

export function PaymentDialog({
  open,
  onOpenChange,
  docId,
  docNo,
  totalAmount,
  paidAmount,
  mode = "receive",
  onRecorded,
}: Props) {
  const isPay = mode === "pay";
  const titleVerb = isPay ? "付款" : "收款";
  const dueLabel = isPay ? "應付" : "應收";
  const paidLabel = isPay ? "已付" : "已收";
  const balLabel = isPay ? "未付" : "未收";
  const balance = Math.max(0, Number(totalAmount) - Number(paidAmount));
  const [amount, setAmount] = useState<string>("");
  const [method, setMethod] = useState<string>("transfer");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setAmount(String(balance));
      setMethod("transfer");
      setReference("");
      setNotes("");
    }
  }, [open, balance]);

  const submit = async () => {
    if (!docId) return;
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error("請輸入有效金額");
      return;
    }
    if (amt > balance) {
      toast.error(`${titleVerb}金額不可超過${balLabel}餘額`);
      return;
    }
    setSaving(true);
    const { error } = await supabase.rpc("record_payment", {
      p_doc_id: docId,
      p_amount: amt,
      p_method: method,
      p_reference: reference || null,
      p_notes: notes || null,
    });
    setSaving(false);
    if (error) {
      toast.error(`${titleVerb}失敗:` + error.message);
      return;
    }
    toast.success(`已記錄${titleVerb}`);
    onOpenChange(false);
    onRecorded?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>收款 {docNo ? `· ${docNo}` : ""}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 rounded-lg border bg-muted/30 p-3 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">應收</div>
              <div className="font-semibold tabular-nums">
                {Number(totalAmount).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">已收</div>
              <div className="font-semibold tabular-nums">
                {Number(paidAmount).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">未收</div>
              <div className="font-semibold tabular-nums text-destructive">
                {balance.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>本次收款金額</Label>
            <Input
              type="number"
              min={0}
              max={balance}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>收款方式</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">現金</SelectItem>
                <SelectItem value="transfer">匯款</SelectItem>
                <SelectItem value="check">支票</SelectItem>
                <SelectItem value="other">其他</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>參考(後五碼/支票號)</Label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="選填"
            />
          </div>

          <div className="space-y-1.5">
            <Label>備註</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="選填"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            取消
          </Button>
          <Button onClick={submit} disabled={saving || balance <= 0}>
            {saving ? "處理中..." : "確認收款"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
