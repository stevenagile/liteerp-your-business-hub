import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Loader2,
  Plus,
  Pencil,
  Search,
  Upload,
  Leaf,
  Thermometer,
  CalendarDays,
  MapPin,
  Package,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { usePermission } from "@/hooks/usePermission";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { ImportDialog, type ImportField } from "@/components/ImportDialog";
import { ExportExcelButton } from "@/components/ExportExcelButton";

export const Route = createFileRoute("/_app/foods")({
  component: FoodsPage,
});

/* ═══════════════════════════════════════════
   食品業暖色系 Token（僅此頁面使用，不污染全局）
   ═══════════════════════════════════════════ */
const FOOD_TOKENS = {
  bg: "#FDF8F3",
  bgWarm: "#FAF3EB",
  card: "#FFFFFF",
  text: "#3D2C1F",
  textMuted: "#7A6555",
  primary: "#C67D4B",
  primarySoft: "#E8A87C",
  primaryBg: "#F5E6D9",
  accentGreen: "#6B9B5C",
  accentGreenBg: "#E2F0DC",
  accentRed: "#C45C4A",
  accentRedBg: "#F5DDD9",
  accentYellow: "#D4A030",
  accentYellowBg: "#FDF0D5",
  border: "#E8DDD0",
  borderLight: "#F2EAE3",
} as const;

type FoodProduct = {
  id: string;
  code: string;
  name: string;
  spec: string | null;
  category: string | null;
  unit: string | null;
  barcode: string | null;
  price1: number | null;
  cost_price: number | null;
  safety_stock: number | null;
  notes: string | null;
  company_id: string | null;
  // 食品專屬欄位（儲存在 product_extra 或利用 notes/spec 欄位存 JSON）
  expiry_days?: number | null;
  origin?: string | null;
  storage_method?: string | null;
  halal?: boolean;
  organic?: boolean;
};

function emptyFood(): FoodProduct {
  return {
    id: "",
    code: "",
    name: "",
    spec: "",
    category: "",
    unit: "個",
    barcode: "",
    price1: 0,
    cost_price: 0,
    safety_stock: 0,
    notes: "",
    company_id: null,
    expiry_days: null,
    origin: "",
    storage_method: "常溫",
    halal: false,
    organic: false,
  };
}

/* ═══════════════════════════════════════════
   嘗試從 product_extra JSON 解析食品欄位
   ═══════════════════════════════════════════ */
function parseExtra(p: Record<string, unknown>): Partial<FoodProduct> {
  const extra =
    typeof p.notes === "string" && p.notes.startsWith("{");
  if (!extra) return {};
  try {
    const obj = JSON.parse(p.notes);
    return {
      expiry_days: typeof obj.expiry_days === "number" ? obj.expiry_days : null,
      origin: obj.origin ?? null,
      storage_method: obj.storage_method ?? null,
      halal: Boolean(obj.halal),
      organic: Boolean(obj.organic),
    };
  } catch {
    return {};
  }
}

function buildExtraString(f: FoodProduct): string {
  const payload = {
    expiry_days: f.expiry_days,
    origin: f.origin,
    storage_method: f.storage_method,
    halal: f.halal,
    organic: f.organic,
  };
  return JSON.stringify(payload);
}

/* ═══════════════════════════════════════════
   小元件
   ═══════════════════════════════════════════ */
function FoodBadge({
  label,
  color,
  bg,
  icon: Icon,
}: {
  label: string;
  color: string;
  bg: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ color, backgroundColor: bg }}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {label}
    </span>
  );
}

function FoodsPage() {
  const { profile } = useAuth();
  const companyId = profile?.company_id ?? null;
  const canWrite = usePermission("inventory", "write");

  const [list, setList] = useState<FoodProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [editing, setEditing] = useState<FoodProduct | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const load = async () => {
    if (!companyId) {
      setList([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select(
        "id, code, name, spec, category, unit, barcode, price1, cost_price, safety_stock, notes, company_id",
      )
      .eq("company_id", companyId)
      .order("code", { ascending: true });
    if (error) {
      toast.error("讀取食品資料失敗：" + error.message);
    } else {
      const mapped = (data ?? []).map((d) => ({
        ...(d as unknown as Record<string, unknown>),
        ...parseExtra(d as unknown as Record<string, unknown>),
      })) as unknown as FoodProduct[];
      setList(mapped);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [companyId]);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return list;
    return list.filter(
      (p) =>
        p.name?.toLowerCase().includes(kw) ||
        p.code?.toLowerCase().includes(kw) ||
        p.origin?.toLowerCase().includes(kw),
    );
  }, [list, keyword]);

  // 統計卡片
  const stats = useMemo(() => {
    const total = list.length;
    const organic = list.filter((f) => f.organic).length;
    const halal = list.filter((f) => f.halal).length;
    const lowStock = list.filter(
      (f) =>
        f.safety_stock != null && f.safety_stock > 0,
    ).length; // 簡化：僅計算有設定安全存量的
    return { total, organic, halal, lowStock };
  }, [list]);

  return (
    <div
      className="space-y-6"
      style={{
        backgroundColor: FOOD_TOKENS.bg,
        borderRadius: "1rem",
        padding: "1.5rem",
      }}
    >
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Leaf
              className="h-6 w-6"
              style={{ color: FOOD_TOKENS.accentGreen }}
            />
            <h1
              className="text-2xl font-semibold tracking-tight"
              style={{ color: FOOD_TOKENS.text }}
            >
              食品管理
            </h1>
          </div>
          <p className="mt-1 text-sm" style={{ color: FOOD_TOKENS.textMuted }}>
            管理食品類產品、有效期限與保存條件。
          </p>
        </div>
        <div className="flex gap-2">
          <ExportExcelButton
            rows={filtered as unknown as Record<string, unknown>[]}
            filename="食品清單"
            columns={[
              { key: "code", label: "編號" },
              { key: "name", label: "名稱" },
              { key: "spec", label: "規格" },
              { key: "category", label: "分類" },
              { key: "unit", label: "單位" },
              { key: "barcode", label: "條碼" },
              { key: "origin", label: "產地" },
              { key: "expiry_days", label: "有效天數", type: "number" },
              { key: "storage_method", label: "保存方式" },
              { key: "price1", label: "售價", type: "number" },
              { key: "cost_price", label: "成本", type: "number" },
            ]}
          />
          {canWrite && (
            <>
              <Button
                variant="outline"
                onClick={() => setImportOpen(true)}
                style={{
                  borderColor: FOOD_TOKENS.border,
                  color: FOOD_TOKENS.primary,
                  backgroundColor: FOOD_TOKENS.card,
                }}
              >
                <Upload className="mr-1.5 h-4 w-4" />
                匯入
              </Button>
              <Button
                onClick={() => {
                  setEditing(emptyFood());
                  setDialogOpen(true);
                }}
                style={{
                  backgroundColor: FOOD_TOKENS.primary,
                  color: "#FFF",
                }}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                新增食品
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── 統計卡片 ── */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          {
            label: "食品品項",
            value: stats.total,
            icon: Package,
            color: FOOD_TOKENS.primary,
            bg: FOOD_TOKENS.primaryBg,
          },
          {
            label: "有機認證",
            value: stats.organic,
            icon: Leaf,
            color: FOOD_TOKENS.accentGreen,
            bg: FOOD_TOKENS.accentGreenBg,
          },
          {
            label: "清真認證",
            value: stats.halal,
            icon: Package,
            color: FOOD_TOKENS.accentYellow,
            bg: FOOD_TOKENS.accentYellowBg,
          },
          {
            label: "需關注庫存",
            value: stats.lowStock,
            icon: AlertTriangle,
            color: FOOD_TOKENS.accentRed,
            bg: FOOD_TOKENS.accentRedBg,
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border p-4"
            style={{
              backgroundColor: FOOD_TOKENS.card,
              borderColor: FOOD_TOKENS.borderLight,
            }}
          >
            <div className="flex items-center gap-2">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ backgroundColor: s.bg, color: s.color }}
              >
                <s.icon className="h-4 w-4" />
              </div>
              <span
                className="text-sm font-medium"
                style={{ color: FOOD_TOKENS.textMuted }}
              >
                {s.label}
              </span>
            </div>
            <div
              className="mt-2 text-2xl font-bold"
              style={{ color: FOOD_TOKENS.text }}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── 搜尋 ── */}
      <div className="flex justify-end">
        <div className="relative w-full sm:w-80">
          <Search
            className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: FOOD_TOKENS.textMuted }}
          />
          <Input
            placeholder="搜尋名稱、編號或產地"
            className="pl-8"
            style={{
              backgroundColor: FOOD_TOKENS.card,
              borderColor: FOOD_TOKENS.border,
              color: FOOD_TOKENS.text,
            }}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>
      </div>

      {/* ── 表格 ── */}
      <div
        className="rounded-xl border shadow-sm"
        style={{
          backgroundColor: FOOD_TOKENS.card,
          borderColor: FOOD_TOKENS.border,
        }}
      >
        <Table>
          <TableHeader>
            <TableRow style={{ borderBottomColor: FOOD_TOKENS.border }}>
              <TableHead className="w-28">編號</TableHead>
              <TableHead>名稱</TableHead>
              <TableHead className="w-24">產地</TableHead>
              <TableHead className="w-24">保存方式</TableHead>
              <TableHead className="w-20 text-center">有效天數</TableHead>
              <TableHead className="w-24">單位</TableHead>
              <TableHead className="w-24 text-right">售價</TableHead>
              <TableHead className="w-36">標籤</TableHead>
              {canWrite && (
                <TableHead className="w-20 text-right">操作</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={canWrite ? 9 : 8}
                  className="h-24 text-center"
                >
                  <Loader2
                    className="inline h-5 w-5 animate-spin"
                    style={{ color: FOOD_TOKENS.textMuted }}
                  />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canWrite ? 9 : 8}
                  className="h-24 text-center text-sm"
                  style={{ color: FOOD_TOKENS.textMuted }}
                >
                  尚無食品資料
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => (
                <TableRow
                  key={p.id}
                  style={{ borderBottomColor: FOOD_TOKENS.borderLight }}
                >
                  <TableCell
                    className="font-mono text-xs"
                    style={{ color: FOOD_TOKENS.textMuted }}
                  >
                    {p.code}
                  </TableCell>
                  <TableCell
                    className="font-medium"
                    style={{ color: FOOD_TOKENS.text }}
                  >
                    {p.name}
                  </TableCell>
                  <TableCell style={{ color: FOOD_TOKENS.textMuted }}>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {p.origin || "—"}
                    </div>
                  </TableCell>
                  <TableCell style={{ color: FOOD_TOKENS.textMuted }}>
                    <div className="flex items-center gap-1">
                      <Thermometer className="h-3 w-3" />
                      {p.storage_method || "—"}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {p.expiry_days != null ? (
                      <div className="flex items-center justify-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        <span>{p.expiry_days} 天</span>
                      </div>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell style={{ color: FOOD_TOKENS.textMuted }}>
                    {p.unit || "—"}
                  </TableCell>
                  <TableCell
                    className="text-right tabular-nums"
                    style={{ color: FOOD_TOKENS.text }}
                  >
                    {p.price1 != null
                      ? Number(p.price1).toLocaleString()
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {p.organic && (
                        <FoodBadge
                          label="有機"
                          color={FOOD_TOKENS.accentGreen}
                          bg={FOOD_TOKENS.accentGreenBg}
                          icon={Leaf}
                        />
                      )}
                      {p.halal && (
                        <FoodBadge
                          label="清真"
                          color={FOOD_TOKENS.accentYellow}
                          bg={FOOD_TOKENS.accentYellowBg}
                        />
                      )}
                      {p.expiry_days != null && p.expiry_days <= 7 && (
                        <FoodBadge
                          label="短效期"
                          color={FOOD_TOKENS.accentRed}
                          bg={FOOD_TOKENS.accentRedBg}
                          icon={AlertTriangle}
                        />
                      )}
                      {!p.organic && !p.halal && p.expiry_days != null && p.expiry_days > 7 && (
                        <span
                          className="text-xs"
                          style={{ color: FOOD_TOKENS.textMuted }}
                        >
                          —
                        </span>
                      )}
                    </div>
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

      {/* ── Dialog ── */}
      <FoodDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={editing}
        onSaved={() => {
          setDialogOpen(false);
          load();
        }}
      />

      {/* ── Import ── */}
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="匯入食品"
        templateFileName="foods_template.csv"
        fields={FOOD_IMPORT_FIELDS}
        validateRows={async (parsedRows) => {
          const codes = parsedRows
            .map((r) => String(r.data.code ?? "").trim())
            .filter(Boolean);
          const seen = new Map<string, number>();
          const dupInFile = new Set<string>();
          codes.forEach((c) => {
            const n = (seen.get(c) ?? 0) + 1;
            seen.set(c, n);
            if (n > 1) dupInFile.add(c);
          });
          let existing = new Set<string>();
          if (codes.length > 0 && companyId) {
            const { data } = await supabase
              .from("products")
              .select("code")
              .eq("company_id", companyId)
              .in("code", codes);
            existing = new Set(
              (data ?? []).map((d: { code: string }) => d.code),
            );
          }
          return parsedRows.map((r) => {
            const code = String(r.data.code ?? "").trim();
            const errs = [...r.errors];
            if (code && dupInFile.has(code))
              errs.push("檔案內 code 重複");
            if (code && existing.has(code)) errs.push("code 已存在");
            return { ...r, errors: errs };
          });
        }}
        onImport={async (validRows) => {
          if (!companyId)
            return {
              success: 0,
              failed: validRows.length,
              errors: ["找不到公司"],
            };
          const payload = validRows.map((r) => {
            const f = r.data as unknown as FoodProduct;
            return {
              ...r.data,
              company_id: companyId,
              notes: buildExtraString(f),
            };
          });
          const { error } = await supabase.from("products").insert(payload);
          if (error)
            return {
              success: 0,
              failed: validRows.length,
              errors: [error.message],
            };
          return { success: validRows.length, failed: 0 };
        }}
        onImported={load}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════
   Dialog 元件
   ═══════════════════════════════════════════ */
function FoodDialog({
  open,
  onOpenChange,
  product,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  product: FoodProduct | null;
  onSaved: () => void;
}) {
  const { profile } = useAuth();
  const [form, setForm] = useState<FoodProduct | null>(product);
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
      category: form.category || "食品",
      unit: form.unit || "個",
      barcode: form.barcode || null,
      price1: form.price1 ?? 0,
      price2: 0,
      price3: 0,
      cost_price: form.cost_price ?? 0,
      safety_stock: form.safety_stock ?? 0,
      notes: buildExtraString(form),
      ...(isEdit ? {} : { company_id: profile?.company_id ?? null }),
    };
    if (!profile?.company_id) {
      setSaving(false);
      toast.error("找不到公司");
      return;
    }
    const query = isEdit
      ? supabase
          .from("products")
          .update(payload)
          .eq("id", form.id)
          .eq("company_id", profile.company_id)
      : supabase.from("products").insert(payload);
    const { error } = await query;
    setSaving(false);
    if (error) {
      toast.error("儲存失敗：" + error.message);
      return;
    }
    toast.success(isEdit ? "已更新食品資料" : "已新增食品");
    onSaved();
  };

  const numField = (
    key: "price1" | "cost_price" | "safety_stock" | "expiry_days",
    label: string,
  ) => (
    <Field label={label}>
      <Input
        type="number"
        min={0}
        step="1"
        value={form[key] ?? 0}
        onChange={(e) =>
          setForm(
            (f) =>
              f && {
                ...f,
                [key]:
                  e.target.value === "" ? null : Number(e.target.value),
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
          <DialogTitle
            style={{ color: FOOD_TOKENS.text }}
          >
            {isEdit ? "編輯食品" : "新增食品"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 基本資料 */}
          <div
            className="rounded-lg border p-3 space-y-3"
            style={{
              backgroundColor: FOOD_TOKENS.bgWarm,
              borderColor: FOOD_TOKENS.border,
            }}
          >
            <div className="text-sm font-semibold" style={{ color: FOOD_TOKENS.primary }}>
              基本資料
            </div>
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
                  value={form.category ?? "食品"}
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
              {numField("price1", "售價")}
              {numField("cost_price", "成本")}
              {numField("safety_stock", "安全存量")}
            </div>
          </div>

          {/* 食品專屬 */}
          <div
            className="rounded-lg border p-3 space-y-3"
            style={{
              backgroundColor: FOOD_TOKENS.accentGreenBg,
              borderColor: FOOD_TOKENS.border,
            }}
          >
            <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: FOOD_TOKENS.accentGreen }}>
              <Leaf className="h-4 w-4" />
              食品專屬資訊
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="產地">
                <Input
                  value={form.origin ?? ""}
                  placeholder="例如：台灣雲林"
                  onChange={(e) =>
                    setForm((f) => f && { ...f, origin: e.target.value })
                  }
                />
              </Field>
              {numField("expiry_days", "有效天數")}
              <Field label="保存方式">
                <Input
                  value={form.storage_method ?? "常溫"}
                  placeholder="常溫 / 冷藏 / 冷凍"
                  onChange={(e) =>
                    setForm(
                      (f) => f && { ...f, storage_method: e.target.value },
                    )
                  }
                />
              </Field>
              <div className="flex items-center gap-6 pt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.organic}
                    onChange={(e) =>
                      setForm(
                        (f) => f && { ...f, organic: e.target.checked },
                      )
                    }
                    className="h-4 w-4 rounded border"
                    style={{ accentColor: FOOD_TOKENS.accentGreen }}
                  />
                  <span className="text-sm">有機認證</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.halal}
                    onChange={(e) =>
                      setForm(
                        (f) => f && { ...f, halal: e.target.checked },
                      )
                    }
                    className="h-4 w-4 rounded border"
                  />
                  <span className="text-sm">清真認證</span>
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={saving}
              style={{
                backgroundColor: FOOD_TOKENS.primary,
                color: "#FFF",
              }}
            >
              {saving && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
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
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </Label>
      {children}
    </div>
  );
}

const FOOD_IMPORT_FIELDS: ImportField[] = [
  { key: "code", label: "產品編號", required: true, example: "F0001" },
  { key: "name", label: "品名", required: true, example: "有機糙米" },
  { key: "spec", label: "規格", example: "1kg/包" },
  { key: "category", label: "分類", default: "食品", example: "穀類" },
  { key: "unit", label: "單位", default: "包", example: "包" },
  { key: "barcode", label: "條碼" },
  { key: "origin", label: "產地", example: "台灣雲林" },
  { key: "expiry_days", label: "有效天數", type: "number", example: 180 },
  { key: "storage_method", label: "保存方式", default: "常溫", example: "冷藏" },
  { key: "price1", label: "售價", type: "number", default: 0, example: 120 },
  { key: "cost_price", label: "成本價", type: "number", default: 0, example: 80 },
  { key: "safety_stock", label: "安全庫存", type: "number", default: 0, example: 20 },
];
