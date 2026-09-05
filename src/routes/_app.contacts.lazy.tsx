import { createLazyFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Loader2, Plus, Pencil, Search, Upload, Link2, QrCode } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { usePermission } from "@/hooks/usePermission";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export const Route = createLazyFileRoute("/_app/contacts")({
  component: ContactsPage,
});
type ContactType = "customer" | "vendor" | "both";

type Contact = {
  id: string;
  code: string;
  name: string;
  type: ContactType;
  tax_id: string | null;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  /** 配送地區（對應 delivery_rules.district，派車規則用） */
  region: string | null;
  /** 配送星期 ISO 1=一 … 7=日（派車規則用） */
  delivery_days: number[] | null;
  /** 路順（出貨單排序用） */
  route_seq: number | null;
  /** 收現 */
  collect_cash: boolean;
  /** 配送備註 */
  delivery_note: string | null;
  bind_code: string | null;
  payment_terms: number | null;
  price_level: number | null;
  credit_limit: number | null;
  price_includes_tax: boolean | null;
  notes: string | null;
  company_id: string | null;
};

const TYPE_LABEL: Record<ContactType, string> = {
  customer: "客戶",
  vendor: "廠商",
  both: "兩者",
};

const WEEKDAYS: { value: number; label: string }[] = [
  { value: 1, label: "一" },
  { value: 2, label: "二" },
  { value: 3, label: "三" },
  { value: 4, label: "四" },
  { value: 5, label: "五" },
  { value: 6, label: "六" },
  { value: 7, label: "日" },
];

/** [2,5] → "二五" */
function formatDays(days: number[] | null | undefined): string {
  if (!days || days.length === 0) return "";
  return [...days]
    .sort((a, b) => a - b)
    .map((d) => WEEKDAYS.find((w) => w.value === d)?.label ?? String(d))
    .join("");
}

/** 匯入用：接受 "2,5" / "二、五" / "2 5" 等寫法 → [2,5] */
function parseDays(raw: unknown): number[] | null {
  if (raw == null || raw === "") return null;
  const s = String(raw);
  const out = new Set<number>();
  for (const w of WEEKDAYS) {
    if (s.includes(w.label)) out.add(w.value);
  }
  for (const m of s.match(/[1-7]/g) ?? []) out.add(Number(m));
  return out.size ? [...out].sort((a, b) => a - b) : null;
}

/** 產生 LINE 一鍵綁定深連結 URL */
function bindDeepLink(bindCode: string | null): string | null {
  if (!bindCode) return null;
  // LINE bot 連結搭配綁定碼作為起始訊息
  const botId = "@fullemei"; // 富樂美 LINE 官方帳號
  return `https://line.me/R/oaMessage/${encodeURIComponent(botId)}/?${encodeURIComponent(bindCode)}`;
}

function emptyContact(): Contact {
  return {
    id: "",
    code: "",
    name: "",
    type: "customer",
    tax_id: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    region: "",
    delivery_days: null,
    route_seq: null,
    collect_cash: false,
    delivery_note: "",
    bind_code: "",
    payment_terms: 30,
    price_level: 1,
    credit_limit: 0,
    price_includes_tax: false,
    notes: "",
    company_id: null,
  };
}

function ContactsPage() {
  const canWrite = usePermission("sales", "write");
  const [list, setList] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "customer" | "vendor">("all");
  const [keyword, setKeyword] = useState("");
  const [editing, setEditing] = useState<Contact | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [companySettings, setCompanySettings] = useState<Record<string, unknown> | null>(null);
  const { profile } = useAuth();
  const companyId = profile?.company_id ?? null;

  const load = async () => {
    if (!companyId) {
      setList([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [{ data: contactsData, error: contactsError }, { data: companyData }] = await Promise.all([
      supabase
        .from("contacts")
        .select(
          "id, code, name, type, tax_id, contact_person, phone, email, address, region, delivery_days, route_seq, collect_cash, delivery_note, bind_code, payment_terms, price_level, credit_limit, price_includes_tax, notes, company_id",
        )
        .eq("company_id", companyId)
        .order("code", { ascending: true }),
      supabase.from("company").select("settings").limit(1).single(),
    ]);
    if (contactsError) {
      toast.error("讀取客戶廠商失敗:" + contactsError.message);
    } else {
      setList((contactsData ?? []) as Contact[]);
    }
    setCompanySettings((companyData?.settings as Record<string, unknown>) ?? null);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [companyId]);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return list.filter((c) => {
      if (tab !== "all") {
        if (tab === "customer" && c.type !== "customer" && c.type !== "both")
          return false;
        if (tab === "vendor" && c.type !== "vendor" && c.type !== "both")
          return false;
      }
      if (!kw) return true;
      return (
        c.name?.toLowerCase().includes(kw) ||
        c.code?.toLowerCase().includes(kw) ||
        c.region?.toLowerCase().includes(kw)
      );
    });
  }, [list, tab, keyword]);

  const colCount = canWrite ? 9 : 8;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">客戶廠商</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            管理往來客戶與供應廠商資料。客戶的「地區＋配送星期」決定派車規則的車種與配送日。
          </p>
        </div>
        <div className="flex gap-2">
          <ExportExcelButton
            rows={filtered as unknown as Record<string, unknown>[]}
            filename="客戶廠商"
            columns={[
              { key: "code", label: "客戶代碼" },
              { key: "name", label: "店名" },
              { key: "type", label: "類型", value: (r: Record<string, unknown>) => TYPE_LABEL[r.type as ContactType] ?? String(r.type ?? "") },
              { key: "region", label: "地區" },
              {
                key: "delivery_days",
                label: "配送星期",
                value: (r: Record<string, unknown>) => formatDays(r.delivery_days as number[] | null),
              },
              { key: "route_seq", label: "路順" },
              {
                key: "collect_cash",
                label: "收現",
                value: (r: Record<string, unknown>) => (r as { collect_cash: boolean }).collect_cash ? "Y" : "",
              },
              { key: "delivery_note", label: "配送備註" },
              { key: "phone", label: "電話" },
              { key: "bind_code", label: "綁定碼" },
              {
                key: "bind_link",
                label: "LINE綁定連結",
                value: (r: Record<string, unknown>) => bindDeepLink((r as { bind_code: string | null }).bind_code) ?? "",
              },
            ]}
          />
          {canWrite && (
            <>
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <Upload className="mr-1.5 h-4 w-4" />
                匯入
              </Button>
              <Button
                onClick={() => {
                  const defaults = emptyContact();
                  defaults.price_includes_tax = Boolean(companySettings?.price_includes_tax ?? false);
                  setEditing(defaults);
                  setDialogOpen(true);
                }}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                新增
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="all">全部</TabsTrigger>
            <TabsTrigger value="customer">客戶</TabsTrigger>
            <TabsTrigger value="vendor">廠商</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜尋名稱、編號或地區"
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
              <TableHead className="w-24">類型</TableHead>
              <TableHead className="w-36">地區 / 配送</TableHead>
              <TableHead className="w-20">路順/收現</TableHead>
              <TableHead className="w-40">電話</TableHead>
              <TableHead className="w-32">綁定碼</TableHead>
              <TableHead className="w-24 text-right">帳期(天)</TableHead>
              {canWrite && (
                <TableHead className="w-20 text-right">操作</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={colCount} className="h-24 text-center">
                  <Loader2 className="inline h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={colCount}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  尚無資料
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono">{c.code}</TableCell>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant={c.type === "vendor" ? "secondary" : "default"}
                    >
                      {TYPE_LABEL[c.type] ?? c.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {c.type === "vendor" ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <div className="leading-tight">
                        <div>{c.region || <span className="text-warning">未設地區</span>}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDays(c.delivery_days) ? `週${formatDays(c.delivery_days)}` : "未設配送日"}
                        </div>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {c.type === "vendor" ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <div className="leading-tight text-xs">
                        <div>{c.route_seq != null ? `#${c.route_seq}` : "—"}</div>
                        {c.collect_cash && (
                          <span className="text-warning-foreground font-medium">收現</span>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.phone || "—"}
                  </TableCell>
                  <TableCell>
                    {c.bind_code ? (
                      <div className="space-y-0.5">
                        <span className="font-mono text-xs">{c.bind_code}</span>
                        {bindDeepLink(c.bind_code) && (
                          <div className="flex items-center gap-1">
                            <a
                              href={bindDeepLink(c.bind_code)!}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-primary hover:underline"
                              title="LINE 一鍵綁定連結"
                            >
                              <Link2 className="inline h-3 w-3" /> 綁定連結
                            </a>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              title="顯示 QR Code"
                              onClick={() => {
                                window.open(
                                  `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(bindDeepLink(c.bind_code)!)}`,
                                  "_blank",
                                );
                              }}
                            >
                              <QrCode className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {c.payment_terms ?? "—"}
                  </TableCell>
                  {canWrite && (
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditing(c);
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

      <ContactDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        contact={editing}
        onSaved={() => {
          setDialogOpen(false);
          load();
        }}
      />

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="匯入客戶廠商"
        templateFileName="contacts_template.csv"
        fields={CONTACT_IMPORT_FIELDS}
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
              .from("contacts")
              .select("code")
              .eq("company_id", companyId)
              .in("code", codes);
            existing = new Set((data ?? []).map((d: { code: string }) => d.code));
          }
          return parsedRows.map((r) => {
            const code = String(r.data.code ?? "").trim();
            const errs = [...r.errors];
            if (code && dupInFile.has(code)) errs.push("檔案內 code 重複");
            if (code && existing.has(code)) errs.push("code 已存在");
            return { ...r, errors: errs };
          });
        }}
        onImport={async (validRows) => {
          if (!companyId) return { success: 0, failed: validRows.length, errors: ["找不到公司"] };
          const payload = validRows.map((r) => {
            const { delivery_days, collect_cash, ...rest } = r.data as Record<string, unknown>;
            return {
              ...rest,
              delivery_days: parseDays(delivery_days),
              collect_cash: collect_cash === true || collect_cash === "true" || collect_cash === "Y" || collect_cash === "1",
              company_id: companyId,
            };
          });
          const { error } = await supabase.from("contacts").insert(payload);
          if (error) return { success: 0, failed: validRows.length, errors: [error.message] };
          return { success: validRows.length, failed: 0 };
        }}
        onImported={load}
      />
    </div>
  );
}

const CONTACT_IMPORT_FIELDS: ImportField[] = [
  { key: "code", label: "代碼", required: true, example: "C0001" },
  { key: "name", label: "名稱", required: true, example: "範例公司" },
  {
    key: "type",
    label: "類別",
    required: true,
    type: "enum",
    enumValues: ["customer", "vendor", "both"],
    example: "customer",
  },
  { key: "short_name", label: "簡稱" },
  { key: "tax_id", label: "統編" },
  { key: "contact_person", label: "聯絡人" },
  { key: "phone", label: "電話" },
  { key: "email", label: "Email" },
  { key: "address", label: "地址" },
  { key: "shipping_address", label: "送貨地址" },
  { key: "region", label: "配送地區", example: "溪湖" },
  { key: "delivery_days", label: "配送星期(1-7,逗號分隔)", example: "2,5" },
  { key: "route_seq", label: "路順", type: "number", example: 1 },
  { key: "collect_cash", label: "收現(Y/空白)", example: "" },
  { key: "delivery_note", label: "配送備註", example: "走後門" },
  { key: "payment_terms", label: "帳期天數", type: "number", default: 30, example: 30 },
  { key: "price_level", label: "售價等級", type: "number", default: 1, example: 1 },
  { key: "credit_limit", label: "信用額度", type: "number", default: 0, example: 0 },
  { key: "notes", label: "備註" },
];


function ContactDialog({
  open,
  onOpenChange,
  contact,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contact: Contact | null;
  onSaved: () => void;
}) {
  const { profile } = useAuth();
  const [form, setForm] = useState<Contact | null>(contact);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(contact);
  }, [contact]);

  if (!form) return null;
  const isEdit = Boolean(form.id);
  const isCustomer = form.type === "customer" || form.type === "both";

  const toggleDay = (d: number) => {
    setForm((f) => {
      if (!f) return f;
      const cur = new Set(f.delivery_days ?? []);
      if (cur.has(d)) cur.delete(d);
      else cur.add(d);
      const next = [...cur].sort((a, b) => a - b);
      return { ...f, delivery_days: next.length ? next : null };
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      code: form.code,
      name: form.name,
      type: form.type,
      tax_id: form.tax_id || null,
      contact_person: form.contact_person || null,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
      region: form.region?.trim() || null,
      delivery_days: form.delivery_days && form.delivery_days.length ? form.delivery_days : null,
      route_seq: form.route_seq,
      collect_cash: form.collect_cash,
      delivery_note: form.delivery_note?.trim() || null,
      payment_terms: form.payment_terms ?? 30,
      price_level: form.price_level ?? 1,
      credit_limit: form.credit_limit ?? 0,
      price_includes_tax: form.price_includes_tax ?? false,
      notes: form.notes || null,
      ...(isEdit ? {} : { company_id: profile?.company_id ?? null }),
    };
    if (!profile?.company_id) {
      setSaving(false);
      toast.error("找不到公司");
      return;
    }
    const query = isEdit
      ? supabase
          .from("contacts")
          .update(payload)
          .eq("id", form.id)
          .eq("company_id", profile.company_id)
      : supabase.from("contacts").insert(payload);
    const { error } = await query;
    setSaving(false);
    if (error) {
      toast.error("儲存失敗:" + error.message);
      return;
    }
    toast.success(isEdit ? "已更新" : "已新增");
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "編輯客戶廠商" : "新增客戶廠商"}</DialogTitle>
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
            <Field label="類型">
              <Select
                value={form.type}
                onValueChange={(v) =>
                  setForm((f) => f && { ...f, type: v as ContactType })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">客戶</SelectItem>
                  <SelectItem value="vendor">廠商</SelectItem>
                  <SelectItem value="both">兩者</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="統一編號">
              <Input
                value={form.tax_id ?? ""}
                onChange={(e) =>
                  setForm((f) => f && { ...f, tax_id: e.target.value })
                }
              />
            </Field>
            <Field label="聯絡人">
              <Input
                value={form.contact_person ?? ""}
                onChange={(e) =>
                  setForm((f) => f && { ...f, contact_person: e.target.value })
                }
              />
            </Field>
            <Field label="電話">
              <Input
                value={form.phone ?? ""}
                onChange={(e) =>
                  setForm((f) => f && { ...f, phone: e.target.value })
                }
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={form.email ?? ""}
                onChange={(e) =>
                  setForm((f) => f && { ...f, email: e.target.value })
                }
              />
            </Field>
            <Field label="地址" className="md:col-span-2">
              <Input
                value={form.address ?? ""}
                onChange={(e) =>
                  setForm((f) => f && { ...f, address: e.target.value })
                }
              />
            </Field>

            {/* ---- 配送（客戶用；決定派車車種與配送日） ---- */}
            {isCustomer && (
              <>
                <Field label="配送地區" hint="須與「配送規則」的地區一致，例：溪湖、北斗、西屯">
                  <Input
                    value={form.region ?? ""}
                    placeholder="例：溪湖"
                    onChange={(e) =>
                      setForm((f) => f && { ...f, region: e.target.value })
                    }
                  />
                </Field>
                <Field label="配送星期" hint="可複選；LINE 下單與開單依此排下一趨">
                  <div className="flex h-9 items-center gap-1">
                    {WEEKDAYS.map((w) => {
                      const on = form.delivery_days?.includes(w.value) ?? false;
                      return (
                        <Button
                          key={w.value}
                          type="button"
                          size="sm"
                          variant={on ? "default" : "outline"}
                          className={cn("h-8 w-9 px-0", !on && "text-muted-foreground")}
                          onClick={() => toggleDay(w.value)}
                          aria-pressed={on}
                        >
                          {w.label}
                        </Button>
                      );
                    })}
                  </div>
                </Field>
                <Field label="路順" hint="出貨單排序依據，數字越小越先送">
                  <Input
                    type="number"
                    min={1}
                    value={form.route_seq ?? ""}
                    placeholder="例：1"
                    onChange={(e) =>
                      setForm((f) => f && {
                        ...f,
                        route_seq: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </Field>
                <div className="flex items-end gap-4">
                  <div className="flex items-center gap-2 pb-1">
                    <Checkbox
                      id="collect_cash"
                      checked={form.collect_cash}
                      onCheckedChange={(v) =>
                        setForm((f) => f && { ...f, collect_cash: Boolean(v) })
                      }
                    />
                    <Label htmlFor="collect_cash" className="cursor-pointer">收現</Label>
                  </div>
                </div>
                <Field label="配送備註" hint="印在出貨單上，例：走後門、週二才收" className="md:col-span-2">
                  <Input
                    value={form.delivery_note ?? ""}
                    placeholder="例：走後門"
                    onChange={(e) =>
                      setForm((f) => f && { ...f, delivery_note: e.target.value })
                    }
                  />
                </Field>
              </>
            )}

            <Field label="帳期 (天)">
              <Input
                type="number"
                min={0}
                value={form.payment_terms ?? 0}
                onChange={(e) =>
                  setForm(
                    (f) =>
                      f && {
                        ...f,
                        payment_terms:
                          e.target.value === "" ? null : Number(e.target.value),
                      },
                  )
                }
              />
            </Field>
            <Field label="售價等級">
              <Select
                value={String(form.price_level ?? 1)}
                onValueChange={(v) =>
                  setForm((f) => f && { ...f, price_level: Number(v) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 (一般)</SelectItem>
                  <SelectItem value="2">2 (經銷)</SelectItem>
                  <SelectItem value="3">3 (VIP)</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="信用額度">
              <Input
                type="number"
                min={0}
                value={form.credit_limit ?? 0}
                onChange={(e) =>
                  setForm(
                    (f) =>
                      f && {
                        ...f,
                        credit_limit:
                          e.target.value === "" ? null : Number(e.target.value),
                      },
                  )
                }
              />
            </Field>
            <div className="flex items-center gap-3 self-end pb-1">
              <Switch
                id="price_includes_tax"
                checked={form.price_includes_tax ?? false}
                onCheckedChange={(v) =>
                  setForm((f) => f && { ...f, price_includes_tax: v })
                }
              />
              <Label htmlFor="price_includes_tax" className="cursor-pointer">
                售價含稅
              </Label>
            </div>
            <Field label="備註" className="md:col-span-2">
              <Input
                value={form.notes ?? ""}
                onChange={(e) =>
                  setForm((f) => f && { ...f, notes: e.target.value })
                }
              />
            </Field>
            {isEdit && form.bind_code && (
              <div className="rounded-md border bg-muted/30 p-3 text-xs md:col-span-2">
                <div className="mb-1 font-medium">LINE 綁定碼</div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm">{form.bind_code}</span>
                  {bindDeepLink(form.bind_code) && (
                    <>
                      <a
                        href={bindDeepLink(form.bind_code)!}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <Link2 className="h-3 w-3" /> 一鍵綁定連結
                      </a>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 text-[10px]"
                        onClick={() => {
                          window.open(
                            `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(bindDeepLink(form.bind_code)!)}`,
                            "_blank",
                          );
                        }}
                      >
                        <QrCode className="mr-1 h-3 w-3" /> QR Code
                      </Button>
                    </>
                  )}
                </div>
                <div className="mt-1 text-muted-foreground">系統自動產生，不可修改。把連結或 QR Code 傳給客戶，客戶點開即可在 LINE 完成綁定。</div>
              </div>
            )}
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
  hint,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
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
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
