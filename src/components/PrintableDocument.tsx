import { useEffect, useState } from "react";
import { Loader2, Printer, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

export type PrintDocType =
  | "quotation"
  | "sales_order"
  | "sales_invoice"
  | "purchase_order"
  | "purchase_receipt";

const DOC_TYPE_LABEL: Record<PrintDocType, string> = {
  quotation: "報價單",
  sales_order: "訂購單",
  sales_invoice: "銷貨單",
  purchase_order: "採購單",
  purchase_receipt: "進貨單",
};

const PURCHASE_TYPES: PrintDocType[] = ["purchase_order", "purchase_receipt"];

type Company = {
  name: string | null;
  tax_id: string | null;
  address: string | null;
  phone: string | null;
  email?: string | null;
  logo_url?: string | null;
};

type Contact = {
  name: string | null;
  tax_id: string | null;
  address: string | null;
  phone: string | null;
};

type Header = {
  id: string;
  doc_type: string;
  doc_no: string | null;
  doc_date: string;
  contact_id: string | null;
  contact_name: string | null;
  notes: string | null;
  subtotal: number | null;
  tax_amount: number | null;
  total_amount: number | null;
};

type Line = {
  line_no: number | null;
  product_code: string | null;
  product_name: string | null;
  unit: string | null;
  quantity: number | null;
  unit_price: number | null;
  discount_pct: number | null;
};

function fmtNum(n: number | null | undefined, digits = 0) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return Number(n).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function lineAmount(l: Line) {
  const qty = Number(l.quantity ?? 0);
  const price = Number(l.unit_price ?? 0);
  const disc = Number(l.discount_pct ?? 0);
  return qty * price * (1 - disc / 100);
}

export function PrintableDocument({
  docType,
  docId,
  companyId,
  onBack,
}: {
  docType: PrintDocType;
  docId: string;
  companyId?: string;
  onBack?: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [header, setHeader] = useState<Header | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);

  const isPurchase = PURCHASE_TYPES.includes(docType);
  const partyLabel = isPurchase ? "廠商" : "客戶";
  const title = DOC_TYPE_LABEL[docType] ?? "單據";

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [{ data: h, error: he }, { data: ls }, { data: comp }] =
          await Promise.all([
            supabase
              .from("doc_headers")
              .select(
                "id, doc_type, doc_no, doc_date, contact_id, contact_name, notes, subtotal, tax_amount, total_amount",
              )
              .eq("id", docId)
              .eq("company_id", companyId ?? "")
              .maybeSingle(),
            supabase
              .from("doc_lines")
              .select(
                "line_no, product_code, product_name, unit, quantity, unit_price, discount_pct",
              )
              .eq("header_id", docId)
              .order("line_no"),
            supabase
              .from("company")
              .select("name, tax_id, address, phone, email, logo_url")
              .eq("id", companyId ?? "")
              .limit(1)
              .maybeSingle(),
          ]);
        if (he) throw he;
        setHeader((h as Header) ?? null);
        setLines((ls ?? []) as Line[]);
        setCompany((comp as Company) ?? null);

        const contactId = (h as Header | null)?.contact_id ?? null;
        if (contactId) {
          const { data: cc } = await supabase
            .from("contacts")
            .select("name, tax_id, address, phone")
            .eq("id", contactId)
            .eq("company_id", companyId ?? "")
            .maybeSingle();
          setContact((cc as Contact) ?? null);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        toast.error("讀取單據失敗：" + msg);
      } finally {
        setLoading(false);
      }
    })();
  }, [docId]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!header) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        找不到單據
      </div>
    );
  }

  return (
    <div className="bg-muted/30 min-h-screen">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-area { margin: 0; box-shadow: none; }
          @page { size: A4; margin: 15mm; }
        }
      `}</style>
      <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b bg-card px-4 py-2 shadow-sm">
        <Button variant="ghost" size="sm" onClick={onBack ?? (() => window.history.back())}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          返回
        </Button>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="mr-1 h-4 w-4" />
          列印 / 存 PDF
        </Button>
      </div>

      <div className="print-area mx-auto my-6 max-w-[210mm] bg-white p-10 text-[12px] leading-snug text-black shadow-md">
        <div className="flex items-start justify-between border-b-2 border-black pb-4">
          <div className="flex items-start gap-3">
            {company?.logo_url ? (
              <img
                src={company.logo_url}
                alt="logo"
                className="h-16 w-16 object-contain"
              />
            ) : null}
            <div>
              <div className="text-xl font-bold">
                {company?.name ?? "公司名稱"}
              </div>
              {company?.tax_id && (
                <div className="text-[11px] text-gray-700">
                  統一編號：{company.tax_id}
                </div>
              )}
              {company?.address && (
                <div className="text-[11px] text-gray-700">
                  {company.address}
                </div>
              )}
              <div className="text-[11px] text-gray-700">
                {company?.phone ? `電話：${company.phone}` : ""}
                {company?.phone && company?.email ? "　" : ""}
                {company?.email ? `Email：${company.email}` : ""}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold tracking-widest">{title}</div>
            <div className="mt-1 text-[11px] text-gray-700">
              {DOC_TYPE_LABEL[docType]}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-6">
          <div className="border border-gray-400">
            <div className="bg-gray-100 px-2 py-1 text-[11px] font-medium">
              {partyLabel}資訊
            </div>
            <table className="w-full text-[11px]">
              <tbody>
                <tr>
                  <td className="w-16 border-t border-gray-300 px-2 py-1 text-gray-600">
                    {partyLabel}
                  </td>
                  <td className="border-t border-gray-300 px-2 py-1 font-medium">
                    {contact?.name ?? header.contact_name ?? "—"}
                  </td>
                </tr>
                <tr>
                  <td className="border-t border-gray-300 px-2 py-1 text-gray-600">
                    統編
                  </td>
                  <td className="border-t border-gray-300 px-2 py-1">
                    {contact?.tax_id ?? "—"}
                  </td>
                </tr>
                <tr>
                  <td className="border-t border-gray-300 px-2 py-1 text-gray-600">
                    地址
                  </td>
                  <td className="border-t border-gray-300 px-2 py-1">
                    {contact?.address ?? "—"}
                  </td>
                </tr>
                <tr>
                  <td className="border-t border-gray-300 px-2 py-1 text-gray-600">
                    電話
                  </td>
                  <td className="border-t border-gray-300 px-2 py-1">
                    {contact?.phone ?? "—"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="border border-gray-400">
            <div className="bg-gray-100 px-2 py-1 text-[11px] font-medium">
              單據資訊
            </div>
            <table className="w-full text-[11px]">
              <tbody>
                <tr>
                  <td className="w-20 border-t border-gray-300 px-2 py-1 text-gray-600">
                    單據編號
                  </td>
                  <td className="border-t border-gray-300 px-2 py-1 font-mono font-medium">
                    {header.doc_no ?? "—"}
                  </td>
                </tr>
                <tr>
                  <td className="border-t border-gray-300 px-2 py-1 text-gray-600">
                    單據日期
                  </td>
                  <td className="border-t border-gray-300 px-2 py-1">
                    {header.doc_date}
                  </td>
                </tr>
                <tr>
                  <td className="border-t border-gray-300 px-2 py-1 text-gray-600">
                    列印日期
                  </td>
                  <td className="border-t border-gray-300 px-2 py-1">
                    {new Date().toISOString().slice(0, 10)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <table className="mt-4 w-full border-collapse border border-gray-500 text-[11px]">
          <thead>
            <tr className="bg-gray-100">
              <th className="w-8 border border-gray-500 px-1 py-1.5">#</th>
              <th className="w-24 border border-gray-500 px-2 py-1.5 text-left">
                產品編號
              </th>
              <th className="border border-gray-500 px-2 py-1.5 text-left">
                品名規格
              </th>
              <th className="w-16 border border-gray-500 px-1 py-1.5 text-right">
                數量
              </th>
              <th className="w-12 border border-gray-500 px-1 py-1.5">單位</th>
              <th className="w-20 border border-gray-500 px-2 py-1.5 text-right">
                單價
              </th>
              <th className="w-14 border border-gray-500 px-1 py-1.5 text-right">
                折扣%
              </th>
              <th className="w-24 border border-gray-500 px-2 py-1.5 text-right">
                金額
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="border border-gray-500 px-2 py-6 text-center text-gray-500"
                >
                  無明細資料
                </td>
              </tr>
            ) : (
              lines.map((l, i) => (
                <tr key={i}>
                  <td className="border border-gray-400 px-1 py-1 text-center">
                    {l.line_no ?? i + 1}
                  </td>
                  <td className="border border-gray-400 px-2 py-1 font-mono">
                    {l.product_code ?? "—"}
                  </td>
                  <td className="border border-gray-400 px-2 py-1">
                    {l.product_name ?? "—"}
                  </td>
                  <td className="border border-gray-400 px-1 py-1 text-right tabular-nums">
                    {fmtNum(l.quantity)}
                  </td>
                  <td className="border border-gray-400 px-1 py-1 text-center">
                    {l.unit ?? ""}
                  </td>
                  <td className="border border-gray-400 px-2 py-1 text-right tabular-nums">
                    {fmtNum(l.unit_price, 2)}
                  </td>
                  <td className="border border-gray-400 px-1 py-1 text-right tabular-nums">
                    {l.discount_pct ? fmtNum(l.discount_pct, 1) : "—"}
                  </td>
                  <td className="border border-gray-400 px-2 py-1 text-right tabular-nums">
                    {fmtNum(lineAmount(l), 2)}
                  </td>
                </tr>
              ))
            )}
            {lines.length > 0 && lines.length < 8
              ? Array.from({ length: 8 - lines.length }).map((_, i) => (
                  <tr key={`f-${i}`} className="h-6">
                    <td className="border border-gray-400 px-1 py-1" colSpan={8}>
                      &nbsp;
                    </td>
                  </tr>
                ))
              : null}
          </tbody>
        </table>

        <div className="mt-3 flex justify-end">
          <table className="w-72 text-[12px]">
            <tbody>
              <tr>
                <td className="px-2 py-1 text-right text-gray-700">未稅合計</td>
                <td className="w-32 px-2 py-1 text-right tabular-nums">
                  {fmtNum(header.subtotal, 2)}
                </td>
              </tr>
              <tr>
                <td className="px-2 py-1 text-right text-gray-700">稅金</td>
                <td className="px-2 py-1 text-right tabular-nums">
                  {fmtNum(header.tax_amount, 2)}
                </td>
              </tr>
              <tr className="border-t-2 border-black">
                <td className="px-2 py-1.5 text-right text-base font-bold">
                  總計
                </td>
                <td className="px-2 py-1.5 text-right text-base font-bold tabular-nums">
                  {fmtNum(header.total_amount, 2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {header.notes ? (
          <div className="mt-4 border border-gray-300 p-2 text-[11px]">
            <div className="font-medium text-gray-700">備註</div>
            <div className="mt-1 whitespace-pre-wrap">{header.notes}</div>
          </div>
        ) : null}

        <div className="mt-10 grid grid-cols-3 gap-6 text-[11px]">
          {["製單", "審核", `${partyLabel}簽收`].map((label) => (
            <div key={label} className="text-center">
              <div className="h-16 border-b border-gray-500" />
              <div className="mt-1 text-gray-700">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
