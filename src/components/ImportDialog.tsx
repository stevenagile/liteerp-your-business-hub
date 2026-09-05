import { useMemo, useRef, useState, type ReactNode } from "react";
// papaparse and xlsx are loaded on-demand via dynamic import to reduce initial bundle
import { Download, Loader2, Upload, FileSpreadsheet, X, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type ImportFieldType = "string" | "number" | "enum";

export type ImportField = {
  key: string;
  label: string; // 中文表頭
  required?: boolean;
  type?: ImportFieldType;
  enumValues?: string[];
  default?: string | number;
  example?: string | number;
};

export type ParsedRow = {
  rowIndex: number; // 1-based source row
  raw: Record<string, string>;
  data: Record<string, unknown>;
  errors: string[];
};

export type ImportDialogProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  templateFileName: string; // e.g. "products_template.csv"
  fields: ImportField[];
  /** 額外驗證 (例如：code 重複、外鍵不存在)；可改寫 data */
  validateRows?: (rows: ParsedRow[]) => Promise<ParsedRow[]> | ParsedRow[];
  /** 將通過驗證的列寫入後端，回傳 {success, failed} */
  onImport: (rows: ParsedRow[]) => Promise<{ success: number; failed: number; errors?: string[] }>;
  onImported?: () => void;
  trigger?: ReactNode;
};

const BATCH_SIZE = 200;

export function ImportDialog({
  open,
  onOpenChange,
  title,
  templateFileName,
  fields,
  validateRows,
  onImport,
  onImported,
}: ImportDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const stats = useMemo(() => {
    const ok = rows.filter((r) => r.errors.length === 0).length;
    return { total: rows.length, ok, bad: rows.length - ok };
  }, [rows]);

  const reset = () => {
    setRows([]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const downloadTemplate = async () => {
    const Papa = await import("papaparse");
    const headers = fields.map((f) => f.label + (f.required ? "*" : ""));
    const example = fields.map((f) => String(f.example ?? f.default ?? ""));
    const csv = Papa.default.unparse([headers, example]);
    // BOM for Excel
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = templateFileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = async (file: File) => {
    setParsing(true);
    try {
      let records: Record<string, string>[] = [];
      const ext = file.name.toLowerCase().split(".").pop();
      if (ext === "xlsx" || ext === "xls") {
        const XLSX = await import("xlsx");
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const arr: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false });
        records = rowsToRecords(arr);
      } else {
        const Papa = await import("papaparse");
        const text = await file.text();
        const parsed = Papa.default.parse<string[]>(text.replace(/^﻿/, ""), { skipEmptyLines: true });
        records = rowsToRecords(parsed.data as string[][]);
      }
      const validated = await validateAll(records);
      setRows(validated);
    } catch (e) {
      toast.error("解析失敗：" + (e as Error).message);
    } finally {
      setParsing(false);
    }
  };

  const rowsToRecords = (arr: string[][]): Record<string, string>[] => {
    if (arr.length === 0) return [];
    const header = arr[0].map((h) => String(h ?? "").replace(/\*$/, "").trim());
    // map header label -> field.key
    const headerKeyMap: Record<number, string> = {};
    header.forEach((h, i) => {
      const f = fields.find((x) => x.label === h || x.key === h);
      if (f) headerKeyMap[i] = f.key;
    });
    const out: Record<string, string>[] = [];
    for (let i = 1; i < arr.length; i++) {
      const row = arr[i];
      if (!row || row.every((v) => String(v ?? "").trim() === "")) continue;
      const rec: Record<string, string> = { __row: String(i + 1) };
      Object.entries(headerKeyMap).forEach(([idx, key]) => {
        rec[key] = String(row[Number(idx)] ?? "").trim();
      });
      out.push(rec);
    }
    return out;
  };

  const validateAll = async (records: Record<string, string>[]): Promise<ParsedRow[]> => {
    const base: ParsedRow[] = records.map((rec) => {
      const errors: string[] = [];
      const data: Record<string, unknown> = {};
      for (const f of fields) {
        const raw = rec[f.key] ?? "";
        if (!raw) {
          if (f.required) {
            errors.push(`${f.label}必填`);
            continue;
          }
          data[f.key] = f.default ?? null;
          continue;
        }
        if (f.type === "number") {
          const n = Number(raw);
          if (Number.isNaN(n)) errors.push(`${f.label}非數字`);
          else data[f.key] = n;
        } else if (f.type === "enum") {
          if (f.enumValues && !f.enumValues.includes(raw)) {
            errors.push(`${f.label}須為 ${f.enumValues.join("/")}`);
          } else data[f.key] = raw;
        } else {
          data[f.key] = raw;
        }
      }
      return {
        rowIndex: Number(rec.__row ?? 0),
        raw: rec,
        data,
        errors,
      };
    });
    if (validateRows) return await validateRows(base);
    return base;
  };

  const handleImport = async () => {
    const valid = rows.filter((r) => r.errors.length === 0);
    if (valid.length === 0) {
      toast.error("無可匯入資料");
      return;
    }
    setSubmitting(true);
    let totalSuccess = 0;
    let totalFailed = 0;
    const allErrors: string[] = [];
    for (let i = 0; i < valid.length; i += BATCH_SIZE) {
      const batch = valid.slice(i, i + BATCH_SIZE);
      try {
        const res = await onImport(batch);
        totalSuccess += res.success;
        totalFailed += res.failed;
        if (res.errors) allErrors.push(...res.errors);
      } catch (e) {
        totalFailed += batch.length;
        allErrors.push((e as Error).message);
      }
    }
    setSubmitting(false);
    if (totalFailed > 0) {
      toast.error(`匯入完成：成功 ${totalSuccess} 筆、失敗 ${totalFailed} 筆${allErrors[0] ? "：" + allErrors[0] : ""}`);
    } else {
      toast.success(`匯入完成：${totalSuccess} 筆`);
    }
    reset();
    onOpenChange(false);
    onImported?.();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={downloadTemplate}>
              <Download className="mr-1.5 h-4 w-4" /> 下載範本
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={parsing}
            >
              {parsing ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-1.5 h-4 w-4" />
              )}
              上傳 CSV / Excel
            </Button>
            {rows.length > 0 && (
              <Button type="button" variant="ghost" size="sm" onClick={reset}>
                <X className="mr-1 h-4 w-4" /> 清除
              </Button>
            )}
            <div className="ml-auto text-sm text-muted-foreground">
              {rows.length > 0 ? (
                <>
                  共 <b className="text-foreground">{stats.total}</b> 筆，
                  可匯入 <b className="text-success">{stats.ok}</b> 筆，
                  錯誤 <b className="text-destructive">{stats.bad}</b> 筆
                </>
              ) : (
                <>請先下載範本，照欄位填寫後上傳。</>
              )}
            </div>
          </div>

          {rows.length > 0 && (
            <div className="max-h-[420px] overflow-auto rounded-lg border">
              <Table>
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead className="w-20">狀態</TableHead>
                    {fields.map((f) => (
                      <TableHead key={f.key}>{f.label}</TableHead>
                    ))}
                    <TableHead>錯誤</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow
                      key={r.rowIndex}
                      className={r.errors.length > 0 ? "bg-destructive/5" : ""}
                    >
                      <TableCell className="text-xs text-muted-foreground">{r.rowIndex}</TableCell>
                      <TableCell>
                        {r.errors.length === 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs text-success">
                            <CheckCircle2 className="h-3.5 w-3.5" /> 可匯入
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-destructive">
                            <AlertCircle className="h-3.5 w-3.5" /> 有誤
                          </span>
                        )}
                      </TableCell>
                      {fields.map((f) => (
                        <TableCell key={f.key} className="text-xs">
                          {String(r.raw[f.key] ?? "")}
                        </TableCell>
                      ))}
                      <TableCell className="text-xs text-destructive">
                        {r.errors.join("；")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {rows.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center text-muted-foreground">
              <FileSpreadsheet className="mb-2 h-8 w-8" />
              <div className="text-sm">尚未選擇檔案</div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button type="button" onClick={handleImport} disabled={submitting || stats.ok === 0}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            確認匯入 {stats.ok > 0 ? `(${stats.ok})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
