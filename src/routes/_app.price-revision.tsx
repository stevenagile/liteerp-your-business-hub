import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Eye, Check, RotateCcw, Percent, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_app/price-revision")({
  component: PriceRevisionPage,
});

const core = () => supabase.schema("core" as never);

type Row = { product_id: string; code: string; name: string; field: string; old_value: number; new_value: number };
type Rev = { id: string; version_no: number; percent: number; scope: string; target: string; sell_mode: string; effective_date: string; status: string; applied_at: string | null; note: string | null };
type Prod = { id: string; code: string; name: string };

const FIELD_LABEL: Record<string, string> = {
  cost_price: "成本", price1: "售價1", price2: "售價2", price3: "售價3", customer_price: "客戶專屬價",
};
const STATUS_LABEL: Record<string, string> = {
  draft: "草稿", scheduled: "排程中", applied: "已套用", reversed: "已回滻",
};

/* ── Excel 匯出（對照表） ── */
function exportPreviewExcel(rows: Row[], pct: string) {
  const header = ["編號", "品名", "欄位", "舊價", "新價", "差額"];
  const tsv = [
    header.join("\t"),
    ...rows.map((r) => {
      const diff = Number(r.new_value) - Number(r.old_value);
      return [
        r.code,
        r.name,
        FIELD_LABEL[r.field] ?? r.field,
        Number(r.old_value),
        Number(r.new_value),
        diff >= 0 ? `+${diff}` : String(diff),
      ].join("\t");
    }),
  ].join("\r\n");

  const BOM = "﻿";
  const blob = new Blob([BOM + tsv], { type: "text/tab-separated-values;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const tag = pct ? `${Number(pct) > 0 ? "+" : ""}${pct}pct` : "preview";
  a.download = `調價對照表_${tag}_${new Date().toISOString().slice(0, 10)}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function PriceRevisionPage() {
  const navigate = useNavigate();
  const [guardLoading, setGuardLoading] = useState(true);
  const [canView, setCanView] = useState(false);

  const [percent, setPercent] = useState("");
  const [scope, setScope] = useState<"all" | "category" | "list">("all");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [products, setProducts] = useState<Prod[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [target, setTarget] = useState<"both" | "cost" | "sell">("both");
  const [sellMode, setSellMode] = useState<"passthrough" | "keep_margin">("passthrough");
  const [adjCust, setAdjCust] = useState(true);
  const [effDate, setEffDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");

  const [previewRows, setPreviewRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [history, setHistory] = useState<Rev[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await core().rpc("has_menu_access", { p_menu: "price_revision", p_action: "view" });
      const ok = data === true;
      setCanView(ok);
      setGuardLoading(false);
      if (!ok) { toast.error("無權限"); setTimeout(() => navigate({ to: "/" }), 800); }
    })();
  }, [navigate]);

  const loadAux = async () => {
    const [c, p, h] = await Promise.all([
      supabase.from("products").select("category").eq("is_active", true),
      supabase.from("products").select("id, code, name").eq("is_active", true).order("code"),
      supabase.from("price_revisions").select("id, version_no, percent, scope, target, sell_mode, effective_date, status, applied_at, note").order("version_no", { ascending: false }),
    ]);
    setCategories([...new Set(((c.data ?? []) as { category: string | null }[]).map((x) => x.category).filter(Boolean) as string[])].sort());
    setProducts((p.data ?? []) as Prod[]);
    setHistory((h.data ?? []) as Rev[]);
  };
  useEffect(() => { if (canView) loadAux(); /* eslint-disable-next-line */ }, [canView]);

  const scopeValue = () =>
    scope === "all" ? null : scope === "category" ? category : [...picked];

  const validScope = scope === "all" || (scope === "category" && category) || (scope === "list" && picked.size > 0);

  const doPreview = async () => {
    const pct = Number(percent);
    if (!percent || isNaN(pct)) return toast.error("請輸入調整百分比");
    if (!validScope) return toast.error("請選擇調價範圍");
    setBusy(true); setPreviewRows(null);
    const { data, error } = await supabase.rpc("price_revision_preview", {
      p_percent: pct, p_scope: scope, p_scope_value: scopeValue(),
      p_target: target, p_sell_mode: sellMode, p_adjust_customer: adjCust,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setPreviewRows((data ?? []) as Row[]);
    if (!data || data.length === 0) toast.info("沒有會變動的價格");
  };

  const doApply = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("price_revision_apply", {
      p_percent: Number(percent), p_scope: scope, p_scope_value: scopeValue(),
      p_target: target, p_sell_mode: sellMode, p_adjust_customer: adjCust,
      p_effective_date: effDate, p_note: note.trim() || null,
    });
    setBusy(false); setConfirmOpen(false);
    if (error) return toast.error(error.message);
    const future = effDate > new Date().toISOString().slice(0, 10);
    toast.success(future ? "已建立排程，將於生效日自動套用" : "已套用價格調整");
    setPreviewRows(null); setPercent(""); setNote("");
    loadAux();
  };

  const doReverse = async (rev: Rev) => {
    if (!confirm(`回滻版次 #${rev.version_no}（${rev.percent > 0 ? "+" : ""}${rev.percent}%）？會把價格還原。`)) return;
    const { error } = await supabase.rpc("price_revision_reverse", { p_rev: rev.id });
    if (error) return toast.error(error.message);
    toast.success("已回滻");
    loadAux();
  };

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? products.filter((p) => p.code.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)) : products;
  }, [products, search]);

  const summary = useMemo(() => {
    if (!previewRows) return null;
    const prods = new Set(previewRows.map((r) => r.product_id));
    return { products: prods.size, changes: previewRows.length };
  }, [previewRows]);

  if (guardLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (!canView) return <div className="rounded-md border bg-card p-6 text-center text-sm text-muted-foreground">無權限，正在導回首頁…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">價格調整</h1>
        <p className="text-sm text-muted-foreground">廠商漲價時，按百分比批次調整成本與售價。套用前可先預覽，每次調整都記版次、可回滻。</p>
      </div>

      {/* 設定 */}
      <div className="rounded-md border bg-card p-4 space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>調整百分比 (%)</Label>
            <div className="flex items-center gap-2">
              <Input type="number" step="0.01" value={percent} onChange={(e) => setPercent(e.target.value)} placeholder="例：8（降價輸 -8）" className="max-w-40" />
              <Percent className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>調整對象</Label>
            <Select value={target} onValueChange={(v) => setTarget(v as typeof target)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="both">成本 + 售價</SelectItem>
                <SelectItem value="cost">僅成本</SelectItem>
                <SelectItem value="sell">僅售價</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>生效日</Label>
            <Input type="date" value={effDate} onChange={(e) => setEffDate(e.target.value)} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>範圍</Label>
            <Select value={scope} onValueChange={(v) => { setScope(v as typeof scope); setPreviewRows(null); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部商品</SelectItem>
                <SelectItem value="category">某分類</SelectItem>
                <SelectItem value="list">手選商品</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {scope === "category" && (
            <div className="space-y-2">
              <Label>分類</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="選擇分類" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {target !== "cost" && (
            <div className="space-y-2">
              <Label>售價模式</Label>
              <Select value={sellMode} onValueChange={(v) => setSellMode(v as typeof sellMode)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="passthrough">售價同步 +X%</SelectItem>
                  <SelectItem value="keep_margin">維持毛利金額</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {target !== "cost" && (
            <div className="flex items-end gap-2 pb-1">
              <Switch checked={adjCust} onCheckedChange={setAdjCust} id="cust" />
              <Label htmlFor="cust">一併調客戶專屬價</Label>
            </div>
          )}
        </div>

        {scope === "list" && (
          <div className="space-y-2">
            <Label>選擇商品（已選 {picked.size}）</Label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜尋品名或編號" />
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-2">
              {filteredProducts.slice(0, 200).map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm py-0.5">
                  <Checkbox checked={picked.has(p.id)} onCheckedChange={(v) => setPicked((prev) => { const n = new Set(prev); if (v === true) n.add(p.id); else n.delete(p.id); return n; })} />
                  <span className="font-mono text-xs text-muted-foreground">{p.code}</span><span>{p.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>備註</Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="例：某廠商 6/15 起漲價 8%" />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={doPreview} disabled={busy}>
            {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Eye className="mr-1 h-4 w-4" />}預覽
          </Button>
          <Button onClick={() => setConfirmOpen(true)} disabled={busy || !previewRows || previewRows.length === 0}>
            <Check className="mr-1 h-4 w-4" />確認套用
          </Button>
        </div>
      </div>

      {/* 預覽 */}
      {previewRows && previewRows.length > 0 && (
        <div className="rounded-md border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <div className="text-base font-medium">
              預覽：{summary?.products} 個商品、{summary?.changes} 筆價格變動
              {previewRows.length > 100 && <span className="ml-2 text-sm text-muted-foreground">（下方僅顯示前 100 筆）</span>}
            </div>
            <Button variant="outline" size="sm" onClick={() => exportPreviewExcel(previewRows, percent)}>
              <Download className="mr-1 h-3.5 w-3.5" />匯出對照表
            </Button>
          </div>
          <div className="max-h-[28rem] overflow-y-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>編號</TableHead><TableHead>品名</TableHead><TableHead>欄位</TableHead>
                <TableHead className="text-right">舊價</TableHead><TableHead className="text-right">新價</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {previewRows.slice(0, 100).map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs">{r.code}</TableCell>
                    <TableCell>{r.name}</TableCell>
                    <TableCell><Badge variant="secondary">{FIELD_LABEL[r.field] ?? r.field}</Badge></TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{Number(r.old_value).toLocaleString()}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{Number(r.new_value).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* 版次歷史 */}
      <div className="rounded-md border bg-card">
        <div className="border-b px-4 py-2.5 text-base font-medium">調價歷史</div>
        <Table>
          <TableHeader><TableRow>
            <TableHead className="w-16">版次</TableHead><TableHead>幅度</TableHead><TableHead>範圍/對象</TableHead>
            <TableHead>生效日</TableHead><TableHead>狀態</TableHead><TableHead className="text-right">操作</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {history.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">尚無調價紀錄</TableCell></TableRow>
            ) : history.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">#{r.version_no}</TableCell>
                <TableCell className={r.percent >= 0 ? "text-destructive" : "text-success"}>{r.percent > 0 ? "+" : ""}{r.percent}%</TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.scope === "all" ? "全部" : r.scope === "category" ? "分類" : "手選"} / {r.target === "both" ? "成本+售價" : r.target === "cost" ? "成本" : "售價"}</TableCell>
                <TableCell className="text-sm">{r.effective_date}</TableCell>
                <TableCell><Badge variant={r.status === "applied" ? "default" : "secondary"} className={r.status === "applied" ? "bg-success text-success-foreground" : ""}>{STATUS_LABEL[r.status] ?? r.status}</Badge></TableCell>
                <TableCell className="text-right">
                  {r.status === "applied" ? (
                    <Button variant="ghost" size="sm" onClick={() => doReverse(r)}><RotateCcw className="mr-1 h-3.5 w-3.5" />回滻</Button>
                  ) : <span className="text-xs text-muted-foreground">—</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* 確認套用 */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認套用價格調整？</AlertDialogTitle>
            <AlertDialogDescription>
              將調整 {summary?.products} 個商品、共 {summary?.changes} 筆價格（{Number(percent) > 0 ? "+" : ""}{percent}%）。
              {effDate > new Date().toISOString().slice(0, 10) ? "生效日為未來，將排程自動套用。" : "將立即生效。"}此動作可在歷史中回滻。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={doApply} disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}確認套用</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
