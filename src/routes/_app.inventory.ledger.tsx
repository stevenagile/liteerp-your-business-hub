import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { SearchSelect } from "@/components/SearchSelect";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/inventory/ledger")({
  component: InventoryLedgerPage,
});

const PAGE_SIZE = 50;

const MOVEMENT_TYPES = [
  { key: "opening", label: "期初入庫", color: "info" },
  { key: "sale", label: "銷貨出庫", color: "destructive" },
  { key: "purchase", label: "進貨入庫", color: "success" },
  { key: "sales_return", label: "銷退入庫", color: "success" },
  { key: "purchase_return", label: "進退出庫", color: "destructive" },
  { key: "adjust", label: "庫存調整", color: "secondary" },
  { key: "void_reverse", label: "作廢沖回", color: "secondary" },
] as const;

type MovementKey = (typeof MOVEMENT_TYPES)[number]["key"];

type LedgerRow = {
  movement_date: string;
  product_code: string;
  product_name: string;
  warehouse_name: string;
  movement_type: string;
  quantity_change: number | null;
  balance_after: number | null;
  unit_cost: number | null;
  movement_value: number | null;
  source_doc_no: string | null;
  source_doc_type: string | null;
};

function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

function fmtNum(n: number | null | undefined, digits = 0) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return Number(n).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function InventoryLedgerPage() {
  const [list, setList] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);

  // filters
  const [productCode, setProductCode] = useState<string | null>(null);
  const [warehouse, setWarehouse] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<MovementKey[]>([]);

  // filter options
  const [productOptions, setProductOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [warehouseOptions, setWarehouseOptions] = useState<
    { value: string; label: string }[]
  >([]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // load filter options once
  useEffect(() => {
    (async () => {
      const [{ data: pd }, { data: wh }] = await Promise.all([
        supabase
          .from("v_inventory_ledger")
          .select("product_code, product_name")
          .order("product_code", { ascending: true }),
        supabase
          .from("v_inventory_ledger")
          .select("warehouse_name")
          .order("warehouse_name", { ascending: true }),
      ]);
      const prods = Array.from(
        new Map(
          (pd ?? []).map((r: any) => [r.product_code, r.product_name]),
        ).entries(),
      ).map(([code, name]) => ({
        value: code,
        label: `${code} — ${name}`,
      }));
      const whs = Array.from(
        new Set((wh ?? []).map((r: any) => r.warehouse_name)),
      ).map((w) => ({ value: w as string, label: w as string }));
      setProductOptions(prods);
      setWarehouseOptions(whs);
    })();
  }, []);

  const load = async (targetPage = page) => {
    setLoading(true);

    let q = supabase
      .from("v_inventory_ledger")
      .select(
        "movement_date, product_code, product_name, warehouse_name, movement_type, quantity_change, balance_after, unit_cost, movement_value, source_doc_no, source_doc_type",
        { count: "exact" },
      )
      .order("movement_date", { ascending: false });

    if (productCode) q = q.eq("product_code", productCode);
    if (warehouse) q = q.eq("warehouse_name", warehouse);
    if (dateFrom) q = q.gte("movement_date", dateFrom);
    if (dateTo) q = q.lte("movement_date", `${dateTo}T23:59:59`);
    if (selectedTypes.length > 0) q = q.in("movement_type", selectedTypes);

    const from = targetPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    q = q.range(from, to);

    const { data, error, count } = await q;
    if (error) {
      toast.error("讀取庫存異動明細失敗：" + error.message);
      setList([]);
      setTotal(0);
    } else {
      setList((data ?? []) as LedgerRow[]);
      setTotal(count ?? 0);
    }
    setLoading(false);
  };

  useEffect(() => {
    load(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productCode, warehouse, dateFrom, dateTo, selectedTypes.join(",")]);

  const toggleType = (key: MovementKey) => {
    setSelectedTypes((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
    setPage(0);
  };

  const clearFilters = () => {
    setProductCode(null);
    setWarehouse(null);
    setDateFrom("");
    setDateTo("");
    setSelectedTypes([]);
    setPage(0);
  };

  const hasFilters =
    productCode || warehouse || dateFrom || dateTo || selectedTypes.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          庫存異動明細
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          追蹤所有庫存異動紀錄，包含銷貨、進貨、退貨與調整。共 {total} 筆。
        </p>
      </div>

      {/* Filters */}
      <div className="space-y-3 rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-56 space-y-1.5">
            <Label className="text-xs">產品</Label>
            <SearchSelect
              value={productCode}
              options={productOptions}
              onChange={(v) => {
                setProductCode(v);
                setPage(0);
              }}
              placeholder="全部產品"
              emptyText="查無產品"
            />
          </div>
          <div className="w-44 space-y-1.5">
            <Label className="text-xs">倉庫</Label>
            <SearchSelect
              value={warehouse}
              options={warehouseOptions}
              onChange={(v) => {
                setWarehouse(v);
                setPage(0);
              }}
              placeholder="全部倉庫"
              emptyText="查無倉庫"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">起始日期</Label>
            <Input
              type="date"
              className="w-40"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(0);
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">結束日期</Label>
            <Input
              type="date"
              className="w-40"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(0);
              }}
            />
          </div>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="mb-0.5"
            >
              <RotateCcw className="mr-1 h-3.5 w-3.5" />
              清除篩選
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">異動類型：</span>
          {MOVEMENT_TYPES.map((t) => {
            const checked = selectedTypes.includes(t.key);
            return (
              <label
                key={t.key}
                className={cn(
                  "flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors",
                  checked
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input hover:bg-muted",
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggleType(t.key)}
                  className="h-3.5 w-3.5"
                />
                <span>{t.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-40">異動時間</TableHead>
              <TableHead>產品</TableHead>
              <TableHead className="w-32">倉庫</TableHead>
              <TableHead className="w-28">異動類型</TableHead>
              <TableHead className="w-24 text-right">異動數量</TableHead>
              <TableHead className="w-24 text-right">異動後餘額</TableHead>
              <TableHead className="w-24 text-right">單位成本</TableHead>
              <TableHead className="w-28 text-right">異動金額</TableHead>
              <TableHead className="w-36">來源單號</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  <Loader2 className="inline h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : list.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  尚無庫存異動紀錄
                </TableCell>
              </TableRow>
            ) : (
              list.map((r, i) => (
                <TableRow key={`${r.movement_date}-${r.product_code}-${i}`}>
                  <TableCell className="font-mono text-xs">
                    {fmtDateTime(r.movement_date)}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{r.product_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.product_code}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.warehouse_name}
                  </TableCell>
                  <TableCell>
                    <MovementTypeBadge type={r.movement_type} />
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right tabular-nums font-medium",
                      (r.quantity_change ?? 0) > 0
                        ? "text-success"
                        : (r.quantity_change ?? 0) < 0
                          ? "text-destructive"
                          : "",
                    )}
                  >
                    {r.quantity_change != null && r.quantity_change > 0
                      ? `+${fmtNum(r.quantity_change)}`
                      : fmtNum(r.quantity_change)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmtNum(r.balance_after)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmtNum(r.unit_cost, 2)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmtNum(r.movement_value, 2)}
                  </TableCell>
                  <TableCell>
                    {r.source_doc_no ? (
                      <span className="font-mono text-xs text-primary hover:underline cursor-pointer">
                        {r.source_doc_no}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          第 {page + 1} / {totalPages} 頁，共 {total} 筆
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 0 || loading}
            onClick={() => {
              const np = Math.max(0, page - 1);
              setPage(np);
              load(np);
            }}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1 || loading}
            onClick={() => {
              const np = Math.min(totalPages - 1, page + 1);
              setPage(np);
              load(np);
            }}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function MovementTypeBadge({ type }: { type: string }) {
  const t = MOVEMENT_TYPES.find((m) => m.key === type);
  if (!t) return <span className="text-xs text-muted-foreground">{type}</span>;

  const colorClass =
    t.color === "success"
      ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800"
      : t.color === "destructive"
        ? "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800"
        : t.color === "info"
          ? "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800"
          : "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700";

  return (
    <Badge variant="outline" className={cn("text-[11px]", colorClass)}>
      {t.label}
    </Badge>
  );
}
