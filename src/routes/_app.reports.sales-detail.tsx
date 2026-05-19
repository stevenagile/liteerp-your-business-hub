import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { ExportExcelButton } from "@/components/ExportExcelButton";

export const Route = createFileRoute("/_app/reports/sales-detail")({
  component: SalesDetailReport,
});

type Row = {
  doc_date: string;
  doc_no: string | null;
  customer_name: string | null;
  sales_person_name: string | null;
  product_code: string | null;
  product_name: string | null;
  quantity: number | null;
  unit_price: number | null;
  amount: number | null;
  unit_cost: number | null;
  gross_profit: number | null;
  margin_pct: number | null;
};

const firstOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n: number | null | undefined) =>
  Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

function SalesDetailReport() {
  const [contacts, setContacts] = useState<{ id: string; name: string }[]>([]);
  const [people, setPeople] = useState<{ id: string; display_name: string | null }[]>([]);
  const [products, setProducts] = useState<{ id: string; code: string; name: string }[]>([]);

  const [start, setStart] = useState(firstOfMonth());
  const [end, setEnd] = useState(today());
  const [customerId, setCustomerId] = useState<string>("all");
  const [personId, setPersonId] = useState<string>("all");
  const [productId, setProductId] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: cs }, { data: pp }, { data: pr }] = await Promise.all([
        supabase.from("contacts").select("id,name").in("type", ["customer", "both"]).order("name"),
        supabase.from("profiles").select("id,display_name").order("display_name"),
        supabase.from("products").select("id,code,name").order("code"),
      ]);
      setContacts((cs ?? []) as { id: string; name: string }[]);
      setPeople((pp ?? []) as { id: string; display_name: string | null }[]);
      setProducts((pr ?? []) as { id: string; code: string; name: string }[]);
    })();
  }, []);

  const run = async () => {
    setLoading(true);
    try {
      let q = supabase
        .from("v_sales_detail")
        .select(
          "doc_date,doc_no,contact_id,customer_name,sales_person_id,sales_person_name,product_code,product_name,quantity,unit_price,amount,unit_cost,gross_profit,margin_pct",
        )
        .gte("doc_date", start)
        .lte("doc_date", end)
        .order("doc_date", { ascending: false });
      if (customerId !== "all") q = q.eq("contact_id", customerId);
      if (personId !== "all") q = q.eq("sales_person_id", personId);
      if (productId !== "all") q = q.eq("product_code", productId);
      const { data, error } = await q;
      if (error) throw error;
      setRows((data ?? []) as Row[]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(() => {
    let amt = 0,
      gp = 0;
    for (const r of rows) {
      amt += Number(r.amount ?? 0);
      gp += Number(r.gross_profit ?? 0);
    }
    return { amt, gp, margin: amt > 0 ? (gp / amt) * 100 : 0 };
  }, [rows]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">銷貨明細報表</h1>

      <div className="flex flex-wrap items-end gap-3 rounded-md border bg-card p-4">
        <div className="grid gap-1.5"><Label>起日</Label><Input className="w-40" type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
        <div className="grid gap-1.5"><Label>迄日</Label><Input className="w-40" type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
        <div className="grid gap-1.5">
          <Label>客戶</Label>
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部客戶</SelectItem>
              {contacts.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>業務員</Label>
          <Select value={personId} onValueChange={setPersonId}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              {people.map((p) => <SelectItem key={p.id} value={p.id}>{p.display_name ?? p.id.slice(0,8)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>產品</Label>
          <Select value={productId} onValueChange={setProductId}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部產品</SelectItem>
              {products.map((p) => <SelectItem key={p.id} value={p.code}>{p.code} {p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={run} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}查詢
        </Button>
        <ExportExcelButton
          rows={rows as unknown as Record<string, unknown>[]}
          filename="銷貨明細"
          columns={[
            { key: "doc_date", label: "日期" },
            { key: "doc_no", label: "單號" },
            { key: "customer_name", label: "客戶" },
            { key: "sales_person_name", label: "業務" },
            { key: "product_code", label: "產品編號" },
            { key: "product_name", label: "品名" },
            { key: "quantity", label: "數量", type: "number" },
            { key: "unit_price", label: "單價", type: "number" },
            { key: "amount", label: "金額", type: "number" },
            { key: "unit_cost", label: "成本", type: "number" },
            { key: "gross_profit", label: "毛利", type: "number" },
            { key: "margin_pct", label: "毛利率(%)", type: "number" },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-md border bg-card p-4"><div className="text-xs text-muted-foreground">總銷售額</div><div className="text-2xl font-bold">{fmt(totals.amt)}</div></div>
        <div className="rounded-md border bg-card p-4"><div className="text-xs text-muted-foreground">總毛利</div><div className="text-2xl font-bold">{fmt(totals.gp)}</div></div>
        <div className="rounded-md border bg-card p-4"><div className="text-xs text-muted-foreground">毛利率</div><div className="text-2xl font-bold">{totals.margin.toFixed(2)}%</div></div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>日期</TableHead>
              <TableHead>單號</TableHead>
              <TableHead>客戶</TableHead>
              <TableHead>業務</TableHead>
              <TableHead>產品編號</TableHead>
              <TableHead>品名</TableHead>
              <TableHead className="text-right">數量</TableHead>
              <TableHead className="text-right">單價</TableHead>
              <TableHead className="text-right">金額</TableHead>
              <TableHead className="text-right">成本</TableHead>
              <TableHead className="text-right">毛利</TableHead>
              <TableHead className="text-right">毛利率</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={12} className="text-center text-sm text-muted-foreground">無資料</TableCell></TableRow>
            )}
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell>{r.doc_date}</TableCell>
                <TableCell>{r.doc_no}</TableCell>
                <TableCell>{r.customer_name}</TableCell>
                <TableCell>{r.sales_person_name ?? "—"}</TableCell>
                <TableCell>{r.product_code}</TableCell>
                <TableCell>{r.product_name}</TableCell>
                <TableCell className="text-right">{fmt(r.quantity)}</TableCell>
                <TableCell className="text-right">{fmt(r.unit_price)}</TableCell>
                <TableCell className="text-right">{fmt(r.amount)}</TableCell>
                <TableCell className="text-right">{fmt(r.unit_cost)}</TableCell>
                <TableCell className="text-right">{fmt(r.gross_profit)}</TableCell>
                <TableCell className="text-right">{Number(r.margin_pct ?? 0).toFixed(2)}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
