import { createFileRoute } from "@tanstack/react-router";
import About from "../pages/About";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Hire Daily — Hire Daily" },
      { name: "description", content: "Learn about Hire Daily, our mission, and how we help people discover job opportunities." },
      { property: "og:title", content: "About Hire Daily — Hire Daily" },
      { property: "og:description", content: "Learn about Hire Daily, our mission, and how we help people discover job opportunities." },
      { property: "og:url", content: "https://hire-daily.vercel.app/about" },
    ],
    links: [{ rel: "canonical", href: "https://hire-daily.vercel.app/about" }],
  }),
  component: About,
});