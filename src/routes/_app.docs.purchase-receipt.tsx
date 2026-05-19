import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/docs/purchase-receipt")({
  component: PurchaseReceiptPage,
});

function PurchaseReceiptPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">進貨單</h1>
        <p className="mt-1 text-sm text-muted-foreground">功能建置中</p>
      </div>
      <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground shadow-sm">
        功能建置中
      </div>
    </div>
  );
}
