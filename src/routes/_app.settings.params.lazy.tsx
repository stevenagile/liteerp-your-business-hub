import { createLazyFileRoute } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Save, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createLazyFileRoute("/_app/settings/params")({
  component: ParamsPage,
});
const core = () => supabase.schema("core" as never);

// 公司識別資料：直接讀寫 public.company（單據計稅與列印的真正來源）
type Company = {
  id: string;
  name: string | null;
  tax_id: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  tax_rate: number | null; // 小數，如 0.05
  default_currency: string | null;
  settings: Record<string, unknown> | null;
};

// 額外參數，存於 company.settings JSON（不影響既有其他鍵）
type Extra = {
  owner: string;
  invoice_title: string;
  fiscal_year_start_month: number;
  doc_number_format: string;
  rounding_mode: string;
  default_warehouse_id: string;
};

const DEFAULT_EXTRA: Extra = {
  owner: "",
  invoice_title: "",
  fiscal_year_start_month: 1,
  doc_number_format: "{TYPE}-{YYYYMMDD}-{SEQ:3}",
  rounding_mode: "round",
  default_warehouse_id: "",
};

function ParamsPage() {
  const navigate = useNavigate();
  const [guardLoading, setGuardLoading] = useState(true);
  const [canView, setCanView] = useState(false);
  const [canEdit, setCanEdit] = useState(false);

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [company, setCompany] = useState<Company | null>(null);
  const [extra, setExtra] = useState<Extra>(DEFAULT_EXTRA);
  const [otherSettings, setOtherSettings] = useState<Record<string, unknown>>({});
  const [taxRatePct, setTaxRatePct] = useState<string>("");

  const [savingCompany, setSavingCompany] = useState(false);
  const [savingParams, setSavingParams] = useState(false);
  const [uploading, setUploading] = useState(false);

  // 守衛（沿用 core 選單權限）
  useEffect(() => {
    (async () => {
      const [{ data: v }, { data: e }] = await Promise.all([
        core().rpc("has_menu_access", { p_menu: "env_params", p_action: "view" }),
        core().rpc("has_menu_access", { p_menu: "env_params", p_action: "edit" }),
      ]);
      const ok = v === true;
      setCanView(ok);
      setCanEdit(e === true);
      setGuardLoading(false);
      if (!ok) {
        toast.error("無權限");
        setTimeout(() => navigate({ to: "/" }), 800);
      }
    })();
  }, [navigate]);

  useEffect(() => {
    if (!canView) return;
    (async () => {
      setLoading(true);
      const { data: cid, error: cidErr } = await core().rpc("current_company");
      if (cidErr || !cid) {
        toast.error(cidErr?.message || "找不到目前公司");
        setLoading(false);
        return;
      }
      setCompanyId(cid as string);

      const { data, error } = await supabase
        .from("company")
        .select(
          "id,name,tax_id,address,phone,email,logo_url,tax_rate,default_currency,settings",
        )
        .eq("id", cid)
        .maybeSingle();
      if (error) toast.error(error.message);

      const c = (data as Company | null) ?? ({
        id: cid as string,
        name: "",
        tax_id: "",
        address: "",
        phone: "",
        email: "",
        logo_url: "",
        tax_rate: 0.05,
        default_currency: "TWD",
        settings: {},
      } as Company);
      setCompany(c);
      setTaxRatePct(
        c.tax_rate != null ? String(Math.round(c.tax_rate * 10000) / 100) : "",
      );

      const s = (c.settings ?? {}) as Record<string, unknown>;
      const known = [
        "owner",
        "invoice_title",
        "fiscal_year_start_month",
        "doc_number_format",
        "rounding_mode",
        "default_warehouse_id",
      ];
      const rest: Record<string, unknown> = {};
      Object.keys(s).forEach((k) => {
        if (!known.includes(k)) rest[k] = s[k];
      });
      setOtherSettings(rest);
      setExtra({
        owner: (s.owner as string) ?? "",
        invoice_title: (s.invoice_title as string) ?? "",
        fiscal_year_start_month: (s.fiscal_year_start_month as number) ?? 1,
        doc_number_format:
          (s.doc_number_format as string) ?? DEFAULT_EXTRA.doc_number_format,
        rounding_mode: (s.rounding_mode as string) ?? "round",
        default_warehouse_id: (s.default_warehouse_id as string) ?? "",
      });

      setLoading(false);
    })();
  }, [canView]);

  const mergedSettings = (e: Extra) => ({
    ...otherSettings,
    owner: e.owner || null,
    invoice_title: e.invoice_title || null,
    fiscal_year_start_month: e.fiscal_year_start_month,
    doc_number_format: e.doc_number_format,
    rounding_mode: e.rounding_mode,
    default_warehouse_id: e.default_warehouse_id || null,
  });

  const handleLogoUpload = async (file: File) => {
    if (!companyId) return;
    setUploading(true);
    const ext = file.name.split(".").pop() || "png";
    const path = `${companyId}/logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("company-assets")
      .upload(path, file, { upsert: true });
    if (error) {
      setUploading(false);
      toast.error(`上傳失敗:${error.message}`);
      return;
    }
    const { data } = supabase.storage.from("company-assets").getPublicUrl(path);
    setCompany((c) => (c ? { ...c, logo_url: data.publicUrl } : c));
    setUploading(false);
    toast.success("Logo 已上傳,請按儲存");
  };

  const saveCompany = async (e: FormEvent) => {
    e.preventDefault();
    if (!company || !companyId) return;
    setSavingCompany(true);
    const { error } = await supabase
      .from("company")
      .update({
        name: company.name,
        tax_id: company.tax_id,
        address: company.address,
        phone: company.phone,
        email: company.email,
        logo_url: company.logo_url,
        settings: mergedSettings(extra),
      })
      .eq("id", companyId);
    setSavingCompany(false);
    if (error) return toast.error(error.message);
    toast.success("已儲存公司基本資料");
  };

  const saveParams = async (e: FormEvent) => {
    e.preventDefault();
    if (!company || !companyId) return;

    const pct = Number(taxRatePct);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      return toast.error("稅率必須為 0-100 之間的數字");
    }
    const m = Number(extra.fiscal_year_start_month ?? 0);
    if (!Number.isInteger(m) || m < 1 || m > 12) {
      return toast.error("會計年度起始月必須為 1-12");
    }

    setSavingParams(true);
    const { error } = await supabase
      .from("company")
      .update({
        tax_rate: Math.round(pct * 100) / 10000,
        default_currency: company.default_currency || "TWD",
        settings: mergedSettings(extra),
      })
      .eq("id", companyId);
    setSavingParams(false);
    if (error) return toast.error(error.message);
    toast.success("已儲存財稅參數");
  };

  if (guardLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!canView) {
    return (
      <div className="rounded-md border bg-card p-6 text-center text-sm text-muted-foreground">
        無權限,正在導回首頁…
      </div>
    );
  }
  if (loading || !company) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const ro = !canEdit;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">環境參數設定</h1>
        <p className="text-sm text-muted-foreground">
          公司資料、財稅與單據相關參數（與單據計稅、列印共用同一份公司資料）
          {ro && <span className="ml-2 text-xs">(目前為唯讀檢視)</span>}
        </p>
      </div>

      {/* 區塊一:公司基本資料 */}
      <form onSubmit={saveCompany} className="rounded-md border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <div className="text-base font-medium">公司基本資料</div>
          <Button type="submit" size="sm" disabled={ro || savingCompany}>
            {savingCompany ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1 h-4 w-4" />
            )}
            儲存
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>公司名稱</Label>
            <Input
              value={company.name ?? ""}
              maxLength={100}
              disabled={ro}
              onChange={(e) => setCompany({ ...company, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>統一編號</Label>
            <Input
              value={company.tax_id ?? ""}
              maxLength={20}
              disabled={ro}
              onChange={(e) => setCompany({ ...company, tax_id: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>負責人</Label>
            <Input
              value={extra.owner}
              maxLength={50}
              disabled={ro}
              onChange={(e) => setExtra({ ...extra, owner: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>電話</Label>
            <Input
              value={company.phone ?? ""}
              maxLength={30}
              disabled={ro}
              onChange={(e) => setCompany({ ...company, phone: e.target.value })}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>地址</Label>
            <Input
              value={company.address ?? ""}
              maxLength={200}
              disabled={ro}
              onChange={(e) => setCompany({ ...company, address: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={company.email ?? ""}
              maxLength={120}
              disabled={ro}
              onChange={(e) => setCompany({ ...company, email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>發票抬頭</Label>
            <Input
              value={extra.invoice_title}
              maxLength={100}
              disabled={ro}
              onChange={(e) =>
                setExtra({ ...extra, invoice_title: e.target.value })
              }
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Logo</Label>
            <div className="flex items-start gap-4">
              {company.logo_url ? (
                <img
                  src={company.logo_url}
                  alt="logo"
                  className="h-16 w-16 rounded border bg-muted object-contain"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded border bg-muted text-xs text-muted-foreground">
                  無
                </div>
              )}
              <div className="flex-1 space-y-2">
                <Input
                  value={company.logo_url ?? ""}
                  placeholder="https://..."
                  disabled={ro}
                  onChange={(e) =>
                    setCompany({ ...company, logo_url: e.target.value })
                  }
                />
                <div>
                  <label
                    className={
                      ro
                        ? "pointer-events-none inline-flex items-center gap-1 text-sm text-muted-foreground"
                        : "inline-flex cursor-pointer items-center gap-1 text-sm text-primary hover:underline"
                    }
                  >
                    {uploading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    上傳圖片 (storage: company-assets)
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={ro || uploading}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleLogoUpload(f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* 區塊二:財稅 / 單據參數 */}
      <form onSubmit={saveParams} className="rounded-md border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <div className="text-base font-medium">財稅 / 單據參數</div>
          <Button type="submit" size="sm" disabled={ro || savingParams}>
            {savingParams ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1 h-4 w-4" />
            )}
            儲存
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>營業稅率 (%)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.01"
                min={0}
                max={100}
                value={taxRatePct}
                disabled={ro}
                onChange={(e) => setTaxRatePct(e.target.value)}
                className="max-w-32"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            <p className="text-sm text-muted-foreground">
              儲存時自動轉為小數(如 5% → 0.05)，單據計稅即時套用
            </p>
          </div>
          <div className="space-y-2">
            <Label>幣別</Label>
            <Input
              value={company.default_currency ?? "TWD"}
              maxLength={10}
              disabled={ro}
              onChange={(e) =>
                setCompany({
                  ...company,
                  default_currency: e.target.value.toUpperCase(),
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>會計年度起始月</Label>
            <Select
              value={String(extra.fiscal_year_start_month ?? 1)}
              onValueChange={(v) =>
                setExtra({ ...extra, fiscal_year_start_month: Number(v) })
              }
              disabled={ro}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {m} 月
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>四捨五入</Label>
            <Select
              value={extra.rounding_mode ?? "round"}
              onValueChange={(v) => setExtra({ ...extra, rounding_mode: v })}
              disabled={ro}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="round">round(四捨五入)</SelectItem>
                <SelectItem value="floor">floor(無條件捨去)</SelectItem>
                <SelectItem value="ceil">ceil(無條件進位)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>單據編號規則</Label>
            <Textarea
              rows={2}
              value={extra.doc_number_format ?? ""}
              disabled={ro}
              onChange={(e) =>
                setExtra({ ...extra, doc_number_format: e.target.value })
              }
              placeholder="{TYPE}-{YYYYMMDD}-{SEQ:3}"
            />
            <p className="text-sm text-muted-foreground">
              佔位符:<code className="mx-1">{"{TYPE}"}</code>單據類型、
              <code className="mx-1">{"{YYYYMMDD}"}</code>日期、
              <code className="mx-1">{"{SEQ:3}"}</code>3 位流水號
            </p>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>預設倉別 ID</Label>
            <Input
              value={extra.default_warehouse_id ?? ""}
              disabled={ro}
              onChange={(e) =>
                setExtra({ ...extra, default_warehouse_id: e.target.value })
              }
              placeholder="可暫留空"
            />
          </div>
        </div>
      </form>
    </div>
  );
}
