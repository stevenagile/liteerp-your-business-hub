import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Save, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/roles")({
  component: RolesPage,
});

const core = () => supabase.schema("core" as never);

type Role = { code: string; label: string };

type MenuItem = {
  id: string;
  parent_id: string | null;
  label: string;
  sort_order: number | null;
};

type MenuNode = MenuItem & { children: MenuNode[] };

type AccessRow = {
  role: string;
  menu_id: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_approve: boolean;
};

type Cell = {
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_approve: boolean;
};
type AccessMap = Record<string, Cell>;

const ACTIONS: Array<{ key: keyof Cell; label: string }> = [
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

function flattenTree(
  nodes: MenuNode[],
  depth = 0,
): Array<MenuNode & { depth: number }> {
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
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [access, setAccess] = useState<AccessMap>({});
  const [originalAccess, setOriginalAccess] = useState<AccessMap>({});
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [saving, setSaving] = useState(false);

  const isAdminRole = selectedRole === "admin";

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
      core().rpc("list_roles"),
      core()
        .from("menu_items")
        .select("id,parent_id,label,sort_order")
        .order("sort_order"),
    ]);
    if (r.error) toast.error(r.error.message);
    else {
      const list = (r.data ?? []) as Role[];
      setRoles(list);
      setSelectedRole(
        (cur) =>
          cur ?? list.find((x) => x.code !== "admin")?.code ?? list[0]?.code ?? null,
      );
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
    if (!selectedRole || selectedRole === "admin") {
      setAccess({});
      setOriginalAccess({});
      return;
    }
    (async () => {
      setLoadingMatrix(true);
      const { data, error } = await core()
        .from("menu_role_access")
        .select("*")
        .eq("role", selectedRole);
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
  }, [selectedRole]);

  const flat = useMemo(() => flattenTree(buildTree(menus)), [menus]);

  const getCell = (menuId: string, key: keyof Cell) =>
    access[menuId]?.[key] ?? false;

  const setCell = (menuId: string, key: keyof Cell, value: boolean) => {
    setAccess((prev) => {
      const cur = prev[menuId] ?? {
        can_view: false,
        can_create: false,
        can_edit: false,
        can_approve: false,
      };
      const next = { ...cur, [key]: value };
      // 審核隱含可見
      if (key === "can_approve" && value && !next.can_view) next.can_view = true;
      return { ...prev, [menuId]: next };
    });
  };

  const isDirty = useMemo(
    () => JSON.stringify(access) !== JSON.stringify(originalAccess),
    [access, originalAccess],
  );

  const saveMatrix = async () => {
    if (!selectedRole || selectedRole === "admin") return;
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
            role: selectedRole,
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
        .from("menu_role_access")
        .upsert(upserts, { onConflict: "role,menu_id" });
      if (error) {
        setSaving(false);
        return toast.error(error.message);
      }
    }
    if (deletes.length) {
      const { error } = await core()
        .from("menu_role_access")
        .delete()
        .eq("role", selectedRole)
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

  const selected = roles.find((r) => r.code === selectedRole) || null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">角色權限</h1>
        <p className="text-sm text-muted-foreground">
          設定各角色對選單的「檢視 / 新增 / 編輯 / 審核」權限。角色沿用系統帳號角色。
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
        {/* Roles list */}
        <div className="rounded-md border bg-card">
          <div className="border-b px-3 py-2 text-sm font-medium">角色</div>
          {loadingList ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ul className="max-h-[70vh] overflow-y-auto">
              {roles.map((r) => {
                const active = r.code === selectedRole;
                return (
                  <li key={r.code}>
                    <button
                      type="button"
                      onClick={() => setSelectedRole(r.code)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 border-b px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                        active && "bg-accent",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{r.label}</div>
                        <div className="truncate text-[11px] text-muted-foreground">
                          {r.code}
                        </div>
                      </div>
                      {r.code === "admin" && (
                        <Badge variant="secondary" className="gap-1 text-[10px]">
                          <Lock className="h-3 w-3" /> 全開
                        </Badge>
                      )}
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
            <div className="text-sm font-medium">
              {selected ? selected.label : "請選擇角色"}
            </div>
            <Button
              size="sm"
              onClick={saveMatrix}
              disabled={!selectedRole || isAdminRole || !isDirty || saving}
            >
              {saving ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1 h-4 w-4" />
              )}
              儲存
            </Button>
          </div>

          {!selectedRole ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              請先從左側選擇角色
            </div>
          ) : isAdminRole ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              管理員 (admin) 預設擁有所有選單與動作權限,不需個別設定。
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
    </div>
  );
}
