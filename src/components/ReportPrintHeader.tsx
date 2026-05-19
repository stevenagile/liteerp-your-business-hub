import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Company = {
  name: string | null;
  tax_id: string | null;
  address: string | null;
  phone: string | null;
};

/**
 * 列印用報表抬頭（公司名 + 報表標題 + 期間）。
 * 平時隱藏，列印時顯示。需要外層使用 `.print-area`。
 */
export function ReportPrintHeader({
  title,
  period,
}: {
  title: string;
  period?: string;
}) {
  const [company, setCompany] = useState<Company | null>(null);
  useEffect(() => {
    supabase
      .from("company")
      .select("name,tax_id,address,phone")
      .maybeSingle()
      .then(({ data }) => setCompany((data ?? null) as Company | null));
  }, []);

  return (
    <div className="hidden print:block mb-4 border-b pb-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-lg font-bold">{company?.name ?? "—"}</div>
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
        <div className="text-right">
          <div className="text-xl font-bold tracking-wider">{title}</div>
          {period && <div className="mt-1 text-xs text-gray-600">{period}</div>}
          <div className="mt-1 text-xs text-gray-500">
            列印日期：{new Date().toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
}
