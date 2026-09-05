import { createLazyFileRoute } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  PrintableDocument,
  type PrintDocType,
} from "@/components/PrintableDocument";

const VALID: PrintDocType[] = [
  "quotation",
  "sales_order",
  "sales_invoice",
  "purchase_order",
  "purchase_receipt",
];

export const Route = createLazyFileRoute("/_app/print/$docType/$id")({
  component: PrintPage,
});
function PrintPage() {
  const { docType, id } = Route.useParams();
  const navigate = useNavigate();
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!VALID.includes(docType as PrintDocType)) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        不支援的單據類型：{docType}
      </div>
    );
  }

  return (
    <PrintableDocument
      docType={docType as PrintDocType}
      docId={id}
      companyId={profile?.company_id ?? ""}
      onBack={() => navigate({ to: "/" })}
    />
  );
}
