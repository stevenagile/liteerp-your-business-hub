export type ExportColumn<T = Record<string, unknown>> = {
  key: keyof T | string;
  label: string;
  value?: (row: T) => unknown;
  type?: "number" | "string";
};

function todayStamp(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

export async function exportToExcel<T extends Record<string, unknown>>(
  rows: T[],
  columns: ExportColumn<T>[],
  reportName: string,
): Promise<void> {
  const { Workbook } = await import("exceljs");

  const workbook = new Workbook();
  const ws = workbook.addWorksheet("Sheet1");

  // Set columns with headers and widths
  ws.columns = columns.map((c) => ({
    header: c.label,
    width: Math.max(10, Math.min(40, c.label.length * 2 + 4)),
  }));

  // Add data rows
  for (const row of rows) {
    const rowData = columns.map((c) => {
      const raw = c.value ? c.value(row) : (row as Record<string, unknown>)[c.key as string];
      if (raw == null || raw === "") return "";
      if (c.type === "number") {
        const n = Number(raw);
        return Number.isFinite(n) ? n : "";
      }
      if (typeof raw === "number") return raw;
      return String(raw);
    });
    ws.addRow(rowData);
  }

  // Write to buffer and trigger browser download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${reportName}_${todayStamp()}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
