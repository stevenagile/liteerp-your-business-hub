import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/docs/manual")({
  component: ManualPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border bg-card p-5">
      <h2 className="mb-2 text-lg font-semibold">{title}</h2>
      <div className="space-y-1.5 text-[15px] leading-relaxed text-foreground/90">
        {children}
      </div>
    </section>
  );
}

function ManualPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">使用手冊</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          LiteERP 進銷存管理系統——基本操作說明
        </p>
      </div>

      <Section title="1. 登入與主畫面">
        <p>以管理員發給的帳號密碼登入。登入後左側為主選單，中間為內容區，右上角為通知與帳號選單。</p>
        <p>選單會依你的角色自動顯示可用的功能。</p>
      </Section>

      <Section title="2. 基本資料">
        <p>開始使用前，請先在「基本資料」建置：<b>商品</b>（售價、成本、安全库存）、<b>客戶/廠商</b>（聯絡人、付款條件、配送規則）、<b>倉庫</b>。</p>
      </Section>

      <Section title="3. 銷售流程">
        <p>一般流程：<b>報價單 → 銷貨訂單 → 出貨 → 銷貨單（發票）</b>。各階段可由上一階單據轉入，不必重輸。</p>
        <p>單據存成草稿後，經「確認」才會正式計入帳務與库存；確認時自動套用營業稅率。</p>
      </Section>

      <Section title="4. 採購與庫存">
        <p>採購流程：<b>採購訂單 → 進貨單</b>。進貨確認後库存自動增加。「庫存調整」用於盤點差異與其他增減。</p>
        <p>「庫存查詢」看即時數量與低安全库存警示；「庫存異動」看每一筆進出軌跡。</p>
      </Section>

      <Section title="5. 收付款與對帳">
        <p>在已確認的銷貨單/進貨單上記錄收款或付款；輸錯可「沖銷」產生反向分錄。「客戶收款/廠商付款」可一次沖銷多張單據。</p>
      </Section>

      <Section title="6. 報表">
        <p>提供損益、營收、帳齡、銷/進貨明細、商品/客戶獲利、業務績效等。各報表可匯出 Excel 或列印。</p>
      </Section>

      <Section title="7. 系統設定（僅管理員）">
        <p><b>環境參數</b>：公司資料、營業稅率、單據編號規則。</p>
        <p><b>帳號列表</b>：新增使用者、指派角色、啟用/停用。</p>
        <p><b>功能權限</b>：設定各角色對業務模組的讀/寫/確認/作廢權限。</p>
        <p><b>角色權限</b>：設定各角色可看到哪些選單。</p>
      </Section>
    </div>
  );
}
