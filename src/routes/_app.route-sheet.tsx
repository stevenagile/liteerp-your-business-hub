import { createFileRoute } from "@tanstack/react-router";

// ─── Route ───
type RouteSheetSearch = { date?: string; truck?: string };

export const Route = createFileRoute("/_app/route-sheet")({
  validateSearch: (s: Record<string, unknown>): RouteSheetSearch => ({
    date:
      typeof s.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s.date)
        ? s.date
        : undefined,
    truck: s.truck === "大車" || s.truck === "小車" ? (s.truck as string) : undefined,
  }),
});
