import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format, addDays } from "date-fns";
import { Loader2, Printer, RefreshCw, Truck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ExportExcelButton } from "@/components/ExportExcelButton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

// 派車頁（車種化）：以「車種（大車／小車）」為主軸，實體車輛為選配。
// 支援 URL 搜尋參數 ?date=YYYY-MM-DD&truck=大車|小車&doc=sales_order|sales_invoice
// 供每日推播深連結直接開到當天出貨單。
type DispatchSearch = {
  date?: string;
  truck?: string;
  doc?: string;
};

export const Route = createFileRoute("/_app/dispatch")({
  validateSearch: (s: Record<string, unknown>): DispatchSearch => ({
    date: typeof s.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s.date) ? s.date : undefined,
    truck: s.truck === "大車" || s.truck === "小車" ? s.truck : undefined,
    doc: s.doc === "sales_order" || s.doc === "sales_invoice" ? s.doc : undefined,
  }),
  component: DispatchPage,
});

type TruckFilter = "all" | "大車" | "小車";
type DocFilter = "all" | "sales_order" | "sales_invoice";

type ManifestRow = {
  delivery_date: string;
  truck_type: string | null;
  vehicle_id: string | null;
  vehicle_name: string | null;
  plate_no: string | null;
  driver_name: string | null;
  doc_type: string;
  order_id: string;
  order_no: string | null;
  contact_id: string | null;
  contact_name: string | null;
  district: string | null;
  line_no: number;
  product_id: string | null;
  product_code: string | null;
  product_name: string | null;
  unit: string | null;
  quantity: number;
  // S2/S3 新增欄位
  route_seq: number | null;
  collect_cash: boolean;
  contact_delivery_note: string | null;
  doc_delivery_note: string | null;
  confirmed_at: string | null;
  pack_per_box: number | null;
};

type TruckGroup = {
  key: string; // "大車" | "小車" | "unassigned"
  label: string;
  unassigned: boolean;
  rows: ManifestRow[];
};

type SheetRun = {
  id: string;
  generated_at: string;
};

const TRUCK_ORDER: Record<string, number> = { 大車: 0, 小車: 1, unassigned: 9 };

function DispatchPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const today = format(new Date(), "yyyy-MM-dd");
  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");

  const [date, setDate] = useState(search.date ?? today);
  const [truck, setTruck] = useState<TruckFilter>((search.truck as TruckFilter) ?? "all");
  const [docType, setDocType] = useState<DocFilter>((search.doc as DocFilter) ?? "all");
  const [rows, setRows] = useState<ManifestRow[]>([]);
  const [loading, setLoading] = useState(true);

  // 重新套用派車規則
  const [reassigning, setReassigning] = useState(false);
  const [fullRecalc, setFullRecalc] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // 最近一次出貨單產生時間（用來標記 late addition）
  const [lastRun, setLastRun] = useState<SheetRun | null>(null);

  // 篩選同步到 URL（可分享 / 推播深連結）
  useEffect(() => {
    navigate({
      search: {
        date: date !== today ? date : undefined,
        truck: truck !== "all" ? truck : undefined,
        doc: docType !== "all" ? docType : undefined,
      },
      replace: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, truck, docType]);

  const load = async () => {
    setLoading(true);
    const [manifestResult, runResult] = await Promise.all([
      (() => {
        let q = supabase
          .from("v_dispatch_manifest")
          .select("*")
          .eq("delivery_date", date);
        if (truck !== "all") q = q.eq("truck_type", truck);
        if (docType !== "all") q = q.eq("doc_type", docType);
        return q
          .order("truck_type", { nullsFirst: false })
          .order("route_seq", { nullsFirst: true })
          .order("district")
          .order("contact_name")
          .order("order_no")
          .order("line_no");
      })(),
      supabase
        .from("dispatch_sheet_runs")
        .select("id, generated_at")
        .eq("delivery_date", date)
        .order("generated_at", { ascending: false })
        .limit(1),
    ]);
    if (manifestResult.error) {
      toast.error("讀取派車單失敗:" + manifestResult.error.message);
    } else {
      setRows((manifestResult.data ?? []) as ManifestRow[]);
    }
    setLastRun((runResult.data?.[0] as SheetRun) ?? null);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, truck, docType]);

  // 依車種分組；truck_type 為 null 者另成「未帶車種」組
  const groups = useMemo<TruckGroup[]>(() => {
    const map = new Map<string, TruckGroup>();
    for (const r of rows) {
      const key = r.truck_type ?? "unassigned";
      if (!map.has(key)) {
        map.set(key, {
          key,
          label: r.truck_type ?? "未帶車種（規則對不到，請補配送規則或客戶地區）",
          unassigned: !r.truck_type,
          rows: [],
        });
      }
      map.get(key)!.rows.push(r);
    }
    return [...map.values()].sort(
      (a, b) => (TRUCK_ORDER[a.key] ?? 5) - (TRUCK_ORDER[b.key] ?? 5),
    );
  }, [rows]);

  const unassignedCount = useMemo(
    () => new Set(rows.filter((r) => !r.truck_type).map((r) => r.order_id)).size,
    [rows],
  );

  const runReassign = async () => {
    setReassigning(true);
    const { data, error } = await supabase.rpc("reassign_dispatch", {
      p_only_unassigned: !fullRecalc,
      p_delivery_date: fullRecalc ? date : null,
    });
    setReassigning(false);
    setConfirmOpen(false);
    if (error) {
      toast.error("重新套用失敗:" + error.message);
      return;
    }
    toast.success(`已回填 ${Number(data ?? 0)} 筆派車`);
    load();
  };

  const handleReassignClick = () => {
    if (fullRecalc) {
      setConfirmOpen(true);
    } else {
      runReassign();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">派車單</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            依車種（大車／小車）與配送日列出當趟要送的訂單／銷貨單與備貨彙總。
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="flex items-center gap-2 rounded-md border px-2 py-1">
            <Button
              size="sm"
              variant="outline"
              onClick={handleReassignClick}
              disabled={reassigning}
            >
              {reassigning ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-1.5 h-4 w-4" />
              )}
              重新套用派車規則
            </Button>
            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
              <Checkbox
                checked={fullRecalc}
                onCheckedChange={(v) => setFullRecalc(Boolean(v))}
              />
              重算 {date} 全部單（會覆蓋手動指定）
            </label>
          </div>
          <ExportExcelButton
            rows={rows as unknown as Record<string, unknown>[]}
            filename={`派車單_${date}${truck !== "all" ? `_${truck}` : ""}`}
            columns={[
              {
                key: "truck_type",
                label: "車種",
                value: (r: Record<string, unknown>) =>
                  String((r as { truck_type: string | null }).truck_type ?? "未帶車種"),
              },
              { key: "vehicle_name", label: "車輛(選配)" },
              { key: "delivery_date", label: "配送日" },
              { key: "route_seq", label: "路順" },
              {
                key: "collect_cash",
                label: "收現",
                value: (r: Record<string, unknown>) =>
                  (r as { collect_cash: boolean }).collect_cash ? "◯" : "",
              },
              {
                key: "doc_type",
                label: "單別",
                value: (r: Record<string, unknown>) =>
                  (r as { doc_type: string }).doc_type === "sales_invoice"
                    ? "銷貨單"
                    : "訂單",
              },
              { key: "order_no", label: "單號" },
              { key: "contact_name", label: "客戶" },
              { key: "district", label: "地區" },
              { key: "product_code", label: "品號" },
              { key: "product_name", label: "品名" },
              { key: "unit", label: "單位" },
              { key: "quantity", label: "數量", type: "number" },
              { key: "pack_per_box", label: "入數/箱" },
              { key: "contact_delivery_note", label: "客戶備註" },
              { key: "doc_delivery_note", label: "單據備註" },
            ]}
          />
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-1.5 h-4 w-4" />
            列印
          </Button>
        </div>
      </div>

      {/* 第一段：篩選 */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4 shadow-sm print:hidden">
        <div className="space-y-1.5">
          <Label className="text-xs">配送日</Label>
          <Input
            type="date"
            className="w-40"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
          />
        </div>
        <div className="flex gap-1 pb-0.5">
          <Button
            size="sm"
            variant={date === today ? "default" : "outline"}
            onClick={() => setDate(today)}
          >
            今天
          </Button>
          <Button
            size="sm"
            variant={date === tomorrow ? "default" : "outline"}
            onClick={() => setDate(tomorrow)}
          >
            明天
          </Button>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">車種</Label>
          <Select value={truck} onValueChange={(v) => setTruck(v as TruckFilter)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="大車">大車</SelectItem>
              <SelectItem value="小車">小車</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">單別</Label>
          <Select value={docType} onValueChange={(v) => setDocType(v as DocFilter)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="sales_order">訂單</SelectItem>
              <SelectItem value="sales_invoice">銷貨單</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {unassignedCount > 0 && (
          <div className="ml-auto rounded-md bg-warning/10 px-3 py-1.5 text-xs text-warning-foreground">
            ⚠ {unassignedCount} 張單未帶車種，可按「重新套用派車規則」補齊
          </div>
        )}
      </div>

      {/* 第二段：結果 */}
      {loading ? (
        <div className="flex h-40 items-center justify-center rounded-lg border bg-card">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : groups.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-lg border bg-card text-sm text-muted-foreground">
          {date} 沒有排定配送的{truck !== "all" ? truck : ""}單據。
        </div>
      ) : (
        groups.map((g) => <TruckManifest key={g.key} group={g} date={date} lastRunAt={lastRun?.generated_at ?? null} />)
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>重算 {date} 全部單的派車？</AlertDialogTitle>
            <AlertDialogDescription>
              會依目前的配送規則重新計算該日所有訂單／銷貨單的車種與配送日，
              <span className="font-medium text-foreground">手動指定的車種會被覆蓋</span>。
              只想補「未帶車種」的單，請取消勾選後再執行。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={runReassign} disabled={reassigning}>
              確定重算
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TruckManifest({ group, date, lastRunAt }: { group: TruckGroup; date: string; lastRunAt: string | null }) {
  // 備貨彙總：同產品（品名+單位）跨客戶加總，方便倉庫一次備齊
  const productSummary = useMemo(() => {
    const map = new Map<
      string,
      { code: string | null; name: string | null; unit: string | null; qty: number; packPerBox: number | null }
    >();
    for (const r of group.rows) {
      const key = `${r.product_id ?? r.product_code}|${r.unit ?? ""}`;
      const cur = map.get(key);
      if (cur) {
        cur.qty += Number(r.quantity) || 0;
      } else {
        map.set(key, {
          code: r.product_code,
          name: r.product_name,
          unit: r.unit,
          qty: Number(r.quantity) || 0,
          packPerBox: r.pack_per_box,
        });
      }
    }
    return [...map.values()].sort((a, b) =>
      (a.code ?? "").localeCompare(b.code ?? ""),
    );
  }, [group.rows]);

  // 各站明細：依路順→地區→客戶→單號→行號排序（view 已排好，這裡保留順序用 Map）
  const orders = useMemo(() => {
    const map = new Map<
      string,
      {
        order_no: string | null;
        doc_type: string;
        contact_name: string | null;
        district: string | null;
        vehicle_name: string | null;
        route_seq: number | null;
        collect_cash: boolean;
        contact_delivery_note: string | null;
        doc_delivery_note: string | null;
        confirmed_at: string | null;
        lines: ManifestRow[];
      }
    >();
    for (const r of group.rows) {
      if (!map.has(r.order_id)) {
        map.set(r.order_id, {
          order_no: r.order_no,
          doc_type: r.doc_type,
          contact_name: r.contact_name,
          district: r.district,
          vehicle_name: r.vehicle_name,
          route_seq: r.route_seq,
          collect_cash: r.collect_cash,
          contact_delivery_note: r.contact_delivery_note,
          doc_delivery_note: r.doc_delivery_note,
          confirmed_at: r.confirmed_at,
          lines: [],
        });
      }
      map.get(r.order_id)!.lines.push(r);
    }
    return [...map.values()];
  }, [group.rows]);

  const totalQty = productSummary.reduce((s, p) => s + p.qty, 0);
  const cashStations = orders.filter((o) => o.collect_cash).length;

  return (
    <section
      className={
        "break-inside-avoid rounded-lg border bg-card shadow-sm print:break-after-page" +
        (group.unassigned ? " border-warning/50" : "")
      }
    >
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b px-4 py-3">
        <div className="flex items-center gap-2 text-base font-semibold">
          <Truck className="h-4 w-4 text-muted-foreground" />
          {group.label}
        </div>
        <div className="text-sm text-muted-foreground">配送日：{date}</div>
        <div className="ml-auto flex gap-4 text-sm text-muted-foreground">
          <span>{orders.length} 站</span>
          {cashStations > 0 && <span className="text-warning-foreground">收現 {cashStations} 站</span>}
          <span>合計 {totalQty.toLocaleString()}</span>
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-2">
        {/* 備貨彙總 */}
        <div>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
            備貨彙總
          </h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">品號</TableHead>
                <TableHead>品名</TableHead>
                <TableHead className="w-16">單位</TableHead>
                <TableHead className="w-20 text-right">入數/箱</TableHead>
                <TableHead className="w-24 text-right">總數量</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productSummary.map((p, i) => (
                <TableRow key={i}>
                  <TableCell className="font-mono text-xs">
                    {p.code ?? "—"}
                  </TableCell>
                  <TableCell>{p.name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.unit ?? "—"}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {p.packPerBox ?? "—"}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {p.qty.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* 各站明細 */}
        <div>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
            各站明細
          </h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>客戶 / 單據</TableHead>
                <TableHead>品名</TableHead>
                <TableHead className="w-24 text-right">數量</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o, oi) => {
                const isLate = lastRunAt && o.confirmed_at && o.confirmed_at > lastRunAt;
                return o.lines.map((l, li) => (
                  <TableRow key={`${oi}-${li}`} className={isLate ? "bg-amber-50 dark:bg-amber-500/5" : ""}>
                    {li === 0 ? (
                      <>
                        <TableCell
                          rowSpan={o.lines.length}
                          className="align-top text-center text-xs text-muted-foreground"
                        >
                          {o.route_seq ?? "—"}
                        </TableCell>
                        <TableCell
                          rowSpan={o.lines.length}
                          className="align-top"
                        >
                          <div className="font-medium">
                            {o.contact_name ?? "—"}
                            {o.collect_cash && (
                              <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-warning text-xs text-warning-foreground" title="收現">◯</span>
                            )}
                            {isLate && (
                              <AlertTriangle className="ml-1 inline h-3.5 w-3.5 text-amber-500" title="出單後才確認（late addition）" />
                            )}
                            {o.district && (
                              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                                {o.district}
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-xs text-muted-foreground">
                            {o.order_no ?? "—"}
                            <span className="ml-1 rounded bg-muted px-1 py-0.5 font-sans text-[10px]">
                              {o.doc_type === "sales_invoice" ? "銷貨" : "訂單"}
                            </span>
                            {o.vehicle_name && (
                              <span className="ml-1 font-sans text-[10px]">
                                車：{o.vehicle_name}
                              </span>
                            )}
                          </div>
                          {(o.contact_delivery_note || o.doc_delivery_note) && (
                            <div className="mt-0.5 text-xs text-muted-foreground italic">
                              {o.contact_delivery_note && <span>客:{o.contact_delivery_note}</span>}
                              {o.contact_delivery_note && o.doc_delivery_note && <span> / </span>}
                              {o.doc_delivery_note && <span>單:{o.doc_delivery_note}</span>}
                            </div>
                          )}
                        </TableCell>
                      </>
                    ) : null}
                    <TableCell>{l.product_name ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {Number(l.quantity).toLocaleString()}
                      <span className="ml-1 text-xs text-muted-foreground">
                        {l.unit ?? ""}
                      </span>
                    </TableCell>
                  </TableRow>
                ));
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </section>
  );
}
