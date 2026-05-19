import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Plus, Trash2, Printer } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { usePermission } from "@/hooks/usePermission";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { SearchSelect, type SearchOption } from "@/components/SearchSelect";
import { VoidDocumentButton } from "@/components/VoidDocumentButton";

export type DocType =
  | "quotation"
  | "sales_order"
  | "sales_invoice"
  | "sales_return"
  | "purchase_order"
  | "purchase_receipt"
  | "inventory_adjust";

const PURCHASE_TYPES: DocType[] = ["purchase_order", "purchase_receipt"];
const isPurchaseType = (t: DocType) => PURCHASE_TYPES.includes(t);
const isAdjustType = (t: DocType) => t === "inventory_adjust";

export type DocLine = {
  id?: string;
  line_no?: number;
  product_id: string | null;
  product_code: string | null;
  product_name: string | null;
  unit: string | null;
  quantity: number;
  unit_price: number;
  discount_pct: number;
  // 銷貨單確認後由後端寫入的成本快照
  unit_cost?: number | null;
  gross_profit?: number | null;
  margin_pct?: number | null;
};

export type DocHeader = {
  id: string;
  doc_type: DocType;
  doc_no: string | null;
  doc_date: string; // yyyy-MM-dd
  contact_id: string | null;
  contact_name: string | null;
  warehouse_id: string | null;
  status: string;
  notes: string | null;
  company_id: string | null;
  sales_person_id: string | null;
  void_reason?: string | null;
  voided_at?: string | null;
};

export function emptyHeader(doc_type: DocType): DocHeader {
  return {
    id: "",
    doc_type,
    doc_no: null,
    doc_date: format(new Date(), "yyyy-MM-dd"),
    contact_id: null,
    contact_name: null,
    warehouse_id: null,
    status: "draft",
    notes: "",
    company_id: null,
    sales_person_id: null,
  };
}

export function emptyLine(): DocLine {
  return {
    product_id: null,
    product_code: null,
    product_name: null,
    unit: null,
    quantity: 1,
    unit_price: 0,
    discount_pct: 0,
  };
}

type Contact = {
  id: string;
  code: string;
  name: string;
  type: string;
  price_level: number | null;
};
type Product = {
  id: string;
  code: string;
  name: string;
  unit: string | null;
  price1: number | null;
  price2: number | null;
  price3: number | null;
  cost_price: number | null;
};
type Warehouse = {
  id: string;
  code: string;
  name: string;
  is_default: boolean | null;
};

type Props = {
  docType: DocType;
  docId?: string | null;
  onSaved?: () => void;
  onCancel?: () => void;
  /** 單據在 Dialog 內被異動（如確認）但 Dialog 保持開啟時呼叫，讓父層列表重新查詢 */
  onChanged?: () => void;
};

export function DocumentForm({ docType, docId, onSaved, onCancel, onChanged }: Props) {
  const { profile, user } = useAuth();
  const isPurchase = isPurchaseType(docType);
  const isAdjust = isAdjustType(docType);
  const permModule = isAdjust ? "inventory" : isPurchase ? "purchase" : "sales";
  const partyLabel = isPurchase ? "廠商" : "客戶";
  const canWrite = usePermission(permModule, "write");
  const canConfirm = usePermission(permModule, "confirm");
  const voidModule = permModule as "sales" | "purchase" | "inventory";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const [header, setHeader] = useState<DocHeader>(emptyHeader(docType));
  const [lines, setLines] = useState<DocLine[]>([emptyLine()]);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [salesPeople, setSalesPeople] = useState<{ id: string; display_name: string | null }[]>([]);
  const [taxRate, setTaxRate] = useState<number>(5);

  const showSalesPerson =
    docType === "sales_invoice" ||
    docType === "sales_order" ||
    docType === "quotation";

  // ---- 載入基礎資料 + 既有單據 ----
  const loadDoc = async (id: string) => {
    const { data: h, error: he } = await supabase
      .from("doc_headers")
      .select(
        "id, doc_type, doc_no, doc_date, contact_id, contact_name, warehouse_id, status, notes, company_id, sales_person_id, void_reason, voided_at",
      )
      .eq("id", id)
      .maybeSingle();
    if (he) {
      toast.error("讀取單據失敗:" + he.message);
      return;
    }
    if (h) setHeader(h as DocHeader);

    const { data: ls } = await supabase
      .from("doc_lines")
      .select(
        "id, line_no, product_id, product_code, product_name, unit, quantity, unit_price, discount_pct, unit_cost, gross_profit, margin_pct",
      )
      .eq("header_id", id)
      .order("line_no");
    setLines(ls && ls.length > 0 ? (ls as DocLine[]) : [emptyLine()]);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: c }, { data: p }, { data: w }, { data: comp }, { data: sp }] =
        await Promise.all([
          supabase
            .from("contacts")
            .select("id, code, name, type, price_level")
            .in("type", isPurchase ? ["vendor", "both"] : ["customer", "both"])
            .order("code"),
          supabase
            .from("products")
            .select("id, code, name, unit, price1, price2, price3, cost_price")
            .order("code"),
          supabase
            .from("warehouses")
            .select("id, code, name, is_default")
            .order("code"),
          supabase
            .from("company")
            .select("tax_rate")
            .limit(1)
            .maybeSingle(),
          showSalesPerson
            ? supabase
                .from("profiles")
                .select("id, display_name, role")
                .in("role", ["sales", "admin", "manager"])
                .order("display_name")
            : Promise.resolve({ data: [] as { id: string; display_name: string | null }[] }),
        ]);
      if (cancelled) return;
      setContacts((c ?? []) as Contact[]);
      setProducts((p ?? []) as Product[]);
      setWarehouses((w ?? []) as Warehouse[]);
      setSalesPeople((sp ?? []) as { id: string; display_name: string | null }[]);
      const tr = (comp as { tax_rate?: number } | null)?.tax_rate;
      if (typeof tr === "number") setTaxRate(tr);

      if (docId) {
        await loadDoc(docId);
      } else {
        // 新建:預設預設倉 + 預設業務員為目前登入者
        const def = (w ?? []).find((x) => x.is_default) ?? (w ?? [])[0];
        setHeader((prev) => ({
          ...prev,
          warehouse_id: def ? def.id : prev.warehouse_id,
          sales_person_id: showSalesPerson ? (profile?.id ?? null) : null,
        }));
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId]);


  // ---- 試算 ----
  const totals = useMemo(() => {
    const subtotal = lines.reduce((sum, l) => {
      const amt =
        (Number(l.quantity) || 0) *
        (Number(l.unit_price) || 0) *
        (1 - (Number(l.discount_pct) || 0) / 100);
      return sum + amt;
    }, 0);
    const tax = subtotal * (taxRate / 100);
    return {
      subtotal,
      tax,
      total: subtotal + tax,
    };
  }, [lines, taxRate]);

  const isEdit = Boolean(header.id);
  const isDraft = header.status === "draft";
  const readOnly = !isDraft || !canWrite;
  const showCostCols =
    (docType === "sales_invoice" || docType === "purchase_receipt") &&
    header.status !== "draft";

  // ---- 客戶選擇 ----
  const selectedContact = contacts.find((c) => c.id === header.contact_id);

  const handleContactChange = (id: string) => {
    const c = contacts.find((x) => x.id === id);
    setHeader((h) => ({
      ...h,
      contact_id: id,
      contact_name: c?.name ?? null,
    }));
  };

  // ---- 行操作 ----
  const updateLine = (idx: number, patch: Partial<DocLine>) => {
    setLines((arr) => arr.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const handleProductChange = (idx: number, productId: string) => {
    const p = products.find((x) => x.id === productId);
    if (!p) return;
    const level = selectedContact?.price_level ?? 1;
    const salesPrice =
      level === 2 ? p.price2 : level === 3 ? p.price3 : p.price1;
    const price = isPurchase ? p.cost_price : salesPrice;
    updateLine(idx, {
      product_id: p.id,
      product_code: p.code,
      product_name: p.name,
      unit: p.unit,
      unit_price: Number(price ?? 0),
    });
  };

  const addLine = () => setLines((arr) => [...arr, emptyLine()]);
  const removeLine = (idx: number) =>
    setLines((arr) => (arr.length <= 1 ? arr : arr.filter((_, i) => i !== idx)));

  // ---- 儲存 ----
  const handleSave = async () => {
    if (!isAdjust && !header.contact_id) {
      toast.error(`請選擇${partyLabel}`);
      return;
    }
    if (!header.warehouse_id) {
      toast.error("請選擇倉庫");
      return;
    }
    if (isAdjust && !(header.notes ?? "").trim()) {
      toast.error("請填寫調整原因 (備註)");
      return;
    }
    const validLines = lines.filter((l) => l.product_id);
    if (validLines.length === 0) {
      toast.error("請至少新增一筆有效明細");
      return;
    }
    if (isAdjust && validLines.some((l) => Number(l.quantity) === 0)) {
      toast.error("調整數量不可為 0");
      return;
    }

    setSaving(true);

    let headerId = header.id;
    let docNo = header.doc_no;

    // 第一次儲存產編號
    if (!isEdit && !docNo) {
      const { data: nx, error: ne } = await supabase.rpc("generate_doc_no", {
        p_company_id: profile?.company_id,
        p_doc_type: docType,
      });
      if (ne) {
        setSaving(false);
        toast.error("產生單號失敗:" + ne.message);
        return;
      }
      docNo = nx as string;
    }

    const headerPayload = {
      doc_type: docType,
      doc_no: docNo,
      doc_date: header.doc_date,
      contact_id: header.contact_id,
      contact_name: header.contact_name,
      warehouse_id: header.warehouse_id,
      notes: header.notes || null,
      status: "draft",
      ...(showSalesPerson ? { sales_person_id: header.sales_person_id } : {}),
      ...(isEdit
        ? {}
        : {
            company_id: profile?.company_id ?? null,
            created_by: user?.id ?? null,
          }),
    };

    if (isEdit) {
      const { error } = await supabase
        .from("doc_headers")
        .update(headerPayload)
        .eq("id", headerId);
      if (error) {
        setSaving(false);
        toast.error("儲存失敗:" + error.message);
        return;
      }
    } else {
      const { data: ins, error } = await supabase
        .from("doc_headers")
        .insert(headerPayload)
        .select("id")
        .single();
      if (error || !ins) {
        setSaving(false);
        toast.error("儲存失敗:" + (error?.message ?? "未知錯誤"));
        return;
      }
      headerId = ins.id;
    }

    // 重寫 lines:刪掉舊的再 insert
    if (isEdit) {
      await supabase.from("doc_lines").delete().eq("header_id", headerId);
    }
    const linesPayload = validLines.map((l, i) => ({
      header_id: headerId,
      line_no: i + 1,
      product_id: l.product_id,
      product_code: l.product_code,
      product_name: l.product_name,
      unit: l.unit,
      quantity: Number(l.quantity) || 0,
      unit_price: Number(l.unit_price) || 0,
      discount_pct: Number(l.discount_pct) || 0,
    }));
    const { error: le } = await supabase
      .from("doc_lines")
      .insert(linesPayload);

    setSaving(false);
    if (le) {
      toast.error("明細儲存失敗:" + le.message);
      return;
    }
    toast.success("已儲存草稿");
    onSaved?.();
  };

  const handleConfirm = async () => {
    if (!header.id) {
      toast.error("請先儲存草稿");
      return;
    }
    console.log("[confirm_document] calling RPC with id:", header.id);
    setConfirming(true);
    const { data, error } = await supabase.rpc("confirm_document", {
      p_doc_id: header.id,
    });
    console.log("[confirm_document] result", { data, error });
    if (error) {
      setConfirming(false);
      toast.error(
        "確認失敗:" + (error.message || error.details || JSON.stringify(error)),
      );
      return;
    }
    toast.success("已確認,庫存與成本已更新");
    // 重新讀取單據,顯示確認後的成本/毛利快照
    await loadDoc(header.id);
    setConfirming(false);
    // 通知父層列表 refetch,讓 status / payment_status 立即更新
    onChanged?.();
  };


  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ============ 表頭 ============ */}
      <section className="rounded-lg border bg-card p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
          表頭資訊
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="單據日期" required>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={readOnly}
                  className={cn(
                    "w-full justify-start font-normal",
                    !header.doc_date && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {header.doc_date || "選擇日期"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={
                    header.doc_date ? new Date(header.doc_date) : undefined
                  }
                  onSelect={(d) =>
                    d &&
                    setHeader((h) => ({
                      ...h,
                      doc_date: format(d, "yyyy-MM-dd"),
                    }))
                  }
                  initialFocus
                  className="pointer-events-auto p-3"
                />
              </PopoverContent>
            </Popover>
          </Field>

          <Field label="單據編號">
            <Input
              value={header.doc_no ?? ""}
              placeholder="儲存時自動產生"
              readOnly
              className="bg-muted/40 font-mono"
            />
          </Field>

          <Field label="狀態">
            <div className="flex h-9 items-center text-sm">
              <StatusBadge status={header.status} />
            </div>
          </Field>

          {!isAdjust && (
            <Field label={partyLabel} required className="md:col-span-2">
              <SearchSelect
                disabled={readOnly}
                value={header.contact_id}
                onChange={(v) => handleContactChange(v)}
                options={contacts.map<SearchOption>((c) => ({
                  value: c.id,
                  label: c.name,
                  hint: c.code,
                }))}
                placeholder={`搜尋${partyLabel}名稱或編號`}
              />
            </Field>
          )}

          <Field
            label="倉庫"
            required
            className={isAdjust ? "md:col-span-2" : undefined}
          >
            <Select
              value={header.warehouse_id ?? ""}
              onValueChange={(v) =>
                setHeader((h) => ({ ...h, warehouse_id: v }))
              }
              disabled={readOnly}
            >
              <SelectTrigger>
                <SelectValue placeholder="選擇倉庫" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {showSalesPerson && (
            <Field label="業務員">
              <Select
                value={header.sales_person_id ?? ""}
                onValueChange={(v) =>
                  setHeader((h) => ({ ...h, sales_person_id: v || null }))
                }
                disabled={readOnly}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選擇業務員" />
                </SelectTrigger>
                <SelectContent>
                  {salesPeople.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.display_name ?? u.id.slice(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          <Field
            label={isAdjust ? "調整原因 (備註)" : "備註"}
            required={isAdjust}
            className="md:col-span-3"
          >
            <Input
              value={header.notes ?? ""}
              onChange={(e) =>
                setHeader((h) => ({ ...h, notes: e.target.value }))
              }
              disabled={readOnly}
              placeholder={isAdjust ? "盤點差異 / 報廢 / 樣品出庫 ..." : ""}
            />
          </Field>
        </div>
      </section>

      {/* ============ 明細 ============ */}
      <section className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground">明細</h3>
          {!readOnly && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={addLine}
            >
              <Plus className="mr-1 h-4 w-4" />
              新增一行
            </Button>
          )}
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              <TableHead className="min-w-[240px]">產品</TableHead>
              <TableHead className="w-20">單位</TableHead>
              <TableHead className="w-24 text-right">數量</TableHead>
              <TableHead className="w-28 text-right">單價</TableHead>
              <TableHead className="w-24 text-right">折扣%</TableHead>
              <TableHead className="w-32 text-right">金額</TableHead>
              {showCostCols && (
                <>
                  <TableHead className="w-24 text-right">單位成本</TableHead>
                  <TableHead className="w-28 text-right">毛利</TableHead>
                  <TableHead className="w-20 text-right">毛利率%</TableHead>
                </>
              )}
              {!readOnly && <TableHead className="w-12" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((l, idx) => {
              const amount =
                (Number(l.quantity) || 0) *
                (Number(l.unit_price) || 0) *
                (1 - (Number(l.discount_pct) || 0) / 100);
              return (
                <TableRow key={idx}>
                  <TableCell className="text-muted-foreground">
                    {idx + 1}
                  </TableCell>
                  <TableCell>
                    <SearchSelect
                      disabled={readOnly}
                      value={l.product_id}
                      onChange={(v) => handleProductChange(idx, v)}
                      options={products.map<SearchOption>((p) => ({
                        value: p.id,
                        label: p.name,
                        hint: p.code,
                      }))}
                      placeholder="選擇產品"
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {l.unit ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      {...(isAdjust ? {} : { min: 0 })}
                      step="0.01"
                      disabled={readOnly}
                      className={cn(
                        "h-8 text-right",
                        isAdjust && Number(l.quantity) < 0 && "text-destructive",
                        isAdjust && Number(l.quantity) > 0 && "text-success",
                      )}
                      value={l.quantity}
                      onChange={(e) =>
                        updateLine(idx, {
                          quantity: Number(e.target.value),
                        })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      disabled={readOnly}
                      className="h-8 text-right"
                      value={l.unit_price}
                      onChange={(e) =>
                        updateLine(idx, {
                          unit_price: Number(e.target.value),
                        })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      disabled={readOnly}
                      className="h-8 text-right"
                      value={l.discount_pct}
                      onChange={(e) =>
                        updateLine(idx, {
                          discount_pct: Number(e.target.value),
                        })
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {amount.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </TableCell>
                  {showCostCols && (
                    <>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {l.unit_cost != null
                          ? Number(l.unit_cost).toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            })
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {l.gross_profit != null
                          ? Number(l.gross_profit).toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            })
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {l.margin_pct != null
                          ? `${Number(l.margin_pct).toFixed(1)}%`
                          : "—"}
                      </TableCell>
                    </>
                  )}
                  {!readOnly && (
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLine(idx)}
                        disabled={lines.length <= 1}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </section>

      {/* ============ 合計 ============ */}
      <section className="flex justify-end">
        <div className="w-full max-w-sm space-y-2 rounded-lg border bg-card p-4 text-sm shadow-sm">
          <Row label="未稅合計" value={totals.subtotal} />
          <Row label={`稅金 (${taxRate}%)`} value={totals.tax} />
          <div className="border-t pt-2">
            <Row label="總計" value={totals.total} bold />
          </div>
          <p className="pt-1 text-[11px] text-muted-foreground">
            前端試算僅供參考,實際以系統重算為準。
          </p>
        </div>
      </section>

      {/* ============ 操作 ============ */}
      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            取消
          </Button>
        )}
        {isEdit &&
          (
            [
              "quotation",
              "sales_order",
              "sales_invoice",
              "purchase_order",
              "purchase_receipt",
            ] as DocType[]
          ).includes(docType) && (
            <Button type="button" variant="outline" asChild>
              <a
                href={`/print/${docType}/${header.id}`}
                target="_blank"
                rel="noreferrer"
              >
                <Printer className="mr-1 h-4 w-4" />
                列印
              </a>
            </Button>
          )}
        {isDraft && canWrite && (
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            儲存草稿
          </Button>
        )}
        {isDraft && isEdit && canConfirm && (
          <Button
            type="button"
            variant="default"
            className="bg-success text-success-foreground hover:bg-success/90"
            onClick={handleConfirm}
            disabled={confirming}
          >
            {confirming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirming ? "處理中..." : "確認單據"}
          </Button>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: number;
  bold?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between tabular-nums",
        bold && "text-base font-semibold",
      )}
    >
      <span className="text-muted-foreground">{label}</span>
      <span>
        {value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </span>
    </div>
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
    <div className={cn("space-y-1.5", className)}>
      <Label>
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    draft: { label: "草稿", cls: "bg-muted text-muted-foreground" },
    confirmed: { label: "已確認", cls: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300" },
    completed: { label: "已完成", cls: "bg-success/15 text-success" },
    voided: { label: "已作廢", cls: "bg-destructive/15 text-destructive" },
  };
  const s = map[status] ?? { label: status, cls: "bg-muted" };
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
