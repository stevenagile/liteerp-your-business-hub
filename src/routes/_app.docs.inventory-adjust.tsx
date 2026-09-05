import { createFileRoute } from "@tanstack/react-router";
import { ExportExcelButton } from "@/components/ExportExcelButton";

const DOC_STATUS_LABEL: Record<string, string> = {
  draft: "草稿",
  confirmed: "已確認",
  completed: "已完成",
  voided: "已作廢",
};
import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Pencil } from "lucide-react";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";
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

export const Route = createFileRoute("/_app/docs/inventory-adjust")({
  component: InventoryAdjustListPage,
});

type Warehouse = { id: string; name: string };

type DocRow = {
  id: string;
  doc_no: string | null;
  doc_date: string;
  warehouse_id: string | null;
  status: string;
  notes: string | null;
};

function InventoryAdjustListPage() {
  const { allowed, checking } = usePermissionGuard("/docs/inventory-adjust");
  const canWrite = usePermission("inventory", "write");
  const { profile } = useAuth();
  const [list, setList] = useState<DocRow[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const warehouseMap = useMemo(
    () => Object.fromEntries(warehouses.map((w) => [w.id, w.name])),
    [warehouses],
  );

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("warehouses")
        .select("id, name")
        .order("code");
      setWarehouses((data ?? []) as Warehouse[]);
    })();
  }, []);

  const load = async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    let q = supabase
      .from("doc_headers")
      .select("id, doc_no, doc_date, warehouse_id, status, notes")
      .eq("doc_type", "inventory_adjust")
      .eq("company_id", profile?.company_id ?? "")
      .order("doc_date", { ascending: false })
      .order("doc_no", { ascending: false });
    if (status !== "all") q = q.eq("status", status);
    if (dateFrom) q = q.gte("doc_date", dateFrom);
    if (dateTo) q = q.lte("doc_date", dateTo);
    const { data, error } = await q;
    if (error) toast.error("讀取調整單失敗:" + error.message);
    else setList((data ?? []) as DocRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, dateFrom, dateTo]);

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
          <h1 className="text-2xl font-semibold tracking-tight">庫存調整單</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            手動調整庫存:盤點差異、報廢、樣品出庫等。共 {list.length} 筆。
          </p>
        </div>
        {canWrite && (
          <Button onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            新增調整單
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
            filename="庫存調整"
            columns={[
              { key: "doc_no", label: "單號" },
              { key: "doc_date", label: "日期" },
              { key: "warehouse_id", label: "倉庫", value: (r: Record<string, unknown>) => warehouseMap[(r as { warehouse_id: string | null }).warehouse_id ?? ""] ?? "—" },
              { key: "status", label: "狀態", value: (r: Record<string, unknown>) => DOC_STATUS_LABEL[(r as { status: string }).status] ?? (r as { status: string }).status },
              { key: "notes", label: "備註" },
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
              <TableHead className="w-40">倉庫</TableHead>
              <TableHead className="w-24">狀態</TableHead>
              <TableHead>備註 / 原因</TableHead>
              <TableHead className="w-20 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <Loader2 className="inline h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : list.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  尚無調整單
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
                  <TableCell>
                    {(d.warehouse_id && warehouseMap[d.warehouse_id]) ?? "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={d.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {d.notes ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <VoidDocumentButton
                        docId={d.id}
                        docNo={d.doc_no}
                        status={d.status}
                        module="inventory"
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
            <DialogTitle>
              {editingId ? (list.find((d) => d.id === editingId)?.status === "draft" ? "編輯調整單" : "檢視調整單") : "新增調整單"}
            </DialogTitle>
          </DialogHeader>
          {dialogOpen && (
            <DocumentForm
              docType="inventory_adjust"
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
    </div>
  );
}
