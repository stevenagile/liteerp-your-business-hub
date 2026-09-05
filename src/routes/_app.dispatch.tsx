import { createFileRoute } from "@tanstack/react-router";

// 派車頁 URL 搜尋參數
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
});
