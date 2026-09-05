import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { MenuItem } from "@/components/layout/Sidebar";

type PermissionMap = {
  /** Set of routes the current user can access */
  allowedRoutes: Set<string>;
  /** Whether the menu data has finished loading */
  ready: boolean;
  /** Full menu items for any component that needs richer permission info */
  menuItems: MenuItem[];
};

const PermissionContext = createContext<PermissionMap>({
  allowedRoutes: new Set(),
  ready: false,
  menuItems: [],
});

export function PermissionProvider({
  menu,
  loading,
  children,
}: {
  menu: MenuItem[];
  loading: boolean;
  children: ReactNode;
}) {
  const value = useMemo<PermissionMap>(() => {
    const routes = new Set<string>();
    for (const item of menu) {
      if (item.route) routes.add(item.route);
    }
    return { allowedRoutes: routes, ready: !loading, menuItems: menu };
  }, [menu, loading]);

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionContext);
}
