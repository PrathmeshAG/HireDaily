import { createFileRoute } from "@tanstack/react-router";
import HowWeVerifyJobs from "../pages/HowWeVerifyJobs";

export const Route = createFileRoute("/how-we-verify-jobs")({
  component: HowWeVerifyJobs,
});