import { createLazyFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { RefreshCw, Loader2, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";
import { useCompanyId } from "@/hooks/useCompanyId";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export const Route = createLazyFileRoute("/_app/studio/aliases")({
  component: AliasTeachingPage,
});

interface ToLearnRow {
  contact_id: string | null;
  raw_message: string | null;
  issues: unknown;
  created_at: string;
}

interface AliasRow {
  id: string;
  alias_text: string;
  product_id: string | null;
  confirm_count: number | null;
  contact_id: string | null;
  disabled: boolean;
  last_used_at: string | null;
}

function formatIssues(issues: unknown): string {
  if (issues == null) return "—";
  if (typeof issues === "string") return issues;
  try { return JSON.stringify(issues); } catch { return String(issues); }
}

function AliasTeachingPage() {
  usePermissionGuard("/studio");
  const companyId = useCompanyId();
  const [toLearn, setToLearn] = useState<ToLearnRow[]>([]);
  const [aliases, setAliases] = useState<AliasRow[]>([]);
  const [loadingToLearn, setLoadingToLearn] = useState(false);
  const [loadingAliases, setLoadingAliases] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [productMap, setProductMap] = useState<Record<string, { code?: string; name?: string }>>({});
  const [contactMap, setContactMap] = useState<Record<string, { code?: string; name?: string }>>({});

  const loadNames = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("lookup-names");
    if (error) return;
    const res = data as {
      products?: Array<{ id: string; code?: string; name?: string }>;
      contacts?: Array<{ id: string; code?: string; name?: string }>;
    } | null;
    const pm: Record<string, { code?: string; name?: string }> = {};
    (res?.products ?? []).forEach((p) => { pm[p.id] = { code: p.code, name: p.name }; });
    const cm: Record<string, { code?: string; name?: string }> = {};
    (res?.contacts ?? []).forEach((c) => { cm[c.id] = { code: c.code, name: c.name }; });
    setProductMap(pm);
    setContactMap(cm);
  }, []);

  const renderProduct = (id: string | null) => {
    if (!id) return "—";
    const p = productMap[id];
    if (p) return `${p.code ?? ""} ${p.name ?? ""}`.trim() || id.slice(0, 8);
    return id.slice(0, 8);
  };
  const renderContact = (id: string | null) => {
    const c = id ? contactMap[id] : undefined;
    return c?.name ?? (id ? id : "");
  };

  const [form, setForm] = useState({
    contact_id: "",
    alias_text: "",
    product_code: "",
    implied_qty: "",
    global: false,
  });

  const loadToLearn = useCallback(async () => {
    if (!companyId) return;
    setLoadingToLearn(true);
    const { data, error } = await supabase
      .schema("channel" as never)
      .from("v_terms_to_learn")
      .select("contact_id, raw_message, issues, created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(100);
    setLoadingToLearn(false);
    if (error) { toast.error(`待教清單載入失敗:${error.message}`); return; }
    setToLearn((data as ToLearnRow[]) ?? []);
  }, [companyId]);

  const loadAliases = useCallback(async () => {
    if (!companyId) return;
    setLoadingAliases(true);
    const { data, error } = await supabase
      .schema("channel" as never)
      .from("customer_term_aliases")
      .select("id, alias_text, product_id, confirm_count, contact_id, disabled, last_used_at")
      .eq("company_id", companyId)
      .order("last_used_at", { ascending: false, nullsFirst: false })
      .limit(200);
    setLoadingAliases(false);
    if (error) { toast.error(`已學清單載入失敗:${error.message}`); return; }
    setAliases((data as AliasRow[]) ?? []);
  }, [companyId]);

  useEffect(() => {
    void loadToLearn();
    void loadAliases();
    void loadNames();
  }, [loadToLearn, loadAliases, loadNames]);

  const handleTeachThis = (contactId: string | null) => {
    setForm((f) => ({ ...f, contact_id: contactId ?? "", global: false }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.alias_text.trim() || !form.product_code.trim()) {
      toast.error("請填寫慣用語與產品代碼"); return;
    }
    if (!form.global && !form.contact_id.trim()) {
      toast.error("請填寫客戶 contact_id,或勾選「全域」"); return;
    }
    setSubmitting(true);
    const impliedQtyNum = form.implied_qty.trim() ? Number(form.implied_qty) : null;
    const { data, error } = await supabase.functions.invoke("teach-alias", {
      body: {
        contact_id: form.global ? null : form.contact_id.trim(),
        alias_text: form.alias_text.trim(),
        product_code: form.product_code.trim(),
        implied_qty: impliedQtyNum != null && Number.isFinite(impliedQtyNum) ? impliedQtyNum : null,
        global: form.global,
      },
    });
    setSubmitting(false);

    if (error) { toast.error(error.message); return; }
    const res = data as { ok?: boolean; message?: string; error?: string } | null;
    if (res?.ok) {
      toast.success(res.message ?? "已新增");
      setForm({ contact_id: "", alias_text: "", product_code: "", implied_qty: "", global: false });
      void loadAliases();
      void loadToLearn();
    } else {
      toast.error(res?.error ?? "操作失敗");
    }
  };

  const toggleDisabled = async (row: AliasRow) => {
    if (!companyId) return;
    setTogglingId(row.id);
    const { error } = await supabase
      .schema("channel" as never)
      .from("customer_term_aliases")
      .update({ disabled: !row.disabled })
      .eq("id", row.id);
    setTogglingId(null);
    if (error) { toast.error(`更新失敗:${error.message}`); return; }
    toast.success(!row.disabled ? "已停用" : "已啟用");
    void loadAliases();
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex items-center gap-3">
        <BookOpen className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">慣用語教學</h1>
          <p className="text-sm text-muted-foreground">教 Agent 認識客戶的慣用詞,讓下單流程更順</p>
        </div>
      </div>

      {/* ① 待教清單 */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h2 className="text-base font-semibold">① 待教清單</h2>
            <p className="text-xs text-muted-foreground">來自 v_terms_to_learn,共 {toLearn.length} 筆</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadToLearn()} disabled={loadingToLearn}>
            <RefreshCw className={cn("h-4 w-4", loadingToLearn && "animate-spin")} />重新整理
          </Button>
        </div>
        {loadingToLearn && toLearn.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> 載入中...
          </div>
        ) : toLearn.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">目前沒有待教項目</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Contact</TableHead>
                <TableHead>客戶原始訊息</TableHead>
                <TableHead className="w-[240px]">未認出問題</TableHead>
                <TableHead className="w-[140px]">時間</TableHead>
                <TableHead className="w-[100px] text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {toLearn.map((r, idx) => (
                <TableRow key={`${r.contact_id}-${r.created_at}-${idx}`}>
                  <TableCell className="font-mono text-xs">{r.contact_id ?? "—"}</TableCell>
                  <TableCell className="text-sm">{r.raw_message ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{formatIssues(r.issues)}</TableCell>
                  <TableCell className="font-mono text-xs">{new Date(r.created_at).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="secondary" onClick={() => handleTeachThis(r.contact_id)}>教這個</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* ② 教學表單 */}
      <Card className="p-4">
        <h2 className="mb-1 text-base font-semibold">② 教學表單</h2>
        <p className="mb-4 text-xs text-muted-foreground">填入慣用語對應的產品。勾選「全域」則對所有客戶生效</p>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">客戶 contact_id</label>
            <Input placeholder="例如 60912345678" value={form.contact_id}
              onChange={(e) => setForm((f) => ({ ...f, contact_id: e.target.value }))} disabled={form.global} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">慣用語</label>
            <Input placeholder="例如 大瓶" value={form.alias_text}
              onChange={(e) => setForm((f) => ({ ...f, alias_text: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">產品代碼</label>
            <Input placeholder="例如 P0001" value={form.product_code}
              onChange={(e) => setForm((f) => ({ ...f, product_code: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">隱含數量(選填)</label>
            <Input type="number" placeholder="例如 2" value={form.implied_qty}
              onChange={(e) => setForm((f) => ({ ...f, implied_qty: e.target.value }))} />
          </div>
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.global}
                onCheckedChange={(v) => setForm((f) => ({ ...f, global: Boolean(v), contact_id: v ? "" : f.contact_id }))} />
              全域(對所有客戶生效)
            </label>
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? (<><Loader2 className="h-4 w-4 animate-spin" /> 教中...</>) : "教"}
            </Button>
          </div>
        </form>
      </Card>

      {/* ③ 已學清單 */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h2 className="text-base font-semibold">③ 已學清單</h2>
            <p className="text-xs text-muted-foreground">共 {aliases.length} 筆</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadAliases()} disabled={loadingAliases}>
            <RefreshCw className={cn("h-4 w-4", loadingAliases && "animate-spin")} />重新整理
          </Button>
        </div>
        {loadingAliases && aliases.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> 載入中...
          </div>
        ) : aliases.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">目前沒有任何慣用語</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>慣用語</TableHead>
                <TableHead className="w-[140px]">產品</TableHead>
                <TableHead className="w-[100px] text-right">教過幾次</TableHead>
                <TableHead className="w-[180px]">Contact</TableHead>
                <TableHead className="w-[100px]">狀態</TableHead>
                <TableHead className="w-[160px]">最後使用</TableHead>
                <TableHead className="w-[110px] text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aliases.map((r, idx) => (
                <TableRow key={r.id} className={cn(idx % 2 === 1 && "bg-muted/30")}>
                  <TableCell className="text-sm font-medium">{r.alias_text}</TableCell>
                  <TableCell className="text-xs">{renderProduct(r.product_id)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{r.confirm_count ?? 0}</TableCell>
                  <TableCell className="text-xs">
                    {r.contact_id ? (
                      renderContact(r.contact_id) || <span className="font-mono">{r.contact_id.slice(0, 8)}</span>
                    ) : (
                      <Badge variant="secondary">全域</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {r.disabled
                      ? <Badge className="bg-slate-400 text-white hover:bg-slate-400">已停用</Badge>
                      : <Badge className="bg-emerald-500 text-white hover:bg-emerald-500">啟用中</Badge>}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{r.last_used_at ? new Date(r.last_used_at).toLocaleString() : "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" disabled={togglingId === r.id} onClick={() => void toggleDisabled(r)}>
                      {togglingId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : r.disabled ? "啟用" : "停用"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
