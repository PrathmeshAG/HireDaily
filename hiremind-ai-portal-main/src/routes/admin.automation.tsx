import { createFileRoute } from "@tanstack/react-router";
import { AutomationApp } from "../admin/automation/automation-app";

export const Route = createFileRoute("/admin/automation")({
  component: AutomationApp,
  head: () => ({
    meta: [
      { title: "Instagram Automation — Hire Daily Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
