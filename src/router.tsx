import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // 避免預覽 iframe 失焦再聚焦時整頁重新抓資料造成閃爍
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        staleTime: 30_000,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    // 關閉自動 scroll restoration：在 Lovable 預覽 iframe 內常會把頁面捲動位置莫名拉走
    scrollRestoration: false,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
