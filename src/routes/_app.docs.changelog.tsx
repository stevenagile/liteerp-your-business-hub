import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/docs/changelog")({
  component: ChangelogPage,
});

type Entry = { version: string; date: string; items: string[] };

const LOG: Entry[] = [
  {
    version: "標準模組 v1.0",
    date: "2026-06-14",
    items: [
      "建置系統底座：使用者/角色/選單權限統一到 profiles，選單由 get_my_menu 動態驅動。",
      "新增帳號管理 /users：管理員可直接建帳（設定帳密、指派角色、啟用/停用）。",
      "新增角色權限 /roles（選單顯示）與功能權限 /settings/permissions（業務模組動作）。",
      "新增環境參數、選單結構、稽核日誌、使用手冊頁。",
    ],
  },
  {
    version: "稅率與可讀性修正",
    date: "2026-06-14",
    items: [
      "修正收付款明細讀取錯誤、沖銷鈕未顯示的問題。",
      "環境參數改接公司主資料，修改稅率即時反映到單據計稅。",
      "全站字級放大、提高對比，長輩友善。",
    ],
  },
];

function ChangelogPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">開發歷程</h1>
        <p className="mt-1 text-sm text-muted-foreground">系統版本與變更紀錄</p>
      </div>

      <div className="space-y-4">
        {LOG.map((e) => (
          <section key={e.version + e.date} className="rounded-md border bg-card p-5">
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-lg font-semibold">{e.version}</h2>
              <span className="text-sm text-muted-foreground">{e.date}</span>
            </div>
            <ul className="list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-foreground/90">
              {e.items.map((it, i) => (
                <li key={i}>{it}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
