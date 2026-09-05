import { createLazyFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export const Route = createLazyFileRoute("/_app/delivery-rules")({
  component: DeliveryRulesPage,
});
const WEEKDAY_LABEL: Record<number, string> = {
  1: "週一",
  2: "週二",
  3: "週三",
  4: "週四",
  5: "週五",
  6: "週六",
  7: "週日",
};

type Rule = {
  id: string;
  weekday: number;
  city: string | null;
  district: string;
  truck: string;
  vehicle_id: string | null;
};

type Vehicle = { id: string; name: string; is_active: boolean };

type FormState = {
  id: string | null;
  weekday: number;
  city: string;
  district: string;
  truck: string;
  vehicle_id: string | null;
};

const EMPTY: FormState = {
  id: null,
  weekday: 1,
  city: "",
  district: "",
  truck: "大車",
  vehicle_id: null,
};

function DeliveryRulesPage() {
  const { allowed, checking } = usePermissionGuard("/delivery-rules");
  const { profile } = useAuth();
  const companyId = profile?.company_id ?? null;
  const [list, setList] = useState<Rule[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekdayFilter, setWeekdayFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Rule | null>(null);

  const vehicleName = useMemo(() => {
    const m = new Map(vehicles.map((v) => [v.id, v.name]));
    return (id: string | null) => (id ? (m.get(id) ?? "—") : null);
  }, [vehicles]);

  const load = async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    const [{ data: r, error }, { data: v }] = await Promise.all([
      supabase
        .from("delivery_rules")
        .select("id, weekday, city, district, truck, vehicle_id")
        .eq("company_id", profile?.company_id ?? "")
        .order("weekday")
        .order("district"),
      supabase.from("vehicles").select("id, name, is_active").order("name"),
    ]);
    if (error) {
      toast.error("讀取失敗:" + error.message);
    } else {
      setList((r ?? []) as Rule[]);
    }
    setVehicles((v ?? []) as Vehicle[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(
    () =>
      weekdayFilter === "all"
        ? list
        : list.filter((r) => r.weekday === Number(weekdayFilter)),
    [list, weekdayFilter],
  );

  const openCreate = () => {
    setForm(EMPTY);
    setOpen(true);
  };

  const openEdit = (r: Rule) => {
    setForm({
      id: r.id,
      weekday: r.weekday,
      city: r.city ?? "",
      district: r.district,
      truck: r.truck,
      vehicle_id: r.vehicle_id,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.district.trim()) {
      toast.error("地區為必填");
      return;
    }
    setSaving(true);
    const payload = {
      weekday: form.weekday,
      city: form.city.trim() || null,
      district: form.district.trim(),
      truck: form.truck,
      vehicle_id: form.vehicle_id,
      ...(form.id ? {} : { company_id: companyId }),
    };
    const { error } = form.id
      ? await supabase.from("delivery_rules").update(payload).eq("id", form.id)
      : await supabase.from("delivery_rules").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(
        error.message.includes("duplicate")
          ? "儲存失敗:同一星期已有相同地區的規則"
          : "儲存失敗:" + error.message,
      );
      return;
    }
    toast.success("已儲存");
    setOpen(false);
    load();
  };

  const handleDelete = (r: Rule) => {
    setDeleteTarget(r);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase
      .from("delivery_rules")
      .delete()
      .eq("id", deleteTarget.id);
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
          <h1 className="text-2xl font-semibold tracking-tight">配送規則</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            設定「星期 × 地區 → 車型 / 車輛」，訂單建立時依客戶地區自動派車。
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" />
          新增規則
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4 shadow-sm">
        <div className="space-y-1.5">
          <Label className="text-xs">星期</Label>
          <Select value={weekdayFilter} onValueChange={setWeekdayFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              {Object.entries(WEEKDAY_LABEL).map(([v, l]) => (
                <SelectItem key={v} value={v}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="pb-1 text-sm text-muted-foreground">
          共 {filtered.length} 條規則
        </div>
      </div>

      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">星期</TableHead>
              <TableHead className="w-28">縣市</TableHead>
              <TableHead>地區</TableHead>
              <TableHead className="w-24">車型</TableHead>
              <TableHead>指定車輛</TableHead>
              <TableHead className="w-28 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  尚無規則，點右上「新增規則」開始建立。
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{WEEKDAY_LABEL[r.weekday] ?? r.weekday}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.city ?? "—"}
                  </TableCell>
                  <TableCell className="font-medium">{r.district}</TableCell>
                  <TableCell>{r.truck}</TableCell>
                  <TableCell>
                    {r.vehicle_id ? (
                      vehicleName(r.vehicle_id)
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        未指定
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(r)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(r)}>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "編輯規則" : "新增規則"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>星期 *</Label>
                <Select
                  value={String(form.weekday)}
                  onValueChange={(v) =>
                    setForm({ ...form, weekday: Number(v) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(WEEKDAY_LABEL).map(([v, l]) => (
                      <SelectItem key={v} value={v}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>車型 *</Label>
                <Select
                  value={form.truck}
                  onValueChange={(v) => setForm({ ...form, truck: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="大車">大車</SelectItem>
                    <SelectItem value="小車">小車</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>縣市</Label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="彰化縣"
                />
              </div>
              <div className="space-y-1.5">
                <Label>地區 *</Label>
                <Input
                  value={form.district}
                  onChange={(e) =>
                    setForm({ ...form, district: e.target.value })
                  }
                  placeholder="員林"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>指定車輛</Label>
              <Select
                value={form.vehicle_id ?? "none"}
                onValueChange={(v) =>
                  setForm({ ...form, vehicle_id: v === "none" ? null : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="未指定" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">未指定</SelectItem>
                  {vehicles
                    .filter((v) => v.is_active || v.id === form.vehicle_id)
                    .map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                指定後，符合此規則的訂單會自動派給這台車。
              </p>
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
        description={`確定要刪除規則「${deleteTarget ? `${WEEKDAY_LABEL[deleteTarget.weekday]} ${deleteTarget.district} → ${deleteTarget.truck}` : ""}」嗎？`}
        confirmLabel="刪除"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
