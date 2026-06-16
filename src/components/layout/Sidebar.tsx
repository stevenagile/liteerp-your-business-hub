import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import * as Icons from "lucide-react";
import { ChevronDown, ChevronRight, Circle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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

// Map kebab/snake icon name from DB to lucide-react PascalCase component
function resolveIcon(name: string | null | undefined): LucideIcon | null {
  if (!name) return null;
  const pascal = name
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join("");
  const Comp = (Icons as unknown as Record<string, LucideIcon>)[pascal];
  return Comp ?? null;
}

export function Sidebar({
  open,
  menu,
  loading,
}: {
  open: boolean;
  menu: MenuItem[];
  loading?: boolean;
}) {
  const tree = buildTree(menu);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-200 md:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-md font-bold text-white"
          style={{ backgroundColor: "#6B9B5C" }}
        >
          L
        </div>
        <div>
          <div className="text-base font-semibold leading-tight text-sidebar-foreground">
            LiteERP
          </div>
          <div className="text-xs leading-tight text-sidebar-foreground/70">
            進銷存管理系統
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
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
        <ul className="space-y-0.5">
          {tree.map((n) => (
            <MenuNode key={n.id} node={n} depth={0} pathname={pathname} />
          ))}
        </ul>
      </nav>

      <div className="border-t border-sidebar-border px-4 py-3 text-xs text-sidebar-foreground/60">
        v0.1.0 · 開發版
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
    isGroup ? containsActive(node) || depth === 0 : false,
  );

  const indent = { paddingLeft: `${0.75 + depth * 0.75}rem` };

  if (isGroup) {
    return (
      <li>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={indent}
          className={cn(
            "flex w-full items-center gap-2 rounded-md py-2 pr-2 text-left text-sm font-semibold text-sidebar-foreground/80 hover:text-sidebar-foreground",
          )}
        >
          {hasChildren ? (
            open ? (
              <ChevronDown className="h-4 w-4 shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0" />
            )
          ) : (
            <span className="w-4" />
          )}
          {Icon && <Icon className="h-4 w-4 shrink-0" />}
          <span className="truncate">{node.label}</span>
        </button>
        {hasChildren && open && (
          <ul className="space-y-0.5">
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
        style={indent}
        className={cn(
          "flex items-center gap-2.5 rounded-md py-2 pr-3 text-[15px] transition-colors",
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
            : "text-sidebar-foreground/85 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
        )}
      >
        {Icon && <Icon className="h-4 w-4 shrink-0" />}
        <span className="truncate">{node.label}</span>
      </Link>
      {hasChildren && (
        <ul className="space-y-0.5">
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
