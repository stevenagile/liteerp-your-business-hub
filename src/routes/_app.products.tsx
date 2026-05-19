import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Loader2, Plus, Pencil, Search, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { usePermission } from "@/hooks/usePermission";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ImportDialog, type ImportField, type ParsedRow } from "@/components/ImportDialog";

export const Route = createFileRoute("/_app/products")({
  component: ProductsPage,
});

type Product = {
  id: string;
  code: string;
  name: string;
  spec: string | null;
  category: string | null;
  unit: string | null;
  barcode: string | null;
  price1: number | null;
  price2: number | null;
  price3: number | null;
  cost_price: number | null;
  safety_stock: number | null;
  notes: string | null;
  company_id: string | null;
};

function emptyProduct(): Product {
  return {
    id: "",
    code: "",
    name: "",
    spec: "",
    category: "",
    unit: "個",
    barcode: "",
    price1: 0,
    price2: 0,
    price3: 0,
    cost_price: 0,
    safety_stock: 0,
    notes: "",
    company_id: null,
  };
}

function ProductsPage() {
  const canWrite = usePermission("inventory", "write");
  const [list, setList] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select(
        "id, code, name, spec, category, unit, barcode, price1, price2, price3, cost_price, safety_stock, notes, company_id",
      )
      .order("code", { ascending: true });
    if (error) {
      toast.error("讀取產品失敗:" + error.message);
    } else {
      setList((data ?? []) as Product[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return list;
    return list.filter(
      (p) =>
        p.name?.toLowerCase().includes(kw) ||
        p.code?.toLowerCase().includes(kw),
    );
  }, [list, keyword]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">產品</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            管理銷售與庫存品項。
          </p>
        </div>
        {canWrite && (
          <Button
            onClick={() => {
              setEditing(emptyProduct());
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            新增
          </Button>
        )}
      </div>

      <div className="flex justify-end">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜尋名稱或編號"
            className="pl-8"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">編號</TableHead>
              <TableHead>名稱</TableHead>
              <TableHead>規格</TableHead>
              <TableHead className="w-20">單位</TableHead>
              <TableHead className="w-24 text-right">售價</TableHead>
              <TableHead className="w-24 text-right">成本</TableHead>
              <TableHead className="w-24 text-right">安全存量</TableHead>
              {canWrite && (
                <TableHead className="w-20 text-right">操作</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={canWrite ? 8 : 7}
                  className="h-24 text-center"
                >
                  <Loader2 className="inline h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canWrite ? 8 : 7}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  尚無資料
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono">{p.code}</TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.spec || "—"}
                  </TableCell>
                  <TableCell>{p.unit || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {p.price1 != null ? Number(p.price1).toLocaleString() : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {p.cost_price != null
                      ? Number(p.cost_price).toLocaleString()
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {p.safety_stock ?? "—"}
                  </TableCell>
                  {canWrite && (
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditing(p);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={editing}
        onSaved={() => {
          setDialogOpen(false);
          load();
        }}
      />
    </div>
  );
}

function ProductDialog({
  open,
  onOpenChange,
  product,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  product: Product | null;
  onSaved: () => void;
}) {
  const { profile } = useAuth();
  const [form, setForm] = useState<Product | null>(product);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(product);
  }, [product]);

  if (!form) return null;
  const isEdit = Boolean(form.id);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      code: form.code,
      name: form.name,
      spec: form.spec || null,
      category: form.category || null,
      unit: form.unit || "個",
      barcode: form.barcode || null,
      price1: form.price1 ?? 0,
      price2: form.price2 ?? 0,
      price3: form.price3 ?? 0,
      cost_price: form.cost_price ?? 0,
      safety_stock: form.safety_stock ?? 0,
      notes: form.notes || null,
      ...(isEdit ? {} : { company_id: profile?.company_id ?? null }),
    };
    const query = isEdit
      ? supabase.from("products").update(payload).eq("id", form.id)
      : supabase.from("products").insert(payload);
    const { error } = await query;
    setSaving(false);
    if (error) {
      toast.error("儲存失敗:" + error.message);
      return;
    }
    toast.success(isEdit ? "已更新" : "已新增");
    onSaved();
  };

  const numField = (
    key: "price1" | "price2" | "price3" | "cost_price" | "safety_stock",
    label: string,
  ) => (
    <Field label={label}>
      <Input
        type="number"
        min={0}
        step="0.01"
        value={form[key] ?? 0}
        onChange={(e) =>
          setForm(
            (f) =>
              f && {
                ...f,
                [key]: e.target.value === "" ? null : Number(e.target.value),
              },
          )
        }
      />
    </Field>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "編輯產品" : "新增產品"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="編號" required>
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
            <Field label="規格">
              <Input
                value={form.spec ?? ""}
                onChange={(e) =>
                  setForm((f) => f && { ...f, spec: e.target.value })
                }
              />
            </Field>
            <Field label="分類">
              <Input
                value={form.category ?? ""}
                onChange={(e) =>
                  setForm((f) => f && { ...f, category: e.target.value })
                }
              />
            </Field>
            <Field label="單位">
              <Input
                value={form.unit ?? ""}
                onChange={(e) =>
                  setForm((f) => f && { ...f, unit: e.target.value })
                }
              />
            </Field>
            <Field label="條碼">
              <Input
                value={form.barcode ?? ""}
                onChange={(e) =>
                  setForm((f) => f && { ...f, barcode: e.target.value })
                }
              />
            </Field>
            {numField("price1", "售價 (一般)")}
            {numField("price2", "售價 (經銷)")}
            {numField("price3", "售價 (VIP)")}
            {numField("cost_price", "成本")}
            {numField("safety_stock", "安全存量")}
            <Field label="備註" className="md:col-span-2">
              <Input
                value={form.notes ?? ""}
                onChange={(e) =>
                  setForm((f) => f && { ...f, notes: e.target.value })
                }
              />
            </Field>
          </div>
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

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
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
