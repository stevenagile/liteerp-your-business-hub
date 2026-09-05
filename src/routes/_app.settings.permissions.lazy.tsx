import { createLazyFileRoute } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createLazyFileRoute("/_app/settings/permissions")({
  component: PermissionsPage,
});
const ROLES = ["sales", "warehouse", "accountant", "staff"] as const;
const ROLE_LABELS: Record<string, string> = {
  sales: "業務",
  warehouse: "倉管",
  accountant: "會計",
  staff: "一般",
};
const MODULES = ["sales", "purchase", "inventory", "finance", "settings"] as const;
const MODULE_LABELS: Record<string, string> = {
  sales: "銷售",
  purchase: "採購",
  inventory: "庫存",
  finance: "帳務",
  settings: "系統",
};
const ACTIONS = [
  { key: "can_read", label: "讀取" },
  { key: "can_write", label: "編輯" },
  { key: "can_confirm", label: "確認" },
  { key: "can_void", label: "作廢" },
] as const;

type Perm = {
  id: string;
  role: string;
  module: string;
  can_read: boolean;
  can_write: boolean;
  can_confirm: boolean;
  can_void: boolean;
};

function PermissionsPage() {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Perm[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!loading && profile && profile.role !== "admin") {
      navigate({ to: "/" });
    }
  }, [loading, profile, navigate]);

  const load = async () => {
    setBusy(true);
    const { data, error } = await supabase
      .from("role_permissions")
      .select("id, role, module, can_read, can_write, can_confirm, can_void");
    if (error) toast.error("讀取失敗:" + error.message);
    else setRows((data ?? []) as Perm[]);
    setBusy(false);
  };

  useEffect(() => {
    if (profile?.role === "admin") load();
  }, [profile]);

  const findRow = (role: string, module: string) =>
    rows.find((r) => r.role === role && r.module === module);

  const toggle = async (role: string, module: string, action: string, value: boolean) => {
    const row = findRow(role, module);
    if (row) {
      // optimistic
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, [action]: value } : r)),
      );
      const { error } = await supabase
        .from("role_permissions")
        .update({ [action]: value })
        .eq("id", row.id);
      if (error) {
        toast.error("更新失敗:" + error.message);
        load();
      }
    } else {
      // 新增時需帶 company_id（NOT NULL）
      const { data: cid, error: cErr } = await supabase.rpc("my_company_id");
      if (cErr) {
        toast.error("取得公司失敗:" + cErr.message);
        return;
      }
      const payload = {
        company_id: cid,
        role,
        module,
        can_read: false,
        can_write: false,
        can_confirm: false,
        can_void: false,
        [action]: value,
      };
      const { data, error } = await supabase
        .from("role_permissions")
        .insert(payload)
        .select()
        .single();
      if (error) {
        toast.error("新增失敗:" + error.message);
        return;
      }
      setRows((prev) => [...prev, data as Perm]);
    }
  };

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
        <p className="text-sm text-muted-foreground">僅管理員可進入權限設定。</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">功能權限（業務模組）</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          管理各角色對各業務模組的操作權限（讀取 / 編輯 / 確認 / 作廢）。管理員擁有所有權限,不在此表控管。注：「選單顯示」請到「角色權限」頁設定。
        </p>
      </div>

      <div className="rounded-lg border bg-card shadow-sm overflow-x-auto">
        {busy ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">角色 \ 模組</TableHead>
                {MODULES.map((m) => (
                  <TableHead key={m} className="text-center">
                    {MODULE_LABELS[m]}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {ROLES.map((role) => (
                <TableRow key={role}>
                  <TableCell className="font-medium">{ROLE_LABELS[role]}</TableCell>
                  {MODULES.map((mod) => {
                    const row = findRow(role, mod);
                    return (
                      <TableCell key={mod} className="align-top">
                        <div className="grid grid-cols-2 gap-1.5">
                          {ACTIONS.map((a) => (
                            <label
                              key={a.key}
                              className="flex items-center gap-1.5 text-sm"
                            >
                              <Checkbox
                                checked={Boolean(row?.[a.key as keyof Perm])}
                                onCheckedChange={(v) =>
                                  toggle(role, mod, a.key, Boolean(v))
                                }
                              />
                              {a.label}
                            </label>
                          ))}
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
