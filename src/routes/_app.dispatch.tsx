import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format, addDays } from "date-fns";
import { Loader2, Printer, Truck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExportExcelButton } from "@/components/ExportExcelButton";
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

export const Route = createFileRoute("/_app/dispatch")({
  component: DispatchPage,
});

type ManifestRow = {
  vehicle_id: string | null;
  vehicle_name: string | null;
  plate_no: string | null;
  driver_name: string | null;
  delivery_date: string;
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
};

type VehicleOpt = { id: string; name: string };

type VehicleGroup = {
  key: string;
  vehicle_name: string;
  plate_no: string | null;
  driver_name: string | null;
  rows: ManifestRow[];
};

function DispatchPage() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [date, setDate] = useState(today);
  const [vehicleId, setVehicleId] = useState<string>("all");
  const [vehicles, setVehicles] = useState<VehicleOpt[]>([]);
  const [rows, setRows] = useState<ManifestRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("vehicles")
      .select("id, name")
      .order("name")
      .then(({ data }) => setVehicles((data ?? []) as VehicleOpt[]));
  }, []);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("v_dispatch_manifest")
      .select("*")
      .eq("delivery_date", date)
      .order("order_no")
      .order("line_no");
    if (vehicleId !== "all") {
      if (vehicleId === "unassigned") {
        q = q.is("vehicle_id", null);
      } else {
        q = q.eq("vehicle_id", vehicleId);
      }
    }
    const { data, error } = await q;
    if (error) {
      toast.error("讀取派車單失敗:" + error.message);
    } else {
      setRows((data ?? []) as ManifestRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, vehicleId]);

  // 依車輛分組
  const groups = useMemo<VehicleGroup[]>(() => {
    const map = new Map<string, VehicleGroup>();
    for (const r of rows) {
      const key = r.vehicle_id ?? "unassigned";
      if (!map.has(key)) {
        map.set(key, {
          key,
          vehicle_name: r.vehicle_name ?? "未指派車輛",
          plate_no: r.plate_no,
          driver_name: r.driver_name,
          rows: [],
        });
      }
      map.get(key)!.rows.push(r);
    }
    return [...map.values()].sort((a, b) =>
      a.vehicle_name.localeCompare(b.vehicle_name, "zh-Hant"),
    );
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">派車單</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            依車輛與配送日列出當趟要送的訂單與備貨彙總。
          </p>
        </div>
        <div className="flex gap-2">
          <ExportExcelButton
            rows={rows as unknown as Record<string, unknown>[]}
            filename={`派車單_${date}`}
            columns={[
              { key: "vehicle_name", label: "車輛" },
              { key: "driver_name", label: "司機" },
              { key: "delivery_date", label: "配送日" },
              { key: "order_no", label: "訂單單號" },
              { key: "contact_name", label: "客戶" },
              { key: "district", label: "地區" },
              { key: "product_code", label: "品號" },
              { key: "product_name", label: "品名" },
              { key: "unit", label: "單位" },
              { key: "quantity", label: "數量", type: "number" },
            ]}
          />
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-1.5 h-4 w-4" />
            列印
          </Button>
        </div>
      </div>

      {/* 篩選 */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4 shadow-sm print:hidden">
        <div className="space-y-1.5">
          <Label className="text-xs">配送日</Label>
          <Input
            type="date"
            className="w-40"
            value={date}
            onChange={(e) => setDate(e.target.value)}
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
            variant={
              date === format(addDays(new Date(), 1), "yyyy-MM-dd")
                ? "default"
                : "outline"
            }
            onClick={() => setDate(format(addDays(new Date(), 1), "yyyy-MM-dd"))}
          >
            明天
          </Button>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">車輛</Label>
          <Select value={vehicleId} onValueChange={setVehicleId}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部車輛</SelectItem>
              <SelectItem value="unassigned">未指派</SelectItem>
              {vehicles.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center rounded-lg border bg-card">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : groups.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-lg border bg-card text-sm text-muted-foreground">
          {date} 沒有排定配送的訂單。
        </div>
      ) : (
        groups.map((g) => <VehicleManifest key={g.key} group={g} date={date} />)
      )}
    </div>
  );
}

function VehicleManifest({ group, date }: { group: VehicleGroup; date: string }) {
  // 備貨彙總:同產品跨訂單加總
  const productSummary = useMemo(() => {
    const map = new Map<
      string,
      { code: string | null; name: string | null; unit: string | null; qty: number }
    >();
    for (const r of group.rows) {
      const key = r.product_id ?? `${r.product_code}`;
      const cur = map.get(key);
      if (cur) {
        cur.qty += Number(r.quantity) || 0;
      } else {
        map.set(key, {
          code: r.product_code,
          name: r.product_name,
          unit: r.unit,
          qty: Number(r.quantity) || 0,
        });
      }
    }
    return [...map.values()].sort((a, b) =>
      (a.code ?? "").localeCompare(b.code ?? ""),
    );
  }, [group.rows]);

  // 訂單分組(維持明細順序)
  const orders = useMemo(() => {
    const map = new Map<
      string,
      {
        order_no: string | null;
        contact_name: string | null;
        district: string | null;
        lines: ManifestRow[];
      }
    >();
    for (const r of group.rows) {
      if (!map.has(r.order_id)) {
        map.set(r.order_id, {
          order_no: r.order_no,
          contact_name: r.contact_name,
          district: r.district,
          lines: [],
        });
      }
      map.get(r.order_id)!.lines.push(r);
    }
    return [...map.values()];
  }, [group.rows]);

  return (
    <section className="break-inside-avoid rounded-lg border bg-card shadow-sm">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b px-4 py-3">
        <div className="flex items-center gap-2 text-base font-semibold">
          <Truck className="h-4 w-4 text-muted-foreground" />
          {group.vehicle_name}
        </div>
        {group.plate_no && (
          <div className="font-mono text-sm text-muted-foreground">
            {group.plate_no}
          </div>
        )}
        {group.driver_name && (
          <div className="text-sm text-muted-foreground">
            司機：{group.driver_name}
          </div>
        )}
        <div className="text-sm text-muted-foreground">配送日：{date}</div>
        <div className="ml-auto text-sm text-muted-foreground">
          {orders.length} 張訂單
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
            配送明細
          </h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>客戶 / 訂單</TableHead>
                <TableHead>品名</TableHead>
                <TableHead className="w-24 text-right">數量</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o, oi) =>
                o.lines.map((l, li) => (
                  <TableRow key={`${oi}-${li}`}>
                    {li === 0 ? (
                      <TableCell
                        rowSpan={o.lines.length}
                        className="align-top"
                      >
                        <div className="font-medium">
                          {o.contact_name ?? "—"}
                        </div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {o.order_no ?? "—"}
                        </div>
                        {o.district && (
                          <div className="text-xs text-muted-foreground">
                            {o.district}
                          </div>
                        )}
                      </TableCell>
                    ) : null}
                    <TableCell>{l.product_name ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {Number(l.quantity).toLocaleString()}
                      <span className="ml-1 text-xs text-muted-foreground">
                        {l.unit ?? ""}
                      </span>
                    </TableCell>
                  </TableRow>
                )),
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </section>
  );
}
