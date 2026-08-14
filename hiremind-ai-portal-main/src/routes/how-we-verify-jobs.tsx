import { createFileRoute } from "@tanstack/react-router";
import HowWeVerifyJobs from "../pages/HowWeVerifyJobs";

export const Route = createFileRoute("/how-we-verify-jobs")({
  head: () => ({
    meta: [
      { title: "How Hire Daily Verifies Jobs — Hire Daily" },
      { name: "description", content: "Learn how Hire Daily sources, reviews, verifies, and handles job listings." },
      { property: "og:title", content: "How Hire Daily Verifies Jobs — Hire Daily" },
      { property: "og:description", content: "Learn how Hire Daily sources, reviews, verifies, and handles job listings." },
      { property: "og:url", content: "https://hire-daily.vercel.app/how-we-verify-jobs" },
    ],
    links: [{ rel: "canonical", href: "https://hire-daily.vercel.app/how-we-verify-jobs" }],
  }),
  component: HowWeVerifyJobs,
});