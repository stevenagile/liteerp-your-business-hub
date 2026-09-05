import { useEffect, useMemo, useState } from "react";
import { Loader2, Printer } from "lucide-react";
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

export type StatementKind = "customer" | "vendor";

type Contact = {
  id: string;
  name: string;
  tax_id: string | null;
  address: string | null;
  phone: string | null;
  type: string;
};

type Company = {
  name: string | null;
  tax_id: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
};

type Row = {
  txn_date: string;
  txn_type: string | null;
  doc_no: string | null;
  debit: number | null;
  credit: number | null;
};

function firstOfMonth(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function today(): string {
  return new Date().toISOString().slice(0, 10);
}
function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function StatementPage({ kind }: { kind: StatementKind }) {
  const isCustomer = kind === "customer";
  const viewName = isCustomer ? "v_customer_statement" : "v_vendor_statement";
  const title = isCustomer ? "客戶對帳單" : "廠商對帳單";
  const partyLabel = isCustomer ? "客戶" : "廠商";

  const { profile } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [contactId, setContactId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>(firstOfMonth());
  const [endDate, setEndDate] = useState<string>(today());
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [opening, setOpening] = useState<number>(0);
  const [generated, setGenerated] = useState(false);

  useEffect(() => {
    (async () => {
      const types = isCustomer ? ["customer", "both"] : ["vendor", "both"];
      const [{ data: cs }, { data: co }] = await Promise.all([
        supabase
          .from("contacts")
          .select("id,name,tax_id,address,phone,type")
          .in("type", types)
          .order("name"),
        supabase
          .from("company")
          .select("name,tax_id,address,phone,email,logo_url")
          .maybeSingle(),
      ]);
      setContacts((cs ?? []) as Contact[]);
      setCompany((co ?? null) as Company | null);
    })();
  }, [isCustomer]);

  const contact = useMemo(
    () => contacts.find((c) => c.id === contactId) ?? null,
    [contacts, contactId],
  );

  const generate = async () => {
    if (!profile?.company_id) return;
    if (!contactId) return toast.error(`請選擇${partyLabel}`);
    if (!startDate || !endDate) return toast.error("請選擇期間");
    setLoading(true);
    try {
      // 期初：起日之前所有 (debit - credit)
      const { data: prior, error: e1 } = await supabase
        .from(viewName)
        .select("debit,credit")
        .eq("company_id", profile?.company_id ?? "")
        .eq("contact_id", contactId)
        .lt("txn_date", startDate);
      if (e1) throw e1;
      const open = (prior ?? []).reduce(
        (s: number, r: { debit: number | null; credit: number | null }) =>
          s + Number(r.debit ?? 0) - Number(r.credit ?? 0),
        0,
      );
      // 期間明細
      const { data: list, error: e2 } = await supabase
        .from(viewName)
        .select("txn_date,txn_type,doc_no,debit,credit")
        .eq("company_id", profile?.company_id ?? "")
        .eq("contact_id", contactId)
        .gte("txn_date", startDate)
        .lte("txn_date", endDate)
        .order("txn_date", { ascending: true });
      if (e2) throw e2;
      setOpening(open);
      setRows((list ?? []) as Row[]);
      setGenerated(true);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // 逐筆累計餘額
  const running = useMemo(() => {
    let bal = opening;
    return rows.map((r) => {
      bal += Number(r.debit ?? 0) - Number(r.credit ?? 0);
      return { ...r, balance: bal };
    });
  }, [rows, opening]);
  const closing = running.length ? running[running.length - 1].balance : opening;
  const totalDebit = rows.reduce((s, r) => s + Number(r.debit ?? 0), 0);
  const totalCredit = rows.reduce((s, r) => s + Number(r.credit ?? 0), 0);

  const txnLabel = (t: string | null) => {
    const map: Record<string, string> = {
      sales_invoice: "銷貨",
      sales_return: "銷退",
      receipt: "收款",
      purchase_receipt: "進貨",
      purchase_return: "進退",
      payment: "付款",
    };
    return map[t ?? ""] ?? (t ?? "—");
  };

  return (
    <div className="space-y-4">
      {/* 篩選列 — 列印時隱藏 */}
      <div className="no-print space-y-4">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <div className="flex flex-wrap items-end gap-3 rounded-md border bg-card p-4">
          <div className="grid gap-1.5">
            <Label>{partyLabel}</Label>
            <Select value={contactId} onValueChange={setContactId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder={`選擇${partyLabel}`} />
              </SelectTrigger>
              <SelectContent>
                {contacts.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>起日</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-44" />
          </div>
          <div className="grid gap-1.5">
            <Label>迄日</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-44" />
          </div>
          <Button onClick={generate} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            產生對帳單
          </Button>
          {generated && (
            <>
              <ExportExcelButton
                rows={running as unknown as Record<string, unknown>[]}
                filename={title}
                columns={[
                  { key: "txn_date", label: "日期" },
                  { key: "txn_type", label: "摘要", value: (r: Record<string, unknown>) => txnLabel(r.txn_type as string | null) },
                  { key: "doc_no", label: "單號" },
                  { key: "debit", label: "借方", type: "number" },
                  { key: "credit", label: "貸方", type: "number" },
                  { key: "balance", label: "餘額", type: "number" },
                ]}
              />
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" />
                列印 / 存 PDF
              </Button>
            </>
          )}
        </div>
      </div>

      {generated && (
        <div className="print-area mx-auto max-w-[210mm] rounded-md border bg-white p-8 text-black shadow-sm">
          {/* 頁首 */}
          <div className="flex items-start justify-between border-b pb-4">
            <div className="flex items-center gap-3">
              {company?.logo_url && (
                <img src={company.logo_url} alt="logo" className="h-14 w-14 object-contain" />
              )}
              <div>
                <div className="text-lg font-bold">{company?.name ?? "公司名稱"}</div>
                {company?.tax_id && (
                  <div className="text-xs text-gray-600">統一編號：{company.tax_id}</div>
                )}
                {company?.address && (
                  <div className="text-xs text-gray-600">{company.address}</div>
                )}
                {company?.phone && (
                  <div className="text-xs text-gray-600">電話：{company.phone}</div>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold tracking-wider">{title}</div>
              <div className="mt-1 text-xs text-gray-600">
                對帳期間：{startDate} ~ {endDate}
              </div>
            </div>
          </div>

          {/* 對象資訊 */}
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs text-gray-500">{partyLabel}</div>
              <div className="font-medium">{contact?.name ?? "—"}</div>
              {contact?.tax_id && <div className="text-xs text-gray-600">統編：{contact.tax_id}</div>}
              {contact?.address && <div className="text-xs text-gray-600">{contact.address}</div>}
              {contact?.phone && <div className="text-xs text-gray-600">電話：{contact.phone}</div>}
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">期初餘額</div>
              <div className="text-lg font-semibold">{fmt(opening)}</div>
            </div>
          </div>

          {/* 明細 */}
          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">日期</TableHead>
                  <TableHead className="w-24">摘要</TableHead>
                  <TableHead>單號</TableHead>
                  <TableHead className="text-right w-32">借方</TableHead>
                  <TableHead className="text-right w-32">貸方</TableHead>
                  <TableHead className="text-right w-32">餘額</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={5} className="text-xs text-gray-600">期初餘額</TableCell>
                  <TableCell className="text-right font-medium">{fmt(opening)}</TableCell>
                </TableRow>
                {running.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-gray-500">
                      期間內無異動
                    </TableCell>
                  </TableRow>
                )}
                {running.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{r.txn_date}</TableCell>
                    <TableCell>{txnLabel(r.txn_type)}</TableCell>
                    <TableCell>{r.doc_no ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      {Number(r.debit ?? 0) ? fmt(Number(r.debit)) : ""}
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(r.credit ?? 0) ? fmt(Number(r.credit)) : ""}
                    </TableCell>
                    <TableCell className="text-right font-medium">{fmt(r.balance)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2">
                  <TableCell colSpan={3} className="font-semibold">合計</TableCell>
                  <TableCell className="text-right font-semibold">{fmt(totalDebit)}</TableCell>
                  <TableCell className="text-right font-semibold">{fmt(totalCredit)}</TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* 期末餘額 */}
          <div className="mt-6 flex justify-end">
            <div className="w-72 rounded border bg-gray-50 p-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">期初餘額</span>
                <span>{fmt(opening)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">本期借方</span>
                <span>{fmt(totalDebit)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">本期貸方</span>
                <span>{fmt(totalCredit)}</span>
              </div>
              <div className="mt-2 flex justify-between border-t pt-2 text-base font-bold">
                <span>期末餘額</span>
                <span>{fmt(closing)}</span>
              </div>
              <div className="mt-1 text-[11px] text-gray-500">
                {isCustomer ? "（客戶尚欠本公司金額）" : "（本公司尚欠廠商金額）"}
              </div>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-3 gap-6 border-t pt-4 text-center text-xs text-gray-600">
            <div>製單：__________</div>
            <div>覆核：__________</div>
            <div>{partyLabel}簽收：__________</div>
          </div>
        </div>
      )}
    </div>
  );
}
