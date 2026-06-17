import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "@tanstack/react-router";
import { Menu, UserCircle2, LogOut } from "lucide-react";
import { Sidebar, type MenuItem } from "./Sidebar";
import { NotificationBell } from "@/components/NotificationBell";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const displayName = profile?.display_name || user?.email || "使用者";
  const roleLabel = profile?.role
    ? { admin: "系統管理員", manager: "主管", sales: "業務", warehouse: "倉管", accountant: "會計", staff: "一般員工" }[profile.role] ??
      profile.role
    : "尚未設定角色";

  // Load dynamic menu from core.get_my_menu
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setMenuLoading(true);
      const { data, error } = await supabase
        .schema("core" as never)
        .rpc("get_my_menu");
      if (cancelled) return;
      if (error) {
        console.error("[menu] get_my_menu error", error);
        setMenu([]);
      } else {
        setMenu((data ?? []) as MenuItem[]);
      }
      setMenuLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Update last_login_at once per session
  useEffect(() => {
    if (!user) return;
    const key = `last_login_at_set_${user.id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    supabase
      .schema("core" as never)
      .rpc("touch_last_login")
      .then(({ error }) => {
        if (error) console.error("[auth] touch_last_login error", error);
      });
  }, [user?.id]);

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen bg-background">
      {!collapsed && (
        <Sidebar
          open={mobileOpen || !collapsed}
          menu={menu}
          loading={menuLoading}
          onCollapse={() => {
            setCollapsed(true);
            setMobileOpen(false);
          }}
          onLogout={handleLogout}
        />
      )}

      {mobileOpen && !collapsed && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className={collapsed ? "" : "md:pl-64"}>
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-card px-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-md p-1.5 hover:bg-accent"
              onClick={() => {
                if (collapsed) setCollapsed(false);
                else setMobileOpen((v) => !v);
              }}
              aria-label="切換選單"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="text-sm text-muted-foreground">
              <span className="text-foreground font-medium">控制台</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <NotificationBell />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-accent"
                >
                  <UserCircle2 className="h-6 w-6 text-muted-foreground" />
                  <div className="hidden text-left text-sm sm:block">
                    <div className="font-medium leading-tight">
                      {displayName}
                    </div>
                    <div className="text-[11px] leading-tight text-muted-foreground">
                      {roleLabel}
                    </div>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="text-sm font-medium">{displayName}</div>
                  <div className="text-xs font-normal text-muted-foreground">
                    {user?.email}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  登出
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
