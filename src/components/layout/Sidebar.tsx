import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  BarChart3,
  BookOpen,
  Box,
  ChevronDown,
  ChevronRight,
  Circle,
  Clock,
  Contact,
  Database,
  DollarSign,
  FileSpreadsheet,
  FileText,
  Flag,
  Folder,
  GitCommit,
  HandCoins,
  Key,
  LayoutDashboard,
  Leaf,
  List,
  ListTree,
  LogOut,
  MapPin,
  Menu as MenuIcon,
  MessageSquare,
  Moon,
  Navigation,
  Package,
  Percent,
  PieChart,
  Receipt,
  Route,
  ScrollText,
  Settings,
  Shield,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sliders,
  Sun,
  TrendingUp,
  Truck,
  User,
  UserCheck,
  Users,
  Warehouse,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Map of PascalCase icon names to their components (from DB icon field) */
const ICON_MAP: Record<string, LucideIcon> = {
  ArrowDownCircle,
  ArrowUpCircle,
  BarChart3,
  BookOpen,
  Box,
  Clock,
  Contact,
  Database,
  DollarSign,
  FileSpreadsheet,
  FileText,
  Flag,
  Folder,
  GitCommit,
  HandCoins,
  Key,
  LayoutDashboard,
  List,
  ListTree,
  MapPin,
  MessageSquare,
  Navigation,
  Package,
  Percent,
  PieChart,
  Receipt,
  Route,
  ScrollText,
  Settings,
  Shield,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sliders,
  TrendingUp,
  Truck,
  User,
  UserCheck,
  Users,
  Warehouse,
  Wrench,
};

export type MenuItem = {
  id: string | number;
  parent_id: string | number | null;
  label: string;
  icon: string | null;
  route: string | null;
  sort_order: number | null;
  can_view?: boolean;
  can_create?: boolean;
  can_edit?: boolean;
  can_approve?: boolean;
};

type Node = MenuItem & { children: Node[] };

function buildTree(items: MenuItem[]): Node[] {
  const map = new Map<string | number, Node>();
  items.forEach((it) => map.set(it.id, { ...it, children: [] }));
  const roots: Node[] = [];
  map.forEach((node) => {
    if (node.parent_id != null && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  const sortRec = (arr: Node[]) => {
    arr.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    arr.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

function resolveIcon(name: string | null | undefined): LucideIcon | null {
  if (!name) return null;
  const pascal = name
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join("");
  return ICON_MAP[pascal] ?? null;
}

export function Sidebar({
  open,
  menu,
  loading,
  onCollapse,
  onLogout,
}: {
  open: boolean;
  menu: MenuItem[];
  loading?: boolean;
  onCollapse?: () => void;
  onLogout?: () => void;
}) {
  const tree = buildTree(menu);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const [isDark, setIsDark] = useState<boolean>(() =>
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark"),
  );

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-transform duration-200 md:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full",
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-4">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-sm"
          style={{ backgroundColor: "#5C8A4D" }}
        >
          <Leaf className="h-6 w-6" strokeWidth={2.2} />
        </div>
        <div className="min-w-0">
          <div className="text-lg font-bold leading-tight text-sidebar-foreground truncate">
            LiteERP · 進銷存
          </div>
          <div className="text-xs leading-tight text-sidebar-foreground/60 truncate">
            智能生管系統
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 pb-3">
        <div className="px-2 pt-3 pb-2 text-xs font-medium text-sidebar-foreground/55">
          主要功能
        </div>
        {loading && (
          <div className="px-3 py-2 text-sm text-sidebar-foreground/70">
            載入選單中…
          </div>
        )}
        {!loading && tree.length === 0 && (
          <div className="px-3 py-2 text-sm text-sidebar-foreground/70">
            無可顯示的選單
          </div>
        )}
        <ul className="space-y-1">
          {tree.map((n) => (
            <MenuNode key={n.id} node={n} depth={0} pathname={pathname} />
          ))}
        </ul>
      </nav>

      {/* Footer: theme toggle + logout */}
      <div className="border-t border-sidebar-border px-3 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsDark((v) => !v)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
            aria-label="切換主題"
          >
            {isDark ? (
              <Moon className="h-5 w-5" />
            ) : (
              <Sun className="h-5 w-5" />
            )}
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg font-semibold text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-5 w-5" />
            登出
          </button>
        </div>

        {/* Collapse */}
        <button
          type="button"
          onClick={onCollapse}
          className="mt-2 flex h-9 w-full items-center justify-center rounded-lg text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
          aria-label="收合選單"
        >
          <MenuIcon className="h-5 w-5" />
        </button>
      </div>
    </aside>
  );
}

function MenuNode({
  node,
  depth,
  pathname,
}: {
  node: Node;
  depth: number;
  pathname: string;
}) {
  const Icon = resolveIcon(node.icon) ?? (depth === 0 ? null : Circle);
  const isGroup = node.route == null;
  const hasChildren = node.children.length > 0;
  const containsActive = (n: Node): boolean =>
    (n.route != null && n.route === pathname) ||
    n.children.some(containsActive);
  const [open, setOpen] = useState<boolean>(
    isGroup ? containsActive(node) : false,
  );

  const padLeft = `${0.75 + depth * 0.875}rem`;

  if (isGroup) {
    return (
      <li>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={{ paddingLeft: padLeft }}
          className="flex w-full items-center gap-3 rounded-full py-2.5 pr-3 text-left text-[15px] font-medium text-sidebar-foreground/85 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        >
          {Icon ? (
            <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
          ) : (
            <span className="w-[18px]" />
          )}
          <span className="flex-1 truncate">{node.label}</span>
          {hasChildren &&
            (open ? (
              <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0 opacity-60" />
            ))}
        </button>
        {hasChildren && open && (
          <ul className="mt-1 space-y-1">
            {node.children.map((c) => (
              <MenuNode
                key={c.id}
                node={c}
                depth={depth + 1}
                pathname={pathname}
              />
            ))}
          </ul>
        )}
      </li>
    );
  }

  const active = pathname === node.route;
  return (
    <li>
      <Link
        to={node.route!}
        style={
          active
            ? { paddingLeft: padLeft, backgroundColor: "#5C8A4D" }
            : { paddingLeft: padLeft }
        }
        className={cn(
          "flex items-center gap-3 rounded-full py-2.5 pr-4 text-[15px] transition-colors",
          active
            ? "font-semibold text-white shadow-sm"
            : "text-sidebar-foreground/85 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
        )}
      >
        {Icon && (
          <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
        )}
        <span className="truncate">{node.label}</span>
      </Link>
      {hasChildren && (
        <ul className="mt-1 space-y-1">
          {node.children.map((c) => (
            <MenuNode
              key={c.id}
              node={c}
              depth={depth + 1}
              pathname={pathname}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
