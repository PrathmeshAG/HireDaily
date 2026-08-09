import { createFileRoute, Outlet } from "@tanstack/react-router";

// Layout route: hosts /admin (admin.index.tsx) and /admin/automation
// (admin.automation.tsx) via the Outlet below. The existing admin dashboard
// content — unchanged — now lives in admin.index.tsx.
export const Route = createFileRoute("/admin")({
  component: () => <Outlet />,
});
