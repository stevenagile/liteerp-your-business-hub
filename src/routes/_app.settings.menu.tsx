import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Lock,
  ChevronUp,
  ChevronDown,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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

export const Route = createFileRoute("/_app/settings/menu")({
  component: MenuStructurePage,
});

const core = () => supabase.schema("core" as never);

type MenuItem = {
  id: string;
  parent_id: string | null;
  label: string;
  route: string | null;
  icon: string | null;
  sort_order: number | null;
  is_active: boolean;
  is_system: boolean;
};

type Node = MenuItem & { children: Node[]; depth: number };

const SLUG_RE = /^[a-z0-9][a-z0-9_-]*$/i;

function buildFlat(items: MenuItem[]): Node[] {
  const map = new Map<string, Node>();
  items.forEach((m) => map.set(m.id, { ...m, children: [], depth: 0 }));
  const roots: Node[] = [];
  map.forEach((n) => {
    if (n.parent_id && map.has(n.parent_id)) {
      map.get(n.parent_id)!.children.push(n);
    } else {
      roots.push(n);
    }
  });
  const sortRec = (arr: Node[], depth: number) => {
    arr.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    arr.forEach((n) => {
      n.depth = depth;
      sortRec(n.children, depth + 1);
    });
  };
  sortRec(roots, 0);
  const out: Node[] = [];
  const walk = (arr: Node[]) => {
    for (const n of arr) {
      out.push(n);
      if (n.children.length) walk(n.children);
    }
  };
  walk(roots);
  return out;
}

type FormState = {
  id: string;
  parent_id: string | "__root__";
  label: string;
  route: string;
  icon: string;
  sort_order: number;
};

function MenuStructurePage() {
  const navigate = useNavigate();
  const [guardLoading, setGuardLoading] = useState(true);
  const [canView, setCanView] = useState(false);
  const [canEdit, setCanEdit] = useState(false);

  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<FormState>({
    id: "",
    parent_id: "__root__",
    label: "",
    route: "",
    icon: "",
    sort_order: 0,
  });

  // 守衛
  useEffect(() => {
    (async () => {
      const [{ data: v }, { data: e }] = await Promise.all([
        core().rpc("has_menu_access", {
          p_menu: "menu_structure",
          p_action: "view",
        }),
        core().rpc("has_menu_access", {
          p_menu: "menu_structure",
          p_action: "edit",
        }),
      ]);
      const ok = v === true;
      setCanView(ok);
      setCanEdit(e === true);
      setGuardLoading(false);
      if (!ok) {
        toast.error("無權限");
        setTimeout(() => navigate({ to: "/" }), 800);
      }
    })();
  }, [navigate]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await core()
      .from("menu_items")
      .select("*")
      .order("sort_order");
    if (error) toast.error(error.message);
    else setItems((data ?? []) as MenuItem[]);
    setLoading(false);
  };

  useEffect(() => {
    if (canView) load();
  }, [canView]);

  const flat = useMemo(() => buildFlat(items), [items]);

  const openCreate = () => {
    setForm({
      id: "",
      parent_id: "__root__",
      label: "",
      route: "",
      icon: "",
      sort_order: (items.reduce((m, i) => Math.max(m, i.sort_order ?? 0), 0) + 10),
    });
    setCreateOpen(true);
  };

  const openEdit = (it: MenuItem) => {
    setEditing(it);
    setForm({
      id: it.id,
      parent_id: it.parent_id ?? "__root__",
      label: it.label,
      route: it.route ?? "",
      icon: it.icon ?? "",
      sort_order: it.sort_order ?? 0,
    });
  };

  const submitCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!SLUG_RE.test(form.id)) {
      return toast.error("ID 必須是英數 slug,例如 'reports'");
    }
    if (!form.label.trim()) return toast.error("請輸入名稱");
    const { error } = await core()
      .from("menu_items")
      .insert({
        id: form.id.trim(),
        parent_id: form.parent_id === "__root__" ? null : form.parent_id,
        label: form.label.trim(),
        route: form.route.trim() || null,
        icon: form.icon.trim() || null,
        sort_order: Number(form.sort_order) || 0,
        is_active: true,
        is_system: false,
      });
    if (error) return toast.error(error.message);
    toast.success("已新增選單項");
    setCreateOpen(false);
    load();
  };

  const submitEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (!form.label.trim()) return toast.error("請輸入名稱");
    if (form.parent_id !== "__root__" && form.parent_id === editing.id) {
      return toast.error("不可將自己設為父節點");
    }
    const { error } = await core()
      .from("menu_items")
      .update({
        parent_id: form.parent_id === "__root__" ? null : form.parent_id,
        label: form.label.trim(),
        route: form.route.trim() || null,
        icon: form.icon.trim() || null,
        sort_order: Number(form.sort_order) || 0,
      })
      .eq("id", editing.id);
    if (error) return toast.error(error.message);
    toast.success("已更新");
    setEditing(null);
    load();
  };

  const toggleActive = async (it: MenuItem, next: boolean) => {
    const { error } = await core()
      .from("menu_items")
      .update({ is_active: next })
      .eq("id", it.id);
    if (error) return toast.error(error.message);
    setItems((prev) =>
      prev.map((i) => (i.id === it.id ? { ...i, is_active: next } : i)),
    );
  };

  const updateSort = async (it: MenuItem, next: number) => {
    const { error } = await core()
      .from("menu_items")
      .update({ sort_order: next })
      .eq("id", it.id);
    if (error) return toast.error(error.message);
    setItems((prev) =>
      prev.map((i) => (i.id === it.id ? { ...i, sort_order: next } : i)),
    );
  };

  const move = async (it: MenuItem, dir: -1 | 1) => {
    // 同層級兄弟，依 sort_order 排序後與相鄰者交換
    const siblings = items
      .filter((i) => (i.parent_id ?? null) === (it.parent_id ?? null))
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const idx = siblings.findIndex((s) => s.id === it.id);
    const swap = siblings[idx + dir];
    if (!swap) return;
    const a = it.sort_order ?? 0;
    const b = swap.sort_order ?? 0;
    // 一般情況交換兩者 sort_order；若相等則依方向給 it 不同值以確保順序改變
    const newSelf = a === b ? a + dir : b;
    const newSwap = a;
    const results = await Promise.all([
      core().from("menu_items").update({ sort_order: newSelf }).eq("id", it.id),
      core().from("menu_items").update({ sort_order: newSwap }).eq("id", swap.id),
    ]);
    const err = results.find((r) => r.error)?.error;
    if (err) return toast.error(err.message);
    load();
  };

  const removeItem = async (it: MenuItem) => {
    if (it.is_system) return;
    if (!confirm(`確定刪除「${it.label}」？`)) return;
    const { error } = await core().from("menu_items").delete().eq("id", it.id);
    if (error) return toast.error(error.message);
    toast.success("已刪除");
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

  const parentOptions = items.filter((i) => i.id !== editing?.id);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">選單結構</h1>
          <p className="text-sm text-muted-foreground">
            管理側邊欄選單項與層級
            {!canEdit && <span className="ml-2 text-xs">(目前為唯讀檢視)</span>}
          </p>
        </div>
        <Button size="sm" onClick={openCreate} disabled={!canEdit}>
          <Plus className="mr-1 h-4 w-4" />
          新增選單
        </Button>
      </div>

      <div className="flex items-start gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="space-y-1">
          <div>
            • <code>route</code> 對應的頁面需另行建立(路由檔),否則點擊會 404。
          </div>
          <div>
            • 新增自訂選單後,需到「角色權限」頁替對應角色開啟 <code>can_view</code>,選單才會出現在側邊欄。
          </div>
          <div>• 停用 (is_active=false) 後,該項不會出現在任何人的 get_my_menu。</div>
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名稱</TableHead>
              <TableHead className="w-48">路徑</TableHead>
              <TableHead className="w-28">Icon</TableHead>
              <TableHead className="w-32 text-center">排序</TableHead>
              <TableHead className="w-24 text-center">啟用</TableHead>
              <TableHead className="w-20 text-center">系統</TableHead>
              <TableHead className="w-28 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : flat.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  尚無選單項
                </TableCell>
              </TableRow>
            ) : (
              flat.map((n) => (
                <TableRow key={n.id}>
                  <TableCell>
                    <div
                      className="flex items-center gap-2"
                      style={{ paddingLeft: `${n.depth * 1.25}rem` }}
                    >
                      <span className={n.route ? "" : "font-medium text-muted-foreground"}>
                        {n.label}
                      </span>
                      <span className="text-xs text-muted-foreground/70">
                        ({n.id})
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {n.route || "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {n.icon || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={!canEdit}
                        onClick={() => move(n, -1)}
                        aria-label="上移"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        className="h-8 w-14 text-center"
                        value={n.sort_order ?? 0}
                        disabled={!canEdit}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          setItems((prev) =>
                            prev.map((i) =>
                              i.id === n.id ? { ...i, sort_order: v } : i,
                            ),
                          );
                        }}
                        onBlur={(e) => updateSort(n, Number(e.target.value) || 0)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={!canEdit}
                        onClick={() => move(n, 1)}
                        aria-label="下移"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={n.is_active}
                      onCheckedChange={(v) => toggleActive(n, v)}
                      disabled={!canEdit}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    {n.is_system ? (
                      <Badge variant="secondary" className="gap-1">
                        <Lock className="h-3 w-3" />
                        系統
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={!canEdit}
                        onClick={() => openEdit(n)}
                        aria-label="編輯"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {!n.is_system && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          disabled={!canEdit}
                          onClick={() => removeItem(n)}
                          aria-label="刪除"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 新增 */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>新增選單項</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>ID (英數 slug) *</Label>
              <Input
                value={form.id}
                onChange={(e) => setForm({ ...form, id: e.target.value })}
                placeholder="reports"
                required
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground">
                建立後不可更改,只允許英數、底線、連字號
              </p>
            </div>
            <FormFields form={form} setForm={setForm} parents={items} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                取消
              </Button>
              <Button type="submit">建立</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 編輯 */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>編輯選單項</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitEdit} className="space-y-4">
            <div className="space-y-2">
              <Label>ID</Label>
              <Input value={form.id} disabled />
            </div>
            <FormFields form={form} setForm={setForm} parents={parentOptions} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                取消
              </Button>
              <Button type="submit">儲存</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FormFields({
  form,
  setForm,
  parents,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  parents: MenuItem[];
}) {
  return (
    <>
      <div className="space-y-2">
        <Label>名稱 *</Label>
        <Input
          value={form.label}
          onChange={(e) => setForm({ ...form, label: e.target.value })}
          required
          maxLength={50}
        />
      </div>
      <div className="space-y-2">
        <Label>路徑 (route)</Label>
        <Input
          value={form.route}
          onChange={(e) => setForm({ ...form, route: e.target.value })}
          placeholder="/reports (留空為群組標題)"
          maxLength={200}
        />
      </div>
      <div className="space-y-2">
        <Label>Icon (lucide 名稱)</Label>
        <Input
          value={form.icon}
          onChange={(e) => setForm({ ...form, icon: e.target.value })}
          placeholder="settings / users / file-text"
          maxLength={50}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>父節點</Label>
          <Select
            value={form.parent_id}
            onValueChange={(v) => setForm({ ...form, parent_id: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__root__">(頂層)</SelectItem>
              {parents.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>排序</Label>
          <Input
            type="number"
            value={form.sort_order}
            onChange={(e) =>
              setForm({ ...form, sort_order: Number(e.target.value) || 0 })
            }
          />
        </div>
      </div>
    </>
  );
}
