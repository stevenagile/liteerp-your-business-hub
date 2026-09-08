import { createLazyFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ChevronRight, Pencil, Trash2, Plus, FolderTree, Upload, Download, FileText } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { usePermissionGuard } from "@/hooks/usePermissionGuard";
import { useCompanyId } from "@/hooks/useCompanyId";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { cn } from "@/lib/utils";

export const Route = createLazyFileRoute("/_app/studio/knowledge")({
  component: KnowledgePage,
});

type NodeType = "department" | "topic";

interface KNode {
  id: string;
  parent_id: string | null;
  type: NodeType;
  name: string;
  path: string;
  description: string | null;
  metadata: unknown;
  created_at: string;
  updated_at: string;
}

const db = () => supabase.schema("knowledge" as never);

type FormMode =
  | { kind: "new-department" }
  | { kind: "new-topic"; parent: KNode }
  | { kind: "edit"; node: KNode; parent: KNode | null };

function isUniqueViolation(err: { code?: string; message?: string } | null) {
  if (!err) return false;
  return err.code === "23505" || /duplicate key|unique/i.test(err.message ?? "");
}

function KnowledgePage() {
  usePermissionGuard("/studio");
  const companyId = useCompanyId();
  const [nodes, setNodes] = useState<KNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<KNode | null>(null);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const { data, error } = await db()
      .from("nodes")
      .select("id,parent_id,type,name,path,description,metadata,created_at,updated_at")
      .eq("company_id", companyId)
      .order("name", { ascending: true });
    if (error) toast.error(`載入失敗：${error.message}`);
    else setNodes((data ?? []) as KNode[]);
    setLoading(false);
  }, [companyId]);

  useEffect(() => { void load(); }, [load]);

  const departments = nodes.filter((n) => n.type === "department" && !n.parent_id);
  const topicsByParent = nodes
    .filter((n) => n.type === "topic" && n.parent_id)
    .reduce<Record<string, KNode[]>>((acc, t) => {
      (acc[t.parent_id!] ??= []).push(t);
      return acc;
    }, {});

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await db().from("nodes").delete().eq("id", deleteTarget.id);
    if (error) toast.error(`刪除失敗：${error.message}`);
    else { toast.success("已刪除"); setDeleteTarget(null); void load(); }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Knowledge Hub</h1>
          <p className="text-sm text-muted-foreground">管理你的知識分類樹（部門 / 主題）</p>
        </div>
        <Button onClick={() => setFormMode({ kind: "new-department" })}>
          <Plus className="h-4 w-4" />New Department
        </Button>
      </div>

      <Card className="p-2">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : departments.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-12 text-center text-sm text-muted-foreground">
            <FolderTree className="h-8 w-8 opacity-40" />
            No departments yet. Create your first one.
          </div>
        ) : (
          <ul className="space-y-1">
            {departments.map((dept) => {
              const topics = topicsByParent[dept.id] ?? [];
              const isOpen = expanded[dept.id] ?? true;
              return (
                <li key={dept.id}>
                  <Collapsible open={isOpen} onOpenChange={(o) => setExpanded((p) => ({ ...p, [dept.id]: o }))}>
                    <div className="group flex items-center gap-1 rounded-md px-2 py-1.5 hover:bg-accent">
                      <CollapsibleTrigger asChild>
                        <button type="button" className="flex flex-1 items-center gap-2 text-left">
                          <ChevronRight className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-90")} />
                          <span className="font-medium">{dept.name}</span>
                          {dept.description && <span className="truncate text-xs text-muted-foreground">— {dept.description}</span>}
                        </button>
                      </CollapsibleTrigger>
                      <NodeActions
                        onAddTopic={() => setFormMode({ kind: "new-topic", parent: dept })}
                        onEdit={() => setFormMode({ kind: "edit", node: dept, parent: null })}
                        onDelete={() => setDeleteTarget(dept)}
                      />
                    </div>
                    <CollapsibleContent>
                      <ul className="ml-6 space-y-1 border-l pl-2">
                        {topics.length === 0 ? (
                          <li className="px-2 py-1.5 text-xs text-muted-foreground">No topics yet.</li>
                        ) : (
                          topics.map((t) => (
                            <li key={t.id} className="space-y-1">
                              <div className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent">
                                <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                <span className="flex-1 text-sm">
                                  {t.name}
                                  {t.description && <span className="ml-2 text-xs text-muted-foreground">— {t.description}</span>}
                                </span>
                                <NodeActions
                                  onEdit={() => setFormMode({ kind: "edit", node: t, parent: dept })}
                                  onDelete={() => setDeleteTarget(t)}
                                />
                              </div>
                              <TopicDocuments topicId={t.id} companyId={companyId} />
                            </li>
                          ))
                        )}
                      </ul>
                    </CollapsibleContent>
                  </Collapsible>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <NodeFormDialog
        mode={formMode} companyId={companyId}
        onOpenChange={(o) => !o && setFormMode(null)}
        onSaved={() => { setFormMode(null); void load(); }}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除「{deleteTarget?.name}」</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === "department"
                ? "Deleting this department also deletes all its topics and documents. This cannot be undone."
                : "此動作無法復原。"}
            </AlertDialogDescription>
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

function NodeActions({
  onAddTopic, onEdit, onDelete,
}: {
  onAddTopic?: () => void; onEdit: () => void; onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
      {onAddTopic && (
        <Button variant="ghost" size="sm" onClick={onAddTopic}><Plus className="h-3.5 w-3.5" />Add Topic</Button>
      )}
      <Button variant="ghost" size="icon" onClick={onEdit}><Pencil className="h-4 w-4" /></Button>
      <Button variant="ghost" size="icon" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
    </div>
  );
}

function NodeFormDialog({
  mode, companyId, onOpenChange, onSaved,
}: {
  mode: FormMode | null; companyId: string | null;
  onOpenChange: (o: boolean) => void; onSaved: () => void;
}) {
  const open = !!mode;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode?.kind === "edit") {
      setName(mode.node.name);
      setDescription(mode.node.description ?? "");
    } else {
      setName("");
      setDescription("");
    }
  }, [open, mode]);

  if (!mode) return null;

  const title =
    mode.kind === "new-department"
      ? "New Department"
      : mode.kind === "new-topic"
        ? `New Topic in「${mode.parent.name}」`
        : `Edit ${mode.node.type === "department" ? "Department" : "Topic"}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { toast.error("Name 為必填"); return; }
    if (!companyId) { toast.error("無法取得 company_id"); return; }
    setSaving(true);

    let res;
    if (mode.kind === "new-department") {
      res = await db().from("nodes").insert({
        type: "department", parent_id: null, name: trimmed,
        path: trimmed, description: description.trim() || null,
        company_id: companyId,
      });
    } else if (mode.kind === "new-topic") {
      res = await db().from("nodes").insert({
        type: "topic", parent_id: mode.parent.id, name: trimmed,
        path: `${mode.parent.name}/${trimmed}`, description: description.trim() || null,
        company_id: companyId,
      });
    } else {
      const node = mode.node;
      const newPath = node.type === "department" ? trimmed : `${mode.parent?.name ?? ""}/${trimmed}`;
      res = await db().from("nodes").update({
        name: trimmed, path: newPath, description: description.trim() || null,
      }).eq("id", node.id);
    }

    setSaving(false);
    if (res.error) {
      if (isUniqueViolation(res.error)) toast.error("A node with this name already exists here.");
      else toast.error(`儲存失敗：${res.error.message}`);
      return;
    }
    toast.success(mode.kind === "edit" ? "已更新" : "已建立");
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>名稱必須在同層級唯一</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>取消</Button>
            <Button type="submit" disabled={saving}>{saving ? "儲存中…" : mode.kind === "edit" ? "更新" : "建立"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface KDoc {
  id: string;
  node_id: string;
  filename: string;
  storage_path: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  status: string | null;
  uploaded_by: string | null;
  created_at: string;
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

const ACCEPT = ".pdf,.doc,.docx,.txt,.md";

function safeStorageFilename(filename: string) {
  const dotIndex = filename.lastIndexOf(".");
  const base = dotIndex > 0 ? filename.slice(0, dotIndex) : filename;
  const ext = dotIndex > 0 ? filename.slice(dotIndex).toLowerCase() : "";
  const safeBase = base
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${safeBase || "file"}${ext.replace(/[^a-z0-9.]/g, "")}`;
}

function TopicDocuments({ topicId, companyId }: { topicId: string; companyId: string | null }) {
  const [docs, setDocs] = useState<KDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleteDoc, setDeleteDoc] = useState<KDoc | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await db()
      .from("documents")
      .select("id,node_id,filename,storage_path,mime_type,file_size_bytes,status,uploaded_by,created_at")
      .eq("node_id", topicId)
      .order("created_at", { ascending: false });
    if (error) toast.error(`載入文件失敗：${error.message}`);
    else setDocs((data ?? []) as KDoc[]);
    setLoading(false);
  }, [topicId]);

  useEffect(() => { void load(); }, [load]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    if (!topicId) { toast.error("Please select a topic first"); return; }
    if (!companyId) { toast.error("無法取得 company_id"); return; }

    setUploading(true);
    const uploadingToast = toast.loading("Uploading...");

    const storageFilename = safeStorageFilename(file.name);
    const path = `${topicId}/${Date.now()}_${storageFilename}`;

    const { error: storageError } = await supabase.storage
      .from("knowledge-files")
      .upload(path, file);

    if (storageError) {
      toast.dismiss(uploadingToast);
      toast.error(`Storage upload failed: ${storageError.message}`);
      setUploading(false);
      return;
    }

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      await supabase.storage.from("knowledge-files").remove([path]);
      toast.dismiss(uploadingToast);
      toast.error(`Not signed in: ${userErr?.message ?? "no user"}`);
      setUploading(false);
      return;
    }

    const { error: dbError } = await db().from("documents").insert({
      node_id: topicId,
      filename: file.name,
      storage_path: path,
      mime_type: file.type || null,
      file_size_bytes: file.size,
      status: "ready",
      uploaded_by: userData.user.id,
      company_id: companyId,
    });

    if (dbError) {
      await supabase.storage.from("knowledge-files").remove([path]);
      toast.dismiss(uploadingToast);
      toast.error(`Database insert failed: ${dbError.message}`);
      setUploading(false);
      return;
    }

    toast.dismiss(uploadingToast);
    toast.success(`Uploaded ${file.name}`);
    setUploading(false);
    await load();
    window.dispatchEvent(new CustomEvent("knowledge-docs-changed"));
  };

  const handleDownload = async (doc: KDoc) => {
    const { data, error } = await supabase.storage
      .from("knowledge-files")
      .createSignedUrl(doc.storage_path, 60);
    if (error || !data?.signedUrl) {
      toast.error(`產生連結失敗：${error?.message ?? "unknown"}`);
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const handleDelete = async () => {
    if (!deleteDoc) return;
    const rm = await supabase.storage.from("knowledge-files").remove([deleteDoc.storage_path]);
    if (rm.error) { toast.error(`刪除檔案失敗：${rm.error.message}`); return; }
    const del = await db().from("documents").delete().eq("id", deleteDoc.id);
    if (del.error) { toast.error(`刪除記錄失敗：${del.error.message}`); return; }
    toast.success("已刪除");
    setDeleteDoc(null);
    void load();
  };

  return (
    <div className="ml-6 rounded-md border bg-muted/30 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Documents</span>
        <div>
          <input ref={fileRef} type="file" accept={ACCEPT} className="hidden" onChange={handleFile} />
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
            <Upload className="h-3.5 w-3.5" />{uploading ? "Uploading…" : "Upload"}
          </Button>
        </div>
      </div>
      {loading ? (
        <div className="py-2 text-xs text-muted-foreground">Loading…</div>
      ) : docs.length === 0 ? (
        <div className="py-2 text-xs text-muted-foreground">No documents in this topic yet.</div>
      ) : (
        <ul className="divide-y">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center gap-2 py-1.5 text-sm">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate">{d.filename}</span>
              <span className="w-20 text-right text-xs text-muted-foreground">{formatBytes(d.file_size_bytes)}</span>
              <span className="w-32 text-right text-xs text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</span>
              <Button variant="ghost" size="icon" onClick={() => handleDownload(d)}><Download className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => setDeleteDoc(d)}><Trash2 className="h-4 w-4" /></Button>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={!!deleteDoc} onOpenChange={(o) => !o && setDeleteDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除「{deleteDoc?.filename}」</AlertDialogTitle>
            <AlertDialogDescription>此動作無法復原。</AlertDialogDescription>
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
