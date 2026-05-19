import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Plus, Pencil, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_app/settings/users")({
  component: UsersPage,
});

const ROLE_LABELS: Record<string, string> = {
  admin: "管理員",
  sales: "業務",
  warehouse: "倉管",
  accountant: "會計",
  staff: "一般",
};
const ROLES = ["admin", "sales", "warehouse", "accountant", "staff"] as const;

type Profile = {
  id: string;
  display_name: string | null;
  role: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
};

function UsersPage() {
  const { profile, loading, user } = useAuth();
  const navigate = useNavigate();
  const [list, setList] = useState<Profile[]>([]);
  const [busy, setBusy] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Profile | null>(null);

  useEffect(() => {
    if (!loading && profile && profile.role !== "admin") {
      navigate({ to: "/" });
    }
  }, [loading, profile, navigate]);

  const load = async () => {
    setBusy(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, role, phone, is_active, created_at")
      .order("created_at", { ascending: false });
    if (error) toast.error("讀取失敗:" + error.message);
    else setList((data ?? []) as Profile[]);
    setBusy(false);
  };

  useEffect(() => {
    if (profile?.role === "admin") load();
  }, [profile]);

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
        <p className="text-sm text-muted-foreground">僅管理員可進入使用者管理。</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">使用者管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            管理同公司使用者帳號與角色。
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          新增使用者
        </Button>
      </div>

      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名稱</TableHead>
              <TableHead className="w-28">角色</TableHead>
              <TableHead>電話</TableHead>
              <TableHead className="w-24">狀態</TableHead>
              <TableHead className="w-40">建立時間</TableHead>
              <TableHead className="w-20 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {busy ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <Loader2 className="inline h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : list.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">
                  尚無使用者
                </TableCell>
              </TableRow>
            ) : (
              list.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {p.display_name || "—"}
                    {p.id === user?.id && (
                      <Badge variant="outline" className="ml-2">我</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{ROLE_LABELS[p.role ?? ""] ?? p.role ?? "—"}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.phone || "—"}</TableCell>
                  <TableCell>
                    {p.is_active ? (
                      <Badge className="bg-success text-success-foreground">啟用</Badge>
                    ) : (
                      <Badge variant="destructive">停用</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => setEditTarget(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          setCreateOpen(false);
          load();
        }}
      />
      <EditUserDialog
        target={editTarget}
        onOpenChange={(v) => !v && setEditTarget(null)}
        currentUserId={user?.id ?? null}
        onSaved={() => {
          setEditTarget(null);
          load();
        }}
      />
    </div>
  );
}

function CreateUserDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<string>("staff");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setEmail("");
      setPassword("");
      setDisplayName("");
      setRole("staff");
    }
  }, [open]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.functions.invoke("admin-create-user", {
      body: { email, password, display_name: displayName, role },
    });
    setSaving(false);
    if (error) {
      toast.error("建立帳號失敗:" + error.message);
      return;
    }
    toast.success("使用者已建立");
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新增使用者</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Email <span className="text-destructive">*</span></Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>密碼 <span className="text-destructive">*</span></Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          <div className="space-y-1.5">
            <Label>顯示名稱 <span className="text-destructive">*</span></Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>角色</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              建立
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditUserDialog({
  target,
  onOpenChange,
  onSaved,
  currentUserId,
}: {
  target: Profile | null;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
  currentUserId: string | null;
}) {
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("staff");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (target) {
      setDisplayName(target.display_name ?? "");
      setRole(target.role ?? "staff");
      setIsActive(target.is_active);
    }
  }, [target]);

  if (!target) return null;
  const isSelf = target.id === currentUserId;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName, role, is_active: isActive })
      .eq("id", target.id);
    setSaving(false);
    if (error) {
      toast.error("更新失敗:" + error.message);
      return;
    }
    toast.success("已更新");
    onSaved();
  };

  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>編輯使用者</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>顯示名稱</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>角色</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <div className="text-sm font-medium">啟用帳號</div>
              <div className="text-xs text-muted-foreground">
                {isSelf ? "不可停用自己的帳號" : "停用後該使用者將無法登入"}
              </div>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
              disabled={isSelf}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            * 不可從此處修改 email 或密碼,請使用者自行重設密碼。
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              儲存
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
