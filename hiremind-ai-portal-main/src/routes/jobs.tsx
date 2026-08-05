import { createFileRoute, Outlet } from "@tanstack/react-router";

// This is a layout route: it just hosts the /jobs list (jobs.index.tsx)
// and the /jobs/$id detail page (jobs.$id.tsx) via the Outlet below.
// The actual "Browse Jobs" page content lives in jobs.index.tsx.
export const Route = createFileRoute("/jobs")({
  component: () => <Outlet />,
});
