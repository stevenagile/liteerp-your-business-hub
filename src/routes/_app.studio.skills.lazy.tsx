import { createLazyFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";
import { useCompanyId } from "@/hooks/useCompanyId";
import { Button } from "@/components/ui/button";
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

export const Route = createLazyFileRoute("/_app/studio/skills")({
  component: SkillsPage,
});

interface Skill {
  id: string;
  name: string;
  description: string | null;
  reversible: boolean;
  json_schema: unknown;
  created_at: string;
}

const skillsDb = () => supabase.schema("agent" as never);
const DEFAULT_JSON_SCHEMA = '{"type":"object","properties":{}}';

function truncate(str: string | null, len: number) {
  if (!str) return "—";
  return str.length > len ? str.slice(0, len) + "…" : str;
}

function SkillsPage() {
  usePermissionGuard("/studio");
  const companyId = useCompanyId();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Skill | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Skill | null>(null);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const { data, error } = await skillsDb()
      .from("skills")
      .select("id,name,description,reversible,json_schema,created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    if (error) toast.error(`載入 Skills 失敗：${error.message}`);
    else setSkills((data ?? []) as Skill[]);
    setLoading(false);
  }, [companyId]);

  useEffect(() => { void load(); }, [load]);

  const openNew = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (s: Skill) => { setEditing(s); setFormOpen(true); };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await skillsDb().from("skills").delete().eq("id", deleteTarget.id);
    if (error) toast.error(`刪除失敗：${error.message}`);
    else { toast.success("已刪除"); setDeleteTarget(null); void load(); }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Skills</h1>
          <p className="text-sm text-muted-foreground">管理你的 AI Skills</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4" />New Skill</Button>
      </div>

      <Card>
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : skills.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No skills yet. Create your first one.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Reversible</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[120px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {skills.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="max-w-xs">{truncate(s.description, 60)}</TableCell>
                  <TableCell>{s.reversible ? "Yes" : "No"}</TableCell>
                  <TableCell className="text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(s)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <SkillFormDialog
        open={formOpen} onOpenChange={setFormOpen} editing={editing}
        companyId={companyId}
        onSaved={() => { setFormOpen(false); void load(); }}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除</AlertDialogTitle>
            <AlertDialogDescription>將永久刪除 Skill「{deleteTarget?.name}」。此動作無法復原。</AlertDialogDescription>
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

function SkillFormDialog({
  open, onOpenChange, editing, companyId, onSaved,
}: {
  open: boolean; onOpenChange: (o: boolean) => void; editing: Skill | null;
  companyId: string | null; onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [reversible, setReversible] = useState(false);
  const [jsonSchema, setJsonSchema] = useState(DEFAULT_JSON_SCHEMA);
  const [jsonError, setJsonError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? "");
    setDescription(editing?.description ?? "");
    setReversible(editing?.reversible ?? false);
    setJsonSchema(
      editing?.json_schema && typeof editing.json_schema === "object"
        ? JSON.stringify(editing.json_schema)
        : typeof editing?.json_schema === "string"
          ? editing.json_schema
          : DEFAULT_JSON_SCHEMA,
    );
    setJsonError("");
  }, [open, editing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setJsonError("");
    if (!name.trim()) { toast.error("Name 為必填"); return; }
    if (!description.trim()) { toast.error("Description 為必填"); return; }
    if (!companyId) { toast.error("無法取得 company_id"); return; }

    let parsedSchema: unknown;
    try {
      parsedSchema = JSON.parse(jsonSchema.trim() || DEFAULT_JSON_SCHEMA);
    } catch {
      setJsonError("json_schema must be valid JSON");
      return;
    }

    setSaving(true);
    const payload = {
      name: name.trim(),
      description: description.trim(),
      reversible,
      json_schema: parsedSchema,
      ...(editing ? {} : { company_id: companyId }),
    };
    const res = editing
      ? await skillsDb().from("skills").update(payload).eq("id", editing.id)
      : await skillsDb().from("skills").insert(payload);
    setSaving(false);
    if (res.error) { toast.error(`儲存失敗：${res.error.message}`); return; }
    toast.success(editing ? "已更新" : "已建立");
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Skill" : "New Skill"}</DialogTitle>
            <DialogDescription>{editing ? "更新 Skill 的設定" : "建立一個新的 Skill"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="query_order_status" required />
            <p className="text-xs text-muted-foreground">snake_case, verb first. e.g. query_order_status</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description <span className="text-destructive">*</span></Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} required />
            <p className="text-xs text-muted-foreground">This is what the AI reads to decide when to use this skill. Write it clearly.</p>
          </div>
          <div className="flex items-start justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="reversible" className="text-base font-medium">Reversible</Label>
              <p className="text-xs text-muted-foreground">Leave OFF for irreversible actions (delete, send email). These require approval later.</p>
            </div>
            <Switch id="reversible" checked={reversible} onCheckedChange={setReversible} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="json_schema">JSON Schema</Label>
            <Textarea
              id="json_schema" value={jsonSchema}
              onChange={(e) => { setJsonSchema(e.target.value); if (jsonError) setJsonError(""); }}
              rows={6}
              className={jsonError ? "border-destructive focus-visible:ring-destructive" : ""}
            />
            <p className="text-xs text-muted-foreground">Input/output structure. Keep the default if unsure.</p>
            {jsonError && <p className="text-xs text-destructive">{jsonError}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>取消</Button>
            <Button type="submit" disabled={saving}>{saving ? "儲存中…" : editing ? "更新" : "建立"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
