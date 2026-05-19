import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { usePermission } from "@/hooks/usePermission";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

export const Route = createFileRoute("/_app/expenses")({
  component: ExpensesPage,
});

type Category = { id: string; code: string; name: string; is_fixed: boolean };
type ExpenseRow = {
  id: string;
  expense_date: string;
  amount: number | null;
  description: string | null;
  vendor_name: string | null;
  category_id: string | null;
  expense_categories: { name: string } | null;
};

function ExpensesPage() {
  const { user, profile } = useAuth();
  const canWrite = usePermission("finance", "write");
  const [list, setList] = useState<ExpenseRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    expense_date: today,
    category_id: "",
    amount: "",
    vendor_name: "",
    description: "",
    receipt_url: "",
  });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("expenses")
      .select(
        "id, expense_date, amount, description, vendor_name, category_id, expense_categories(name)",
      )
      .order("expense_date", { ascending: false });
    if (error) toast.error("讀取費用失敗:" + error.message);
    else setList((data ?? []) as unknown as ExpenseRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    (async () => {
      const { data } = await supabase
        .from("expense_categories")
        .select("id, code, name, is_fixed")
        .order("code");
      setCategories((data ?? []) as Category[]);
    })();
  }, []);

  const total = useMemo(
    () => list.reduce((s, e) => s + (Number(e.amount) || 0), 0),
    [list],
  );

  const openCreate = () => {
    setForm({
      expense_date: today,
      category_id: "",
      amount: "",
      vendor_name: "",
      description: "",
      receipt_url: "",
    });
    setDialogOpen(true);
  };

  const submit = async () => {
    if (!form.category_id) {
      toast.error("請選擇分類");
      return;
    }
    const amt = Number(form.amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error("請輸入有效金額");
      return;
    }
    if (!profile?.company_id || !user?.id) {
      toast.error("缺少使用者或公司資訊");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("expenses").insert({
      company_id: profile.company_id,
      created_by: user.id,
      expense_date: form.expense_date,
      category_id: form.category_id,
      amount: amt,
      vendor_name: form.vendor_name || null,
      description: form.description || null,
      receipt_url: form.receipt_url || null,
    });
    setSaving(false);
    if (error) {
      toast.error("新增失敗:" + error.message);
      return;
    }
    toast.success("已新增費用");
    setDialogOpen(false);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">費用管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            記錄營運費用支出。共 {list.length} 筆,合計{" "}
            {total.toLocaleString()}。
          </p>
        </div>
        {canWrite && (
          <Button onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            新增費用
          </Button>
        )}
      </div>

      <div className="rounded-lg border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">日期</TableHead>
              <TableHead className="w-40">分類</TableHead>
              <TableHead className="w-32 text-right">金額</TableHead>
              <TableHead className="w-48">廠商</TableHead>
              <TableHead>說明</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <Loader2 className="inline h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : list.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  尚無費用紀錄
                </TableCell>
              </TableRow>
            ) : (
              list.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{e.expense_date}</TableCell>
                  <TableCell>{e.expense_categories?.name ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {Number(e.amount ?? 0).toLocaleString()}
                  </TableCell>
                  <TableCell>{e.vendor_name ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {e.description ?? "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>新增費用</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>費用日期</Label>
              <Input
                type="date"
                value={form.expense_date}
                onChange={(e) =>
                  setForm({ ...form, expense_date: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>分類</Label>
              <Select
                value={form.category_id}
                onValueChange={(v) => setForm({ ...form, category_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選擇分類" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>金額</Label>
              <Input
                type="number"
                min={0}
                step="1"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>廠商/付給誰</Label>
              <Input
                value={form.vendor_name}
                onChange={(e) =>
                  setForm({ ...form, vendor_name: e.target.value })
                }
                placeholder="選填"
              />
            </div>
            <div className="space-y-1.5">
              <Label>說明</Label>
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="選填"
              />
            </div>
            <div className="space-y-1.5">
              <Label>收據連結</Label>
              <Input
                value={form.receipt_url}
                onChange={(e) =>
                  setForm({ ...form, receipt_url: e.target.value })
                }
                placeholder="選填(URL)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              取消
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? "儲存中..." : "儲存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
