import { createFileRoute, redirect } from "@tanstack/react-router";

// Rescue route for DM links that were created as https://<website>/r/<mediaId>/<n>
// (this happened when TRACKING_BASE_URL on the backend pointed at the website instead
// of the backend). Those links already sit inside delivered DMs and cannot be edited,
// so the website forwards them to the backend click route, which counts the click and
// redirects to the real job page. The destination is never taken from the URL.

const SITE_HOST = "hire-daily.vercel.app";
const API_BASE = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "https://hiredaily-backend.vercel.app").replace(/\/+$/, "");

export const Route = createFileRoute("/r/$mediaId/$idx")({
  beforeLoad: ({ params }) => {
    let apiHost = "";
    try {
      apiHost = new URL(API_BASE).host;
    } catch {
      apiHost = "";
    }
    const valid = /^[A-Za-z0-9_-]{5,64}$/.test(params.mediaId) && /^[0-4]$/.test(params.idx);
    // Never redirect back to ourselves (that would loop) and never forward odd input.
    if (!valid || !apiHost || apiHost === SITE_HOST) {
      throw redirect({ to: "/jobs" });
    }
    throw redirect({ href: `${API_BASE}/r/${encodeURIComponent(params.mediaId)}/${params.idx}` });
  },
  head: () => ({
    meta: [
      { title: "Opening job… — Hire Daily" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
