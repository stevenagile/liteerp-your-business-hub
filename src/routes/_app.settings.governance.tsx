import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Plus, RefreshCw, Trash2, KeyRound, Pencil } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
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

export const Route = createFileRoute("/_app/settings/governance")({
  component: GovernancePage,
});

const core = () => supabase.schema("core" as never);
const GOV_URL = "https://atzovofxfahrptstnkke.supabase.co/functions/v1/gov-admin";

async function gov(action: string, payload: Record<string, unknown> = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(GOV_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session?.access_token ?? ""}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action, ...payload }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.error) throw new Error(j.error || `HTTP ${res.status}`);
  return j;
}

type Manager = { line_user_id: string; display_name: string | null; kind: string; is_active: boolean };
type Client = { id: string; name: string; allowed_skills: string[]; is_active: boolean; last_used_at: string | null };
type Skill = { name: string; needs_approval: boolean };
type Candidate = { line_user_id: string; display_name: string | null; contact_code: string | null };

function fmt(s: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString("zh-TW", { hour12: false });
}

function GovernancePage() {
  const navigate = useNavigate();
  const [guardLoading, setGuardLoading] = useState(true);
  const [canView, setCanView] = useState(false);
  const [loading, setLoading] = useState(true);

  const [managers, setManagers] = useState<Manager[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  // 新增審核者
  const [mgrOpen, setMgrOpen] = useState(false);
  const [mgrPick, setMgrPick] = useState("");
  const [mgrId, setMgrId] = useState("");
  const [mgrName, setMgrName] = useState("");
  const [mgrKind, setMgrKind] = useState("user");
  const [mgrBusy, setMgrBusy] = useState(false);

  // 新增/編輯 client
  const [cliOpen, setCliOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [cliName, setCliName] = useState("");
  const [cliAll, setCliAll] = useState(true);
  const [cliSkills, setCliSkills] = useState<Set<string>>(new Set());
  const [cliBusy, setCliBusy] = useState(false);

  // 金鑰顯示
  const [keyShown, setKeyShown] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await core().rpc("has_menu_access", { p_menu: "governance", p_action: "view" });
      const ok = data === true;
      setCanView(ok);
      setGuardLoading(false);
      if (!ok) {
        toast.error("無權限");
        setTimeout(() => navigate({ to: "/" }), 800);
      }
    })();
  }, [navigate]);

  const load = async () => {
    setLoading(true);
    try {
      const r = await gov("list");
      setManagers(r.managers ?? []);
      setClients(r.clients ?? []);
      setSkills(r.skills ?? []);
      setCandidates(r.candidates ?? []);
    } catch (e) {
      toast.error(`讀取失敗：${(e as Error).message}`);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (canView) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView]);

  // ---- 審核者 ----
  const addManager = async (e: FormEvent) => {
    e.preventDefault();
    const id = (mgrPick || mgrId).trim();
    if (!id) return toast.error("請選擇或輸入 LINE userId");
    setMgrBusy(true);
    try {
      const picked = candidates.find((c) => c.line_user_id === id);
      await gov("add_manager", {
        line_user_id: id,
        display_name: mgrName.trim() || picked?.display_name || null,
        kind: mgrKind,
      });
      toast.success("已新增審核者");
      setMgrOpen(false); setMgrPick(""); setMgrId(""); setMgrName(""); setMgrKind("user");
      load();
    } catch (err) { toast.error((err as Error).message); }
    setMgrBusy(false);
  };

  const toggleManager = async (m: Manager, next: boolean) => {
    try {
      await gov("update_manager", { line_user_id: m.line_user_id, is_active: next });
      setManagers((p) => p.map((x) => (x.line_user_id === m.line_user_id ? { ...x, is_active: next } : x)));
    } catch (e) { toast.error((e as Error).message); }
  };

  const removeManager = async (m: Manager) => {
    if (!confirm(`移除審核者「${m.display_name || m.line_user_id}」？`)) return;
    try { await gov("remove_manager", { line_user_id: m.line_user_id }); toast.success("已移除"); load(); }
    catch (e) { toast.error((e as Error).message); }
  };

  // ---- MCP clients ----
  const openNewClient = () => {
    setEditClient(null); setCliName(""); setCliAll(true); setCliSkills(new Set()); setCliOpen(true);
  };
  const openEditClient = (c: Client) => {
    setEditClient(c); setCliName(c.name);
    const all = c.allowed_skills.includes("*");
    setCliAll(all);
    setCliSkills(new Set(all ? [] : c.allowed_skills));
    setCliOpen(true);
  };
  const submitClient = async (e: FormEvent) => {
    e.preventDefault();
    const allowed = cliAll ? ["*"] : [...cliSkills];
    if (!cliAll && allowed.length === 0) return toast.error("請至少勾選一個技能，或選「全部」");
    setCliBusy(true);
    try {
      if (editClient) {
        await gov("update_client", { id: editClient.id, allowed_skills: allowed });
        toast.success("已更新權限");
      } else {
        if (!cliName.trim()) { setCliBusy(false); return toast.error("請輸入名稱"); }
        const r = await gov("add_client", { name: cliName.trim(), allowed_skills: allowed });
        setKeyShown(r.api_key as string);
        toast.success("已建立 client");
      }
      setCliOpen(false);
      load();
    } catch (err) { toast.error((err as Error).message); }
    setCliBusy(false);
  };
  const toggleClient = async (c: Client, next: boolean) => {
    try {
      await gov("update_client", { id: c.id, is_active: next });
      setClients((p) => p.map((x) => (x.id === c.id ? { ...x, is_active: next } : x)));
    } catch (e) { toast.error((e as Error).message); }
  };
  const regenKey = async (c: Client) => {
    if (!confirm(`重新產生「${c.name}」的金鑰？舊金鑰會立即失效。`)) return;
    try { const r = await gov("regenerate_client_key", { id: c.id }); setKeyShown(r.api_key as string); }
    catch (e) { toast.error((e as Error).message); }
  };

  if (guardLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }
  if (!canView) {
    return <div className="rounded-md border bg-card p-6 text-center text-sm text-muted-foreground">無權限，正在導回首頁…</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">AI 治理設定</h1>
        <p className="text-sm text-muted-foreground">管理 LINE 審核者與 AI(MCP) 客戶端。僅管理員可操作。</p>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {/* 審核者 */}
          <section className="rounded-md border bg-card">
            <div className="flex items-center justify-between border-b px-4 py-2.5">
              <div className="text-base font-medium">LINE 審核者</div>
              <Button size="sm" onClick={() => setMgrOpen(true)}><Plus className="mr-1 h-4 w-4" />新增審核者</Button>
            </div>
            <Table>
              <TableHeader><TableRow>
                <TableHead>名稱</TableHead><TableHead>LINE userId</TableHead>
                <TableHead className="w-24">類型</TableHead><TableHead className="w-24 text-center">啟用</TableHead>
                <TableHead className="w-20 text-right">移除</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {managers.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">尚未設定審核者</TableCell></TableRow>
                ) : managers.map((m) => (
                  <TableRow key={m.line_user_id}>
                    <TableCell className="font-medium">{m.display_name || "—"}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{m.line_user_id.slice(0, 12)}…</TableCell>
                    <TableCell><Badge variant="secondary">{m.kind === "group" ? "群組" : "個人"}</Badge></TableCell>
                    <TableCell className="text-center"><Switch checked={m.is_active} onCheckedChange={(v) => toggleManager(m, v)} /></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => removeManager(m)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>

          {/* MCP clients */}
          <section className="rounded-md border bg-card">
            <div className="flex items-center justify-between border-b px-4 py-2.5">
              <div className="text-base font-medium">AI (MCP) 客戶端</div>
              <Button size="sm" onClick={openNewClient}><Plus className="mr-1 h-4 w-4" />新增 client</Button>
            </div>
            <Table>
              <TableHeader><TableRow>
                <TableHead>名稱</TableHead><TableHead>可用技能</TableHead>
                <TableHead className="w-44">最後使用</TableHead><TableHead className="w-24 text-center">啟用</TableHead>
                <TableHead className="w-32 text-right">操作</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {clients.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">尚無 client</TableCell></TableRow>
                ) : clients.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.allowed_skills.includes("*") ? "全部技能" : `${c.allowed_skills.length} 個技能`}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{fmt(c.last_used_at)}</TableCell>
                    <TableCell className="text-center"><Switch checked={c.is_active} onCheckedChange={(v) => toggleClient(c, v)} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditClient(c)} aria-label="編輯權限"><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => regenKey(c)} aria-label="重產金鑰"><KeyRound className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        </>
      )}

      {/* 新增審核者 Dialog */}
      <Dialog open={mgrOpen} onOpenChange={setMgrOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>新增審核者</DialogTitle></DialogHeader>
          <form onSubmit={addManager} className="space-y-4">
            <div className="space-y-2">
              <Label>從近期 LINE 互動挑選</Label>
              <Select value={mgrPick} onValueChange={(v) => { setMgrPick(v); const c = candidates.find((x) => x.line_user_id === v); setMgrName(c?.display_name || ""); }}>
                <SelectTrigger><SelectValue placeholder={candidates.length ? "選擇一位近期互動者" : "近期無可選對象"} /></SelectTrigger>
                <SelectContent>
                  {candidates.map((c) => (
                    <SelectItem key={c.line_user_id} value={c.line_user_id}>{(c.display_name || "(未綁定)") + " · " + c.line_user_id.slice(0, 10) + "…"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">或直接輸入 LINE userId（U 開頭）。對方需先加官方帳號並傳過訊息才會出現在清單。</p>
            </div>
            <div className="space-y-2">
              <Label>LINE userId（手動輸入）</Label>
              <Input value={mgrId} onChange={(e) => setMgrId(e.target.value)} placeholder="U xxxxxxxx" disabled={!!mgrPick} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>名稱</Label><Input value={mgrName} onChange={(e) => setMgrName(e.target.value)} placeholder="顯示名稱" /></div>
              <div className="space-y-2"><Label>類型</Label>
                <Select value={mgrKind} onValueChange={setMgrKind}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="user">個人（可按核准）</SelectItem><SelectItem value="group">群組（推播目標）</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setMgrOpen(false)}>取消</Button>
              <Button type="submit" disabled={mgrBusy}>{mgrBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}新增</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 新增/編輯 client Dialog */}
      <Dialog open={cliOpen} onOpenChange={setCliOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editClient ? `編輯權限：${editClient.name}` : "新增 MCP client"}</DialogTitle></DialogHeader>
          <form onSubmit={submitClient} className="space-y-4">
            {!editClient && (
              <div className="space-y-2"><Label>名稱</Label><Input value={cliName} onChange={(e) => setCliName(e.target.value)} placeholder="例：claude-dispatch" required /></div>
            )}
            <div className="flex items-center gap-2">
              <Switch checked={cliAll} onCheckedChange={setCliAll} id="all" />
              <Label htmlFor="all">全部技能（*）</Label>
            </div>
            {!cliAll && (
              <div className="max-h-64 space-y-1.5 overflow-y-auto rounded-md border p-3">
                {skills.map((s) => (
                  <label key={s.name} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={cliSkills.has(s.name)}
                      onCheckedChange={(v) => setCliSkills((prev) => { const n = new Set(prev); if (v === true) n.add(s.name); else n.delete(s.name); return n; })}
                    />
                    <span>{s.name}</span>
                    {s.needs_approval && <Badge variant="secondary" className="text-xs">需審核</Badge>}
                  </label>
                ))}
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCliOpen(false)}>取消</Button>
              <Button type="submit" disabled={cliBusy}>{cliBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editClient ? "儲存" : "建立"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 金鑰顯示 Dialog */}
      <Dialog open={!!keyShown} onOpenChange={(o) => !o && setKeyShown(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>API 金鑰（只顯示這一次）</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">請立即複製並交給對應的 client。關閉後無法再查看。</p>
            <div className="rounded-md border bg-muted/40 p-3 font-mono text-sm break-all">{keyShown}</div>
            <Button onClick={() => { navigator.clipboard?.writeText(keyShown ?? ""); toast.success("已複製"); }} className="w-full">複製金鑰</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
