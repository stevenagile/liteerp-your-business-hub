import { createLazyFileRoute } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { ExportExcelButton } from "@/components/ExportExcelButton";

const DOC_STATUS_LABEL: Record<string, string> = {
  draft: "草稿",
  confirmed: "已確認",
  completed: "已完成",
  voided: "已作廢",
};
import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Pencil, ArrowRightLeft, Printer, Truck } from "lucide-react";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";
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
import { TransferToOrderDialog } from "@/components/TransferToOrderDialog";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { usePermission } from "@/hooks/usePermission";
import { useAuth } from "@/context/AuthContext";
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

export const Route = createLazyFileRoute("/_app/docs/sales-order")({
  component: SalesOrderListPage,
});
type DocRow = {
  id: string;
  doc_no: string | null;
  doc_date: string;
  contact_name: string | null;
  total_amount: number | null;
  status: string;
  source_doc_no: string | null;
};

function SalesOrderListPage() {
  const { allowed, checking } = usePermissionGuard("/docs/sales-order");
  const canWrite = usePermission("sales", "write");
  const canConfirm = usePermission("sales", "confirm");
  const { profile } = useAuth();
  const [list, setList] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [transferTarget, setTransferTarget] = useState<DocRow | null>(null);
  const [shipTarget, setShipTarget] = useState<DocRow | null>(null);
  const [shipping, setShipping] = useState(false);
  const navigate = useNavigate();

  const handleShip = async () => {
    if (!shipTarget) return;
    setShipping(true);
    const { error } = await supabase.rpc("agent_ship_order", { p_order_id: shipTarget.id });
    setShipping(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("已出貨，銷貨單已建立");
    setShipTarget(null);
    load();
  };

  const load = async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    let q = supabase
      .from("doc_headers")
      .select(
        "id, doc_no, doc_date, contact_name, total_amount, status, source_doc_no",
      )
      .eq("doc_type", "sales_order")
      .eq("company_id", profile?.company_id ?? "")
      .order("doc_date", { ascending: false })
      .order("doc_no", { ascending: false });
    if (status !== "all") q = q.eq("status", status);
    if (dateFrom) q = q.gte("doc_date", dateFrom);
    if (dateTo) q = q.lte("doc_date", dateTo);
    const { data, error } = await q;
    if (error) {
      toast.error("讀取訂單失敗：" + error.message);
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

  if (checking) return <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (!allowed) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">訂單</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            管理銷售訂單，可由報價單轉入。共 {summary.count} 筆，總金額{" "}
            {summary.total.toLocaleString()}。
          </p>
        </div>
        {canWrite && (
          <Button onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            新增訂單
          </Button>
        )}
      </div>

      {/* 篩選 */}
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
            filename="訂單"
            columns={[
              { key: "doc_no", label: "單號" },
              { key: "doc_date", label: "日期" },
              { key: "contact_name", label: "客戶" },
              { key: "total_amount", label: "總金額", type: "number" },
              { key: "status", label: "狀態", value: (r: Record<string, unknown>) => DOC_STATUS_LABEL[(r as { status: string }).status] ?? (r as { status: string }).status },
              { key: "source_doc_no", label: "來源報價單" },
            ]}
          />
        </div>
      </div>

      {/* 列表 */}
      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-40">單號</TableHead>
              <TableHead className="w-32">日期</TableHead>
              <TableHead>客戶</TableHead>
              <TableHead className="w-32 text-right">總金額</TableHead>
              <TableHead className="w-24">狀態</TableHead>
              <TableHead className="w-36">來源報價單</TableHead>
              <TableHead className="w-20 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <Loader2 className="inline h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : list.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  尚無資料
                </TableCell>
              </TableRow>
            ) : (
              list.map((d) => (
                <TableRow key={d.id}>
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
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {d.source_doc_no ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {canConfirm && d.status === "confirmed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setTransferTarget(d)}
                        >
                          <ArrowRightLeft className="mr-1 h-3.5 w-3.5" />
                          轉銷貨
                        </Button>
                      )}
                      {canConfirm && d.status === "confirmed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShipTarget(d)}
                        >
                          <Truck className="mr-1 h-3.5 w-3.5" />
                          出貨
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" asChild title="列印">
                        <a
                          href={`/print/sales_order/${d.id}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Printer className="h-4 w-4" />
                        </a>
                      </Button>
                      <VoidDocumentButton
                        docId={d.id}
                        docNo={d.doc_no}
                        status={d.status}
                        module="sales"
                        variant="ghost"
                        onVoided={load}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEdit(d.id)}
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

      {/* 編輯/新增 Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? (list.find((d) => d.id === editingId)?.status === "draft" ? "編輯訂單" : "檢視訂單") : "新增訂單"}</DialogTitle>
          </DialogHeader>
          {dialogOpen && (
            <DocumentForm
              docType="sales_order"
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

      <TransferToOrderDialog
        open={Boolean(transferTarget)}
        onOpenChange={(v) => !v && setTransferTarget(null)}
        sourceDocId={transferTarget?.id ?? null}
        sourceDocNo={transferTarget?.doc_no ?? null}
        targetDocType="sales_invoice"
        targetLabel="銷貨單"
        onTransferred={() => {
          setTransferTarget(null);
          load();
          navigate({ to: "/docs/sales-invoice" });
        }}
      />

      <AlertDialog open={Boolean(shipTarget)} onOpenChange={(v) => !v && !shipping && setShipTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定出貨？</AlertDialogTitle>
            <AlertDialogDescription>
              將建立銷貨單並扣庫存、產生應收。訂單：{shipTarget?.doc_no ?? "—"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={shipping}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleShip(); }} disabled={shipping}>
              {shipping ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              確定出貨
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
