import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { format, addDays } from "date-fns";
import {
  Loader2,
  GripVertical,
  Download,
  RefreshCw,
  MapPin,
  CircleDollarSign,
  Package,
  Printer,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ExportExcelButton } from "@/components/ExportExcelButton";
import type { ExportColumn } from "@/lib/export-excel";

// ─── Route ───
type RouteSheetSearch = { date?: string; truck?: string };

export const Route = createFileRoute("/_app/route-sheet")({
  validateSearch: (s: Record<string, unknown>): RouteSheetSearch => ({
    date:
      typeof s.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s.date)
        ? s.date
        : undefined,
    truck: s.truck === "大車" || s.truck === "小車" ? (s.truck as string) : undefined,
  }),
  component: RouteSheetPage,
});

// ─── Types ───
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
  route_seq: number | null;
  collect_cash: boolean;
  contact_delivery_note: string | null;
  doc_delivery_note: string | null;
  confirmed_at: string | null;
  pack_per_box: number | null;
};

/** Aggregated stop (one customer) */
type Stop = {
  contact_id: string;
  contact_name: string;
  district: string;
  route_seq: number | null;
  collect_cash: boolean;
  items: string; // "烏龍240g ×3、蛋 ×1"
  cashAmount: number; // placeholder — we don't have line-level price in manifest
  contact_delivery_note: string;
  doc_delivery_note: string;
  orderCount: number;
};

type DistrictGroup = {
  district: string;
  stops: Stop[];
  collapsed: boolean;
};

type ProductSummary = {
  name: string;
  totalQty: number;
  unit: string;
  boxes: string; // "約 N 箱" or "—"
};

// ─── Helpers ───
function todayStr(): string {
  return format(new Date(), "yyyy-MM-dd");
}

function aggregateStops(rows: ManifestRow[]): Stop[] {
  const map = new Map<string, { rows: ManifestRow[]; contact: ManifestRow }>();
  for (const r of rows) {
    const key = r.contact_id ?? r.contact_name ?? r.order_id;
    if (!map.has(key)) map.set(key, { rows: [], contact: r });
    map.get(key)!.rows.push(r);
  }

  return [...map.values()].map(({ rows: rs, contact }) => {
    // Build items string: "product ×qty" joined by 、
    const itemParts = rs.map((r) => {
      const name = r.product_name ?? r.product_code ?? "—";
      const unitSuffix = r.unit ? `(${r.unit})` : "";
      return `${name}${unitSuffix} ×${r.quantity}`;
    });
    const notes = [
      contact.contact_delivery_note,
      contact.doc_delivery_note,
    ]
      .filter(Boolean)
      .join("；");

    return {
      contact_id: contact.contact_id ?? "",
      contact_name: contact.contact_name ?? "(未命名)",
      district: contact.district ?? "(未分區)",
      route_seq: contact.route_seq,
      collect_cash: contact.collect_cash ?? false,
      items: itemParts.join("、"),
      cashAmount: 0,
      contact_delivery_note: notes,
      doc_delivery_note: "",
      orderCount: new Set(rs.map((r) => r.order_id)).size,
    };
  });
}

function groupByDistrict(stops: Stop[]): DistrictGroup[] {
  const map = new Map<string, Stop[]>();
  for (const s of stops) {
    const d = s.district;
    if (!map.has(d)) map.set(d, []);
    map.get(d)!.push(s);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "zh-Hant"))
    .map(([district, stops]) => ({
      district,
      stops: stops.sort(
        (a, b) => (a.route_seq ?? 9999) - (b.route_seq ?? 9999),
      ),
      collapsed: false,
    }));
}

function buildProductSummary(rows: ManifestRow[]): ProductSummary[] {
  const map = new Map<
    string,
    { qty: number; unit: string; packPerBox: number | null }
  >();
  for (const r of rows) {
    const name = r.product_name ?? r.product_code ?? "—";
    if (!map.has(name)) {
      map.set(name, { qty: 0, unit: r.unit ?? "", packPerBox: r.pack_per_box });
    }
    map.get(name)!.qty += r.quantity;
  }
  return [...map.entries()].map(([name, v]) => ({
    name,
    totalQty: v.qty,
    unit: v.unit,
    boxes:
      v.packPerBox && v.packPerBox > 0
        ? `約 ${Math.ceil(v.qty / v.packPerBox)} 箱`
        : "—",
  }));
}

// Excel export columns
const EXPORT_COLS: ExportColumn<Record<string, unknown>>[] = [
  { key: "seq", label: "#", type: "number" },
  { key: "district", label: "區域" },
  { key: "contact_name", label: "客戶名稱" },
  { key: "items", label: "品項 × 數量" },
  { key: "collect_cash", label: "收現" },
  { key: "contact_delivery_note", label: "備註" },
];

// ─── Component ───
function RouteSheetPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const [date, setDate] = useState(search.date ?? todayStr());
  const [truck, setTruck] = useState<"all" | "大車" | "小車">(
    (search.truck as "大車" | "小車") ?? "all",
  );
  const [rows, setRows] = useState<ManifestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<DistrictGroup[]>([]);
  const [saving, setSaving] = useState(false);

  // Drag state
  const dragRef = useRef<{
    district: string;
    fromIdx: number;
  } | null>(null);
  const [dragOver, setDragOver] = useState<{
    district: string;
    idx: number;
  } | null>(null);

  // ── Sync URL params ──
  useEffect(() => {
    navigate({
      search: {
        date: date === todayStr() ? undefined : date,
        truck: truck === "all" ? undefined : truck,
      } as RouteSheetSearch,
      replace: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, truck]);

  // ── Load data ──
  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("v_dispatch_manifest")
      .select("*")
      .eq("delivery_date", date);
    if (truck !== "all") q = q.eq("truck_type", truck);
    const { data, error } = await q
      .order("route_seq", { nullsFirst: true })
      .order("district")
      .order("contact_name")
      .order("line_no");
    if (error) {
      toast.error("讀取出貨資料失敗：" + error.message);
      setRows([]);
    } else {
      setRows((data ?? []) as ManifestRow[]);
    }
    setLoading(false);
  }, [date, truck]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Aggregate rows → stops → district groups ──
  useEffect(() => {
    const stops = aggregateStops(rows);
    setGroups(groupByDistrict(stops));
  }, [rows]);

  // ── Product summary ──
  const productSummary = useMemo(() => buildProductSummary(rows), [rows]);

  // ── Stats ──
  const totalStops = useMemo(
    () => groups.reduce((sum, g) => sum + g.stops.length, 0),
    [groups],
  );
  const cashStops = useMemo(
    () =>
      groups.reduce(
        (sum, g) => sum + g.stops.filter((s) => s.collect_cash).length,
        0,
      ),
    [groups],
  );

  // ── Toggle district collapse ──
  const toggleCollapse = (district: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.district === district ? { ...g, collapsed: !g.collapsed } : g,
      ),
    );
  };

  // ── Drag handlers ──
  const handleDragStart = (district: string, idx: number) => {
    dragRef.current = { district, fromIdx: idx };
  };

  const handleDragOver = (
    e: React.DragEvent,
    district: string,
    idx: number,
  ) => {
    e.preventDefault();
    if (dragRef.current?.district !== district) return;
    setDragOver({ district, idx });
  };

  const handleDrop = (district: string, toIdx: number) => {
    const from = dragRef.current;
    if (!from || from.district !== district || from.fromIdx === toIdx) {
      dragRef.current = null;
      setDragOver(null);
      return;
    }
    setGroups((prev) =>
      prev.map((g) => {
        if (g.district !== district) return g;
        const newStops = [...g.stops];
        const [moved] = newStops.splice(from.fromIdx, 1);
        newStops.splice(toIdx, 0, moved);
        // Assign new route_seq: 10, 20, 30, ...
        return {
          ...g,
          stops: newStops.map((s, i) => ({ ...s, route_seq: (i + 1) * 10 })),
        };
      }),
    );
    dragRef.current = null;
    setDragOver(null);
  };

  const handleDragEnd = () => {
    dragRef.current = null;
    setDragOver(null);
  };

  // ── Save route_seq to DB ──
  const saveRouteSeq = async () => {
    const updates: { contact_id: string; route_seq: number }[] = [];
    for (const g of groups) {
      for (const s of g.stops) {
        if (s.contact_id && s.route_seq != null) {
          updates.push({ contact_id: s.contact_id, route_seq: s.route_seq });
        }
      }
    }
    if (updates.length === 0) {
      toast.info("沒有需要儲存的順序變更");
      return;
    }
    setSaving(true);
    let errCount = 0;
    // batch update route_seq
    for (const u of updates) {
      const { error } = await supabase
        .from("contacts")
        .update({ route_seq: u.route_seq })
        .eq("id", u.contact_id);
      if (error) errCount++;
    }
    setSaving(false);
    if (errCount > 0) {
      toast.error(`${errCount} 筆路順更新失敗`);
    } else {
      toast.success(`已儲存 ${updates.length} 筆路順`);
    }
  };

  // ── Flat list for Excel export ──
  const exportRows = useMemo(() => {
    let seq = 0;
    const flat: Record<string, unknown>[] = [];
    for (const g of groups) {
      for (const s of g.stops) {
        seq++;
        flat.push({
          seq,
          district: s.district,
          contact_name: s.contact_name,
          items: s.items,
          collect_cash: s.collect_cash ? "◯" : "",
          contact_delivery_note: s.contact_delivery_note,
        });
      }
    }
    return flat;
  }, [groups]);

  // ── Print ──
  const handlePrint = () => {
    window.print();
  };

  // ── Render ──
  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">出貨路線單</h1>
          <p className="text-sm text-muted-foreground">
            依區域分組，可拖曳調整站序，匯出 Excel 給司機
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2 no-print">
          <div className="space-y-1">
            <Label className="text-xs">日期</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">車種</Label>
            <Select
              value={truck}
              onValueChange={(v) => setTruck(v as "all" | "大車" | "小車")}
            >
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="大車">大車</SelectItem>
                <SelectItem value="小車">小車</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw
              className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            重新整理
          </Button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="flex flex-wrap gap-3 no-print">
        <Badge variant="secondary" className="gap-1 text-sm">
          <MapPin className="h-3.5 w-3.5" />
          {totalStops} 站
        </Badge>
        <Badge variant="secondary" className="gap-1 text-sm">
          <Package className="h-3.5 w-3.5" />
          {groups.length} 區域
        </Badge>
        {cashStops > 0 && (
          <Badge
            variant="outline"
            className="gap-1 border-amber-300 bg-amber-50 text-sm text-amber-700"
          >
            <CircleDollarSign className="h-3.5 w-3.5" />
            {cashStops} 站需收現
          </Badge>
        )}
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap gap-2 no-print">
        <Button
          size="sm"
          onClick={saveRouteSeq}
          disabled={saving || loading}
        >
          {saving ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <GripVertical className="mr-1 h-4 w-4" />
          )}
          儲存路順
        </Button>
        <ExportExcelButton
          rows={exportRows}
          columns={EXPORT_COLS}
          filename={`出貨路線單_${truck === "all" ? "全車種" : truck}`}
          disabled={exportRows.length === 0}
          size="sm"
        />
        <Button variant="ghost" size="sm" onClick={handlePrint}>
          <Printer className="mr-1 h-4 w-4" />
          列印
        </Button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!loading && groups.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <MapPin className="mb-3 h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">
              {date} 沒有出貨資料
            </p>
            <Button
              variant="link"
              className="mt-2"
              onClick={() => setDate(format(addDays(new Date(), 1), "yyyy-MM-dd"))}
            >
              切換到明天
            </Button>
          </CardContent>
        </Card>
      )}

      {/* District groups */}
      {!loading &&
        groups.map((g) => (
          <Card key={g.district} className="overflow-hidden">
            <CardHeader
              className="cursor-pointer select-none bg-muted/50 py-3"
              onClick={() => toggleCollapse(g.district)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {g.collapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  <CardTitle className="text-base">
                    <MapPin className="mr-1 inline h-4 w-4 text-primary" />
                    {g.district}
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {g.stops.length} 站
                  </Badge>
                  {g.stops.some((s) => s.collect_cash) && (
                    <Badge
                      variant="outline"
                      className="border-amber-300 bg-amber-50 text-xs text-amber-700"
                    >
                      收現 {g.stops.filter((s) => s.collect_cash).length}
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-xs no-print">
                  拖曳 ⠿ 可調整順序
                </CardDescription>
              </div>
            </CardHeader>
            {!g.collapsed && (
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8 text-center no-print" />
                      <TableHead className="w-10 text-center">#</TableHead>
                      <TableHead className="w-32">客戶</TableHead>
                      <TableHead>品項 × 數量</TableHead>
                      <TableHead className="w-16 text-center">收現</TableHead>
                      <TableHead className="w-44">備註</TableHead>
                      <TableHead className="w-10 text-center">✓</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {g.stops.map((stop, idx) => (
                      <TableRow
                        key={stop.contact_id || idx}
                        draggable
                        onDragStart={() =>
                          handleDragStart(g.district, idx)
                        }
                        onDragOver={(e) =>
                          handleDragOver(e, g.district, idx)
                        }
                        onDrop={() => handleDrop(g.district, idx)}
                        onDragEnd={handleDragEnd}
                        className={`transition-colors ${
                          dragOver?.district === g.district &&
                          dragOver?.idx === idx
                            ? "bg-primary/10"
                            : ""
                        } ${stop.collect_cash ? "bg-amber-50/60" : ""}`}
                      >
                        <TableCell className="cursor-grab text-center text-muted-foreground no-print">
                          <GripVertical className="mx-auto h-4 w-4" />
                        </TableCell>
                        <TableCell className="text-center text-xs text-muted-foreground">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="font-medium">
                          {stop.contact_name}
                        </TableCell>
                        <TableCell className="text-sm">{stop.items}</TableCell>
                        <TableCell className="text-center">
                          {stop.collect_cash && (
                            <CircleDollarSign className="mx-auto h-4 w-4 text-amber-600" />
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {stop.contact_delivery_note}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="mx-auto h-4 w-4 rounded border border-muted-foreground/30" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            )}
          </Card>
        ))}

      {/* Product summary */}
      {!loading && productSummary.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4 text-primary" />
              備貨彙總
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>品項</TableHead>
                  <TableHead className="w-24 text-right">總量</TableHead>
                  <TableHead className="w-20">單位</TableHead>
                  <TableHead className="w-24 text-right">約箱數</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productSummary.map((p) => (
                  <TableRow key={p.name}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-right">{p.totalQty}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.unit}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {p.boxes}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
