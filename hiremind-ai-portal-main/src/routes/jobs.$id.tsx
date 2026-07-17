import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BadgeCheck, Briefcase, Clock, ExternalLink, IndianRupee, MapPin, Share2, Copy } from "lucide-react";
import { toast } from "sonner";
import { fetchJob, fetchJobs } from "../lib/jobs";
import { JobCard } from "../components/job-card";

export const Route = createFileRoute("/jobs/$id")({
  component: JobDetail,
});

function JobDetail() {
  const { id } = Route.useParams();
  const { data: job, isLoading } = useQuery({ queryKey: ["job", id], queryFn: () => fetchJob(id) });
  const { data: allJobs } = useQuery({ queryKey: ["jobs"], queryFn: fetchJobs });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="glass h-96 shimmer-loading rounded-3xl" />
      </div>
    );
  }
  if (!job) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="text-3xl font-bold text-white">Job not found</h1>
        <p className="mt-2 text-white/60">This posting may have been removed.</p>
        <Link to="/jobs" className="btn-glow mt-6 inline-flex rounded-xl px-6 py-3 text-sm">
          Browse Jobs
        </Link>
      </div>
    );
  }

  const link = typeof window !== "undefined" ? window.location.href : "";
  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: `${job.role} at ${job.companyName}`, url: link }); } catch {}
    } else {
      await navigator.clipboard.writeText(link);
      toast.success("Link copied");
    }
  };
  const copy = async () => {
    await navigator.clipboard.writeText(link);
    toast.success("Link copied");
  };

  const related = (allJobs ?? []).filter((j) => j.id !== job.id && j.role === job.role).slice(0, 3);
  const skills = (job.skills || "").split(",").map((s) => s.trim()).filter(Boolean);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link to="/jobs" className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-[#00e5ff]">
        <ArrowLeft className="h-4 w-4" /> Back to jobs
      </Link>

      <div className="glass mt-4 rounded-3xl p-6 md:p-10 animate-fade-up">
        <div className="flex flex-col gap-6 md:flex-row md:items-start">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-white/10 to-white/[0.02] ring-1 ring-white/10">
            {job.companyLogo ? (
              <img src={job.companyLogo} alt={job.companyName} className="h-full w-full object-cover" />
            ) : (
              <span className="text-3xl font-bold text-white/80">{job.companyName?.[0]}</span>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-sm text-white/70">{job.companyName}</p>
              <BadgeCheck className="h-4 w-4 text-[#00e5ff]" />
            </div>
            <h1 className="mt-1 text-3xl font-bold text-white md:text-4xl" style={{ fontFamily: "'Space Grotesk'" }}>
              {job.role}
            </h1>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              {[
                { icon: MapPin, text: job.location },
                { icon: IndianRupee, text: job.salary },
                { icon: Briefcase, text: job.experience },
                { icon: Clock, text: job.jobType },
              ].filter((x) => x.text).map((x, i) => (
                <span key={i} className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-white/80 ring-1 ring-white/10">
                  <x.icon className="h-3.5 w-3.5 text-[#22d3ee]" /> {x.text}
                </span>
              ))}
            </div>
          </div>
        </div>

        {skills.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">Required Skills</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {skills.map((s, i) => (
                <span key={i} className="rounded-lg bg-gradient-to-br from-[#00e5ff]/10 to-[#7c3aed]/10 px-3 py-1.5 text-xs text-white ring-1 ring-white/10">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">Description</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-white/80">{job.description}</p>
        </div>

        {job.lastDate && (
          <div className="mt-6 text-xs text-white/60">
            Apply by <span className="font-semibold text-white">{job.lastDate}</span>
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-2">
          <a href={job.applyLink} target="_blank" rel="noreferrer" className="btn-glow flex items-center gap-2 rounded-xl px-6 py-3 text-sm">
            Apply Now <ExternalLink className="h-4 w-4" />
          </a>
          <button onClick={share} className="btn-ghost-glow flex items-center gap-2 rounded-xl px-4 py-3 text-sm">
            <Share2 className="h-4 w-4" /> Share
          </button>
          <button onClick={copy} className="btn-ghost-glow flex items-center gap-2 rounded-xl px-4 py-3 text-sm">
            <Copy className="h-4 w-4" /> Copy link
          </button>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk'" }}>Related Jobs</h2>
          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {related.map((j, i) => <JobCard key={j.id} job={j} index={i} />)}
          </div>
        </section>
      )}
    </div>
  );
}