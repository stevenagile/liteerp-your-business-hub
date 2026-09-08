import { createLazyFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Pencil, Trash2, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";
import { useCompanyId } from "@/hooks/useCompanyId";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createLazyFileRoute("/_app/studio/agents")({
  component: AgentsPage,
});

type Status = "draft" | "active" | "archived";

interface Agent {
  id: string;
  name: string;
  jd: string | null;
  system_prompt: string | null;
  department_id: string | null;
  status: Status;
  created_at: string;
}

interface Department { id: string; name: string; }
interface Skill { id: string; name: string; }

const NONE_DEPT = "__none__";
const agentDb = () => supabase.schema("agent" as never);

const statusVariant = (s: Status) =>
  s === "active" ? "default" : s === "archived" ? "secondary" : "outline";

function AgentsPage() {
  usePermissionGuard("/studio");
  const companyId = useCompanyId();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [skillCounts, setSkillCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Agent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Agent | null>(null);

  const deptMap = useMemo(
    () => Object.fromEntries(departments.map((d) => [d.id, d.name])),
    [departments],
  );

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const [a, d, as_] = await Promise.all([
      agentDb().from("agents")
        .select("id,name,jd,system_prompt,department_id,status,created_at")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false }),
      agentDb().from("departments").select("id,name")
        .eq("company_id", companyId).order("name"),
      agentDb().from("agent_skills").select("agent_id"),
    ]);
    if (a.error) toast.error(`載入 Agents 失敗：${a.error.message}`);
    else setAgents((a.data ?? []) as Agent[]);
    if (d.error) toast.error(`載入 Departments 失敗：${d.error.message}`);
    else setDepartments((d.data ?? []) as Department[]);
    if (!as_.error) {
      const counts: Record<string, number> = {};
      for (const row of (as_.data ?? []) as { agent_id: string }[]) {
        counts[row.agent_id] = (counts[row.agent_id] ?? 0) + 1;
      }
      setSkillCounts(counts);
    }
    setLoading(false);
  }, [companyId]);

  useEffect(() => { void load(); }, [load]);

  const openNew = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (a: Agent) => { setEditing(a); setFormOpen(true); };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await agentDb().from("agents").delete().eq("id", deleteTarget.id);
    if (error) toast.error(`刪除失敗：${error.message}`);
    else { toast.success("已刪除"); setDeleteTarget(null); void load(); }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agents</h1>
          <p className="text-sm text-muted-foreground">管理你的 AI Agents</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4" />New Agent</Button>
      </div>

      <Card>
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : agents.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No agents yet. Create your first one.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Skills</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[120px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell><Badge variant={statusVariant(a.status)}>{a.status}</Badge></TableCell>
                  <TableCell>{a.department_id ? deptMap[a.department_id] ?? "—" : "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{skillCounts[a.id] ?? 0}</TableCell>
                  <TableCell className="text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(a)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(a)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <AgentFormDialog
        open={formOpen} onOpenChange={setFormOpen} editing={editing}
        departments={departments} companyId={companyId}
        onSaved={() => { setFormOpen(false); void load(); }}
        onSkillsChanged={() => void load()}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除</AlertDialogTitle>
            <AlertDialogDescription>將永久刪除 Agent「{deleteTarget?.name}」。此動作無法復原。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>刪除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AgentFormDialog({
  open, onOpenChange, editing, departments, companyId, onSaved, onSkillsChanged,
}: {
  open: boolean; onOpenChange: (o: boolean) => void; editing: Agent | null;
  departments: Department[]; companyId: string | null; onSaved: () => void; onSkillsChanged: () => void;
}) {
  const [name, setName] = useState("");
  const [jd, setJd] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [departmentId, setDepartmentId] = useState<string>(NONE_DEPT);
  const [status, setStatus] = useState<Status>("draft");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? "");
    setJd(editing?.jd ?? "");
    setSystemPrompt(editing?.system_prompt ?? "");
    setDepartmentId(editing?.department_id ?? NONE_DEPT);
    setStatus(editing?.status ?? "draft");
  }, [open, editing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Name 為必填"); return; }
    if (!companyId) { toast.error("無法取得 company_id"); return; }
    setSaving(true);
    const payload = {
      name: name.trim(),
      jd: jd.trim() || null,
      system_prompt: systemPrompt.trim() || null,
      department_id: departmentId === NONE_DEPT ? null : departmentId,
      status,
      ...(editing ? {} : { company_id: companyId }),
    };
    const res = editing
      ? await agentDb().from("agents").update(payload).eq("id", editing.id)
      : await agentDb().from("agents").insert(payload);
    setSaving(false);
    if (res.error) { toast.error(`儲存失敗：${res.error.message}`); return; }
    toast.success(editing ? "已更新" : "已建立");
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Agent" : "New Agent"}</DialogTitle>
            <DialogDescription>{editing ? "更新 Agent 的設定" : "建立一個新的 Agent"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="jd">Job description / 職務說明</Label>
            <Textarea id="jd" value={jd} onChange={(e) => setJd(e.target.value)} rows={3} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sp">System prompt</Label>
            <Textarea id="sp" value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} rows={4} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_DEPT}>None</SelectItem>
                  {departments.map((d) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">draft</SelectItem>
                  <SelectItem value="active">active</SelectItem>
                  <SelectItem value="archived">archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {editing ? (
            <AgentSkillsSection agentId={editing.id} onChanged={onSkillsChanged} />
          ) : (
            <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
              Save the agent first, then edit it to assign skills.
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>取消</Button>
            <Button type="submit" disabled={saving}>{saving ? "儲存中…" : editing ? "更新" : "建立"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AgentSkillsSection({ agentId, onChanged }: { agentId: string; onChanged: () => void }) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [bound, setBound] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<Set<string>>(new Set());

  const fetchState = useCallback(async () => {
    const [s, b] = await Promise.all([
      agentDb().from("skills").select("id,name").order("name"),
      agentDb().from("agent_skills").select("skill_id").eq("agent_id", agentId),
    ]);
    if (s.error) toast.error(`載入 Skills 失敗：${s.error.message}`);
    else setSkills((s.data ?? []) as Skill[]);
    if (b.error) toast.error(`載入 binding 失敗：${b.error.message}`);
    else setBound(new Set(((b.data ?? []) as { skill_id: string }[]).map((r) => r.skill_id)));
    setLoading(false);
  }, [agentId]);

  useEffect(() => { setLoading(true); void fetchState(); }, [fetchState]);

  const toggle = async (skillId: string, next: boolean) => {
    setPending((p) => new Set(p).add(skillId));
    setBound((prev) => {
      const n = new Set(prev);
      if (next) n.add(skillId); else n.delete(skillId);
      return n;
    });
    const res = next
      ? await agentDb().from("agent_skills").insert({ agent_id: agentId, skill_id: skillId, enabled: true })
      : await agentDb().from("agent_skills").delete().eq("agent_id", agentId).eq("skill_id", skillId);
    setPending((p) => { const n = new Set(p); n.delete(skillId); return n; });
    if (res.error) { toast.error(`更新失敗：${res.error.message}`); void fetchState(); return; }
    toast.success(next ? "已綁定" : "已取消綁定");
    onChanged();
  };

  return (
    <div className="space-y-2 border-t pt-4">
      <Label className="text-base font-medium">Skills</Label>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : skills.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No skills available.{" "}
          <Link to="/studio/skills" className="text-primary underline">Create skills first.</Link>
        </p>
      ) : (
        <div className="space-y-1 rounded-md border">
          {skills.map((s) => (
            <div key={s.id} className="flex items-center justify-between px-3 py-2 [&:not(:last-child)]:border-b">
              <span className="text-sm">{s.name}</span>
              <Switch checked={bound.has(s.id)} disabled={pending.has(s.id)} onCheckedChange={(v) => void toggle(s.id, v)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
