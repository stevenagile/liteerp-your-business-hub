import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportToExcel, type ExportColumn } from "@/lib/export-excel";
import { toast } from "sonner";

type Props<T extends Record<string, unknown>> = {
  rows: T[];
  columns: ExportColumn<T>[];
  filename: string;
  disabled?: boolean;
  size?: "sm" | "default";
  variant?: "outline" | "default" | "ghost" | "secondary";
  className?: string;
};

export function ExportExcelButton<T extends Record<string, unknown>>({
  rows,
  columns,
  filename,
  disabled,
  size = "default",
  variant = "outline",
  className,
}: Props<T>) {
  const handleClick = () => {
    if (!rows || rows.length === 0) {
      toast.info("目前無資料可匯出");
      return;
    }
    try {
      exportToExcel(rows, columns, filename);
      toast.success("已匯出 Excel");
    } catch (e) {
      toast.error("匯出失敗：" + (e as Error).message);
    }
  };
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={disabled}
      className={"no-print " + (className ?? "")}
    >
      <Download className="mr-1.5 h-4 w-4" />
      匯出 Excel
    </Button>
  );
}
