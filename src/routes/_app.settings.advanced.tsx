import { createFileRoute } from "@tanstack/react-router";
import { AdvancedSettingsPanel } from "@/components/AdvancedSettingsPanel";

export const Route = createFileRoute("/_app/settings/advanced")({
  component: AdvancedSettingsPage,
});

function AdvancedSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">進階參數</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          管理公司進階設定與營運參數。
        </p>
      </div>
      <AdvancedSettingsPanel />
    </div>
  );
}
