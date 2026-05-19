import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Plus, Pencil, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && profile && profile.role !== "admin") {
      navigate({ to: "/" });
    }
  }, [loading, profile, navigate]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile || profile.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShieldAlert className="h-10 w-10 text-warning" />
        <h2 className="mt-3 text-lg font-semibold">權限不足</h2>
        <p className="text-sm text-muted-foreground">
          僅管理員 (admin) 可進入系統設定。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">系統設定</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          管理公司基本資料與倉庫。
        </p>
      </div>

      <Tabs defaultValue="company">
        <TabsList>
          <TabsTrigger value="company">公司資料</TabsTrigger>
          <TabsTrigger value="warehouses">倉庫管理</TabsTrigger>
        </TabsList>
        <TabsContent value="company" className="mt-4">
          <CompanyForm />
        </TabsContent>
        <TabsContent value="warehouses" className="mt-4">
          <WarehousesPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------- 公司資料 ----------

type CompanyRow = {
  id?: string;
  name: string;
  tax_id: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  tax_rate: number | null;
};

function CompanyForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CompanyRow>({
    name: "",
    tax_id: "",
    address: "",
    phone: "",
    email: "",
    tax_rate: 5,
  });

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("company")
        .select("id, name, tax_id, address, phone, email, tax_rate")
        .limit(1)
        .maybeSingle();
      if (error) {
        toast.error("讀取公司資料失敗:" + error.message);
      } else if (data) {
        setForm({
          id: data.id,
          name: data.name ?? "",
          tax_id: data.tax_id ?? "",
          address: data.address ?? "",
          phone: data.phone ?? "",
          email: (data as { email?: string | null }).email ?? "",
          tax_rate:
            (data as { tax_rate?: number | null }).tax_rate ?? 5,
        });
      }
      setLoading(false);
    })();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name: form.name,
      tax_id: form.tax_id,
      address: form.address,
      phone: form.phone,
      email: form.email,
      tax_rate: form.tax_rate,
    };
    const query = form.id
      ? supabase.from("company").update(payload).eq("id", form.id)
      : supabase.from("company").insert(payload);
    const { error } = await query;
    setSaving(false);
    if (error) {
      toast.error("儲存失敗:" + error.message);
    } else {
      toast.success("公司資料已儲存");
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border bg-card p-6 shadow-sm"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="公司名稱" required>
          <Input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
        </Field>
        <Field label="統一編號">
          <Input
            value={form.tax_id ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, tax_id: e.target.value }))
            }
          />
        </Field>
        <Field label="電話">
          <Input
            value={form.phone ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            value={form.email ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
        </Field>
        <Field label="地址" className="md:col-span-2">
          <Input
            value={form.address ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, address: e.target.value }))
            }
          />
        </Field>
        <Field label="稅率 (%)">
          <Input
            type="number"
            min={0}
            max={100}
            step="0.01"
            value={form.tax_rate ?? 0}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                tax_rate: e.target.value === "" ? null : Number(e.target.value),
              }))
            }
          />
        </Field>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          儲存
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={"space-y-1.5 " + (className ?? "")}>
      <Label>
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

// ---------- 倉庫管理 ----------

type Warehouse = {
  id: string;
  code: string;
  name: string;
  address: string | null;
  is_default: boolean;
};

function WarehousesPanel() {
  const [list, setList] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("warehouses")
      .select("id, code, name, address, is_default")
      .order("code", { ascending: true });
    if (error) {
      toast.error("讀取倉庫失敗:" + error.message);
    } else {
      setList((data ?? []) as Warehouse[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing({
      id: "",
      code: "",
      name: "",
      address: "",
      is_default: false,
    });
    setDialogOpen(true);
  };

  const openEdit = (w: Warehouse) => {
    setEditing({ ...w });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          共 {list.length} 個倉庫
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1.5 h-4 w-4" />
          新增倉庫
        </Button>
      </div>

      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">代碼</TableHead>
              <TableHead>名稱</TableHead>
              <TableHead>地址</TableHead>
              <TableHead className="w-24">預設</TableHead>
              <TableHead className="w-20 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <Loader2 className="inline h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : list.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  尚無倉庫,請新增
                </TableCell>
              </TableRow>
            ) : (
              list.map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="font-mono">{w.code}</TableCell>
                  <TableCell className="font-medium">{w.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {w.address || "—"}
                  </TableCell>
                  <TableCell>
                    {w.is_default && (
                      <Badge variant="secondary">預設</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEdit(w)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <WarehouseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        warehouse={editing}
        onSaved={() => {
          setDialogOpen(false);
          load();
        }}
      />
    </div>
  );
}

function WarehouseDialog({
  open,
  onOpenChange,
  warehouse,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  warehouse: Warehouse | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Warehouse | null>(warehouse);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(warehouse);
  }, [warehouse]);

  if (!form) return null;

  const isEdit = Boolean(form.id);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      code: form.code,
      name: form.name,
      address: form.address,
      is_default: form.is_default,
    };
    const query = isEdit
      ? supabase.from("warehouses").update(payload).eq("id", form.id)
      : supabase.from("warehouses").insert(payload);
    const { error } = await query;
    setSaving(false);
    if (error) {
      toast.error("儲存失敗:" + error.message);
      return;
    }
    toast.success(isEdit ? "倉庫已更新" : "倉庫已新增");
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "編輯倉庫" : "新增倉庫"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="代碼" required>
            <Input
              value={form.code}
              onChange={(e) =>
                setForm((f) => f && { ...f, code: e.target.value })
              }
              required
            />
          </Field>
          <Field label="名稱" required>
            <Input
              value={form.name}
              onChange={(e) =>
                setForm((f) => f && { ...f, name: e.target.value })
              }
              required
            />
          </Field>
          <Field label="地址">
            <Input
              value={form.address ?? ""}
              onChange={(e) =>
                setForm((f) => f && { ...f, address: e.target.value })
              }
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={form.is_default}
              onCheckedChange={(v) =>
                setForm((f) => f && { ...f, is_default: Boolean(v) })
              }
            />
            設為預設倉庫
          </label>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              儲存
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Trigger 編譯註:確保 DialogTrigger 引入未被移除
void DialogTrigger;
