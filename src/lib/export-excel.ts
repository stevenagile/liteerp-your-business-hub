import * as XLSX from "xlsx";

export type ExportColumn<T = Record<string, unknown>> = {
  key: keyof T | string;
  label: string;
  /** Optional value mapper. Return number for numeric Excel cell, string for text. */
  value?: (row: T) => unknown;
  /** Hint: 'number' to force numeric coercion when possible. */
  type?: "number" | "string";
};

function todayStamp(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

/**
 * Export rows to .xlsx, filename pattern: {name}_YYYYMMDD.xlsx
 * Numeric columns are emitted as real numbers so Excel can sum them.
 */
export function exportToExcel<T extends Record<string, unknown>>(
  rows: T[],
  columns: ExportColumn<T>[],
  reportName: string,
): void {
  const header = columns.map((c) => c.label);
  const data = rows.map((row) =>
    columns.map((c) => {
      const raw = c.value
        ? c.value(row)
        : (row as Record<string, unknown>)[c.key as string];
      if (raw == null || raw === "") return "";
      if (c.type === "number") {
        const n = Number(raw);
        return Number.isFinite(n) ? n : "";
      }
      if (typeof raw === "number") return raw;
      return String(raw);
    }),
  );

  const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
  // Auto width based on header length
  ws["!cols"] = columns.map((c) => ({
    wch: Math.max(10, Math.min(40, c.label.length * 2 + 4)),
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  const filename = `${reportName}_${todayStamp()}.xlsx`;
  XLSX.writeFile(wb, filename);
}
