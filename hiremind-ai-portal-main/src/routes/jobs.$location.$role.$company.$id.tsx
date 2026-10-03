import { createFileRoute } from "@tanstack/react-router";
import { fetchJob, fetchJobs } from "../lib/jobs";
import { getJobPath } from "../lib/job-url";
import { SITE } from "../lib/site";
import { JobDetailPage } from "./jobs.$id";

export const Route = createFileRoute("/jobs/$location/$role/$company/$id")({
  ssr: true,
  loader: async ({ params }) => ({
    job: await fetchJob(params.id),
    allJobs: await fetchJobs(),
  }),
  component: JobSeoJobDetailPage,
  head: ({ loaderData }) => {
    const job = loaderData?.job;
    const title = job ? `${job.role} at ${job.companyName} — Hire Daily` : "Job Not Found — Hire Daily";

    return {
      meta: [
        { title },
        {
          name: "description",
          content: job
            ? `${job.role} at ${job.companyName}. View job description, location, experience, skills, salary information, deadline and application details on Hire Daily.`
            : "The requested job listing could not be found on Hire Daily.",
        },
        { property: "og:title", content: title },
        { name: "twitter:title", content: title },
        {
          property: "og:description",
          content: job
            ? `Review the details and application information for ${job.role} at ${job.companyName}.`
            : "The requested job listing could not be found.",
        },
        {
          name: "twitter:description",
          content: job
            ? `Review the details and application information for ${job.role} at ${job.companyName}.`
            : "The requested job listing could not be found.",
        },
      ],
      // One canonical address per job: the long SEO URL, so /jobs/<id> does not compete with it.
      links: job ? [{ rel: "canonical", href: `${SITE.url}${getJobPath(job)}` }] : [],
    };
  },
});

function JobSeoJobDetailPage() {
  const { job, allJobs } = Route.useLoaderData();
  return <JobDetailPage job={job} allJobs={allJobs} />;
}
