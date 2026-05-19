import { createFileRoute } from "@tanstack/react-router";
import { ExportExcelButton } from "@/components/ExportExcelButton";

const DOC_STATUS_LABEL: Record<string, string> = {
  draft: "草稿",
  confirmed: "已確認",
  completed: "已完成",
  voided: "已作廢",
};
const PAY_STATUS_LABEL: Record<string, string> = {
  unpaid: "未付款",
  partial: "部分付款",
  paid: "已付款",
};
import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Pencil, Wallet, Printer } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { usePermission } from "@/hooks/usePermission";
import { cn } from "@/lib/utils";
import { PaymentDialog } from "@/components/PaymentDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DocumentForm, StatusBadge } from "@/components/DocumentForm";
import { VoidDocumentButton } from "@/components/VoidDocumentButton";

export const Route = createFileRoute("/_app/docs/purchase-receipt")({
  component: PurchaseReceiptListPage,
});

type DocRow = {
  id: string;
  doc_no: string | null;
  doc_date: string;
  contact_name: string | null;
  total_amount: number | null;
  paid_amount: number | null;
  status: string;
  source_doc_no: string | null;
  payment_status: string | null;
};

function PayableBadge({ status }: { status: string | null }) {
  const map: Record<string, { label: string; cls: string }> = {
    unpaid: {
      label: "未付款",
      cls: "bg-destructive/15 text-destructive",
    },
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

function PurchaseReceiptListPage() {
  const canWrite = usePermission("purchase", "write");
  const canPay = usePermission("finance", "write");
  const [list, setList] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [payTarget, setPayTarget] = useState<DocRow | null>(null);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("doc_headers")
      .select(
        "id, doc_no, doc_date, contact_name, total_amount, paid_amount, status, source_doc_no, payment_status",
      )
      .eq("doc_type", "purchase_receipt")
      .order("doc_date", { ascending: false })
      .order("doc_no", { ascending: false });
    if (status !== "all") q = q.eq("status", status);
    if (dateFrom) q = q.gte("doc_date", dateFrom);
    if (dateTo) q = q.lte("doc_date", dateTo);
    const { data, error } = await q;
    if (error) {
      toast.error("讀取進貨單失敗:" + error.message);
    } else {
      setList((data ?? []) as DocRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, dateFrom, dateTo]);

  const summary = useMemo(() => {
    const total = list.reduce(
      (s, d) => s + (Number(d.total_amount) || 0),
      0,
    );
    return { count: list.length, total };
  }, [list]);

  const openCreate = () => {
    setEditingId(null);
    setDialogOpen(true);
  };
  const openEdit = (id: string) => {
    setEditingId(id);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">進貨單</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            管理已入庫之進貨單據,可由採購單轉入。共 {summary.count} 筆,總金額{" "}
            {summary.total.toLocaleString()}。
          </p>
        </div>
        {canWrite && (
          <Button onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            新增進貨單
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4 shadow-sm">
        <div className="space-y-1.5">
          <Label className="text-xs">狀態</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="draft">草稿</SelectItem>
              <SelectItem value="confirmed">已確認</SelectItem>
              <SelectItem value="completed">已完成</SelectItem>
              <SelectItem value="voided">已作廢</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">起始日期</Label>
          <Input
            type="date"
            className="w-40"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">結束日期</Label>
          <Input
            type="date"
            className="w-40"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        {(dateFrom || dateTo || status !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatus("all");
              setDateFrom("");
              setDateTo("");
            }}
          >
            清除篩選
          </Button>
        )}
        <div className="ml-auto">
          <ExportExcelButton
            rows={list as unknown as Record<string, unknown>[]}
            filename="進貨單"
            columns={[
              { key: "doc_no", label: "單號" },
              { key: "doc_date", label: "日期" },
              { key: "contact_name", label: "廠商" },
              { key: "total_amount", label: "總金額", type: "number" },
              { key: "paid_amount", label: "已付", type: "number" },
              { key: "status", label: "狀態", value: (r) => DOC_STATUS_LABEL[(r as { status: string }).status] ?? (r as { status: string }).status },
              { key: "payment_status", label: "付款狀態", value: (r) => PAY_STATUS_LABEL[(r as { payment_status: string | null }).payment_status ?? ""] ?? "—" },
              { key: "source_doc_no", label: "來源採購單" },
            ]}
          />
        </div>
      </div>

      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-40">單號</TableHead>
              <TableHead className="w-32">日期</TableHead>
              <TableHead>廠商</TableHead>
              <TableHead className="w-32 text-right">總金額</TableHead>
              <TableHead className="w-24">狀態</TableHead>
              <TableHead className="w-28">付款</TableHead>
              <TableHead className="w-36">來源採購單</TableHead>
              <TableHead className="w-32 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  <Loader2 className="inline h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : list.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  尚無進貨單
                </TableCell>
              </TableRow>
            ) : (
              list.map((d) => (
                <TableRow
                  key={d.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => openEdit(d.id)}
                >
                  <TableCell className="font-mono">{d.doc_no ?? "—"}</TableCell>
                  <TableCell>{d.doc_date}</TableCell>
                  <TableCell className="font-medium">
                    {d.contact_name ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {Number(d.total_amount ?? 0).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={d.status} />
                  </TableCell>
                  <TableCell>
                    <PayableBadge status={d.payment_status} />
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {d.source_doc_no ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {canPay &&
                        d.status === "confirmed" &&
                        d.payment_status !== "paid" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPayTarget(d);
                            }}
                          >
                            <Wallet className="mr-1 h-3.5 w-3.5" />
                            付款
                          </Button>
                        )}
                      <Button size="sm" variant="ghost" asChild title="列印">
                        <a
                          href={`/print/purchase_receipt/${d.id}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Printer className="h-4 w-4" />
                        </a>
                      </Button>
                      <VoidDocumentButton
                        docId={d.id}
                        docNo={d.doc_no}
                        status={d.status}
                        module="purchase"
                        variant="ghost"
                        onVoided={load}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(d.id);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "編輯進貨單" : "新增進貨單"}</DialogTitle>
          </DialogHeader>
          {dialogOpen && (
            <DocumentForm
              docType="purchase_receipt"
              docId={editingId}
              onCancel={() => setDialogOpen(false)}
              onSaved={() => {
                setDialogOpen(false);
                load();
              }}
              onChanged={load}
            />
          )}
        </DialogContent>
      </Dialog>

      <PaymentDialog
        open={Boolean(payTarget)}
        onOpenChange={(v) => !v && setPayTarget(null)}
        docId={payTarget?.id ?? null}
        docNo={payTarget?.doc_no ?? null}
        totalAmount={Number(payTarget?.total_amount ?? 0)}
        paidAmount={Number(payTarget?.paid_amount ?? 0)}
        mode="pay"
        onRecorded={() => {
          setPayTarget(null);
          load();
        }}
      />
    </div>
  );
}
