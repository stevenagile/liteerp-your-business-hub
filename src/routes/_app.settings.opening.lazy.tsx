import { createLazyFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Plus, Trash2, ShieldAlert, Info, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { ImportDialog, type ImportField } from "@/components/ImportDialog";

export const Route = createLazyFileRoute("/_app/settings/opening")({
  component: OpeningPage,
});
type Product = { id: string; code: string; name: string; cost_price: number | null };
type Warehouse = { id: string; code: string; name: string };
type Contact = { id: string; name: string; type: string };

function OpeningPage() {
  const { profile, loading } = useAuth();
  const { allowed, checking } = usePermissionGuard("/settings/opening");

  if (loading || checking) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!profile || !allowed || profile.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShieldAlert className="h-10 w-10 text-warning" />
        <h2 className="mt-3 text-lg font-semibold">權限不足</h2>
        <p className="text-sm text-muted-foreground">僅管理員可進入系統開帳。</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">系統開帳</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          系統上線時一次性匯入期初庫存與期初應收/應付。
        </p>
      </div>

      <Tabs defaultValue="inventory">
        <TabsList>
          <TabsTrigger value="inventory">期初庫存</TabsTrigger>
          <TabsTrigger value="ar">期初應收</TabsTrigger>
          <TabsTrigger value="ap">期初應付</TabsTrigger>
        </TabsList>
        <TabsContent value="inventory" className="mt-4">
          <OpeningInventory />
        </TabsContent>
        <TabsContent value="ar" className="mt-4">
          <OpeningPayable kind="ar" />
        </TabsContent>
        <TabsContent value="ap" className="mt-4">
          <OpeningPayable kind="ap" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ----------------------- 期初庫存 ----------------------- */

type InvRow = {
  key: string;
  product_id: string;
  warehouse_id: string;
  quantity: string;
  unit_cost: string;
};

function newInvRow(): InvRow {
  return {
    key: crypto.randomUUID(),
    product_id: "",
    warehouse_id: "",
    quantity: "",
    unit_cost: "",
  };
}

function OpeningInventory() {
  const { profile } = useAuth();
  const companyId = profile?.company_id ?? "";
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [rows, setRows] = useState<InvRow[]>([newInvRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: w }] = await Promise.all([
        supabase.from("products").select("id, code, name, cost_price").eq("company_id", companyId).order("code"),
        supabase.from("warehouses").select("id, code, name").eq("company_id", companyId).order("code"),
      ]);
      setProducts((p ?? []) as Product[]);
      setWarehouses((w ?? []) as Warehouse[]);
    })();
  }, []);

  const update = (key: string, patch: Partial<InvRow>) => {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const submit = async () => {
    const items = rows
      .filter((r) => r.product_id && r.warehouse_id)
      .map((r) => ({
        product_id: r.product_id,
        warehouse_id: r.warehouse_id,
        quantity: Number(r.quantity || 0),
        unit_cost: Number(r.unit_cost || 0),
      }))
      .filter((i) => i.quantity > 0);
    if (items.length === 0) {
      toast.error("請至少填寫一筆有效的期初庫存");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.rpc("load_opening_inventory", { p_items: items });
    setSubmitting(false);
    if (error) {
      toast.error("套用失敗：" + error.message);
      return;
    }
    toast.success(`已套用 ${items.length} 筆期初庫存`);
    setRows([newInvRow()]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-warning-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <div>期初庫存應於系統上線時一次設定，套用後可至「庫存總覽」與「庫存異動明細」驗證。</div>
      </div>

      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>產品</TableHead>
              <TableHead className="w-44">倉庫</TableHead>
              <TableHead className="w-32 text-right">期初數量</TableHead>
              <TableHead className="w-32 text-right">期初單位成本</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.key}>
                <TableCell>
                  <Select
                    value={r.product_id}
                    onValueChange={(v) => {
                      const p = products.find((x) => x.id === v);
                      update(r.key, {
                        product_id: v,
                        unit_cost: r.unit_cost || (p?.cost_price?.toString() ?? ""),
                      });
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="選擇產品" /></SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.code} — {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select
                    value={r.warehouse_id}
                    onValueChange={(v) => update(r.key, { warehouse_id: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="倉庫" /></SelectTrigger>
                    <SelectContent>
                      {warehouses.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="1"
                    inputMode="decimal"
                    className="text-right"
                    value={r.quantity}
                    onChange={(e) => update(r.key, { quantity: e.target.value })}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="1"
                    inputMode="decimal"
                    className="text-right"
                    value={r.unit_cost}
                    onChange={(e) => update(r.key, { unit_cost: e.target.value })}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      setRows((rs) => (rs.length > 1 ? rs.filter((x) => x.key !== r.key) : rs))
                    }
                    disabled={rows.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-between">
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setRows((rs) => [...rs, newInvRow()])}>
            <Plus className="mr-1.5 h-4 w-4" /> 新增一列
          </Button>
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="mr-1.5 h-4 w-4" /> 匯入
          </Button>
        </div>
        <Button onClick={submit} disabled={submitting}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          套用期初庫存
        </Button>
      </div>

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        title="匯入期初庫存"
        templateFileName="opening_inventory_template.csv"
        fields={OPENING_INV_FIELDS}
        validateRows={(parsedRows) => {
          const prodMap = new Map(products.map((p) => [p.code, p.id]));
          const whMap = new Map(warehouses.map((w) => [w.code, w.id]));
          return parsedRows.map((r) => {
            const errs = [...r.errors];
            const pCode = String(r.data.product_code ?? "").trim();
            const wCode = String(r.data.warehouse_code ?? "").trim();
            const pid = prodMap.get(pCode);
            const wid = whMap.get(wCode);
            if (pCode && !pid) errs.push(`產品編號 ${pCode} 不存在`);
            if (wCode && !wid) errs.push(`倉庫代碼 ${wCode} 不存在`);
            return {
              ...r,
              errors: errs,
              data: { ...r.data, product_id: pid, warehouse_id: wid },
            };
          });
        }}
        onImport={async (validRows) => {
          const items = validRows.map((r) => ({
            product_id: r.data.product_id as string,
            warehouse_id: r.data.warehouse_id as string,
            quantity: Number(r.data.quantity ?? 0),
            unit_cost: Number(r.data.unit_cost ?? 0),
          }));
          const { error } = await supabase.rpc("load_opening_inventory", { p_items: items });
          if (error) return { success: 0, failed: items.length, errors: [error.message] };
          return { success: items.length, failed: 0 };
        }}
      />
    </div>
  );
}

const OPENING_INV_FIELDS: ImportField[] = [
  { key: "product_code", label: "產品編號", required: true, example: "P0001" },
  { key: "warehouse_code", label: "倉庫代碼", required: true, example: "WH01" },
  { key: "quantity", label: "期初數量", required: true, type: "number", example: 100 },
  { key: "unit_cost", label: "期初單位成本", required: true, type: "number", example: 50 },
];

/* ----------------------- 期初應收/應付 ----------------------- */

type OpeningDoc = {
  id: string;
  doc_no: string;
  doc_date: string;
  due_date: string | null;
  total_amount: number | null;
  contact_id: string;
  notes: string | null;
};

function OpeningPayable({ kind }: { kind: "ar" | "ap" }) {
  const { profile } = useAuth();
  const companyId = profile?.company_id ?? "";
  const isAR = kind === "ar";
  const docType = isAR ? "sales_invoice" : "purchase_receipt";
  const partyLabel = isAR ? "客戶" : "廠商";
  const verb = isAR ? "應收" : "應付";
  const rpcName = isAR ? "load_opening_ar" : "load_opening_ap";

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactId, setContactId] = useState("");
  const [amount, setAmount] = useState("");
  const [docDate, setDocDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [list, setList] = useState<OpeningDoc[]>([]);
  const [loading, setLoading] = useState(false);

  const contactMap = Object.fromEntries(contacts.map((c) => [c.id, c.name]));

  const loadContacts = async () => {
    const types = isAR ? ["customer", "both"] : ["vendor", "both"];
    const { data } = await supabase
      .from("contacts")
      .select("id,name,type")
      .eq("company_id", companyId)
      .in("type", types)
      .order("name");
    setContacts((data ?? []) as Contact[]);
  };

  const loadList = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("doc_headers")
      .select("id, doc_no, doc_date, due_date, total_amount, contact_id, notes")
      .eq("company_id", companyId)
      .eq("doc_type", docType)
      .eq("is_opening", true)
      .order("doc_date", { ascending: false });
    setLoading(false);
    if (error) toast.error("讀取失敗：" + error.message);
    else setList((data ?? []) as OpeningDoc[]);
  };

  useEffect(() => {
    loadContacts();
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!contactId || !amount || Number(amount) <= 0) {
      toast.error(`請選擇${partyLabel}並輸入金額`);
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.rpc(rpcName, {
      p_contact_id: contactId,
      p_amount: Number(amount),
      p_doc_date: docDate,
      p_due_date: dueDate || null,
      p_notes: notes || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error("建立失敗：" + error.message);
      return;
    }
    toast.success(`已新增期初${verb}`);
    setContactId("");
    setAmount("");
    setDueDate("");
    setNotes("");
    loadList();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <form onSubmit={submit} className="space-y-4 rounded-lg border bg-card p-4 shadow-sm">
        <div className="text-sm font-medium">新增期初{verb}</div>
        <div className="space-y-1.5">
          <Label>{partyLabel} <span className="text-destructive">*</span></Label>
          <Select value={contactId} onValueChange={setContactId}>
            <SelectTrigger><SelectValue placeholder={`選擇${partyLabel}`} /></SelectTrigger>
            <SelectContent>
              {contacts.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>金額 <span className="text-destructive">*</span></Label>
          <Input
            type="number"
            step="1"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label>單據日期 <span className="text-destructive">*</span></Label>
          <Input type="date" value={docDate} onChange={(e) => setDocDate(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>到期日</Label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>備註</Label>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          新增期初{verb}
        </Button>
      </form>

      <div className="rounded-lg border bg-card shadow-sm">
        <div className="border-b px-4 py-3 text-sm font-medium">已建立的期初{verb}</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">單號</TableHead>
              <TableHead className="w-28">日期</TableHead>
              <TableHead>{partyLabel}</TableHead>
              <TableHead className="w-28">到期日</TableHead>
              <TableHead className="w-32 text-right">金額</TableHead>
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
                <TableCell colSpan={5} className="h-24 text-center text-sm text-muted-foreground">
                  尚無期初{verb}
                </TableCell>
              </TableRow>
            ) : (
              list.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-mono text-xs">{d.doc_no}</TableCell>
                  <TableCell>{d.doc_date}</TableCell>
                  <TableCell>{contactMap[d.contact_id] ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{d.due_date ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {Number(d.total_amount ?? 0).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
