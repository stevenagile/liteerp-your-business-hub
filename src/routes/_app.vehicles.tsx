import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_app/vehicles")({
  component: VehiclesPage,
});

const WEEKDAYS = [
  { value: 1, label: "一" },
  { value: 2, label: "二" },
  { value: 3, label: "三" },
  { value: 4, label: "四" },
  { value: 5, label: "五" },
  { value: 6, label: "六" },
  { value: 7, label: "日" },
];

type Vehicle = {
  id: string;
  name: string;
  plate_no: string | null;
  truck_type: string | null;
  delivery_days: number[] | null;
  capacity: string | null;
  driver_name: string | null;
  is_active: boolean;
  note: string | null;
};

type FormState = {
  id: string | null;
  name: string;
  plate_no: string;
  truck_type: string;
  delivery_days: number[];
  capacity: string;
  driver_name: string;
  is_active: boolean;
  note: string;
};

const EMPTY: FormState = {
  id: null,
  name: "",
  plate_no: "",
  truck_type: "",
  delivery_days: [],
  capacity: "",
  driver_name: "",
  is_active: true,
  note: "",
};

function formatDays(days: number[] | null): string {
  if (!days || days.length === 0) return "—";
  return [...days]
    .sort((a, b) => a - b)
    .map((d) => WEEKDAYS.find((w) => w.value === d)?.label ?? String(d))
    .join("、");
}

function VehiclesPage() {
  const { allowed, checking } = usePermissionGuard("/vehicles");
  const { profile } = useAuth();
  const companyId = profile?.company_id ?? null;
  const [list, setList] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null);

  const load = async () => {
    if (!companyId) {
      setList([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("vehicles")
      .select(
        "id, name, plate_no, truck_type, delivery_days, capacity, driver_name, is_active, note",
      )
      .eq("company_id", companyId)
      .order("name");
    if (error) {
      toast.error("讀取失敗:" + error.message);
    } else {
      setList((data ?? []) as Vehicle[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const openCreate = () => {
    setForm(EMPTY);
    setOpen(true);
  };

  const openEdit = (v: Vehicle) => {
    setForm({
      id: v.id,
      name: v.name,
      plate_no: v.plate_no ?? "",
      truck_type: v.truck_type ?? "",
      delivery_days: v.delivery_days ?? [],
      capacity: v.capacity ?? "",
      driver_name: v.driver_name ?? "",
      is_active: v.is_active,
      note: v.note ?? "",
    });
    setOpen(true);
  };

  const toggleDay = (d: number) => {
    setForm((f) => ({
      ...f,
      delivery_days: f.delivery_days.includes(d)
        ? f.delivery_days.filter((x) => x !== d)
        : [...f.delivery_days, d].sort((a, b) => a - b),
    }));
  };

  const handleSave = async () => {
    if (!companyId) {
      toast.error("找不到公司資料，請重新登入");
      return;
    }
    if (!form.name.trim()) {
      toast.error("車輛名稱為必填");
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      plate_no: form.plate_no.trim() || null,
      truck_type: form.truck_type || null,
      delivery_days: form.delivery_days.length > 0 ? form.delivery_days : null,
      capacity: form.capacity.trim() || null,
      driver_name: form.driver_name.trim() || null,
      is_active: form.is_active,
      note: form.note.trim() || null,
      company_id: companyId,
    };
    const { error } = form.id
      ? await supabase
          .from("vehicles")
          .update(payload)
          .eq("id", form.id)
          .eq("company_id", companyId)
      : await supabase.from("vehicles").insert(payload);
    setSaving(false);
    if (error) {
      toast.error("儲存失敗:" + error.message);
      return;
    }
    toast.success("已儲存");
    setOpen(false);
    load();
  };

  const handleDelete = (v: Vehicle) => {
    if (!companyId) return;
    setDeleteTarget(v);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!companyId || !deleteTarget) return;
    const { error } = await supabase
      .from("vehicles")
      .delete()
      .eq("id", deleteTarget.id)
      .eq("company_id", companyId);
    if (error) {
      toast.error("刪除失敗:" + error.message);
      return;
    }
    toast.success("已刪除");
    load();
  };

  if (checking) return <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (!allowed) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">車輛管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            維護配送車輛與固定配送星期，配送規則可將地區綁定到指定車輛。
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" />
          新增車輛
        </Button>
      </div>

      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>車輛名稱</TableHead>
              <TableHead className="w-32">車牌</TableHead>
              <TableHead className="w-24">車型</TableHead>
              <TableHead>固定配送星期</TableHead>
              <TableHead className="w-28">司機</TableHead>
              <TableHead className="w-20 text-center">啟用</TableHead>
              <TableHead className="w-28 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : list.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  尚無車輛資料，點右上「新增車輛」開始建立。
                </TableCell>
              </TableRow>
            ) : (
              list.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.name}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {v.plate_no ?? "—"}
                  </TableCell>
                  <TableCell>{v.truck_type ?? "—"}</TableCell>
                  <TableCell className="text-sm">
                    {formatDays(v.delivery_days)}
                  </TableCell>
                  <TableCell>{v.driver_name ?? "—"}</TableCell>
                  <TableCell className="text-center">
                    {v.is_active ? (
                      <span className="text-xs text-success">啟用</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">停用</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(v)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(v)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "編輯車輛" : "新增車輛"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>車輛名稱 *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="大車-A"
                />
              </div>
              <div className="space-y-1.5">
                <Label>車牌</Label>
                <Input
                  value={form.plate_no}
                  onChange={(e) => setForm({ ...form, plate_no: e.target.value })}
                  placeholder="ABC-1234"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>車型</Label>
                <Select
                  value={form.truck_type || "none"}
                  onValueChange={(v) =>
                    setForm({ ...form, truck_type: v === "none" ? "" : v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="選擇車型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">未指定</SelectItem>
                    <SelectItem value="大車">大車</SelectItem>
                    <SelectItem value="小車">小車</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>司機</Label>
                <Input
                  value={form.driver_name}
                  onChange={(e) =>
                    setForm({ ...form, driver_name: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>固定配送星期</Label>
              <div className="flex gap-1.5">
                {WEEKDAYS.map((w) => {
                  const active = form.delivery_days.includes(w.value);
                  return (
                    <button
                      key={w.value}
                      type="button"
                      onClick={() => toggleDay(w.value)}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-md border text-sm transition-colors",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "bg-background text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {w.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                手動指派此車時，系統會依這些星期自動算預計配送日。
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>載量</Label>
              <Input
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                placeholder="例：3.5 噸 / 120 箱"
              />
            </div>
            <div className="space-y-1.5">
              <Label>備註</Label>
              <Textarea
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                rows={2}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label>啟用</Label>
                <p className="text-xs text-muted-foreground">
                  停用後不會出現在訂單的派車選擇中。
                </p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              儲存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="確認刪除"
        description={`確定要刪除車輛「${deleteTarget?.name}」嗎？已派車的訂單會保留但車輛欄位將清空。`}
        confirmLabel="刪除"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
