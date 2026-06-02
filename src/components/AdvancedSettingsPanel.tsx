import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SalesPerson = { id: string; display_name: string | null };

type SettingsShape = {
  order_cutoff_hour?: number;
  line_sales_person_id?: string | null;
  allow_negative_stock?: boolean;
  price_includes_tax?: boolean;
  low_stock_alert?: boolean;
  low_stock_multiplier?: number;
  default_payment_terms?: number;
  fiscal_year_start?: number;
};

const DEFAULTS: Required<SettingsShape> = {
  order_cutoff_hour: 17,
  line_sales_person_id: null,
  allow_negative_stock: false,
  price_includes_tax: false,
  low_stock_alert: false,
  low_stock_multiplier: 1,
  default_payment_terms: 30,
  fiscal_year_start: 1,
};

export function AdvancedSettingsPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [settings, setSettings] = useState<SettingsShape>({ ...DEFAULTS });
  const [salesPeople, setSalesPeople] = useState<SalesPerson[]>([]);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("company")
        .select("id, settings")
        .limit(1)
        .maybeSingle();
      if (error) {
        toast.error("讀取進階參數失敗:" + error.message);
      } else if (data) {
        setCompanyId(data.id);
        const raw = (data as { settings?: SettingsShape | null }).settings;
        setSettings({
          ...DEFAULTS,
          ...(raw ?? {}),
        });
      }
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    if (!companyId) return;
    setSaving(true);

    const { data: current } = await supabase
      .from("company")
      .select("settings")
      .eq("id", companyId)
      .single();

    const merged = {
      ...((current?.settings as Record<string, unknown> | null) ?? {}),
      ...settings,
    };

    const { error } = await supabase
      .from("company")
      .update({ settings: merged })
      .eq("id", companyId);
    setSaving(false);
    if (error) {
      toast.error("儲存失敗:" + error.message);
    } else {
      toast.success("進階參數已儲存");
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-lg border bg-card p-6 shadow-sm">
      <SettingRow
        label="允許負庫存銷貨"
        description="關閉時，庫存不足將無法確認銷貨單（建議關閉）"
      >
        <Switch
          checked={settings.allow_negative_stock}
          onCheckedChange={(v) =>
            setSettings((s) => ({ ...s, allow_negative_stock: v }))
          }
        />
      </SettingRow>

      <SettingRow label="售價是否含稅">
        <Switch
          checked={settings.price_includes_tax}
          onCheckedChange={(v) =>
            setSettings((s) => ({ ...s, price_includes_tax: v }))
          }
        />
      </SettingRow>

      <SettingRow label="啟用低庫存通知">
        <Switch
          checked={settings.low_stock_alert}
          onCheckedChange={(v) =>
            setSettings((s) => ({ ...s, low_stock_alert: v }))
          }
        />
      </SettingRow>

      <SettingRow
        label="低庫存門檻倍數"
        description="庫存低於 安全存量 × 此倍數 時發出通知"
      >
        <Input
          type="number"
          min={0}
          step="0.1"
          value={settings.low_stock_multiplier}
          onChange={(e) =>
            setSettings((s) => ({
              ...s,
              low_stock_multiplier:
                e.target.value === "" ? 0 : Number(e.target.value),
            }))
          }
          className="w-32"
        />
      </SettingRow>

      <SettingRow
        label="預設帳期天數"
        description="新建客戶/廠商的預設帳期"
      >
        <Input
          type="number"
          min={0}
          step="1"
          value={settings.default_payment_terms}
          onChange={(e) =>
            setSettings((s) => ({
              ...s,
              default_payment_terms:
                e.target.value === "" ? 0 : Number(e.target.value),
            }))
          }
          className="w-32"
        />
      </SettingRow>

      <SettingRow label="會計年度起始月">
        <Input
          type="number"
          min={1}
          max={12}
          step="1"
          value={settings.fiscal_year_start}
          onChange={(e) =>
            setSettings((s) => ({
              ...s,
              fiscal_year_start:
                e.target.value === "" ? 1 : Number(e.target.value),
            }))
          }
          className="w-32"
        />
      </SettingRow>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          儲存設定
        </Button>
      </div>
    </div>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="space-y-0.5">
        <Label className="text-sm font-medium">{label}</Label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
