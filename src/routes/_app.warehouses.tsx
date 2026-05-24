import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_app/warehouses")({
  component: WarehousesPage,
});

type Warehouse = {
  id: string;
  code: string;
  name: string;
  address: string | null;
  is_default: boolean;
  is_active: boolean;
};

type FormState = {
  id: string | null;
  code: string;
  name: string;
  address: string;
  is_default: boolean;
  is_active: boolean;
};

const EMPTY: FormState = {
  id: null,
  code: "",
  name: "",
  address: "",
  is_default: false,
  is_active: true,
};

function WarehousesPage() {
  const { profile } = useAuth();
  const companyId = profile?.company_id ?? null;
  const [list, setList] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!companyId) {
      setList([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("warehouses")
      .select("id, code, name, address, is_default, is_active")
      .eq("company_id", companyId)
      .order("code");
    if (error) {
      toast.error("讀取失敗:" + error.message);
    } else {
      setList((data ?? []) as Warehouse[]);
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

  const openEdit = (w: Warehouse) => {
    setForm({
      id: w.id,
      code: w.code,
      name: w.name,
      address: w.address ?? "",
      is_default: w.is_default,
      is_active: w.is_active,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!companyId) {
      toast.error("找不到公司資料，請重新登入");
      return;
    }
    if (!form.code.trim() || !form.name.trim()) {
      toast.error("編號與名稱為必填");
      return;
    }
    setSaving(true);
    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      address: form.address.trim() || null,
      is_default: form.is_default,
      is_active: form.is_active,
      company_id: companyId,
    };
    const { error } = form.id
      ? await supabase
          .from("warehouses")
          .update(payload)
          .eq("id", form.id)
          .eq("company_id", companyId)
      : await supabase.from("warehouses").insert(payload);
    setSaving(false);
    if (error) {
      toast.error("儲存失敗:" + error.message);
      return;
    }
    toast.success("已儲存");
    setOpen(false);
    load();
  };

  const handleDelete = async (w: Warehouse) => {
    if (!companyId) return;
    if (!confirm(`確定要刪除倉庫「${w.name}」嗎？`)) return;
    const { error } = await supabase
      .from("warehouses")
      .delete()
      .eq("id", w.id)
      .eq("company_id", companyId);
    if (error) {
      toast.error("刪除失敗:" + error.message);
      return;
    }
    toast.success("已刪除");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">倉庫管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            管理庫存所在倉庫，可設定一個預設倉。
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" />
          新增倉庫
        </Button>
      </div>

      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">編號</TableHead>
              <TableHead>名稱</TableHead>
              <TableHead>地址</TableHead>
              <TableHead className="w-24 text-center">預設倉</TableHead>
              <TableHead className="w-24 text-center">啟用</TableHead>
              <TableHead className="w-32 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : list.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  尚無倉庫資料，點右上「新增倉庫」開始建立。
                </TableCell>
              </TableRow>
            ) : (
              list.map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="font-mono">{w.code}</TableCell>
                  <TableCell>{w.name}</TableCell>
                  <TableCell className="text-muted-foreground">{w.address ?? "—"}</TableCell>
                  <TableCell className="text-center">
                    {w.is_default ? (
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                        預設
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {w.is_active ? (
                      <span className="text-xs text-success">啟用</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">停用</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(w)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(w)}>
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
            <DialogTitle>{form.id ? "編輯倉庫" : "新增倉庫"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>編號 *</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="WH01"
                />
              </div>
              <div className="space-y-1.5">
                <Label>名稱 *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="主倉"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>地址</Label>
              <Textarea
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                rows={2}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label>預設倉庫</Label>
                <p className="text-xs text-muted-foreground">設為預設後，建立單據時自動帶入此倉。</p>
              </div>
              <Switch
                checked={form.is_default}
                onCheckedChange={(v) => setForm({ ...form, is_default: v })}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label>啟用</Label>
                <p className="text-xs text-muted-foreground">停用後不會出現在單據的倉庫選擇中。</p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              儲存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
