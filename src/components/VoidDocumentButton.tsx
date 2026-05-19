import { useState, type ReactNode } from "react";
import { Ban, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { usePermission } from "@/hooks/usePermission";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Props = {
  docId: string;
  docNo?: string | null;
  status: string;
  module: "sales" | "purchase" | "inventory";
  onVoided?: () => void;
  size?: "sm" | "default";
  variant?: "outline" | "ghost" | "destructive";
  label?: ReactNode;
  stopPropagation?: boolean;
};

const VOIDABLE = new Set(["draft", "confirmed", "completed"]);

export function VoidDocumentButton({
  docId,
  docNo,
  status,
  module,
  onVoided,
  size = "sm",
  variant = "outline",
  label,
  stopPropagation = true,
}: Props) {
  const canVoid = usePermission(module, "void");
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!canVoid || !VOIDABLE.has(status)) return null;

  const handleConfirm = async () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      toast.error("請輸入作廢原因");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.rpc("void_document", {
      p_doc_id: docId,
      p_reason: trimmed,
    });
    setSubmitting(false);
    if (error) {
      toast.error(
        "作廢失敗:" + (error.message || error.details || JSON.stringify(error)),
      );
      return;
    }
    toast.success("已作廢");
    setOpen(false);
    setReason("");
    onVoided?.();
  };

  return (
    <>
      <Button
        size={size}
        variant={variant}
        onClick={(e) => {
          if (stopPropagation) e.stopPropagation();
          setOpen(true);
        }}
      >
        <Ban className="mr-1 h-3.5 w-3.5" />
        {label ?? "作廢"}
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              確認作廢{docNo ? ` ${docNo}` : "此單據"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              作廢已確認單據會反向沖回庫存與流水帳,此動作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="void-reason">
              作廢原因 <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="void-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="請輸入作廢原因"
              disabled={submitting}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirm();
              }}
              disabled={submitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              確認作廢
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
