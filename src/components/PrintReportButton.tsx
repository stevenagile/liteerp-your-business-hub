import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintReportButton({
  size = "default",
}: {
  size?: "sm" | "default";
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      onClick={() => window.print()}
      className="no-print"
    >
      <Printer className="mr-1.5 h-4 w-4" />
      列印
    </Button>
  );
}
