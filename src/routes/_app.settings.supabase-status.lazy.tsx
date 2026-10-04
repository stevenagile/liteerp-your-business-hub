import { createLazyFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Loader2,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Database,
  Plug,
  Table2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createLazyFileRoute("/_app/settings/supabase-status")({
  component: SupabaseStatusPage,
});

type CheckStatus = "pending" | "ok" | "fail";

interface TableCheck {
  schema: string;
  table: string;
  label: string;
  status: CheckStatus;
  message?: string;
}

const REQUIRED_TABLES: Array<Pick<TableCheck, "schema" | "table" | "label">> = [
  { schema: "public", table: "products", label: "產品" },
  { schema: "public", table: "contacts", label: "客戶廠商" },
  { schema: "public", table: "warehouses", label: "倉庫" },
  { schema: "public", table: "doc_headers", label: "單據表頭" },
  { schema: "public", table: "doc_lines", label: "單據明細" },
  { schema: "public", table: "company", label: "公司資料" },
  { schema: "core", table: "menu_items", label: "選單項目" },
  { schema: "core", table: "users", label: "系統使用者" },
];

function projectRefFromUrl(url: string): string {
  const m = url.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/i);
  return m ? m[1] : url;
}

function SupabaseStatusPage() {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const projectRef = projectRefFromUrl(supabaseUrl);

  const [checking, setChecking] = useState(false);
  const [connStatus, setConnStatus] = useState<CheckStatus>("pending");
  const [connMessage, setConnMessage] = useState<string>("");
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [tables, setTables] = useState<TableCheck[]>(
    REQUIRED_TABLES.map((t) => ({ ...t, status: "pending" })),
  );
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (!loading && profile && profile.role !== "admin") {
      navigate({ to: "/" });
    }
  }, [loading, profile, navigate]);

  async function runChecks() {
    setChecking(true);
    setConnStatus("pending");
    setConnMessage("");
    setLatencyMs(null);
    setTables(REQUIRED_TABLES.map((t) => ({ ...t, status: "pending" })));

    // 1) 連線測試：對 auth session endpoint 發一個輕量請求
    const started = performance.now();
    try {
      const { error } = await supabase.auth.getSession();
      const elapsed = Math.round(performance.now() - started);
      if (error) {
        setConnStatus("fail");
        setConnMessage(error.message);
      } else {
        setConnStatus("ok");
        setLatencyMs(elapsed);
        setConnMessage("連線正常");
      }
    } catch (e) {
      setConnStatus("fail");
      setConnMessage(e instanceof Error ? e.message : String(e));
    }

    // 2) 資料表可讀性檢查
    const results: TableCheck[] = [];
    for (const t of REQUIRED_TABLES) {
      try {
        // 動態檢查任意 schema/資料表，繞過型別限制
        const client = supabase as unknown as {
          schema: (s: string) => {
            from: (t: string) => {
              select: (
                cols: string,
                opts: { count: "exact"; head: boolean },
              ) => Promise<{ error: { message: string } | null }>;
            };
          };
        };
        const { error } = await client
          .schema(t.schema)
          .from(t.table)
          .select("*", { count: "exact", head: true });
        if (error) {
          results.push({ ...t, status: "fail", message: error.message });
        } else {
          results.push({ ...t, status: "ok" });
        }
      } catch (e) {
        results.push({
          ...t,
          status: "fail",
          message: e instanceof Error ? e.message : String(e),
        });
      }
      setTables([...results, ...REQUIRED_TABLES.slice(results.length).map((r) => ({ ...r, status: "pending" as CheckStatus }))]);
    }
    setCheckedAt(new Date());
    setChecking(false);
  }

  useEffect(() => {
    if (profile?.role === "admin") runChecks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.role]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile || profile.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShieldAlert className="h-10 w-10 text-warning" />
        <h2 className="mt-3 text-lg font-semibold">權限不足</h2>
        <p className="text-sm text-muted-foreground">
          僅管理員 (admin) 可檢視連線狀態。
        </p>
      </div>
    );
  }

  const okCount = tables.filter((t) => t.status === "ok").length;
  const failCount = tables.filter((t) => t.status === "fail").length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Supabase 連線狀態
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            檢查目前連接的 Supabase 專案、連線狀況與必要資料表是否可讀取。
          </p>
        </div>
        <Button onClick={runChecks} disabled={checking} variant="outline">
          {checking ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          重新檢查
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4" />
              目前連接的專案
            </CardTitle>
            <CardDescription>前端程式設定的 Supabase 專案</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Project Ref</span>
              <span className="font-mono font-medium">{projectRef}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">URL</span>
              <span className="font-mono text-xs break-all">{supabaseUrl}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Plug className="h-4 w-4" />
              連線測試
            </CardTitle>
            <CardDescription>
              {checkedAt
                ? `上次檢查：${checkedAt.toLocaleTimeString("zh-TW")}`
                : "尚未檢查"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">狀態</span>
              {connStatus === "pending" ? (
                <Badge variant="secondary">
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  檢查中
                </Badge>
              ) : connStatus === "ok" ? (
                <Badge className="bg-green-600 text-white hover:bg-green-600">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  正常
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <XCircle className="mr-1 h-3 w-3" />
                  失敗
                </Badge>
              )}
            </div>
            {latencyMs !== null && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">回應時間</span>
                <span className="font-mono">{latencyMs} ms</span>
              </div>
            )}
            {connMessage && (
              <p
                className={
                  connStatus === "fail"
                    ? "text-xs text-destructive break-all"
                    : "text-xs text-muted-foreground"
                }
              >
                {connMessage}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Table2 className="h-4 w-4" />
            必要資料表可讀性
          </CardTitle>
          <CardDescription>
            {checking
              ? "逐一檢查中…"
              : `共 ${tables.length} 張表：可讀取 ${okCount} 張，失敗 ${failCount} 張`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y rounded-md border">
            {tables.map((t) => (
              <div
                key={`${t.schema}.${t.table}`}
                className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm"
              >
                <div>
                  <span className="font-medium">{t.label}</span>
                  <span className="ml-2 font-mono text-xs text-muted-foreground">
                    {t.schema}.{t.table}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {t.message && (
                    <span className="max-w-md truncate text-xs text-destructive">
                      {t.message}
                    </span>
                  )}
                  {t.status === "pending" ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : t.status === "ok" ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            若某張表顯示失敗，常見原因：資料表不存在、RLS 政策未開放讀取，或該
            schema 未對 API 開放。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
