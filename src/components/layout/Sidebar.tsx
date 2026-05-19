import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Package,
  Warehouse,
  FileText,
  ShoppingCart,
  Receipt,
  Truck,
  PackageOpen,
  ClipboardList,
  Boxes,
  Wallet,
  CircleDollarSign,
  TrendingUp,
  BarChart3,
  UserCheck,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { label: string; to: string; icon: LucideIcon };
type Group = { title: string; items: Item[] };

const groups: Group[] = [
  {
    title: "總覽",
    items: [{ label: "儀表板", to: "/", icon: LayoutDashboard }],
  },
  {
    title: "基礎資料",
    items: [
      { label: "客戶廠商", to: "/contacts", icon: Users },
      { label: "產品", to: "/products", icon: Package },
      { label: "倉庫", to: "/warehouses", icon: Warehouse },
    ],
  },
  {
    title: "銷售",
    items: [
      { label: "報價單", to: "/docs/quotation", icon: FileText },
      { label: "訂單", to: "/docs/sales-order", icon: ShoppingCart },
      { label: "銷貨單", to: "/docs/sales-invoice", icon: Receipt },
      { label: "銷退單", to: "/docs/sales-return", icon: PackageOpen },
    ],
  },
  {
    title: "採購",
    items: [
      { label: "採購單", to: "/docs/purchase-order", icon: Truck },
      { label: "進貨單", to: "/docs/purchase-receipt", icon: PackageOpen },
    ],
  },
  {
    title: "庫存",
    items: [
      { label: "庫存總覽", to: "/inventory", icon: Boxes },
      { label: "庫存調整", to: "/docs/inventory-adjust", icon: ClipboardList },
    ],
  },
  {
    title: "帳務",
    items: [
      { label: "應收帳款", to: "/receivables", icon: Wallet },
      { label: "費用管理", to: "/expenses", icon: CircleDollarSign },
    ],
  },
  {
    title: "報表",
    items: [
      { label: "月損益", to: "/reports/pnl", icon: TrendingUp },
      { label: "產品利潤", to: "/reports/product-profit", icon: BarChart3 },
      { label: "客戶利潤", to: "/reports/customer-profit", icon: UserCheck },
    ],
  },
  {
    title: "系統",
    items: [{ label: "系統設定", to: "/settings", icon: Settings }],
  },
];

export function Sidebar({ open }: { open: boolean }) {
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-200 md:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-success font-bold text-success-foreground">
          L
        </div>
        <div>
          <div className="text-sm font-semibold leading-tight text-white">
            LiteERP
          </div>
          <div className="text-[11px] leading-tight text-sidebar-foreground/60">
            進銷存管理系統
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {groups.map((g) => (
          <div key={g.title} className="mb-4">
            <div className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/50">
              {g.title}
            </div>
            <ul className="space-y-0.5">
              {g.items.map((item) => {
                const active = pathname === item.to;
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border px-4 py-3 text-[11px] text-sidebar-foreground/50">
        v0.1.0 · 開發版
      </div>
    </aside>
  );
}
