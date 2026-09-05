import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePermission } from "@/hooks/usePermission";

export type SettlementKind = "customer" | "vendor";

type Contact = { id: string; name: string; type: string };

type OpenDoc = {
  id: string;
  doc_no: string;
  doc_date: string;
  total_amount: number | null;
  paid_amount: number | null;
};

export function SettlementPage({ kind }: { kind: SettlementKind }) {
  const isCustomer = kind === "customer";
  const docType = isCustomer ? "sales_invoice" : "purchase_receipt";
  const verb = isCustomer ? "收款" : "付款";
  const partyLabel = isCustomer ? "客戶" : "廠商";
  const title = isCustomer ? "客戶收款結帳" : "廠商付款結帳";
  const { profile } = useAuth();
  const canWrite = usePermission("finance", "write");

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactId, setContactId] = useState<string>("");
  const [docs, setDocs] = useState<OpenDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [allocs, setAllocs] = useState<Record<string, string>>({});
  const [totalAmount, setTotalAmount] = useState<string>("");
  const [method, setMethod] = useState("transfer");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const types = isCustomer ? ["customer", "both"] : ["vendor", "both"];
      const { data } = await supabase
        .from("contacts")
        .select("id,name,type")
        .in("type", types)
        .order("name");
      setContacts((data ?? []) as Contact[]);
    })();
  }, [isCustomer]);

  const loadDocs = async (cid: string) => {
    if (!profile?.company_id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("doc_headers")
      .select("id,doc_no,doc_date,total_amount,paid_amount")
      .eq("company_id", profile?.company_id ?? "")
      .eq("doc_type", docType)
      .eq("contact_id", cid)
      .in("status", ["confirmed", "completed"])
      .neq("payment_status", "paid")
      .order("doc_date", { ascending: true });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDocs((data ?? []) as OpenDoc[]);
    setAllocs({});
  };

  useEffect(() => {
    if (contactId) loadDocs(contactId);
    else {
      setDocs([]);
      setAllocs({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId]);

  const balanceOf = (d: OpenDoc) =>
    Math.max(0, Number(d.total_amount ?? 0) - Number(d.paid_amount ?? 0));

  const allocated = useMemo(
    () =>
      Object.values(allocs).reduce((s, v) => s + (Number(v) || 0), 0),
    [allocs],
  );
  const incoming = Number(totalAmount) || 0;
  const remaining = incoming - allocated;

  const autoAllocate = () => {
    if (incoming <= 0) {
      toast.error(`請先輸入本次${verb}總額`);
      return;
    }
    let left = incoming;
    const next: Record<string, string> = {};
    for (const d of docs) {
      if (left <= 0) {
        next[d.id] = "0";
        continue;
      }
      const bal = balanceOf(d);
      const use = Math.min(bal, left);
      next[d.id] = String(use);
      left -= use;
    }
    setAllocs(next);
    if (left > 0) {
      toast.warning(
        `仍有 ${left.toLocaleString()} 未分配,超出未結金額`,
      );
    }
  };

  const updateAlloc = (d: OpenDoc, val: string) => {
    const n = Number(val);
    const bal = balanceOf(d);
    if (Number.isFinite(n) && n > bal) {
      toast.error(`不可超過該單未${isCustomer ? "收" : "付"}餘額`);
      setAllocs((p) => ({ ...p, [d.id]: String(bal) }));
      return;
    }
    setAllocs((p) => ({ ...p, [d.id]: val }));
  };

  const submit = async () => {
    if (!contactId) return toast.error(`請選擇${partyLabel}`);
    if (incoming <= 0) return toast.error(`請輸入${verb}總額`);
    if (Math.abs(remaining) > 0.001) {
      return toast.error(`未分配餘額需為 0,目前 ${remaining.toLocaleString()}`);
    }
    const allocations = Object.entries(allocs)
      .map(([doc_id, v]) => ({ doc_id, amount: Number(v) || 0 }))
      .filter((a) => a.amount > 0);
    if (allocations.length === 0) return toast.error("請至少分配一張單據");

    setSubmitting(true);
    const { data, error } = await supabase.rpc("settle_documents", {
      p_allocations: allocations,
      p_method: method,
      p_reference: reference || null,
      p_notes: notes || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error(`${verb}結帳失敗:${error.message}`);
      return;
    }
    const settleNo =
      (data && typeof data === "object" && "settlement_no" in (data as object)
        ? (data as { settlement_no?: string }).settlement_no
        : null) || (typeof data === "string" ? data : "");
    toast.success(`已完成${verb}結帳${settleNo ? ` · ${settleNo}` : ""}`);
    setTotalAmount("");
    setReference("");
    setNotes("");
    setAllocs({});
    await loadDocs(contactId);
  };

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <div className="text-sm text-muted-foreground">
          選擇{partyLabel}後,輸入本次{verb}總額並分配到未結清單據
        </div>
      </div>

      <section className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>{partyLabel}</Label>
          <Select value={contactId} onValueChange={setContactId}>
            <SelectTrigger>
              <SelectValue placeholder={`選擇${partyLabel}`} />
            </SelectTrigger>
            <SelectContent>
              {contacts.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>本次{verb}總額</Label>
          <Input
            type="number"
            min={0}
            step="1"
            value={totalAmount}
            onChange={(e) => setTotalAmount(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{verb}方式</Label>
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
          <Label>參考</Label>
          <Input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="後五碼/支票號(選填)"
          />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label>備註</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>
      </section>

      <section className="rounded-lg border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-2">
          <div className="text-sm font-medium">
            未結清{isCustomer ? "銷貨單" : "進貨單"} ({docs.length})
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span>
              已分配:
              <span className="ml-1 font-semibold tabular-nums">
                {allocated.toLocaleString()}
              </span>
            </span>
            <span>
              未分配:
              <span
                className={`ml-1 font-semibold tabular-nums ${Math.abs(remaining) > 0.001 ? "text-destructive" : "text-success"}`}
              >
                {remaining.toLocaleString()}
              </span>
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={autoAllocate}
              disabled={!contactId || incoming <= 0}
            >
              自動分配 (FIFO)
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            載入中...
          </div>
        ) : !contactId ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            請先選擇{partyLabel}
          </div>
        ) : docs.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            無未結清單據
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>單號</TableHead>
                <TableHead>日期</TableHead>
                <TableHead className="text-right">總額</TableHead>
                <TableHead className="text-right">
                  已{isCustomer ? "收" : "付"}
                </TableHead>
                <TableHead className="text-right">未結餘額</TableHead>
                <TableHead className="w-44 text-right">
                  本次分配
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((d) => {
                const bal = balanceOf(d);
                return (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono">{d.doc_no}</TableCell>
                    <TableCell>{d.doc_date}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {Number(d.total_amount ?? 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {Number(d.paid_amount ?? 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {bal.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min={0}
                        max={bal}
                        step="1"
                        value={allocs[d.id] ?? ""}
                        onChange={(e) => updateAlloc(d, e.target.value)}
                        className="ml-auto h-8 w-36 text-right"
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </section>

      <div className="flex justify-end">
        <Button
          onClick={submit}
          disabled={
            submitting ||
            !canWrite ||
            !contactId ||
            incoming <= 0 ||
            Math.abs(remaining) > 0.001
          }
        >
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          確認{verb}結帳
        </Button>
      </div>
    </div>
  );
}
