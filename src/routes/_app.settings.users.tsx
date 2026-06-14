import { createFileRoute, redirect } from "@tanstack/react-router";

// 退役：使用者管理統一到 /users（對齊 profiles 的統一版）
export const Route = createFileRoute("/_app/settings/users")({
  beforeLoad: () => {
    throw redirect({ to: "/users" });
  },
});
