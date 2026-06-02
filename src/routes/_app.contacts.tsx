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
import { Badge } from "@/components/ui/badge";
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

export const Route = createFileRoute("/_app/contacts")({
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
  region: string | null;
  bind_code: string | null;
  payment_terms: number | null;
  price_level: number | null;
  credit_limit: number | null;
  notes: string | null;
  company_id: string | null;
};

const TYPE_LABEL: Record<ContactType, string> = {
  customer: "客戶",
  vendor: "廠商",
  both: "兩者",
};

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
    bind_code: "",
    payment_terms: 30,
    price_level: 1,
    credit_limit: 0,
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
  const { profile } = useAuth();
  const companyId = profile?.company_id ?? null;

  const load = async () => {
    if (!companyId) {
      setList([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("contacts")
      .select(
        "id, code, name, type, tax_id, contact_person, phone, email, address, region, bind_code, payment_terms, price_level, credit_limit, notes, company_id",
      )
      .eq("company_id", companyId)
      .order("code", { ascending: true });
    if (error) {
      toast.error("讀取客戶廠商失敗:" + error.message);
    } else {
      setList((data ?? []) as Contact[]);
    }
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
        c.code?.toLowerCase().includes(kw)
      );
    });
  }, [list, tab, keyword]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">客戶廠商</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            管理往來客戶與供應廠商資料。
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
              { key: "phone", label: "電話" },
              { key: "bind_code", label: "綁定碼" },
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
                  setEditing(emptyContact());
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
              <TableHead className="w-24">類型</TableHead>
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
                <TableCell
                  colSpan={canWrite ? 7 : 6}
                  className="h-24 text-center"
                >
                  <Loader2 className="inline h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canWrite ? 6 : 5}
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
                  <TableCell className="text-muted-foreground">
                    {c.phone || "—"}
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
          const payload = validRows.map((r) => ({
            ...r.data,
            company_id: companyId,
          }));
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
      payment_terms: form.payment_terms ?? 30,
      price_level: form.price_level ?? 1,
      credit_limit: form.credit_limit ?? 0,
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
