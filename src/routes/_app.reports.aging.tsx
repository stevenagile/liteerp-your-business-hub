import { createFileRoute } from "@tanstack/react-router";
import { ExportExcelButton } from "@/components/ExportExcelButton";
import { PrintReportButton } from "@/components/PrintReportButton";
import { ReportPrintHeader } from "@/components/ReportPrintHeader";
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/_app/reports/aging")({
  component: AgingReport,
});

const BUCKETS = ["未到期", "1-30天", "31-60天", "61-90天", "90天以上"] as const;
type Bucket = (typeof BUCKETS)[number];

type Row = {
  party_name: string | null;
  doc_no: string | null;
  due_date: string | null;
  balance: number | null;
  overdue_days: number | null;
  aging_bucket: string | null;
};

const fmt = (n: number | null | undefined) =>
  Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

function useAging(view: string, partyKey: "customer_name" | "vendor_name") {
  const { profile } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      if (!profile?.company_id) return;
      setLoading(true);
      const { data, error } = await supabase
        .from(view)
        .select(`${partyKey},doc_no,due_date,balance,overdue_days,aging_bucket`)
        .eq("company_id", profile?.company_id ?? "")
        .order("overdue_days", { ascending: false });
      if (error) toast.error(error.message);
      const mapped = (data ?? []).map((r: Record<string, unknown>) => ({
        party_name: r[partyKey] as string | null,
        doc_no: r.doc_no as string | null,
        due_date: r.due_date as string | null,
        balance: r.balance as number | null,
        overdue_days: r.overdue_days as number | null,
        aging_bucket: r.aging_bucket as string | null,
      }));
      setRows(mapped);
      setLoading(false);
    })();
  }, [view, partyKey]);
  return { rows, loading };
}

function AgingTable({ rows, partyLabel }: { rows: Row[]; partyLabel: string }) {
  const summary = useMemo(() => {
    const map: Record<string, number> = {};
    for (const b of BUCKETS) map[b] = 0;
    for (const r of rows) {
      const k = (r.aging_bucket ?? "") as Bucket;
      if (k in map) map[k] += Number(r.balance ?? 0);
    }
    return map;
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {BUCKETS.map((b) => (
          <div key={b} className={cn(
            "rounded-md border bg-card p-3",
            b === "90天以上" && "border-destructive/40 bg-destructive/5",
          )}>
            <div className="text-xs text-muted-foreground">{b}</div>
            <div className="text-xl font-bold">{fmt(summary[b])}</div>
          </div>
        ))}
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{partyLabel}</TableHead>
              <TableHead>單號</TableHead>
              <TableHead>到期日</TableHead>
              <TableHead className="text-right">餘額</TableHead>
              <TableHead className="text-right">逾期天數</TableHead>
              <TableHead>帳齡</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">無資料</TableCell></TableRow>
            )}
            {rows.map((r, i) => {
              const isOld = r.aging_bucket === "90天以上";
              return (
                <TableRow key={i} className={cn(isOld && "text-destructive")}>
                  <TableCell>{r.party_name}</TableCell>
                  <TableCell>{r.doc_no}</TableCell>
                  <TableCell>{r.due_date ?? "—"}</TableCell>
                  <TableCell className="text-right">{fmt(r.balance)}</TableCell>
                  <TableCell className="text-right">{r.overdue_days ?? 0}</TableCell>
                  <TableCell>{r.aging_bucket ?? "—"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function AgingReport() {
  const { allowed, checking } = usePermissionGuard("/reports/aging");
  const ar = useAging("v_ar_aging", "customer_name");
  const ap = useAging("v_ap_aging", "vendor_name");
  const [tab, setTab] = useState<"ar" | "ap">("ar");

  const activeRows = tab === "ar" ? ar.rows : ap.rows;

  if (checking) return <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (!allowed) return null;

  return (
    <div className="space-y-4 print-area">
      <ReportPrintHeader title="帳齡分析" />
      <div className="flex items-start justify-between gap-4 no-print">
        <h1 className="text-2xl font-semibold">帳齡分析</h1>
        <div className="flex gap-2">
          <ExportExcelButton
            rows={activeRows as unknown as Record<string, unknown>[]}
            filename={tab === "ar" ? "應收帳齡分析" : "應付帳齡分析"}
            columns={[
              { key: "party_name", label: tab === "ar" ? "客戶" : "廠商" },
              { key: "doc_no", label: "單號" },
              { key: "due_date", label: "到期日" },
              { key: "balance", label: "餘額", type: "number" },
              { key: "overdue_days", label: "逾期天數", type: "number" },
              { key: "aging_bucket", label: "帳齡" },
            ]}
          />
          <PrintReportButton />
        </div>
      </div>
      <Tabs value={tab} onValueChange={(v) => setTab(v as "ar" | "ap")}>
        <TabsList className="no-print">
          <TabsTrigger value="ar">應收帳齡</TabsTrigger>
          <TabsTrigger value="ap">應付帳齡</TabsTrigger>
        </TabsList>
        <TabsContent value="ar" className="mt-4">
          {ar.loading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <AgingTable rows={ar.rows} partyLabel="客戶" />
          )}
        </TabsContent>
        <TabsContent value="ap" className="mt-4">
          {ap.loading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <AgingTable rows={ap.rows} partyLabel="廠商" />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
