import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/")({
  head: () => ({ meta: [
    { title: "儀表板 · LiteERP 進銷存" },
    { name: "description", content: "LiteERP 營運儀表板：營收、毛利、客戶欠款與庫存概況。" },
    { property: "og:title", content: "儀表板 · LiteERP 進銷存" },
    { property: "og:description", content: "查看 LiteERP 的營收、毛利、客戶欠款與庫存概況。" },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});
