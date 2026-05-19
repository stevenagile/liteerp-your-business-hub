import { useState } from "react";
import { Outlet } from "@tanstack/react-router";
import { Menu, Bell, UserCircle2 } from "lucide-react";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar open={open} />

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="md:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-card px-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-md p-1.5 hover:bg-accent md:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label="切換選單"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="text-sm text-muted-foreground">
              <span className="text-foreground font-medium">控制台</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="通知"
            >
              <Bell className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-accent">
              <UserCircle2 className="h-6 w-6 text-muted-foreground" />
              <div className="hidden text-sm sm:block">
                <div className="font-medium leading-tight">管理員</div>
                <div className="text-[11px] leading-tight text-muted-foreground">
                  尚未登入
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
