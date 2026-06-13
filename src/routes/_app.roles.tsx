import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Loader2, Plus, Save, Trash2, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/roles")({
  component: RolesPage,
});

const core = () => supabase.schema("core" as never);

type Role = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_system: boolean;
  sort_order?: number | null;
};

type MenuItem = {
  id: string;
  parent_id: string | null;
  label: string;
  sort_order: number | null;
};

type MenuNode = MenuItem & { children: MenuNode[] };

type AccessRow = {
  role_id: string;
  menu_id: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_approve: boolean;
};

type AccessMap = Record<
  string,
  { can_view: boolean; can_create: boolean; can_edit: boolean; can_approve: boolean }
>;

const ACTIONS: Array<{ key: keyof AccessMap[string]; label: string }> = [
  { key: "can_view", label: "檢視" },
  { key: "can_create", label: "新增" },
  { key: "can_edit", label: "編輯" },
  { key: "can_approve", label: "審核" },
];

function buildTree(items: MenuItem[]): MenuNode[] {
  const map = new Map<string, MenuNode>();
  items.forEach((m) => map.set(m.id, { ...m, children: [] }));
  const roots: MenuNode[] = [];
  map.forEach((n) => {
    if (n.parent_id && map.has(n.parent_id)) {
      map.get(n.parent_id)!.children.push(n);
    } else {
      roots.push(n);
    }
  });
  const sortRec = (arr: MenuNode[]) => {
    arr.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    arr.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

function flattenTree(nodes: MenuNode[], depth = 0): Array<MenuNode & { depth: number }> {
  const out: Array<MenuNode & { depth: number }> = [];
  for (const n of nodes) {
    out.push({ ...n, depth });
    if (n.children.length) out.push(...flattenTree(n.children, depth + 1));
  }
  return out;
}

function RolesPage() {
  const navigate = useNavigate();
  const [guardLoading, setGuardLoading] = useState(true);
  const [canView, setCanView] = useState(false);

  const [roles, setRoles] = useState<Role[]>([]);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [access, setAccess] = useState<AccessMap>({});
  const [originalAccess, setOriginalAccess] = useState<AccessMap>({});
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [saving, setSaving] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [newRole, setNewRole] = useState({ code: "", name: "", description: "" });

  // 守衛
  useEffect(() => {
    (async () => {
      const { data } = await core().rpc("has_menu_access", {
        p_menu: "role_permission",
        p_action: "view",
      });
      const ok = data === true;
      setCanView(ok);
      setGuardLoading(false);
      if (!ok) {
        toast.error("無權限");
        setTimeout(() => navigate({ to: "/" }), 800);
      }
    })();
  }, [navigate]);

  const loadRolesAndMenus = async () => {
    setLoadingList(true);
    const [r, m] = await Promise.all([
      core()
        .from("roles")
        .select("id, code, name, description, is_system, sort_order")
        .order("sort_order"),
      core()
        .from("menu_items")
        .select("id,parent_id,label,sort_order")
        .order("sort_order"),
    ]);
    if (r.error) toast.error(r.error.message);
    else {
      const list = (r.data ?? []) as Role[];
      setRoles(list);
      if (!selectedRoleId && list.length > 0) setSelectedRoleId(list[0].id);
    }
    if (m.error) toast.error(m.error.message);
    else setMenus((m.data ?? []) as MenuItem[]);
    setLoadingList(false);
  };

  useEffect(() => {
    if (canView) loadRolesAndMenus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView]);

  // Load matrix for selected role
  useEffect(() => {
    if (!selectedRoleId) {
      setAccess({});
      setOriginalAccess({});
      return;
    }
    (async () => {
      setLoadingMatrix(true);
      const { data, error } = await core()
        .from("role_menu_access")
        .select("*")
        .eq("role_id", selectedRoleId);
      if (error) {
        toast.error(error.message);
        setAccess({});
        setOriginalAccess({});
      } else {
        const m: AccessMap = {};
        ((data ?? []) as AccessRow[]).forEach((row) => {
          m[row.menu_id] = {
            can_view: !!row.can_view,
            can_create: !!row.can_create,
            can_edit: !!row.can_edit,
            can_approve: !!row.can_approve,
          };
        });
        setAccess(m);
        setOriginalAccess(JSON.parse(JSON.stringify(m)));
      }
      setLoadingMatrix(false);
    })();
  }, [selectedRoleId]);

  const flat = useMemo(() => flattenTree(buildTree(menus)), [menus]);

  const getCell = (menuId: string, key: keyof AccessMap[string]) =>
    access[menuId]?.[key] ?? false;

  const setCell = (
    menuId: string,
    key: keyof AccessMap[string],
    value: boolean,
  ) => {
    setAccess((prev) => {
      const cur = prev[menuId] ?? {
        can_view: false,
        can_create: false,
        can_edit: false,
        can_approve: false,
      };
      const next = { ...cur, [key]: value };
      // 審核隱含可見
      if (key === "can_approve" && value && !next.can_view) {
        next.can_view = true;
      }
      return { ...prev, [menuId]: next };
    });
  };

  const isDirty = useMemo(
    () => JSON.stringify(access) !== JSON.stringify(originalAccess),
    [access, originalAccess],
  );

  const selectedRole = roles.find((r) => r.id === selectedRoleId) || null;

  const saveMatrix = async () => {
    if (!selectedRoleId) return;
    setSaving(true);
    const upserts: AccessRow[] = [];
    const deletes: string[] = [];
    for (const m of menus) {
      const cur = access[m.id];
      const orig = originalAccess[m.id];
      const allFalse =
        !cur ||
        (!cur.can_view && !cur.can_create && !cur.can_edit && !cur.can_approve);
      if (allFalse) {
        if (orig) deletes.push(m.id);
      } else {
        const changed =
          !orig ||
          orig.can_view !== cur.can_view ||
          orig.can_create !== cur.can_create ||
          orig.can_edit !== cur.can_edit ||
          orig.can_approve !== cur.can_approve;
        if (changed) {
          upserts.push({
            role_id: selectedRoleId,
            menu_id: m.id,
            can_view: cur.can_view,
            can_create: cur.can_create,
            can_edit: cur.can_edit,
            can_approve: cur.can_approve,
          });
        }
      }
    }

    if (upserts.length) {
      const { error } = await core()
        .from("role_menu_access")
        .upsert(upserts, { onConflict: "role_id,menu_id" });
      if (error) {
        setSaving(false);
        return toast.error(error.message);
      }
    }
    if (deletes.length) {
      const { error } = await core()
        .from("role_menu_access")
        .delete()
        .eq("role_id", selectedRoleId)
        .in("menu_id", deletes);
      if (error) {
        setSaving(false);
        return toast.error(error.message);
      }
    }
    setSaving(false);
    toast.success("已儲存權限");
    setOriginalAccess(JSON.parse(JSON.stringify(access)));
  };

  const createRole = async (e: FormEvent) => {
    e.preventDefault();
    if (!newRole.code.trim() || !newRole.name.trim()) {
      return toast.error("請輸入代碼與名稱");
    }
    const { data: companyId, error: cErr } = await core().rpc("current_company");
    if (cErr) return toast.error(cErr.message);
    const { data, error } = await core()
      .from("roles")
      .insert({
        code: newRole.code.trim(),
        name: newRole.name.trim(),
        description: newRole.description.trim() || null,
        is_system: false,
        company_id: companyId,
      })
      .select("id, code, name, description, is_system, sort_order")
      .single();
    if (error) return toast.error(error.message);
    toast.success("已新增角色");
    setCreateOpen(false);
    setNewRole({ code: "", name: "", description: "" });
    await loadRolesAndMenus();
    if (data?.id) setSelectedRoleId(data.id as string);
  };

  const deleteRole = async (r: Role) => {
    if (r.is_system) return;
    if (!confirm(`確定刪除角色「${r.name}」？`)) return;
    const { error } = await core().from("roles").delete().eq("id", r.id);
    if (error) return toast.error(error.message);
    toast.success("已刪除");
    if (selectedRoleId === r.id) setSelectedRoleId(null);
    loadRolesAndMenus();
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
      <div>
        <h1 className="text-xl font-semibold">角色權限</h1>
        <p className="text-sm text-muted-foreground">
          編輯各角色對選單的「檢視 / 新增 / 編輯 / 審核」權限
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
        {/* Roles list */}
        <div className="rounded-md border bg-card">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <div className="text-sm font-medium">角色</div>
            <Button size="sm" variant="ghost" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1 h-4 w-4" />
              新增
            </Button>
          </div>
          {loadingList ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : roles.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              尚無角色
            </div>
          ) : (
            <ul className="max-h-[70vh] overflow-y-auto">
              {roles.map((r) => {
                const active = r.id === selectedRoleId;
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedRoleId(r.id)}
                      className={cn(
                        "flex w-full items-start justify-between gap-2 border-b px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                        active && "bg-accent",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 font-medium">
                          {r.is_system && (
                            <Lock className="h-3 w-3 text-muted-foreground" />
                          )}
                          <span className="truncate">{r.name}</span>
                        </div>
                        <div className="truncate text-[11px] text-muted-foreground">
                          {r.code}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {r.is_system && (
                          <Badge variant="secondary" className="text-[10px]">
                            系統
                          </Badge>
                        )}
                        {!r.is_system && (
                          <button
                            type="button"
                            className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteRole(r);
                            }}
                            aria-label="刪除角色"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Matrix */}
        <div className="rounded-md border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <div>
              <div className="text-sm font-medium">
                {selectedRole ? selectedRole.name : "請選擇角色"}
              </div>
              {selectedRole?.description && (
                <div className="text-xs text-muted-foreground">
                  {selectedRole.description}
                </div>
              )}
            </div>
            <Button
              size="sm"
              onClick={saveMatrix}
              disabled={!selectedRoleId || !isDirty || saving}
            >
              {saving ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1 h-4 w-4" />
              )}
              儲存
            </Button>
          </div>

          {!selectedRoleId ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              請先從左側選擇角色
            </div>
          ) : loadingMatrix ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                    <th className="px-4 py-2 text-left font-medium">選單</th>
                    {ACTIONS.map((a) => (
                      <th
                        key={a.key}
                        className="w-20 px-2 py-2 text-center font-medium"
                      >
                        {a.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {flat.map((n) => {
                    const isGroup = n.children.length > 0;
                    return (
                      <tr
                        key={n.id}
                        className={cn(
                          "border-b last:border-b-0",
                          isGroup && "bg-muted/20",
                        )}
                      >
                        <td
                          className="px-4 py-2"
                          style={{ paddingLeft: `${1 + n.depth * 1.25}rem` }}
                        >
                          <span
                            className={cn(
                              isGroup
                                ? "text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
                                : "text-foreground",
                            )}
                          >
                            {n.label}
                          </span>
                        </td>
                        {ACTIONS.map((a) => (
                          <td key={a.key} className="px-2 py-2 text-center">
                            <Checkbox
                              checked={getCell(n.id, a.key)}
                              onCheckedChange={(v) =>
                                setCell(n.id, a.key, v === true)
                              }
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 新增角色 Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>新增角色</DialogTitle>
          </DialogHeader>
          <form onSubmit={createRole} className="space-y-4">
            <div className="space-y-2">
              <Label>代碼 (code) *</Label>
              <Input
                value={newRole.code}
                onChange={(e) =>
                  setNewRole((p) => ({ ...p, code: e.target.value }))
                }
                placeholder="例:sales_manager"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>名稱 *</Label>
              <Input
                value={newRole.name}
                onChange={(e) =>
                  setNewRole((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="例:銷售主管"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>說明</Label>
              <Textarea
                value={newRole.description}
                onChange={(e) =>
                  setNewRole((p) => ({ ...p, description: e.target.value }))
                }
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                取消
              </Button>
              <Button type="submit">建立</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
