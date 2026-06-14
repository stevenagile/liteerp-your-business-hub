import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Pencil, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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

export const Route = createFileRoute("/_app/users")({
  component: UsersPage,
});

type Role = { code: string; label: string };
type UserRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  is_active: boolean;
  last_login_at: string | null;
  role: string | null;
};

const core = () => supabase.schema("core" as never);

function formatDateTime(s: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("zh-TW", { hour12: false });
}

function UsersPage() {
  const navigate = useNavigate();
  const [guardLoading, setGuardLoading] = useState(true);
  const [canView, setCanView] = useState(false);
  const [canEdit, setCanEdit] = useState(false);

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);

  const [editing, setEditing] = useState<UserRow | null>(null);
  const [editName, setEditName] = useState("");

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("");
  const [inviting, setInviting] = useState(false);

  const roleLabel = (code: string | null) =>
    roles.find((r) => r.code === code)?.label ?? code ?? "—";

  // 進頁守衛
  useEffect(() => {
    (async () => {
      const [{ data: viewOk }, { data: editOk }] = await Promise.all([
        core().rpc("has_menu_access", { p_menu: "user_list", p_action: "view" }),
        core().rpc("has_menu_access", { p_menu: "user_list", p_action: "edit" }),
      ]);
      const v = viewOk === true;
      setCanView(v);
      setCanEdit(editOk === true);
      setGuardLoading(false);
      if (!v) {
        toast.error("無權限");
        setTimeout(() => navigate({ to: "/" }), 800);
      }
    })();
  }, [navigate]);

  const load = async () => {
    setLoading(true);
    const [u, r] = await Promise.all([
      core().rpc("list_users"),
      core().rpc("list_roles"),
    ]);
    if (u.error) toast.error(u.error.message);
    else setUsers((u.data ?? []) as UserRow[]);
    if (r.error) toast.error(r.error.message);
    else setRoles((r.data ?? []) as Role[]);
    setLoading(false);
  };

  useEffect(() => {
    if (canView) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView]);

  const updateRole = async (user: UserRow, role: string) => {
    const { error } = await core().rpc("admin_update_user", {
      p_id: user.id,
      p_role: role,
    });
    if (error) return toast.error(error.message);
    toast.success("已更新角色");
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, role } : u)),
    );
  };

  const toggleActive = async (user: UserRow, next: boolean) => {
    const { error } = await core().rpc("admin_update_user", {
      p_id: user.id,
      p_is_active: next,
    });
    if (error) return toast.error(error.message);
    toast.success(next ? "已啟用" : "已停用");
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, is_active: next } : u)),
    );
  };

  const saveName = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const { error } = await core().rpc("admin_update_user", {
      p_id: editing.id,
      p_display_name: editName.trim() || null,
    });
    if (error) return toast.error(error.message);
    toast.success("已更新姓名");
    setEditing(null);
    load();
  };

  const invite = async (e: FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteRole) {
      toast.error("請輸入 Email 並選擇角色");
      return;
    }
    setInviting(true);
    const { error } = await supabase.functions.invoke("invite_user", {
      body: {
        email: inviteEmail.trim(),
        role: inviteRole,
        display_name: inviteName.trim() || undefined,
      },
    });
    setInviting(false);
    if (error) {
      toast.error(error.message || "邀請失敗");
      return;
    }
    toast.success("已寄出邀請信");
    setInviteOpen(false);
    setInviteEmail("");
    setInviteName("");
    setInviteRole("");
    load();
  };

  if (guardLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="rounded-md border bg-card p-6 text-center text-sm text-muted-foreground">
        無權限,正在導回首頁…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">使用者管理</h1>
          <p className="text-sm text-muted-foreground">
            管理系統使用者、角色與啟用狀態
            {!canEdit && (
              <span className="ml-2 text-xs">(目前為唯讀檢視)</span>
            )}
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)} disabled={!canEdit} size="sm">
          <UserPlus className="mr-2 h-4 w-4" />
          邀請使用者
        </Button>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>姓名</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="w-48">角色</TableHead>
              <TableHead className="w-28">狀態</TableHead>
              <TableHead className="w-44">最後登入</TableHead>
              <TableHead className="w-20 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  尚無使用者
                </TableCell>
              </TableRow>
            ) : (
              users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    {u.display_name || "—"}
                  </TableCell>
                  <TableCell>{u.email || "—"}</TableCell>
                  <TableCell>
                    {canEdit ? (
                      <Select
                        value={u.role ?? ""}
                        onValueChange={(v) => updateRole(u, v)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="選擇角色" />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((r) => (
                            <SelectItem key={r.code} value={r.code}>
                              {r.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span>{roleLabel(u.role)}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={u.is_active}
                        onCheckedChange={(v) => toggleActive(u, v)}
                        disabled={!canEdit}
                      />
                      <Badge
                        variant={u.is_active ? "default" : "secondary"}
                        className={
                          u.is_active
                            ? "bg-success text-success-foreground hover:bg-success/90"
                            : ""
                        }
                      >
                        {u.is_active ? "啟用" : "停用"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDateTime(u.last_login_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={!canEdit}
                      onClick={() => {
                        setEditing(u);
                        setEditName(u.display_name ?? "");
                      }}
                      aria-label="編輯姓名"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 編輯姓名 */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>編輯姓名</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveName} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={editing?.email ?? ""} disabled />
            </div>
            <div className="space-y-2">
              <Label>姓名</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="輸入顯示姓名"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(null)}
              >
                取消
              </Button>
              <Button type="submit">儲存</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 邀請使用者 */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>邀請使用者</DialogTitle>
          </DialogHeader>
          <form onSubmit={invite} className="space-y-4">
            <p className="text-sm text-muted-foreground">
              系統會建立帳號並寄出邀請信，對方點信中連結設定密碼即可登入。
            </p>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>姓名（可選）</Label>
              <Input
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="顯示姓名"
              />
            </div>
            <div className="space-y-2">
              <Label>角色</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue placeholder="選擇角色" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.code} value={r.code}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setInviteOpen(false)}
              >
                取消
              </Button>
              <Button type="submit" disabled={inviting}>
                {inviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                送出邀請
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
