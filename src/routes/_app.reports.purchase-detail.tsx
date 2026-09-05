import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
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

export const Route = createFileRoute("/_app/reports/purchase-detail")({
  component: PurchaseDetailReport,
});

type Row = {
  doc_date: string;
  doc_no: string | null;
  vendor_name: string | null;
  product_code: string | null;
  product_name: string | null;
  quantity: number | null;
  unit_price: number | null;
  amount: number | null;
};

const firstOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n: number | null | undefined) =>
  Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

function PurchaseDetailReport() {
  const { allowed, checking } = usePermissionGuard("/reports/purchase-detail");
  const { profile } = useAuth();
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([]);
  const [products, setProducts] = useState<{ id: string; code: string; name: string }[]>([]);
  const [start, setStart] = useState(firstOfMonth());
  const [end, setEnd] = useState(today());
  const [vendorId, setVendorId] = useState<string>("all");
  const [productId, setProductId] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: vs }, { data: pr }] = await Promise.all([
        supabase.from("contacts").select("id,name").in("type", ["vendor", "both"]).order("name"),
        supabase.from("products").select("id,code,name").order("code"),
      ]);
      setVendors((vs ?? []) as { id: string; name: string }[]);
      setProducts((pr ?? []) as { id: string; code: string; name: string }[]);
    })();
  }, []);

  const run = async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    try {
      let q = supabase
        .from("v_purchase_detail")
        .select("doc_date,doc_no,contact_id,vendor_name,product_code,product_name,quantity,unit_price,amount")
        .eq("company_id", profile?.company_id ?? "")
        .gte("doc_date", start)
        .lte("doc_date", end)
        .order("doc_date", { ascending: false });
      if (vendorId !== "all") q = q.eq("contact_id", vendorId);
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

  const total = useMemo(() => rows.reduce((s, r) => s + Number(r.amount ?? 0), 0), [rows]);

  if (checking) return <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (!allowed) return null;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">進貨明細報表</h1>
      <div className="flex flex-wrap items-end gap-3 rounded-md border bg-card p-4">
        <div className="grid gap-1.5"><Label>起日</Label><Input className="w-40" type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
        <div className="grid gap-1.5"><Label>迄日</Label><Input className="w-40" type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
        <div className="grid gap-1.5">
          <Label>廠商</Label>
          <Select value={vendorId} onValueChange={setVendorId}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部廠商</SelectItem>
              {vendors.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
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
          filename="進貨明細"
          columns={[
            { key: "doc_date", label: "日期" },
            { key: "doc_no", label: "單號" },
            { key: "vendor_name", label: "廠商" },
            { key: "product_code", label: "產品編號" },
            { key: "product_name", label: "品名" },
            { key: "quantity", label: "數量", type: "number" },
            { key: "unit_price", label: "單價", type: "number" },
            { key: "amount", label: "金額", type: "number" },
          ]}
        />
      </div>

      <div className="rounded-md border bg-card p-4">
        <div className="text-xs text-muted-foreground">總進貨額</div>
        <div className="text-2xl font-bold">{fmt(total)}</div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>日期</TableHead>
              <TableHead>單號</TableHead>
              <TableHead>廠商</TableHead>
              <TableHead>產品編號</TableHead>
              <TableHead>品名</TableHead>
              <TableHead className="text-right">數量</TableHead>
              <TableHead className="text-right">單價</TableHead>
              <TableHead className="text-right">金額</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground">無資料</TableCell></TableRow>
            )}
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell>{r.doc_date}</TableCell>
                <TableCell>{r.doc_no}</TableCell>
                <TableCell>{r.vendor_name}</TableCell>
                <TableCell>{r.product_code}</TableCell>
                <TableCell>{r.product_name}</TableCell>
                <TableCell className="text-right">{fmt(r.quantity)}</TableCell>
                <TableCell className="text-right">{fmt(r.unit_price)}</TableCell>
                <TableCell className="text-right">{fmt(r.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
