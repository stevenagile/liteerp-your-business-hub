import { createFileRoute, useNavigate } from "@tanstack/react-router";
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

export const Route = createFileRoute("/_app/print/$docType/$id")({
  component: PrintPage,
});

function PrintPage() {
  const { docType, id } = Route.useParams();
  const navigate = useNavigate();

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
      onBack={() => navigate({ to: "/" })}
    />
  );
}
